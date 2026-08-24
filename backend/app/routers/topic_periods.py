from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select

from app.db.session import get_session
from app.dependencies import get_current_world, require_exists
from app.models.period import Period
from app.models.topic import Topic
from app.models.topic_period import (
    TopicPeriod,
    TopicPeriodCreate,
    TopicPeriodRead,
    TopicPeriodUpdate,
)
from app.models.world import World

router = APIRouter(prefix="/api/topic-periods", tags=["topic-periods"])


@router.get("/", response_model=list[TopicPeriodRead])
def list_topic_periods(
    period_id: int | None = Query(default=None),
    topic_id: int | None = Query(default=None),
    session: Session = Depends(get_session),
):
    query = select(TopicPeriod)
    if period_id is not None:
        query = query.where(TopicPeriod.period_id == period_id)
    if topic_id is not None:
        query = query.where(TopicPeriod.topic_id == topic_id)
    return session.exec(query).all()


@router.post("/", response_model=TopicPeriodRead, status_code=201)
def create_topic_period(
    topic_period_in: TopicPeriodCreate,
    session: Session = Depends(get_session),
    world: World = Depends(get_current_world),
):
    require_exists(session, Topic, topic_period_in.topic_id, "Topic", world)
    require_exists(session, Period, topic_period_in.period_id, "Period", world)
    topic_period = TopicPeriod.model_validate(topic_period_in)
    session.add(topic_period)
    session.commit()
    session.refresh(topic_period)
    return topic_period


@router.get("/{topic_period_id}", response_model=TopicPeriodRead)
def get_topic_period(topic_period_id: int, session: Session = Depends(get_session)):
    topic_period = session.get(TopicPeriod, topic_period_id)
    if topic_period is None:
        raise HTTPException(status_code=404, detail="TopicPeriod not found")
    return topic_period


@router.patch("/{topic_period_id}", response_model=TopicPeriodRead)
def update_topic_period(
    topic_period_id: int,
    topic_period_in: TopicPeriodUpdate,
    session: Session = Depends(get_session),
):
    topic_period = session.get(TopicPeriod, topic_period_id)
    if topic_period is None:
        raise HTTPException(status_code=404, detail="TopicPeriod not found")
    for key, value in topic_period_in.model_dump(exclude_unset=True).items():
        setattr(topic_period, key, value)
    session.add(topic_period)
    session.commit()
    session.refresh(topic_period)
    return topic_period


@router.delete("/{topic_period_id}", status_code=204)
def delete_topic_period(topic_period_id: int, session: Session = Depends(get_session)):
    topic_period = session.get(TopicPeriod, topic_period_id)
    if topic_period is None:
        raise HTTPException(status_code=404, detail="TopicPeriod not found")
    session.delete(topic_period)
    session.commit()
