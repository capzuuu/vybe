from datetime import datetime, timezone
from threading import Lock
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Path, Response, status
from pydantic import BaseModel, Field, field_validator

router = APIRouter(prefix="/items", tags=["items"])

MAX_ITEMS = 500
_items_lock = Lock()


class ItemBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=100, json_schema_extra={"example": "Sample Item"})
    description: Optional[str] = Field(None, max_length=500, json_schema_extra={"example": "This is an item description"})
    completed: bool = False

    @field_validator("title")
    @classmethod
    def clean_title(cls, v: str) -> str:
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("Title cannot be empty")
        return cleaned

    @field_validator("description")
    @classmethod
    def clean_description(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        cleaned = v.strip()
        return cleaned or None


class ItemCreate(ItemBase):
    pass


class Item(ItemBase):
    id: int
    created_at: datetime


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


# In-memory storage for initial bootstrap (bounded & concurrency-safe)
_items_db: List[Item] = [
    Item(
        id=1,
        title="Welcome to Vybe",
        description="FastAPI + React Vite full-stack starter template is ready!",
        completed=True,
        created_at=_utc_now(),
    ),
    Item(
        id=2,
        title="Explore Backend Docs",
        description="Visit http://127.0.0.1:8000/docs for Swagger interactive API documentation.",
        completed=False,
        created_at=_utc_now(),
    ),
    Item(
        id=3,
        title="Connect React Frontend",
        description="The React frontend fetches this list directly from the FastAPI backend.",
        completed=False,
        created_at=_utc_now(),
    ),
]


@router.get("", response_model=List[Item])
def get_items(response: Response):
    """Retrieve all items."""
    response.headers["Cache-Control"] = "no-store"
    with _items_lock:
        return list(_items_db)


@router.get("/{item_id}", response_model=Item)
def get_item(response: Response, item_id: int = Path(..., gt=0)):
    """Retrieve a single item by ID."""
    response.headers["Cache-Control"] = "no-store"
    with _items_lock:
        for item in _items_db:
            if item.id == item_id:
                return item
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")


@router.post("", response_model=Item, status_code=status.HTTP_201_CREATED)
def create_item(payload: ItemCreate):
    """Create a new item (bounded store to prevent memory exhaustion)."""
    with _items_lock:
        if len(_items_db) >= MAX_ITEMS:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Item capacity limit reached",
            )
        new_id = max((i.id for i in _items_db), default=0) + 1
        new_item = Item(
            id=new_id,
            title=payload.title,
            description=payload.description,
            completed=payload.completed,
            created_at=_utc_now(),
        )
        _items_db.append(new_item)
        return new_item


@router.patch("/{item_id}/toggle", response_model=Item)
def toggle_item(item_id: int = Path(..., gt=0)):
    """Toggle completion status of an item."""
    with _items_lock:
        for item in _items_db:
            if item.id == item_id:
                item.completed = not item.completed
                return item
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_item(item_id: int = Path(..., gt=0)):
    """Delete an item by ID."""
    with _items_lock:
        for idx, item in enumerate(_items_db):
            if item.id == item_id:
                _items_db.pop(idx)
                return None
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")

