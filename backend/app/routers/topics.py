from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.db.session import get_session
from app.dependencies import get_current_world
from app.models.topic import Topic, TopicCreate, TopicRead, TopicUpdate
from app.models.world import World

router = APIRouter(prefix="/api/topics", tags=["topics"])


@router.get("/", response_model=list[TopicRead])
def list_topics(
    session: Session = Depends(get_session),
    world: World = Depends(get_current_world),
):
    return session.exec(select(Topic).where(Topic.world_id == world.id)).all()


@router.post("/", response_model=TopicRead, status_code=201)
def create_topic(
    topic_in: TopicCreate,
    session: Session = Depends(get_session),
    world: World = Depends(get_current_world),
):
    topic = Topic.model_validate(topic_in, update={"world_id": world.id})
    session.add(topic)
    session.commit()
    session.refresh(topic)
    return topic


@router.get("/{topic_id}", response_model=TopicRead)
def get_topic(topic_id: int, session: Session = Depends(get_session)):
    topic = session.get(Topic, topic_id)
    if topic is None:
        raise HTTPException(status_code=404, detail="Topic not found")
    return topic


@router.patch("/{topic_id}", response_model=TopicRead)
def update_topic(topic_id: int, topic_in: TopicUpdate, session: Session = Depends(get_session)):
    topic = session.get(Topic, topic_id)
    if topic is None:
        raise HTTPException(status_code=404, detail="Topic not found")
    for key, value in topic_in.model_dump(exclude_unset=True).items():
        setattr(topic, key, value)
    session.add(topic)
    session.commit()
    session.refresh(topic)
    return topic


@router.delete("/{topic_id}", status_code=204)
def delete_topic(topic_id: int, session: Session = Depends(get_session)):
    topic = session.get(Topic, topic_id)
    if topic is None:
        raise HTTPException(status_code=404, detail="Topic not found")
    session.delete(topic)
    session.commit()
