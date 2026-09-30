from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import Optional
from app.database import get_db
from app.models.user import User
from app.core.security import verify_password
from app.core.auth import get_current_user

router = APIRouter(prefix="/discounts", tags=["discounts"])


class DiscountAuthRequest(BaseModel):
    manager_username: str = Field(..., min_length=1)
    manager_password: str = Field(..., min_length=1)


class DiscountAuthResponse(BaseModel):
    authorized: bool
    manager_name: str
    manager_id: int


@router.post("/authorize", response_model=DiscountAuthResponse)
def authorize_discount(
    payload: DiscountAuthRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Validate manager credentials for discount authorization.
    A cashier CANNOT authorize their own discount — the manager must be a different user.
    """
    manager_username = payload.manager_username.strip().lower()

    # Find the manager user
    manager = db.query(User).filter(
        User.username == manager_username,
        User.role == "MANAGER",
        User.is_active == True
    ).first()

    if not manager:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid manager credentials."
        )

    if not verify_password(payload.manager_password, manager.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid manager credentials."
        )

    # A cashier cannot authorize themselves (different user IDs required)
    if manager.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You cannot authorize your own discount. A different manager must approve."
        )

    return DiscountAuthResponse(
        authorized=True,
        manager_name=manager.name,
        manager_id=manager.id
    )
