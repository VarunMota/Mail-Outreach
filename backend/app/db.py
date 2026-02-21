from sqlalchemy import create_engine, text, inspect
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from .config import settings
from .utils.logging import logger

engine = create_engine(
    settings.SQLALCHEMY_DATABASE_URI,
    pool_pre_ping=True
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def verify_database_connection() -> None:
    """
    Verify database connectivity by executing a test query.
    Raises exception on failure to trigger fast-fail behavior.
    """
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
            conn.commit()
        logger.info("Database connection verified successfully")
    except Exception as e:
        logger.error(f"Database connection failed: {type(e).__name__}: {str(e)}")
        raise RuntimeError(f"Failed to connect to database: {e}") from e


def get_existing_tables() -> set:
    """Return set of existing table names in the database."""
    inspector = inspect(engine)
    return set(inspector.get_table_names())


def create_missing_tables() -> list:
    """
    Create any missing tables defined in models.
    Returns list of table names that were created.
    """
    from . import models  # Import all models to register them with Base

    existing_tables = get_existing_tables()
    all_tables = set(Base.metadata.tables.keys())
    missing_tables = all_tables - existing_tables

    if missing_tables:
        logger.info(f"Creating missing tables: {sorted(missing_tables)}")
        Base.metadata.create_all(bind=engine, tables=[
            Base.metadata.tables[table_name] for table_name in missing_tables
        ])
        logger.info(f"Successfully created tables: {sorted(missing_tables)}")
    else:
        logger.info("All tables already exist, skipping creation")

    return sorted(missing_tables)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
