from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.db.session import get_session
from app.dependencies import get_current_world
from app.models.parliament_period import ParliamentPeriod
from app.models.party import Party, PartyCreate, PartyRead, PartyUpdate
from app.models.party_period import PartyPeriod
from app.models.party_statement import PartyStatement
from app.models.votes import Votes
from app.models.world import World

router = APIRouter(prefix="/api/parties", tags=["parties"])


@router.get("/", response_model=list[PartyRead])
def list_parties(
    session: Session = Depends(get_session),
    world: World = Depends(get_current_world),
):
    return session.exec(select(Party).where(Party.world_id == world.id)).all()


@router.post("/", response_model=PartyRead, status_code=201)
def create_party(
    party_in: PartyCreate,
    session: Session = Depends(get_session),
    world: World = Depends(get_current_world),
):
    party = Party.model_validate(party_in, update={"world_id": world.id})
    session.add(party)
    session.commit()
    session.refresh(party)
    return party


@router.get("/{party_id}", response_model=PartyRead)
def get_party(party_id: int, session: Session = Depends(get_session)):
    party = session.get(Party, party_id)
    if party is None:
        raise HTTPException(status_code=404, detail="Party not found")
    return party


@router.patch("/{party_id}", response_model=PartyRead)
def update_party(party_id: int, party_in: PartyUpdate, session: Session = Depends(get_session)):
    party = session.get(Party, party_id)
    if party is None:
        raise HTTPException(status_code=404, detail="Party not found")
    for key, value in party_in.model_dump(exclude_unset=True).items():
        setattr(party, key, value)
    session.add(party)
    session.commit()
    session.refresh(party)
    return party


@router.delete("/{party_id}", status_code=204)
def delete_party(party_id: int, session: Session = Depends(get_session)):
    party = session.get(Party, party_id)
    if party is None:
        raise HTTPException(status_code=404, detail="Party not found")
    for dependent_model in (Votes, ParliamentPeriod, PartyPeriod, PartyStatement):
        for row in session.exec(select(dependent_model).where(dependent_model.party_id == party_id)).all():
            session.delete(row)
    session.delete(party)
    session.commit()
