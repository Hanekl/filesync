from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# SQLite DB 파일 위치 설정
SQLALCHEMY_DATABASE_URL = "sqlite:///./filesync.db"

# DB 엔진 생성
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False}
)

# DB 세션 설정
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 모델의 기본 클래스
Base = declarative_base()

# DB 연결 함수
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()