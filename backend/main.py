from fastapi import FastAPI, Depends, HTTPException, WebSocket, WebSocketDisconnect, UploadFile, File as FastAPIFile, Form
from typing import List, Optional
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime
import models
from database import engine, get_db, SessionLocal
import hashlib
import json
import uuid
import os
from permissions import ROLE_PERMISSIONS, has_permission
import anthropic
from pathlib import Path
from extractor import extract_text
from classifier import classify, FOLDER_NAMES
from pipeline import load_embedder
from tag_system import assign_tag, run_initial_clustering, set_tag_name, show_tags, load_cluster_data

def hash_password(password: str):
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(plain_password: str, hashed_password: str):
    return hash_password(plain_password) == hashed_password

# 새 컬럼 추가 (DB 삭제 없이)
from sqlalchemy import text
with engine.connect() as conn:
    for sql in [
        "ALTER TABLE messages ADD COLUMN is_read BOOLEAN DEFAULT 0",
        "ALTER TABLE users ADD COLUMN status VARCHAR DEFAULT 'offline'",
        "ALTER TABLE users ADD COLUMN last_active DATETIME DEFAULT CURRENT_TIMESTAMP",
        "ALTER TABLE users ADD COLUMN dept_key VARCHAR DEFAULT ''",
        "ALTER TABLE users ADD COLUMN is_first_login BOOLEAN DEFAULT 1",
        "ALTER TABLE announcements ADD COLUMN is_urgent BOOLEAN DEFAULT 0",
        "ALTER TABLE announcements ADD COLUMN was_urgent BOOLEAN DEFAULT 0",
        "ALTER TABLE announcements ADD COLUMN urgent_until DATETIME",
        "ALTER TABLE users ADD COLUMN phone VARCHAR DEFAULT ''",
        "ALTER TABLE users ADD COLUMN email VARCHAR DEFAULT ''",
        "ALTER TABLE messages ADD COLUMN file_id VARCHAR",
        "ALTER TABLE files ADD COLUMN parent_id VARCHAR",
        "ALTER TABLE files ADD COLUMN version INTEGER DEFAULT 1",
        "ALTER TABLE user_files ADD COLUMN is_home BOOLEAN DEFAULT 0",
        "ALTER TABLE users ADD COLUMN profile_picture VARCHAR DEFAULT ''",
        "ALTER TABLE users ADD COLUMN bio VARCHAR DEFAULT ''",
    ]:
        try:
            conn.execute(text(sql))
            conn.commit()
        except:
            pass

app = FastAPI()

# 분류 AI 초기화 (서버 시작 시 1회)
_embedder_data = {"embedder": None, "folder_vecs": None, "folder_codes": None}
_llm_client = None
"ALTER TABLE messages ADD COLUMN file_id VARCHAR",
"ALTER TABLE files ADD COLUMN parent_id VARCHAR",
"ALTER TABLE files ADD COLUMN version INTEGER DEFAULT 1",
@app.on_event("startup")
async def startup_event():
    global _llm_client
    try:
        e, fv, fc = load_embedder()
        _embedder_data["embedder"]    = e
        _embedder_data["folder_vecs"] = fv
        _embedder_data["folder_codes"]= fc
        _llm_client = anthropic.Anthropic()
        print("[분류 AI] 로딩 완료 ✅")
    except Exception as e:
        print(f"[분류 AI] 로딩 실패 (룰 기반으로 동작): {e}")

# 채팅방별 연결 관리
class ConnectionManager:
    def __init__(self):
        self.connections: dict = {}

    async def connect(self, websocket: WebSocket, room_id: int):
        await websocket.accept()
        if room_id not in self.connections:
            self.connections[room_id] = []
        self.connections[room_id].append(websocket)

    def disconnect(self, websocket: WebSocket, room_id: int):
        if room_id in self.connections:
            self.connections[room_id].remove(websocket)

    async def broadcast(self, message: str, room_id: int):
        if room_id in self.connections:
            for connection in self.connections[room_id]:
                await connection.send_text(message)

manager = ConnectionManager()

# 프론트엔드 연결 허용 (CORS 설정)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================== 데이터 형식 정의 ====================

class UserCreate(BaseModel):
    username: str
    password: str
    name: str
    dept: str
    role: str
    grade: str = "member"

class UserLogin(BaseModel):
    username: str
    password: str

class RoomCreate(BaseModel):
    name: str
    member_ids: list[int]

class MessageCreate(BaseModel):
    content: str
    room_id: int
    sender_id: int
    is_file: bool = False

# ==================== 유저 API ====================

# 회원가입
@app.post("/users/create")
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.username == user.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="이미 존재하는 아이디예요")
    new_user = models.User(
        username=user.username,
        password=hash_password(user.password),
        name=user.name,
        dept=user.dept,
        role=user.role,
        grade=user.grade
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return { "message": "회원가입 성공", "user_id": new_user.id }

# 로그인
@app.post("/users/login")
def login(user: UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(
        models.User.username == user.username
    ).first()
    if not db_user or not verify_password(user.password, db_user.password):
        raise HTTPException(status_code=401, detail="아이디 또는 비밀번호가 틀렸어요")
    if not db_user.is_active:
        raise HTTPException(status_code=403, detail="퇴사 처리된 계정이에요")
    db_user.status = "online"
    db_user.last_active = datetime.now()
    db.commit()
    return {
        "message": "로그인 성공",
        "user": {
            "id": db_user.id,
            "username": db_user.username,
            "name": db_user.name,
            "dept": db_user.dept,
            "role": db_user.role,
            "grade": db_user.grade,
            "is_first_login": db_user.is_first_login,
            "phone": db_user.phone or "",
            "email": db_user.email or "",
            "profile_picture": db_user.profile_picture or "",
            "bio": db_user.bio or ""
        }
    }

# 로그아웃
@app.post("/users/logout/{user_id}")
def logout(user_id: int, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if db_user:
        db_user.status = "offline"
        db.commit()
    return { "message": "로그아웃 성공" }

# 활동 업데이트
@app.post("/users/active/{user_id}")
def update_active(user_id: int, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if db_user:
        db_user.last_active = datetime.now()
        if db_user.status == "away":
            db_user.status = "online"
        db.commit()
    return { "message": "활동 업데이트" }

class OnboardingData(BaseModel):
    name: str
    phone: str
    email: str
    new_username: str
    new_password: str

@app.post("/users/onboarding/{user_id}")
def complete_onboarding(user_id: int, data: OnboardingData, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="유저를 찾을 수 없어요")
    user.name = data.name
    user.username = data.new_username
    user.password = hash_password(data.new_password)
    user.is_first_login = False
    db.commit()
    return { "message": "온보딩 완료" }

class ProfileUpdate(BaseModel):
    name: str
    phone: str
    email: str
    username: str
    bio: str = ""

class PasswordChange(BaseModel):
    current_password: str
    new_password: str

# 프로필 업데이트
    @app.put("/users/profile/{user_id}")
    def update_profile(user_id: int, data: ProfileUpdate, db: Session = Depends(get_db)):
        user = db.query(models.User).filter(models.User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="유저를 찾을 수 없어요")
        user.name = data.name
        user.phone = data.phone
        user.email = data.email
        user.username = data.username
        user.bio = data.bio
        db.commit()
        return { "message": "프로필 업데이트 완료" }

# 비밀번호 변경
@app.put("/users/password/{user_id}")
def change_password(user_id: int, data: PasswordChange, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="유저를 찾을 수 없어요")
    if not verify_password(data.current_password, user.password):
        raise HTTPException(status_code=400, detail="현재 비밀번호가 틀렸어요")
    user.password = hash_password(data.new_password)
    db.commit()
    return { "message": "비밀번호 변경 완료" }


class GradeUpdate(BaseModel):
    grade: str

class DeptUpdate(BaseModel):
    dept: str

# 전체 유저 목록 (인사관리용)
@app.get("/users/all")
def get_all_users(db: Session = Depends(get_db)):
    users = db.query(models.User).all()
    return [{ "id": u.id, "username": u.username, "name": u.name, "dept": u.dept, "role": u.role, "grade": u.grade, "is_active": u.is_active, "status": u.status or "offline" } for u in users]
# 역할 변경
@app.put("/users/grade/{user_id}")
def update_grade(user_id: int, data: GradeUpdate, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="유저를 찾을 수 없어요")
    user.grade = data.grade
    db.commit()
    return { "message": "역할 변경 성공" }

# 부서 변경
@app.put("/users/dept/{user_id}")
def update_dept(user_id: int, data: DeptUpdate, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="유저를 찾을 수 없어요")
    user.dept = data.dept
    db.commit()
    return { "message": "부서 변경 성공" }

# 퇴사 처리
@app.put("/users/resign/{user_id}")
def resign_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="유저를 찾을 수 없어요")
    user.is_active = False
    user.status = "offline"
    db.commit()
    return { "message": "퇴사 처리 완료" }

# 계정 완전 삭제
@app.delete("/users/delete/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="유저를 찾을 수 없어요")
    db.delete(user)
    db.commit()
    return { "message": "계정 삭제 완료" }

# 전체 유저 목록
@app.get("/users/{current_user_id}")
def get_users(current_user_id: int, db: Session = Depends(get_db)):
    users = db.query(models.User).filter(models.User.id != current_user_id).all()
    result = []
    for u in users:
        # DM방 찾기
        room = db.query(models.Room).filter(
            models.Room.name == f"dm_{min(current_user_id, u.id)}_{max(current_user_id, u.id)}"
        ).first()
        last_message = ""
        unread_count = 0
        if room:
            last_msg = db.query(models.Message).filter(
                models.Message.room_id == room.id
            ).order_by(models.Message.id.desc()).first()
            if last_msg:
                last_message = last_msg.content
            unread_count = db.query(models.Message).filter(
                models.Message.room_id == room.id,
                models.Message.sender_id != current_user_id,
                models.Message.is_read == False
            ).count()

        if not u.is_active:
            continue

        result.append({
            "id": u.id,
            "name": u.name if u.name else u.username,
            "dept": u.dept,
            "role": u.role,
            "grade": u.grade,
            "last_message": last_message,
            "last_message_at": last_msg.created_at.isoformat() if last_msg else None, 
            "unread_count": unread_count,
            "status": (
                "online" if u.last_active and (datetime.now() - u.last_active).seconds < 1800
                else "away"
            ) if u.is_active and u.status != "offline" else "offline"
        })
    return result

# ==================== 협업방 API ====================

# 협업방 생성
@app.post("/rooms/create")
def create_room(room: RoomCreate, db: Session = Depends(get_db)):
    new_room = models.Room(name=room.name)
    db.add(new_room)
    db.commit()
    db.refresh(new_room)
    for user_id in room.member_ids:
        member = models.RoomMember(room_id=new_room.id, user_id=user_id)
        db.add(member)
    db.commit()
    return { "message": "협업방 생성 성공", "room_id": new_room.id }

# 협업방 목록
@app.get("/rooms/{user_id}")
def get_rooms(user_id: int, db: Session = Depends(get_db)):
    rooms = db.query(models.Room).filter(
        ~models.Room.name.startswith("dm_")
    ).all()
    result = []
    for r in rooms:
        members = db.query(models.RoomMember).filter(
            models.RoomMember.room_id == r.id
        ).all()
        member_names = []
        for m in members:
            user = db.query(models.User).filter(models.User.id == m.user_id).first()
            if user:
                member_names.append(user.name)
        last_msg = db.query(models.Message).filter(
            models.Message.room_id == r.id
        ).order_by(models.Message.id.desc()).first()
        unread_count = db.query(models.Message).filter(
            models.Message.room_id == r.id,
            models.Message.sender_id != user_id,
            models.Message.is_read == False
        ).count()
        result.append({
            "id": r.id,
            "name": r.name,
            "members": member_names,
            "lastMessage": last_msg.content if last_msg else "",
            "last_message_at": last_msg.created_at.isoformat() if last_msg else None,
            "unread_count": unread_count
        })
    return result

# =================== 신규 회원 API =====================
import random
import string

@app.post("/users/bulk-create")
def bulk_create_users(data: dict, db: Session = Depends(get_db)):
    name = data["name"]
    dept = data["dept"]
    role = data["role"]
    count = int(data.get("count", 1))

    created = []
    for _ in range(count):
        suffix = ''.join(random.choices(string.digits, k=4))
        username = f"{name}{suffix}"
        password = ''.join(random.choices(string.ascii_letters + string.digits, k=8))

        while db.query(models.User).filter(models.User.username == username).first():
            suffix = ''.join(random.choices(string.digits, k=4))
            username = f"{name}{suffix}"

        user = models.User(
            username=username,
            password=hash_password(password),
            name=name,
            dept=dept,
            role=role,
            grade='member',
            is_first_login=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        created.append({ "username": username, "password": password, "name": name })

    return created

# ==================== 메시지 API ====================

# 메시지 전송
@app.post("/messages/send")
def send_message(msg: MessageCreate, db: Session = Depends(get_db)):
    new_msg = models.Message(
        content=msg.content,
        sender_id=msg.sender_id,
        room_id=msg.room_id,
        is_file=msg.is_file
    )
    db.add(new_msg)
    db.commit()
    db.refresh(new_msg)
    return { "message": "전송 성공", "message_id": new_msg.id }

# 기존 WebSocket 전체 교체
@app.websocket("/ws/{room_id}/{user_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: int, user_id: int):
    db = SessionLocal()
    await manager.connect(websocket, room_id)
    try:
        while True:
            data = await websocket.receive_text()

            # 파일 메시지 여부 확인
            is_file = False
            file_id = None
            try:
                parsed = json.loads(data)
                if parsed.get("type") == "file":
                    is_file = True
                    file_id = parsed.get("file_id")
                    data = parsed.get("file_name", "파일")
            except:
                pass

            new_msg = models.Message(
                content=data,
                sender_id=user_id,
                room_id=room_id,
                is_file=is_file,
                file_id=file_id
            )
            db.add(new_msg)
            db.commit()
            db.refresh(new_msg)

            await manager.broadcast(
                json.dumps({
                    "type": "message",
                    "id": new_msg.id,
                    "content": data,
                    "sender_id": user_id,
                    "created_at": str(new_msg.created_at),
                    "is_read": False,
                    "is_file": is_file,
                    "file_id": file_id
                }),
                room_id
            )
    except WebSocketDisconnect:
        manager.disconnect(websocket, room_id)

# DM 방 찾기 또는 만들기
@app.get("/dm/{user1_id}/{user2_id}")
def get_or_create_dm(user1_id: int, user2_id: int, db: Session = Depends(get_db)):
    # 두 유저 사이의 기존 DM방 찾기
    room = db.query(models.Room).filter(
        models.Room.name == f"dm_{min(user1_id, user2_id)}_{max(user1_id, user2_id)}"
    ).first()
    
    # 없으면 새로 만들기
    if not room:
        room = models.Room(name=f"dm_{min(user1_id, user2_id)}_{max(user1_id, user2_id)}")
        db.add(room)
        db.commit()
        db.refresh(room)
        for uid in [user1_id, user2_id]:
            member = models.RoomMember(room_id=room.id, user_id=uid)
            db.add(member)
        db.commit()
    
    return { "room_id": room.id }

# 채팅방 메시지 불러오기
@app.get("/messages/{room_id}")
def get_messages(room_id: int, db: Session = Depends(get_db)):
    messages = db.query(models.Message).filter(
        models.Message.room_id == room_id
    ).all()
    return [{
        "id": m.id,
        "content": m.content,
        "sender_id": m.sender_id,
        "created_at": m.created_at,
        "is_file": m.is_file,
        "is_read": m.is_read,
        "file_id": m.file_id  # ← 추가
    } for m in messages]

@app.post("/messages/read/{room_id}/{user_id}")
async def mark_as_read(room_id: int, user_id: int, db: Session = Depends(get_db)):
    db.query(models.Message).filter(
        models.Message.room_id == room_id,
        models.Message.sender_id != user_id,
        models.Message.is_read == False
    ).update({"is_read": True})
    db.commit()
    # 읽음 이벤트 실시간 전달
    await manager.broadcast(
        json.dumps({
            "type": "read",
            "room_id": room_id,
            "reader_id": user_id
        }),
        room_id
    )
    return { "message": "읽음 처리 완료" }

@app.get("/messages/shared/{user_id}")
def get_shared_files(user_id: int, db: Session = Depends(get_db)):
    # 내가 속한 방 목록
    my_rooms = db.query(models.RoomMember.room_id).filter(
        models.RoomMember.user_id == user_id
    ).subquery()

    msgs = db.query(models.Message).filter(
        models.Message.is_file == True,
        models.Message.room_id.in_(my_rooms)
    ).order_by(models.Message.created_at.desc()).limit(50).all()

    result = []
    for m in msgs:
        sender = db.query(models.User).filter(models.User.id == m.sender_id).first()
        room = db.query(models.Room).filter(models.Room.id == m.room_id).first()
        f = db.query(models.File).filter(models.File.id == m.file_id).first() if m.file_id else None
        result.append({
            "message_id": m.id,
            "file_id": m.file_id,
            "file_name": m.content,
            "sender": sender.name if sender else "알 수 없음",
            "room_name": room.name if room else "DM",
            "created_at": str(m.created_at)[:10],
            "description": f.description if f else ""
        })
    return result
# ==================== 권한 API =========================

# 역할별 권한 조회
@app.get("/permissions/{role}")
def get_permissions(role: str):
    if role not in ROLE_PERMISSIONS:
        raise HTTPException(status_code=404, detail="역할을 찾을 수 없어요")
    return ROLE_PERMISSIONS[role]

# 특정 권한 확인
@app.get("/permissions/{role}/{permission}")
def check_permission(role: str, permission: str):
    return { "has_permission": has_permission(role, permission) }   

# ====================== 부서 API ========================

class DeptCreate(BaseModel):
    key: str
    name: str

# 부서 생성
@app.post("/departments/create")
def create_department(dept: DeptCreate, db: Session = Depends(get_db)):
    existing = db.query(models.Department).filter(
        models.Department.key == dept.key
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="이미 존재하는 부서 키예요")
    new_dept = models.Department(key=dept.key, name=dept.name)
    db.add(new_dept)
    db.commit()
    db.refresh(new_dept)
    return { "message": "부서 생성 성공", "dept_id": new_dept.id }

# 부서 목록
@app.get("/departments")
def get_departments(db: Session = Depends(get_db)):
    depts = db.query(models.Department).all()
    return [{ "id": d.id, "key": d.key, "name": d.name } for d in depts]

# 부서 이름 변경
@app.put("/departments/{dept_key}")
def update_department(dept_key: str, dept: DeptCreate, db: Session = Depends(get_db)):
    db_dept = db.query(models.Department).filter(
        models.Department.key == dept_key
    ).first()
    if not db_dept:
        raise HTTPException(status_code=404, detail="부서를 찾을 수 없어요")
    db_dept.name = dept.name
    db.commit()
    return { "message": "부서 이름 변경 성공" }

# 부서 특수 권한 추가
@app.post("/departments/{dept_key}/permissions")
def add_dept_permission(dept_key: str, permission: str, db: Session = Depends(get_db)):
    new_perm = models.DeptPermission(dept_key=dept_key, permission=permission)
    db.add(new_perm)
    db.commit()
    return { "message": "특수 권한 추가 성공" }

# 부서 특수 권한 조회
@app.get("/departments/{dept_key}/permissions")
def get_dept_permissions(dept_key: str, db: Session = Depends(get_db)):
    perms = db.query(models.DeptPermission).filter(
        models.DeptPermission.dept_key == dept_key
    ).all()
    return [{ "permission": p.permission, "enabled": p.enabled } for p in perms]


# =================== 역할 API ==========================

class RoleConfigUpdate(BaseModel):
    display_name: str

# 역할 설정 초기화 (처음 한 번만 실행)
@app.post("/roles/init")
def init_roles(db: Session = Depends(get_db)):
    defaults = {
        "super_admin": "최고 관리자",
        "admin": "관리자",
        "manager": "부서 관리자",
        "member": "일반 직원",
        "guest": "외부 협력사"
    }
    for key, name in defaults.items():
        existing = db.query(models.RoleConfig).filter(
            models.RoleConfig.role_key == key
        ).first()
        if not existing:
            db.add(models.RoleConfig(role_key=key, display_name=name))
    db.commit()
    return { "message": "역할 설정 초기화 완료" }

# 역할 설정 조회
@app.get("/roles")
def get_roles(db: Session = Depends(get_db)):
    roles = db.query(models.RoleConfig).all()
    return [{ "role_key": r.role_key, "display_name": r.display_name } for r in roles]

# 역할 표시 이름 변경
@app.put("/roles/{role_key}")
def update_role(role_key: str, data: RoleConfigUpdate, db: Session = Depends(get_db)):
    role = db.query(models.RoleConfig).filter(
        models.RoleConfig.role_key == role_key
    ).first()
    if not role:
        raise HTTPException(status_code=404, detail="역할을 찾을 수 없어요")
    if role_key == "guest":
        raise HTTPException(status_code=400, detail="게스트 역할은 변경할 수 없어요")
    role.display_name = display_name=data.display_name
    db.commit()
    return { "message": "역할 이름 변경 성공" }

# 부서 삭제
@app.delete("/departments/{dept_key}")
def delete_department(dept_key: str, db: Session = Depends(get_db)):
    dept = db.query(models.Department).filter(
        models.Department.key == dept_key
    ).first()
    if not dept:
        raise HTTPException(status_code=404, detail="부서를 찾을 수 없어요")
    db.delete(dept)
    db.commit()
    return { "message": "부서 삭제 완료" }

# ===================== 직책 API ===========================

class JobTitleCreate(BaseModel):
    title: str
    role: str

# 직책 생성
@app.post("/jobtitles/create")
def create_jobtitle(data: JobTitleCreate, db: Session = Depends(get_db)):
    new_title = models.JobTitle(
        title=data.title,
        role=data.role
    )
    db.add(new_title)
    db.commit()
    db.refresh(new_title)
    return { "message": "직책 생성 성공", "id": new_title.id }

# 직책 목록 (부서별)
@app.get("/jobtitles")
def get_jobtitles(db: Session = Depends(get_db)):
    titles = db.query(models.JobTitle).all()
    return [{ "id": t.id, "title": t.title, "role": t.role } for t in titles]

# 직책 삭제
@app.delete("/jobtitles/{title_id}")
def delete_jobtitle(title_id: int, db: Session = Depends(get_db)):
    title = db.query(models.JobTitle).filter(
        models.JobTitle.id == title_id
    ).first()
    if not title:
        raise HTTPException(status_code=404, detail="직책을 찾을 수 없어요")
    db.delete(title)
    db.commit()
    return { "message": "직책 삭제 완료" }

# =================== 공지사항 API ======================

class AnnouncementCreate(BaseModel):
    title: str
    content: str
    author_id: int
    is_urgent: bool = False
    urgent_days: int = 1

# 공지 생성
@app.post("/announcements/create")
def create_announcement(data: AnnouncementCreate, db: Session = Depends(get_db)):
    author = db.query(models.User).filter(models.User.id == data.author_id).first()
    if not author or author.grade not in ['manager', 'admin', 'super_admin']:
        raise HTTPException(status_code=403, detail="공지 작성 권한이 없어요")
    urgent_until = None
    if data.is_urgent:
        from datetime import timedelta
        urgent_until = datetime.now() + timedelta(days=data.urgent_days)
    new_ann = models.Announcement(
        title=data.title,
        content=data.content,
        author_id=data.author_id,
        is_urgent=data.is_urgent,
        was_urgent=data.is_urgent,
        urgent_until=urgent_until
    )
    db.add(new_ann)
    db.commit()
    db.refresh(new_ann)
    return { "message": "공지 생성 완료", "id": new_ann.id }

# 공지 목록
@app.get("/announcements")
def get_announcements(limit: int = 50, db: Session = Depends(get_db)):
    anns = db.query(models.Announcement).order_by(
        models.Announcement.created_at.desc()
    ).limit(limit).all()
    result = []
    for a in anns:
        # 긴급 공지 만료 체크
        if a.is_urgent and a.urgent_until and datetime.now() > a.urgent_until:
            a.is_urgent = False
            db.commit()
        author = db.query(models.User).filter(models.User.id == a.author_id).first()
        reactions = db.query(models.AnnouncementReaction).filter(
            models.AnnouncementReaction.announcement_id == a.id
        ).all()
        reaction_counts = {}
        for r in reactions:
            reaction_counts[r.reaction] = reaction_counts.get(r.reaction, 0) + 1
        result.append({
            "id": a.id,
            "title": a.title,
            "content": a.content,
            "author": author.name if author else "알 수 없음",
            "is_urgent": a.is_urgent,
            "was_urgent": a.was_urgent,
            "created_at": str(a.created_at)[:10],
            "reactions": reaction_counts
        })
    return result

# 공감 추가/취소
@app.post("/announcements/{ann_id}/react")
def react_announcement(ann_id: int, user_id: int, reaction: str, db: Session = Depends(get_db)):
    # 같은 공감 클릭 시 취소
    existing = db.query(models.AnnouncementReaction).filter(
        models.AnnouncementReaction.announcement_id == ann_id,
        models.AnnouncementReaction.user_id == user_id,
        models.AnnouncementReaction.reaction == reaction
    ).first()
    if existing:
        db.delete(existing)
        db.commit()
        return { "message": "공감 취소" }
    # 기존 다른 공감 삭제
    db.query(models.AnnouncementReaction).filter(
        models.AnnouncementReaction.announcement_id == ann_id,
        models.AnnouncementReaction.user_id == user_id
    ).delete()
    # 새 공감 추가
    new_reaction = models.AnnouncementReaction(
        announcement_id=ann_id,
        user_id=user_id,
        reaction=reaction
    )
    db.add(new_reaction)
    db.commit()
    return { "message": "공감 추가" }

# 공지 삭제
@app.delete("/announcements/{ann_id}")
def delete_announcement(ann_id: int, db: Session = Depends(get_db)):
    ann = db.query(models.Announcement).filter(models.Announcement.id == ann_id).first()
    if not ann:
        raise HTTPException(status_code=404, detail="공지를 찾을 수 없어요")
    db.delete(ann)
    db.commit()
    return { "message": "공지 삭제 완료" }

# ===================== 메모 API =========================

class MemoCreate(BaseModel):
    user_id: int
    title: str = ""
    content: str = ""
    color: str = "#FAEEDA"

class MemoUpdate(BaseModel):
    title: str = ""
    content: str = ""
    color: str = "#FAEEDA"

# 메모 목록
@app.get("/memos/{user_id}")
def get_memos(user_id: int, db: Session = Depends(get_db)):
    memos = db.query(models.Memo).filter(
        models.Memo.user_id == user_id
    ).order_by(models.Memo.updated_at.desc()).all()
    return [{ "id": m.id, "title": m.title, "content": m.content, "color": m.color, "updated_at": str(m.updated_at)[:16] } for m in memos]

# 메모 생성
@app.post("/memos/create")
def create_memo(data: MemoCreate, db: Session = Depends(get_db)):
    new_memo = models.Memo(
        user_id=data.user_id,
        title=data.title,
        content=data.content,
        color=data.color
    )
    db.add(new_memo)
    db.commit()
    db.refresh(new_memo)
    return { "message": "메모 생성 완료", "id": new_memo.id }

# 메모 수정
@app.put("/memos/{memo_id}")
def update_memo(memo_id: int, data: MemoUpdate, db: Session = Depends(get_db)):
    memo = db.query(models.Memo).filter(models.Memo.id == memo_id).first()
    if not memo:
        raise HTTPException(status_code=404, detail="메모를 찾을 수 없어요")
    memo.title = data.title
    memo.content = data.content
    memo.color = data.color
    memo.updated_at = datetime.now()
    db.commit()
    return { "message": "메모 수정 완료" }

# 메모 삭제
@app.delete("/memos/{memo_id}")
def delete_memo(memo_id: int, db: Session = Depends(get_db)):
    memo = db.query(models.Memo).filter(models.Memo.id == memo_id).first()
    if not memo:
        raise HTTPException(status_code=404, detail="메모를 찾을 수 없어요")
    db.delete(memo)
    db.commit()
    return { "message": "메모 삭제 완료" }

# ── 태그 ──────────────────────────────────────
@app.get("/schedule-tags/{user_id}")
def get_tags(user_id: int, db: Session = Depends(get_db)):
    return db.query(models.ScheduleTag).filter(models.ScheduleTag.user_id == user_id).all()

@app.post("/schedule-tags")
def create_tag(data: dict, db: Session = Depends(get_db)):
    tag = models.ScheduleTag(user_id=data["user_id"], name=data["name"], color=data.get("color", "#534AB7"))
    db.add(tag); db.commit(); db.refresh(tag)
    return tag

@app.delete("/schedule-tags/{tag_id}")
def delete_tag(tag_id: int, db: Session = Depends(get_db)):
    db.query(models.ScheduleTag).filter(models.ScheduleTag.id == tag_id).delete()
    db.commit()
    return {"ok": True}

# ── 일정 ──────────────────────────────────────
@app.get("/schedules/{user_id}")
def get_schedules(user_id: int, db: Session = Depends(get_db)):
    return db.query(models.Schedule).filter(models.Schedule.user_id == user_id).all()

@app.post("/schedules")
def create_schedule(data: dict, db: Session = Depends(get_db)):
    s = models.Schedule(
        user_id=data["user_id"], title=data["title"],
        date=data["date"], time=data.get("time"),
        memo=data.get("memo", ""), tag_id=data.get("tag_id")
    )
    db.add(s); db.commit(); db.refresh(s)
    return s

@app.put("/schedules/{schedule_id}")
def update_schedule(schedule_id: int, data: dict, db: Session = Depends(get_db)):
    s = db.query(models.Schedule).filter(models.Schedule.id == schedule_id).first()
    if not s: raise HTTPException(404)
    for k, v in data.items(): setattr(s, k, v)
    db.commit(); db.refresh(s)
    return s

@app.post("/schedules/{schedule_id}/done")
def toggle_done(schedule_id: int, db: Session = Depends(get_db)):
    s = db.query(models.Schedule).filter(models.Schedule.id == schedule_id).first()
    if not s: raise HTTPException(404)
    s.is_done = not s.is_done
    db.commit()
    return {"is_done": s.is_done}

@app.delete("/schedules/{schedule_id}")
def delete_schedule(schedule_id: int, db: Session = Depends(get_db)):
    db.query(models.Schedule).filter(models.Schedule.id == schedule_id).delete()
    db.commit()
    return {"ok": True}

# =================== 즐겨찾기 API =========================

@app.get("/favorites/{user_id}")
def get_favorites(user_id: int, db: Session = Depends(get_db)):
    return db.query(models.Favorite).filter(models.Favorite.user_id == user_id).all()

@app.post("/favorites")
def add_favorite(data: dict, db: Session = Depends(get_db)):
    existing = db.query(models.Favorite).filter(
        models.Favorite.user_id == data["user_id"],
        models.Favorite.type == data["type"],
        models.Favorite.target_id == data.get("target_id"),
        models.Favorite.target_name == data.get("target_name")
    ).first()
    if existing:
        return existing
    fav = models.Favorite(
        user_id=data["user_id"],
        type=data["type"],
        target_id=data.get("target_id"),
        target_name=data.get("target_name")
    )
    db.add(fav); db.commit(); db.refresh(fav)
    return fav

@app.delete("/favorites/{favorite_id}")
def remove_favorite(favorite_id: int, db: Session = Depends(get_db)):
    db.query(models.Favorite).filter(models.Favorite.id == favorite_id).delete()
    db.commit()
    return {"ok": True}

@app.delete("/favorites")
def remove_favorite_by_target(data: dict, db: Session = Depends(get_db)):
    db.query(models.Favorite).filter(
        models.Favorite.user_id == data["user_id"],
        models.Favorite.type == data["type"],
        models.Favorite.target_id == data.get("target_id"),
        models.Favorite.target_name == data.get("target_name")
    ).delete()
    db.commit()
    return {"ok": True}

# ==================== 파일 API ====================

# 업로드 폴더 생성 및 정적 파일 서빙
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

def calc_md5(file_bytes: bytes) -> str:
    return hashlib.md5(file_bytes).hexdigest()

# 파일 업로드
@app.post("/files/upload")
async def upload_file(
    file: UploadFile = FastAPIFile(...),
    uploader_id: int = Form(0),
    description: str = Form(""),
    custom_name: str = Form(""),
    db: Session = Depends(get_db)
):
    if not description.strip():
        raise HTTPException(status_code=400, detail="설명을 입력해주세요")
    
    print(f"[업로드 디버그] file={file.filename}, desc='{description}', name='{custom_name}'")

    file_bytes = await file.read()
    file_hash = calc_md5(file_bytes)

    # 중복 파일 체크
    existing = db.query(models.File).filter(
        models.File.file_hash == file_hash,
        models.File.is_deleted == False
    ).first()
    if existing:
        return {
            "duplicate": True,
            "message": "이미 서버에 존재하는 파일이에요",
            "file_id": existing.id,
            "original_name": existing.original_name
        }

    # 업로더 부서 조회
    uploader = db.query(models.User).filter(models.User.id == uploader_id).first()
    dept = uploader.dept if uploader else ""

    # UUID 파일명으로 저장
    ext = os.path.splitext(file.filename)[-1].lower()
    file_id = str(uuid.uuid4())
    stored_name = f"{file_id}{ext}"
    save_path = os.path.join(UPLOAD_DIR, stored_name)

    with open(save_path, "wb") as f:
        f.write(file_bytes)

    # files 테이블 저장
    new_file = models.File(
        id=file_id,
        original_name=custom_name.strip() or file.filename,
        description=description.strip(),
        stored_name=stored_name,
        file_hash=file_hash,
        folder_code="99",   # 분류 AI 연동 전까지 기본값
        uploader_id=uploader_id,
        dept=dept,
        version=1
    )
    db.add(new_file)
    db.flush()
    # 분류 AI 실행
    folder_code = "99"
    try:
        if _embedder_data["embedder"] is not None:
            text = extract_text(Path(save_path))
            result = classify(
                text=text,
                filename=file.filename,
                embedder=_embedder_data["embedder"],
                folder_vecs=_embedder_data["folder_vecs"],
                folder_codes=_embedder_data["folder_codes"],
                llm_client=_llm_client,
                use_llm=True,
            )
            folder_code = result["folder_code"]
            print(f"[분류] {file.filename} → {folder_code} ({result['method']}, {result['confidence']:.2f})")
    except Exception as e:
        print(f"[분류 오류] {e}")
    new_file.folder_code = folder_code
    # 자동 태그 (HDBSCAN)
    auto_tag = None
    try:
        if _embedder_data["embedder"] is not None:
            text_for_tag = text if 'text' in locals() else ""
            auto_tag = assign_tag(file.filename, text_for_tag, _embedder_data["embedder"])
    except Exception as e:
        print(f"[태그 오류] {e}")

    # 자동 태그 부착 (부서, 날짜, 미분류)
    folder_tag = FOLDER_NAMES.get(folder_code, "미분류") if folder_code != "99" else "미분류"
    auto_tags = [
        models.FileTag(file_id=file_id, tag=dept, tag_type="dept"),
        models.FileTag(file_id=file_id, tag=datetime.now().strftime("%Y-%m"), tag_type="date"),
        models.FileTag(file_id=file_id, tag=folder_tag, tag_type="folder"),
    ]
    if auto_tag:
        auto_tags.append(models.FileTag(file_id=file_id, tag=auto_tag, tag_type="auto"))
    for t in auto_tags:
        db.add(t)

    # user_files 바로가기 생성 (업로더 워크스페이스 미분류 패널)
    user_file = models.UserFile(
        user_id=uploader_id,
        file_id=file_id,
        folder_id=None,
        custom_name=custom_name.strip() or None,
        is_classified=False
    )
    db.add(user_file)
    db.commit()

    return {
        "duplicate": False,
        "message": "업로드 완료",
        "file_id": file_id
    }

# 서버 저장소 파일 목록
@app.get("/files")
def get_files(tag: str = None, db: Session = Depends(get_db)):
    query = db.query(models.File).filter(models.File.is_deleted == False)
    
    if tag:
        tagged_ids = db.query(models.FileTag.file_id).filter(
            models.FileTag.tag == tag
        ).subquery()
        query = query.filter(models.File.id.in_(tagged_ids))

    files = query.order_by(models.File.created_at.desc()).all()
    result = []
    for f in files:
        uploader = db.query(models.User).filter(models.User.id == f.uploader_id).first()
        tags = db.query(models.FileTag).filter(models.FileTag.file_id == f.id).all()
        result.append({
            "id": f.id,
            "original_name": f.original_name,
            "description": f.description,
            "stored_name": f.stored_name,
            "folder_code": f.folder_code,
            "uploader": uploader.name if uploader else "알 수 없음",
            "uploader_id": f.uploader_id,
            "dept": f.dept,
            "version": f.version,
            "created_at": str(f.created_at)[:10],
            "tags": [{"tag": t.tag, "type": t.tag_type} for t in tags]
        })
    return result

# 파일 다운로드
@app.get("/files/download/{file_id}")
def download_file(file_id: str, db: Session = Depends(get_db)):
    f = db.query(models.File).filter(models.File.id == file_id).first()
    if not f or f.is_deleted:
        raise HTTPException(status_code=404, detail="파일을 찾을 수 없어요")
    file_path = os.path.join(UPLOAD_DIR, f.stored_name)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="서버에 파일이 없어요")
    return FileResponse(path=file_path, filename=f.original_name)

# 파일 버전 히스토리 조회
@app.get("/files/{file_id}/versions")
def get_file_versions(file_id: str, db: Session = Depends(get_db)):
    versions = db.query(models.FileVersion).filter(
        models.FileVersion.file_id == file_id
    ).order_by(models.FileVersion.version.desc()).all()
    result = []
    for v in versions:
        uploader = db.query(models.User).filter(models.User.id == v.uploader_id).first()
        result.append({
            "version": v.version,
            "uploader": uploader.name if uploader else "알 수 없음",
            "created_at": str(v.created_at)[:10],
            "stored_name": v.stored_name
        })
    return result

# 파일 휴지통 이동 (누구나)
@app.delete("/files/{file_id}/trash")
def trash_file(file_id: str, db: Session = Depends(get_db)):
    f = db.query(models.File).filter(models.File.id == file_id).first()
    if not f:
        raise HTTPException(status_code=404, detail="파일을 찾을 수 없어요")
    f.is_deleted = True
    db.commit()
    return {"message": "휴지통으로 이동했어요"}

# 파일 실제 삭제 (관리자 이상)
@app.delete("/files/{file_id}/permanent")
def delete_file_permanent(file_id: str, grade: str, db: Session = Depends(get_db)):
    if grade not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="권한이 없어요")
    f = db.query(models.File).filter(models.File.id == file_id).first()
    if not f:
        raise HTTPException(status_code=404, detail="파일을 찾을 수 없어요")
    file_path = os.path.join(UPLOAD_DIR, f.stored_name)
    if os.path.exists(file_path):
        os.remove(file_path)
    db.query(models.FileTag).filter(models.FileTag.file_id == file_id).delete()
    db.query(models.UserFile).filter(models.UserFile.file_id == file_id).delete()
    db.delete(f)
    db.commit()
    return {"message": "파일이 완전히 삭제됐어요"}


# ── 워크스페이스 바로가기 API ──────────────────────

# 내 미분류 파일 목록
@app.get("/user-files/{user_id}")
def get_user_files(user_id: int, db: Session = Depends(get_db)):
    user_files = db.query(models.UserFile).filter(
        models.UserFile.user_id == user_id,
        models.UserFile.is_deleted == False
    ).all()
    result = []
    for uf in user_files:
        f = db.query(models.File).filter(
            models.File.id == uf.file_id,
            models.File.is_deleted == False
        ).first()
        if not f:
            continue
        tags = db.query(models.FileTag).filter(models.FileTag.file_id == f.id).all()
        result.append({
            "user_file_id": uf.id,
            "file_id": f.id,
            "display_name": uf.custom_name or f.original_name,
            "description": f.description,
            "folder_id": uf.folder_id,
            "is_classified": uf.is_classified,
            "folder_code": f.folder_code,
            "created_at": str(f.created_at)[:10],
            "is_home": uf.is_home,
            "tags": [{"tag": t.tag, "type": t.tag_type} for t in tags]
        })
    return result

# 워크스페이스에 파일 추가 (다른 사람 파일 바로가기)
@app.post("/user-files")
def add_user_file(data: dict, db: Session = Depends(get_db)):
    existing = db.query(models.UserFile).filter(
        models.UserFile.user_id == data["user_id"],
        models.UserFile.file_id == data["file_id"],
        models.UserFile.is_deleted == False
    ).first()
    if existing:
        return {"message": "이미 워크스페이스에 있어요", "user_file_id": existing.id}
    uf = models.UserFile(
        user_id=data["user_id"],
        file_id=data["file_id"],
        folder_id=data.get("folder_id"),
        custom_name=data.get("custom_name")
    )
    db.add(uf); db.commit(); db.refresh(uf)
    return {"message": "워크스페이스에 추가됐어요", "user_file_id": uf.id}

# 폴더 이동 (분류)
@app.put("/user-files/{user_file_id}/move")
def move_user_file(user_file_id: int, data: dict, db: Session = Depends(get_db)):
    uf = db.query(models.UserFile).filter(models.UserFile.id == user_file_id).first()
    if not uf:
        raise HTTPException(status_code=404, detail="찾을 수 없어요")
    uf.folder_id = data.get("folder_id")
    uf.is_classified = data.get("folder_id") is not None or data.get("is_home", False)
    uf.is_home = data.get("is_home", False)
    if "is_deleted" in data:
        uf.is_deleted = data["is_deleted"]
    db.commit()
    return {"message": "이동 완료"}

# 서버 휴지통 목록
@app.get("/files/trash")
def get_trash(grade: str, db: Session = Depends(get_db)):
    if grade not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="권한이 없어요")
    files = db.query(models.File).filter(models.File.is_deleted == True).all()
    result = []
    for f in files:
        uploader = db.query(models.User).filter(models.User.id == f.uploader_id).first()
        result.append({
            "id": f.id,
            "original_name": f.original_name,
            "description": f.description,
            "uploader": uploader.name if uploader else "알 수 없음",
            "dept": f.dept,
            "created_at": str(f.created_at)[:10]
        })
    return result

# 서버 휴지통 복원
@app.post("/files/{file_id}/restore")
def restore_file(file_id: str, db: Session = Depends(get_db)):
    f = db.query(models.File).filter(models.File.id == file_id).first()
    if not f:
        raise HTTPException(status_code=404, detail="파일을 찾을 수 없어요")
    f.is_deleted = False
    db.commit()
    return {"message": "복원 완료"}

# 내 폴더 휴지통 목록
@app.get("/user-files/{user_id}/trash")
def get_user_trash(user_id: int, db: Session = Depends(get_db)):
    user_files = db.query(models.UserFile).filter(
        models.UserFile.user_id == user_id,
        models.UserFile.is_deleted == True
    ).all()
    result = []
    for uf in user_files:
        f = db.query(models.File).filter(models.File.id == uf.file_id).first()
        if not f: continue
        result.append({
            "user_file_id": uf.id,
            "file_id": f.id,
            "display_name": uf.custom_name or f.original_name,
            "description": f.description,
            "created_at": str(f.created_at)[:10]
        })
    return result

# 내 폴더 휴지통 복원
@app.post("/user-files/{user_file_id}/restore")
def restore_user_file(user_file_id: int, db: Session = Depends(get_db)):
    uf = db.query(models.UserFile).filter(models.UserFile.id == user_file_id).first()
    if not uf:
        raise HTTPException(status_code=404, detail="찾을 수 없어요")
    uf.is_deleted = False
    uf.folder_id = None
    uf.is_classified = False
    db.commit()
    return {"message": "복원 완료"}

# ==================== 폴더 API ====================

# 내 폴더 목록 (전체, 트리 재구성은 프론트에서)
@app.get("/folders/{user_id}")
def get_folders(user_id: int, db: Session = Depends(get_db)):
    folders = db.query(models.Folder).filter(
        models.Folder.user_id == user_id
    ).order_by(models.Folder.created_at).all()
    return [{"id": f.id, "name": f.name, "parent_id": f.parent_id, "memo": f.memo} for f in folders]

# 폴더 생성
@app.post("/folders")
def create_folder(data: dict, db: Session = Depends(get_db)):
    folder = models.Folder(
        user_id=data["user_id"],
        name=data["name"],
        parent_id=data.get("parent_id")
    )
    db.add(folder); db.commit(); db.refresh(folder)
    return {"id": folder.id, "name": folder.name, "parent_id": folder.parent_id, "memo": folder.memo}

# 폴더 수정 (이름/메모)
@app.put("/folders/{folder_id}")
def update_folder(folder_id: int, data: dict, db: Session = Depends(get_db)):
    folder = db.query(models.Folder).filter(models.Folder.id == folder_id).first()
    if not folder: raise HTTPException(404)
    if "name" in data: folder.name = data["name"]
    if "memo" in data: folder.memo = data["memo"]
    if "parent_id" in data: folder.parent_id = data["parent_id"]
    db.commit()
    return {"ok": True}

# 폴더 삭제 (하위 폴더/파일은 미분류로 이동)
@app.delete("/folders/{folder_id}")
def delete_folder(folder_id: int, db: Session = Depends(get_db)):
    # 하위 폴더 루트로 이동
    db.query(models.Folder).filter(models.Folder.parent_id == folder_id).update({"parent_id": None})
    # 해당 폴더 파일 미분류로
    db.query(models.UserFile).filter(models.UserFile.folder_id == folder_id).update({"folder_id": None, "is_classified": False})
    db.query(models.Folder).filter(models.Folder.id == folder_id).delete()
    db.commit()
    return {"ok": True}

# 초기 클러스터링 실행 (관리자 전용)
@app.post("/files/clustering")
async def run_clustering(grade: str, db: Session = Depends(get_db)):
    if grade not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="권한이 없어요")
    if _embedder_data["embedder"] is None:
        raise HTTPException(status_code=503, detail="임베딩 모델이 로딩되지 않았어요")

    files = db.query(models.File).filter(models.File.is_deleted == False).all()
    if len(files) < 5:
        raise HTTPException(status_code=400, detail=f"파일이 최소 5개 필요해요 (현재 {len(files)}개)")

    file_data = []
    for f in files:
        file_path = Path(UPLOAD_DIR) / f.stored_name
        try:
            text = extract_text(file_path) or ""
        except:
            text = ""
        file_data.append({"filename": f.original_name, "text": text})

    try:
        result = run_initial_clustering(file_data, _embedder_data["embedder"])
        clusters_out = []
        for cid, info in result["clusters"].items():
            clusters_out.append({
                "cluster_id": cid,
                "keywords": info["keywords"],
                "files": info["files"][:5],
                "file_count": len(info["files"]),
                "tag_name": info["tag_name"]
            })
        return {"clusters": clusters_out}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.put("/files/{file_id}/classify")
def classify_file(file_id: str, data: dict, db: Session = Depends(get_db)):
    f = db.query(models.File).filter(models.File.id == file_id).first()
    if not f:
        raise HTTPException(status_code=404, detail="파일을 찾을 수 없어요")
    f.folder_code = data.get("folder_code", "99")
    db.commit()
    return {"message": "분류 완료"}

# 태그 이름 설정 (관리자 전용)
@app.post("/files/clustering/tag-name")
def update_tag_name(data: dict, db: Session = Depends(get_db)):
    if data.get("grade") not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="권한이 없어요")
    set_tag_name(data["cluster_id"], data["tag_name"])
    return {"message": "태그 이름 설정 완료"}

@app.get("/files/clustering")
def get_clustering(grade: str, db: Session = Depends(get_db)):
    if grade not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="권한이 없어요")
    data = load_cluster_data()
    if not data:
        return {"clusters": []}
    clusters_out = []
    for cid, info in data["clusters"].items():
        clusters_out.append({
            "cluster_id": cid,
            "keywords": info["keywords"],
            "files": info["files"][:5],
            "file_count": len(info["files"]),
            "tag_name": info["tag_name"]
        })
    return {"clusters": clusters_out}

# ===================== 프로필 사진 API ==========================

PROFILE_PIC_DIR = "profile_pics"
os.makedirs(PROFILE_PIC_DIR, exist_ok=True)
app.mount("/profile_pics", StaticFiles(directory=PROFILE_PIC_DIR), name="profile_pics")

@app.post("/users/profile-picture/{user_id}")
async def upload_profile_picture(user_id: int, file: UploadFile = FastAPIFile(...), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="유저를 찾을 수 없어요")
    ext = file.filename.split('.')[-1].lower()
    if ext not in ['jpg', 'jpeg', 'png', 'gif', 'webp']:
        raise HTTPException(status_code=400, detail="이미지 파일만 업로드 가능해요")
    filename = f"{uuid.uuid4()}.{ext}"
    filepath = os.path.join(PROFILE_PIC_DIR, filename)
    with open(filepath, "wb") as f:
        f.write(await file.read())
    if user.profile_picture:
        old_path = os.path.join(PROFILE_PIC_DIR, user.profile_picture)
        if os.path.exists(old_path):
            os.remove(old_path)
    user.profile_picture = filename
    db.commit()
    return {"profile_picture": filename}

# ==================== 서버 실행 확인 ====================

@app.get("/")
def root():
    return { "message": "FileSync 서버 실행 중 ✅" }