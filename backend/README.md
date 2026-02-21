# Cold Email Outreach Automation Platform - Backend

This is a production-ready FastAPI backend for a cold email outreach platform.

## Features
- **FastAPI**: High-performance asynchronous API setup.
- **SQLAlchemy 2.0 + PostgreSQL**: Modern ORM and robust relational database.
- **Alembic**: Database migrations management.
- **Celery + Redis**: Background jobs for email sending and automated follow-ups.
- **Jinja2**: Email templating engine.
- **Pydantic V2**: Request/Response validation and configuration management.
- **Modular Structure**: Clean and scalable folder organization.

## Project Structure
```text
backend/
├── alembic/              # Database migrations
├── app/
│   ├── api/              # API routes (versioned)
│   ├── models/           # SQLAlchemy models
│   ├── schemas/          # Pydantic models
│   ├── services/         # Business logic (EmailService, etc.)
│   ├── utils/            # Utilities (Logging, etc.)
│   ├── workers/          # Celery app and tasks
│   ├── config.py         # App configuration
│   ├── db.py             # Database session and engine
│   └── main.py           # App entry point
├── .env                  # Environment variables
├── alembic.ini           # Alembic configuration
└── requirements.txt      # Dependencies
```

## Getting Started

### 1. Prerequisites
- Python 3.10+
- PostgreSQL
- Redis

### 2. Setup
1. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Configure environment variables:
   - Edit `.env` with your database and redis credentials.

### 3. Migrations
Run the initial migration (after creating your database):
```bash
alembic revision --autogenerate -m "Initial migration"
alembic upgrade head
```

### 4. Running the Application
**Start the API:**
```bash
uvicorn app.main:app --reload
```
The API will be available at `http://localhost:8000`. Swagger documentation at `/docs`.

**Start the Celery worker:**
```bash
celery -A app.workers.celery_app worker --loglevel=info
```

## Health Check
Verify the setup by visiting `http://localhost:8000/health`.
