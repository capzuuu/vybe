from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

router = APIRouter(prefix="/items", tags=["items"])


class ItemBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=100, example="Sample Item")
    description: Optional[str] = Field(None, max_length=500, example="This is an item description")
    completed: bool = False


class ItemCreate(ItemBase):
    pass


class Item(ItemBase):
    id: int
    created_at: datetime


# In-memory storage for initial bootstrap
_items_db: List[Item] = [
    Item(
        id=1,
        title="Welcome to Vybe",
        description="FastAPI + React Vite full-stack starter template is ready!",
        completed=True,
        created_at=datetime.utcnow()
    ),
    Item(
        id=2,
        title="Explore Backend Docs",
        description="Visit http://127.0.0.1:8000/docs for Swagger interactive API documentation.",
        completed=False,
        created_at=datetime.utcnow()
    ),
    Item(
        id=3,
        title="Connect React Frontend",
        description="The React frontend fetches this list directly from the FastAPI backend.",
        completed=False,
        created_at=datetime.utcnow()
    )
]


@router.get("", response_model=List[Item])
def get_items():
    """Retrieve all items."""
    return _items_db


@router.get("/{item_id}", response_model=Item)
def get_item(item_id: int):
    """Retrieve a single item by ID."""
    for item in _items_db:
        if item.id == item_id:
            return item
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")


@router.post("", response_model=Item, status_code=status.HTTP_201_CREATED)
def create_item(payload: ItemCreate):
    """Create a new item."""
    new_id = max([i.id for i in _items_db], default=0) + 1
    new_item = Item(
        id=new_id,
        title=payload.title,
        description=payload.description,
        completed=payload.completed,
        created_at=datetime.utcnow()
    )
    _items_db.append(new_item)
    return new_item


@router.patch("/{item_id}/toggle", response_model=Item)
def toggle_item(item_id: int):
    """Toggle completion status of an item."""
    for item in _items_db:
        if item.id == item_id:
            item.completed = not item.completed
            return item
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_item(item_id: int):
    """Delete an item by ID."""
    global _items_db
    initial_len = len(_items_db)
    _items_db = [item for item in _items_db if item.id != item_id]
    if len(_items_db) == initial_len:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
    return None

