"""Task CRUD routes."""
from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import Task
from app.db.session import get_db
from app.schemas.task import TaskCreate, TaskRead, TaskUpdate

router = APIRouter(prefix="/workspaces/{workspace_id}/tasks", tags=["tasks"])


@router.post("", response_model=TaskRead, status_code=status.HTTP_201_CREATED)
def create_task(workspace_id: UUID, payload: TaskCreate, db: Session = Depends(get_db)):
    task = Task(
        workspace_id=workspace_id,
        title=payload.title,
        description=payload.description,
        priority=payload.priority,
        assignee=payload.assignee,
        due_date=payload.due_date,
        created_by=payload.created_by,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


@router.get("", response_model=list[TaskRead])
def list_tasks(workspace_id: UUID, db: Session = Depends(get_db)):
    tasks = db.scalars(
        select(Task)
        .where(Task.workspace_id == workspace_id)
        .order_by(Task.created_at.desc())
    ).all()
    return list(tasks)


@router.patch("/{task_id}", response_model=TaskRead)
def update_task(workspace_id: UUID, task_id: UUID, payload: TaskUpdate, db: Session = Depends(get_db)):
    task = db.scalar(
        select(Task).where(Task.id == task_id, Task.workspace_id == workspace_id)
    )
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")

    updates = payload.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(task, field, value)

    db.add(task)
    db.commit()
    db.refresh(task)
    return task


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(workspace_id: UUID, task_id: UUID, db: Session = Depends(get_db)):
    task = db.scalar(
        select(Task).where(Task.id == task_id, Task.workspace_id == workspace_id)
    )
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    db.delete(task)
    db.commit()
