# Vybe Backend (FastAPI)

## Requirements
- Python 3.10+ (tested on Python 3.12)
- Virtual environment in `.venv/`

## Setup & Running

```powershell
cd d:\vybe\backend

# Activate virtual environment (Windows PowerShell)
.\.venv\Scripts\Activate.ps1

# Install / update dependencies (if needed)
pip install -r requirements.txt

# Run the dev server
uvicorn app.main:app --reload --port 8000
```

## Features
- **FastAPI**: Modern, high-performance web framework.
- **Pydantic v2**: Strict data validation and schema generation.
- **CORS Configured**: Allows cross-origin requests from `http://localhost:5173`.
- **Swagger Documentation**: Live interactive docs at `/docs`.

