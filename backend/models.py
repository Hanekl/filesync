from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

# 유저 테이블
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)  # 아이디
    password = Column(String)                            # 비밀번호
    name = Column(String)                                # 이름
    dept = Column(String)                                # 부서
    role = Column(String)                                # 직책
    grade = Column(String, default="member")             # 권한
    is_active = Column(Boolean, default=True)            # 활성 여부
    is_first_login = Column(Boolean, default=True)
    status = Column(String, default="offline")
    last_active = Column(DateTime, default=datetime.now)
    phone = Column(String, default="")
    email = Column(String, default="")

    # 관계 설정
    messages = relationship("Message", back_populates="sender")

# 협업방 테이블
class Room(Base):
    __tablename__ = "rooms"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)                                # 방 이름
    created_by = Column(Integer, ForeignKey("users.id")) # 만든 사람
    created_at = Column(DateTime, default=datetime.now)  # 만든 시간

    # 관계 설정
    messages = relationship("Message", back_populates="room")
    members = relationship("RoomMember", back_populates="room")

# 협업방 멤버 테이블
class RoomMember(Base):
    __tablename__ = "room_members"

    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(Integer, ForeignKey("rooms.id"))    # 방 ID
    user_id = Column(Integer, ForeignKey("users.id"))    # 유저 ID
    joined_at = Column(DateTime, default=datetime.now)   # 참여 시간

    # 관계 설정
    room = relationship("Room", back_populates="members")

# 메시지 테이블
class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    content = Column(String)                              # 메시지 내용
    sender_id = Column(Integer, ForeignKey("users.id"))  # 보낸 사람
    room_id = Column(Integer, ForeignKey("rooms.id"))    # 채팅방 ID
    created_at = Column(DateTime, default=datetime.now)  # 보낸 시간
    is_file = Column(Boolean, default=False)             # 파일 여부
    is_read = Column(Boolean, default=False)             # 읽음 여부

    # 관계 설정
    sender = relationship("User", back_populates="messages")
    room = relationship("Room", back_populates="messages")
    file_id = Column(String, ForeignKey("files.id"), nullable=True) 

    # 부서 테이블
class Department(Base):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, unique=True, index=True)   # 내부 키 (변경 불가)
    name = Column(String)                            # 표시 이름 (변경 가능)
    created_at = Column(DateTime, default=datetime.now)

# 부서 특수 권한 테이블
class DeptPermission(Base):
    __tablename__ = "dept_permissions"

    id = Column(Integer, primary_key=True, index=True)
    dept_key = Column(String, ForeignKey("departments.key"))
    permission = Column(String)   # 권한 이름
    enabled = Column(Boolean, default=True)

    # 역할 설정 테이블
class RoleConfig(Base):
    __tablename__ = "role_configs"

    id = Column(Integer, primary_key=True, index=True)
    role_key = Column(String, unique=True, index=True)
    display_name = Column(String)

    # 직책 테이블
class JobTitle(Base):
    __tablename__ = "job_titles"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)          # 직책 이름
    role = Column(String)           # 연결된 역할 (grade)
    created_at = Column(DateTime, default=datetime.now)

        # 공지사항 테이블
class Announcement(Base):
    __tablename__ = "announcements"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    content = Column(String)
    author_id = Column(Integer, ForeignKey("users.id"))
    is_urgent = Column(Boolean, default=False)
    was_urgent = Column(Boolean, default=False)
    urgent_until = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.now)

        # 공지사항 이모티콘 
class AnnouncementReaction(Base):
    __tablename__ = "announcement_reactions"

    id = Column(Integer, primary_key=True, index=True)
    announcement_id = Column(Integer, ForeignKey("announcements.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    reaction = Column(String)

    # 메모 테이블
class Memo(Base):
    __tablename__ = "memos"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    title = Column(String, default="")
    content = Column(String, default="")
    color = Column(String, default="#FAEEDA")
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now)

class ScheduleTag(Base):
    __tablename__ = "schedule_tags"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String)
    color = Column(String, default="#534AB7")
    created_at = Column(DateTime, default=datetime.now)

class Schedule(Base):
    __tablename__ = "schedules"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    title = Column(String)
    date = Column(String)       # YYYY-MM-DD
    time = Column(String, nullable=True)  # HH:MM
    memo = Column(String, default="")
    tag_id = Column(Integer, ForeignKey("schedule_tags.id"), nullable=True)
    is_done = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.now)    

class Favorite(Base):
    __tablename__ = "favorites"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    type = Column(String)        # 'user', 'room', 'dept'
    target_id = Column(Integer, nullable=True)    # user/room id
    target_name = Column(String, nullable=True)   # dept 이름
    created_at = Column(DateTime, default=datetime.now)    

# 파일 테이블 (서버에 실제 저장된 파일)
class File(Base):
    __tablename__ = "files"

    id = Column(String, primary_key=True, index=True)        # UUID
    original_name = Column(String)                           # 사용자 입력 파일명
    description = Column(String)                             # 설명 (필수)
    stored_name = Column(String)                             # 서버 저장 파일명 (UUID.확장자)
    file_hash = Column(String, unique=True, index=True)      # MD5 중복 감지
    folder_code = Column(String, default="99")               # 분류 코드
    uploader_id = Column(Integer, ForeignKey("users.id"))    # 업로더
    dept = Column(String)                                    # 업로더 부서 (태그용)
    version = Column(Integer, default=1)                     # 버전 번호
    parent_id = Column(String, ForeignKey("files.id"), nullable=True)  # 원본 파일 ID
    is_deleted = Column(Boolean, default=False)              # 휴지통 여부
    created_at = Column(DateTime, default=datetime.now)


# 워크스페이스 바로가기 테이블
class UserFile(Base):
    __tablename__ = "user_files"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    file_id = Column(String, ForeignKey("files.id"))
    folder_id = Column(Integer, nullable=True)               # null = 미분류
    custom_name = Column(String, nullable=True)              # 사용자 저장 이름
    is_classified = Column(Boolean, default=False)           # 분류 완료 여부
    is_deleted = Column(Boolean, default=False)              # 워크스페이스 휴지통
    is_home = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.now)


# 파일 태그 테이블
class FileTag(Base):
    __tablename__ = "file_tags"

    id = Column(Integer, primary_key=True, index=True)
    file_id = Column(String, ForeignKey("files.id"))
    tag = Column(String)                                     # 태그 값
    tag_type = Column(String)                                # 'dept', 'folder', 'date', 'auto', 'manual'


# 파일 버전 히스토리 테이블
class FileVersion(Base):
    __tablename__ = "file_versions"

    id = Column(Integer, primary_key=True, index=True)
    file_id = Column(String, ForeignKey("files.id"))         # 현재 최신 파일 ID
    version = Column(Integer)                                # 버전 번호
    stored_name = Column(String)                             # 해당 버전 서버 파일명
    uploader_id = Column(Integer, ForeignKey("users.id"))    # 업로더
    created_at = Column(DateTime, default=datetime.now)

# 폴더 테이블 (워크스페이스 내 폴더)
class Folder(Base):
    __tablename__ = "folders"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String)
    parent_id = Column(Integer, ForeignKey("folders.id"), nullable=True)  # null = 루트
    memo = Column(String, default="")
    created_at = Column(DateTime, default=datetime.now)