"""Report CRUD and section generation routes."""
from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.db.models import Report, ReportSection
from app.db.session import get_db
from app.schemas.report import ReportCreate, ReportRead, ReportWithSections

router = APIRouter(prefix="/workspaces/{workspace_id}/reports", tags=["reports"])


@router.post("", response_model=ReportRead, status_code=status.HTTP_201_CREATED)
def create_report(workspace_id: UUID, payload: ReportCreate, db: Session = Depends(get_db)):
    report = Report(
        workspace_id=workspace_id,
        title=payload.title,
        status="draft",
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return report


@router.get("", response_model=list[ReportRead])
def list_reports(workspace_id: UUID, db: Session = Depends(get_db)):
    reports = db.scalars(
        select(Report)
        .where(Report.workspace_id == workspace_id)
        .order_by(Report.created_at.desc())
    ).all()
    return list(reports)


@router.get("/{report_id}", response_model=ReportWithSections)
def get_report(workspace_id: UUID, report_id: UUID, db: Session = Depends(get_db)):
    report = db.scalar(
        select(Report)
        .options(joinedload(Report.sections))
        .where(Report.id == report_id, Report.workspace_id == workspace_id)
    )
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found")
    return report
