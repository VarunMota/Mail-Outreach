from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
from .config import settings
from .db import get_db, verify_database_connection, create_missing_tables
from .utils.logging import setup_logging, logger, RequestLoggingMiddleware
from .api.v1.api import api_router

# Initialize logging first
setup_logging()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan handler for startup and shutdown events.
    Performs database verification and table creation on startup.
    """
    logger.info("=" * 50)
    logger.info(f"Starting {settings.PROJECT_NAME} v{settings.VERSION}")
    logger.info("=" * 50)

    # Step 1: Verify database connection (fail fast if unavailable)
    logger.info("Verifying database connection...")
    verify_database_connection()

    # Step 2: Create missing tables safely
    logger.info("Checking database tables...")
    created_tables = create_missing_tables()

    logger.info("Application startup complete")
    logger.info("=" * 50)

    yield

    # Shutdown
    logger.info("Shutting down application...")


# Create FastAPI app with lifespan
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

# Add CORS middleware - allow frontend origin
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add request logging middleware
app.add_middleware(RequestLoggingMiddleware)

# Include API routes
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/health", tags=["Health"])
def health_check(db: Session = Depends(get_db)):
    """
    Health check endpoint that verifies API and database status.
    Performs live database query to confirm connectivity.
    """
    try:
        db.execute(text("SELECT 1"))
        return {
            "api": "ok",
            "database": "ok"
        }
    except Exception as e:
        logger.error(f"Health check failed: {type(e).__name__}: {str(e)}")
        return {
            "api": "ok",
            "database": "error"
        }


@app.get("/")
def root():
    return {"message": f"Welcome to {settings.PROJECT_NAME}"}
