import re
import tempfile
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlmodel import Session

from app.db.session import get_session
from app.dependencies import get_current_world
from app.models.world import World, WorldBase
from app.services.demo_data import seed_demo_data, world_has_data
from app.services.world_reset import delete_all_data
from app.services.world_transfer import InvalidWorldFileError, export_world, import_world

router = APIRouter(prefix="/api/world", tags=["world"])


@router.get("/", response_model=World)
def get_world(world: World = Depends(get_current_world)):
    return world


@router.patch("/", response_model=World)
def update_world(
    world_in: WorldBase,
    session: Session = Depends(get_session),
    world: World = Depends(get_current_world),
):
    world.name = world_in.name
    world.parliament_name = world_in.parliament_name
    session.add(world)
    session.commit()
    session.refresh(world)
    return world


@router.post("/seed-demo-data", status_code=201)
def seed_demo_data_endpoint(
    session: Session = Depends(get_session),
    world: World = Depends(get_current_world),
) -> dict[str, str]:
    if world_has_data(session, world.id):
        raise HTTPException(
            status_code=409,
            detail="World already has data — demo seeding is only available for an empty world.",
        )
    seed_demo_data(session, world)
    return {"status": "seeded"}


@router.delete("/data", status_code=200)
def delete_all_data_endpoint(
    session: Session = Depends(get_session),
    world: World = Depends(get_current_world),
) -> dict[str, str]:
    delete_all_data(session, world.id)
    return {"status": "deleted"}


@router.get("/export")
def export_world_endpoint(
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
    world: World = Depends(get_current_world),
) -> FileResponse:
    path = export_world(session, world)
    background_tasks.add_task(path.unlink, missing_ok=True)
    safe_name = re.sub(r"[^A-Za-z0-9_-]+", "-", world.name.strip()).strip("-") or "world"
    return FileResponse(
        path,
        media_type="application/octet-stream",
        filename=f"{safe_name}.chronodemica.db",
    )


@router.post("/import", response_model=World)
def import_world_endpoint(
    file: UploadFile = File(...),
    session: Session = Depends(get_session),
    world: World = Depends(get_current_world),
):
    suffix = Path(file.filename or "upload.db").suffix or ".db"
    fd, tmp_path_str = tempfile.mkstemp(suffix=suffix)
    tmp_path = Path(tmp_path_str)
    try:
        with open(fd, "wb") as tmp_file:
            tmp_file.write(file.file.read())
        try:
            import_world(session, world, tmp_path)
        except InvalidWorldFileError as error:
            raise HTTPException(status_code=400, detail=str(error)) from error
    finally:
        tmp_path.unlink(missing_ok=True)
    session.refresh(world)
    return world
