from sqlmodel import Session, select

from app.models.parliament_period import ParliamentPeriod
from app.models.party import Party
from app.models.party_period import PartyPeriod
from app.models.party_statement import PartyStatement
from app.models.period import Period
from app.models.pop import Pop
from app.models.pop_period import PopPeriod
from app.models.pop_statement import PopStatement
from app.models.statement import Statement
from app.models.topic import Topic
from app.models.topic_period import TopicPeriod
from app.models.votes import Votes


def delete_all_data(session: Session, world_id: int, commit: bool = True) -> None:
    party_ids = list(session.exec(select(Party.id).where(Party.world_id == world_id)))
    pop_ids = list(session.exec(select(Pop.id).where(Pop.world_id == world_id)))
    topic_ids = list(session.exec(select(Topic.id).where(Topic.world_id == world_id)))
    period_ids = list(session.exec(select(Period.id).where(Period.world_id == world_id)))

    def delete_where(model: type, column, ids: list[int]) -> None:
        if not ids:
            return
        for row in session.exec(select(model).where(column.in_(ids))).all():
            session.delete(row)

    delete_where(Votes, Votes.period_id, period_ids)
    delete_where(ParliamentPeriod, ParliamentPeriod.period_id, period_ids)
    delete_where(PartyStatement, PartyStatement.period_id, period_ids)
    delete_where(PopStatement, PopStatement.period_id, period_ids)
    delete_where(PartyPeriod, PartyPeriod.period_id, period_ids)
    delete_where(PopPeriod, PopPeriod.period_id, period_ids)
    delete_where(TopicPeriod, TopicPeriod.period_id, period_ids)
    delete_where(Statement, Statement.topic_id, topic_ids)
    delete_where(Period, Period.id, period_ids)
    delete_where(Topic, Topic.id, topic_ids)
    delete_where(Pop, Pop.id, pop_ids)
    delete_where(Party, Party.id, party_ids)

    if commit:
        session.commit()
