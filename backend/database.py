import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from dotenv import load_dotenv

# Load .env from workspace root directory
root_env = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env')
load_dotenv(root_env)

# Get DATABASE_URL from environment
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    # Fallback to local SQLite if DATABASE_URL is not set for local testing
    DATABASE_URL = "sqlite:///./aligo_c2_fallback.db"

# Create SQLAlchemy engine
# pool_pre_ping=True validates connection health before checkout, essential for Neon serverless timeouts
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True
)

# Configure Session local instance
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Declarative Base for models
Base = declarative_base()

def get_db():
    """Dependency generator to retrieve database sessions with automatic closure."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
