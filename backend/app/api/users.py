from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.core.security import hash_password
from app.core.auth import require_manager
from app.schemas.user import UserCreate, UserUpdate, UserResponse

router = APIRouter(prefix="/users", tags=["users"])


def _active_manager_count(db: Session) -> int:
    return db.query(User).filter(User.role == "MANAGER", User.is_active == True).count()


@router.get("", response_model=List[UserResponse])
def list_users(
    db: Session = Depends(get_db),
    _: User = Depends(require_manager)
):
    """List all users. Manager only."""
    return db.query(User).order_by(User.created_at.asc()).all()


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_manager)
):
    """Create a new user. Manager only."""
    username_lower = payload.username.strip().lower()
    existing = db.query(User).filter(User.username == username_lower).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Username '{username_lower}' is already taken."
        )
    user = User(
        name=payload.name.strip(),
        username=username_lower,
        password_hash=hash_password(payload.password),
        role=payload.role,
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager)
):
    """Update a user's credentials, role, name, or active status. Manager only."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    if payload.name is not None:
        user.name = payload.name.strip()

    if payload.username is not None:
        new_username = payload.username.strip().lower()
        if new_username != user.username:
            existing = db.query(User).filter(User.username == new_username, User.id != user_id).first()
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Username '{new_username}' is already taken by another account."
                )
            user.username = new_username

    if payload.role is not None:
        if user.id == current_user.id and payload.role != "MANAGER":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You cannot change your own role."
            )
        # Prevent demoting the last active manager
        if user.role == "MANAGER" and payload.role != "MANAGER" and _active_manager_count(db) <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot demote the last active Manager account."
            )
        user.role = payload.role

    if payload.password is not None and payload.password.strip():
        user.password_hash = hash_password(payload.password)

    if payload.is_active is not None:
        if user.id == current_user.id and not payload.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You cannot deactivate your own account."
            )
        # Prevent deactivating the last active manager
        if user.role == "MANAGER" and not payload.is_active and _active_manager_count(db) <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot deactivate the last active Manager account."
            )
        user.is_active = payload.is_active

    db.commit()
    db.refresh(user)
    return user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def deactivate_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager)
):
    """Soft-delete (deactivate) a user. Manager only."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot deactivate your own account."
        )
    if user.role == "MANAGER" and _active_manager_count(db) <= 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot deactivate the last active Manager account."
        )
    user.is_active = False
    db.commit()
