import os
import shutil
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db, DATABASE_PATH
from app.models.user import User
from app.core.auth import require_manager
from app.core.config import init_app_storage

router = APIRouter(prefix="/backup", tags=["backup"])

storage_info = init_app_storage()
BACKUP_DIR = storage_info["backups_dir"]


@router.post("", status_code=status.HTTP_201_CREATED)
def create_database_backup(_: User = Depends(require_manager)):
    """
    Create a timestamped SQLite database backup in AppData backups directory.
    Manager only. Never overwrites existing backups.
    """
    if not os.path.exists(DATABASE_PATH):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Database file not found."
        )

    os.makedirs(BACKUP_DIR, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_filename = f"cafe_pos_backup_{timestamp}.db"
    backup_path = os.path.join(BACKUP_DIR, backup_filename)

    if os.path.exists(backup_path):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Backup file '{backup_filename}' already exists."
        )

    try:
        shutil.copy2(DATABASE_PATH, backup_path)
        file_size = os.path.getsize(backup_path)

        return {
            "message": "Database backup created successfully.",
            "filename": backup_filename,
            "created_at": datetime.now().isoformat(),
            "size_bytes": file_size,
            "size_mb": round(file_size / (1024 * 1024), 2)
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create database backup: {str(e)}"
        )


@router.get("", response_model=list)
def list_backups(_: User = Depends(require_manager)):
    """List all timestamped database backups. Manager only."""
    if not os.path.exists(BACKUP_DIR):
        return []

    backups = []
    for fname in sorted(os.listdir(BACKUP_DIR), reverse=True):
        if fname.endswith(".db"):
            fpath = os.path.join(BACKUP_DIR, fname)
            stat = os.stat(fpath)
            backups.append({
                "filename": fname,
                "created_at": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                "size_bytes": stat.st_size,
                "size_mb": round(stat.st_size / (1024 * 1024), 2)
            })

    return backups


@router.post("/restore/{filename}")
def restore_database_backup(filename: str, _: User = Depends(require_manager)):
    """
    Restore database from a selected backup file.
    Manager only.
    Safety feature: Creates an automatic safety backup of current state BEFORE restoring!
    """
    target_backup_path = os.path.join(BACKUP_DIR, filename)
    if not os.path.exists(target_backup_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Backup file '{filename}' not found."
        )

    # 1. Create safety backup of current database first
    if os.path.exists(DATABASE_PATH):
        safety_name = f"safety_pre_restore_{datetime.now().strftime('%Y%m%d_%H%M%S')}.db"
        safety_path = os.path.join(BACKUP_DIR, safety_name)
        try:
            shutil.copy2(DATABASE_PATH, safety_path)
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Safety backup before restore failed: {exc}"
            )

    # 2. Perform restore
    try:
        shutil.copy2(target_backup_path, DATABASE_PATH)
        return {
            "message": f"Database successfully restored from '{filename}'. Safety backup created.",
            "restored_filename": filename,
            "restored_at": datetime.now().isoformat()
        }
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database restore failed: {exc}"
        )
