from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import ProjectState, Workspace
from app.db.session import get_db
from app.schemas.project_state import ProjectStateRead, ProjectStateUpdate
from app.schemas.workspace import WorkspaceCreate, WorkspaceRead

router = APIRouter(prefix="/workspaces", tags=["workspaces"])


@router.post("", response_model=WorkspaceRead, status_code=status.HTTP_201_CREATED)
def create_workspace(payload: WorkspaceCreate, db: Session = Depends(get_db)) -> Workspace:
    workspace = Workspace(
        name=payload.name,
        description=payload.description,
        created_by=payload.created_by,
    )
    db.add(workspace)
    db.flush()

    project_state = ProjectState(
        workspace_id=workspace.id,
        research_goal=payload.research_goal,
        scope=payload.scope,
    )
    db.add(project_state)
    db.commit()
    db.refresh(workspace)
    return workspace


@router.get("", response_model=list[WorkspaceRead])
def list_workspaces(db: Session = Depends(get_db)) -> list[Workspace]:
    return list(db.scalars(select(Workspace).order_by(Workspace.created_at.desc())))


@router.get("/{workspace_id}", response_model=WorkspaceRead)
def get_workspace(workspace_id: UUID, db: Session = Depends(get_db)) -> Workspace:
    workspace = db.get(Workspace, workspace_id)
    if workspace is None:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return workspace


@router.get("/{workspace_id}/state", response_model=ProjectStateRead)
def get_project_state(workspace_id: UUID, db: Session = Depends(get_db)) -> ProjectState:
    state = db.scalar(select(ProjectState).where(ProjectState.workspace_id == workspace_id))
    if state is None:
        raise HTTPException(status_code=404, detail="Project state not found")
    return state


@router.patch("/{workspace_id}/state", response_model=ProjectStateRead)
def update_project_state(
    workspace_id: UUID,
    payload: ProjectStateUpdate,
    db: Session = Depends(get_db),
) -> ProjectState:
    state = db.scalar(select(ProjectState).where(ProjectState.workspace_id == workspace_id))
    if state is None:
        raise HTTPException(status_code=404, detail="Project state not found")

    updates = payload.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(state, field, value)

    db.add(state)
    db.commit()
    db.refresh(state)
    return state