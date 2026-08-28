from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.db.session import get_session
from app.dependencies import get_current_world
from app.models.period import Period
from app.models.pop import Pop, PopCreate, PopRead, PopUpdate
from app.models.pop_period import PopPeriod
from app.models.pop_statement import PopStatement
from app.models.world import World

router = APIRouter(prefix="/api/pops", tags=["pops"])


@router.get("/", response_model=list[PopRead])
def list_pops(
    session: Session = Depends(get_session),
    world: World = Depends(get_current_world),
):
    return session.exec(select(Pop).where(Pop.world_id == world.id)).all()


@router.post("/", response_model=PopRead, status_code=201)
def create_pop(
    pop_in: PopCreate,
    session: Session = Depends(get_session),
    world: World = Depends(get_current_world),
):
    pop = Pop.model_validate(pop_in, update={"world_id": world.id})
    session.add(pop)
    session.flush()

    # Every pop is always represented in every period — no manual "add to period"
    # step, so a newly created pop immediately gets a row (share=0) for each of
    # this world's existing periods.
    periods = session.exec(select(Period).where(Period.world_id == world.id)).all()
    for period in periods:
        session.add(PopPeriod(pop_id=pop.id, period_id=period.id, share=0, turnout=0.5))

    session.commit()
    session.refresh(pop)
    return pop


@router.get("/{pop_id}", response_model=PopRead)
def get_pop(pop_id: int, session: Session = Depends(get_session)):
    pop = session.get(Pop, pop_id)
    if pop is None:
        raise HTTPException(status_code=404, detail="Pop not found")
    return pop


@router.patch("/{pop_id}", response_model=PopRead)
def update_pop(pop_id: int, pop_in: PopUpdate, session: Session = Depends(get_session)):
    pop = session.get(Pop, pop_id)
    if pop is None:
        raise HTTPException(status_code=404, detail="Pop not found")
    for key, value in pop_in.model_dump(exclude_unset=True).items():
        setattr(pop, key, value)
    session.add(pop)
    session.commit()
    session.refresh(pop)
    return pop


@router.delete("/{pop_id}", status_code=204)
def delete_pop(pop_id: int, session: Session = Depends(get_session)):
    pop = session.get(Pop, pop_id)
    if pop is None:
        raise HTTPException(status_code=404, detail="Pop not found")
    for dependent_model in (PopPeriod, PopStatement):
        for row in session.exec(select(dependent_model).where(dependent_model.pop_id == pop_id)).all():
            session.delete(row)
    session.delete(pop)
    session.commit()
