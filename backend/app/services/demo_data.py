from datetime import UTC, datetime

from sqlmodel import Session, select

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
from app.models.voting_system import VotingSystem
from app.models.world import World

PARTIES = [
    {
        "abbreviation": "GRN",
        "name": "Green Alliance",
        "color_bg": "#2b8a3e",
        "color_text": "#ffffff",
        "seat_orientation": 15,
        "popularity": 14,
    },
    {
        "abbreviation": "SPD",
        "name": "Social Democrats",
        "color_bg": "#c92a2a",
        "color_text": "#ffffff",
        "seat_orientation": 35,
        "popularity": 17,
    },
    {
        "abbreviation": "CU",
        "name": "Centrist Union",
        "color_bg": "#e8a800",
        "color_text": "#000000",
        "seat_orientation": 50,
        "popularity": 18,
    },
    {
        "abbreviation": "LIB",
        "name": "Liberal Party",
        "color_bg": "#1864ab",
        "color_text": "#ffffff",
        "seat_orientation": 65,
        "popularity": 15,
    },
    {
        "abbreviation": "NC",
        "name": "National Conservatives",
        "color_bg": "#5f3dc4",
        "color_text": "#ffffff",
        "seat_orientation": 85,
        "popularity": 13,
    },
]

POPS = [
    {
        "key": "URB",
        "name": "Urban Progressives",
        "description": "Younger, urban voters focused on social progress and public services.",
        "population": 250_000,
        "turnout": 0.65,
        "eligibility": 0.82,
    },
    {
        "key": "SUB",
        "name": "Suburban Families",
        "description": "Middle-class suburban households balancing work, family, and moderate politics.",
        "population": 400_000,
        "turnout": 0.70,
        "eligibility": 0.85,
    },
    {
        "key": "RUR",
        "name": "Rural Traditionalists",
        "description": "Rural communities favoring tradition, agriculture, and local autonomy.",
        "population": 150_000,
        "turnout": 0.75,
        "eligibility": 0.80,
    },
]

TOPICS = [
    {
        "name": "Economy",
        "description": "Taxation, industry policy and the social safety net.",
        "importance": 18,
        "statements": [
            "Lower taxes and deregulation",
            "Strengthen social safety nets",
            "Invest in green industry",
        ],
        "party_approvals": {
            "GRN": "Invest in green industry",
            "SPD": "Strengthen social safety nets",
            "CU": "Strengthen social safety nets",
            "LIB": "Lower taxes and deregulation",
            "NC": "Lower taxes and deregulation",
        },
        "pop_approvals": {
            "URB": [15, 35, 50],
            "SUB": [30, 40, 30],
            "RUR": [45, 35, 20],
        },
    },
    {
        "name": "Environment",
        "description": "Climate policy and the pace of the energy transition.",
        "importance": 14,
        "statements": [
            "Aggressive climate action now",
            "Balanced transition with economic safeguards",
            "Prioritize energy independence over emissions targets",
        ],
        "party_approvals": {
            "GRN": "Aggressive climate action now",
            "SPD": "Aggressive climate action now",
            "CU": "Balanced transition with economic safeguards",
            "LIB": "Balanced transition with economic safeguards",
            "NC": "Prioritize energy independence over emissions targets",
        },
        "pop_approvals": {
            "URB": [55, 35, 10],
            "SUB": [25, 50, 25],
            "RUR": [10, 35, 55],
        },
    },
    {
        "name": "Immigration",
        "description": "Border policy and integration of newcomers.",
        "importance": 12,
        "statements": [
            "Open and welcoming immigration policy",
            "Controlled immigration with integration support",
            "Strict border enforcement",
        ],
        "party_approvals": {
            "GRN": "Open and welcoming immigration policy",
            "SPD": "Controlled immigration with integration support",
            "CU": "Controlled immigration with integration support",
            "LIB": "Controlled immigration with integration support",
            "NC": "Strict border enforcement",
        },
        "pop_approvals": {
            "URB": [50, 40, 10],
            "SUB": [20, 55, 25],
            "RUR": [10, 30, 60],
        },
    },
]


def world_has_data(session: Session, world_id: int) -> bool:
    return (
        session.exec(select(Party).where(Party.world_id == world_id)).first() is not None
        or session.exec(select(Pop).where(Pop.world_id == world_id)).first() is not None
        or session.exec(select(Topic).where(Topic.world_id == world_id)).first() is not None
        or session.exec(select(Period).where(Period.world_id == world_id)).first() is not None
    )


def seed_demo_data(session: Session, world: World) -> None:
    parties = {
        data["abbreviation"]: Party(
            world_id=world.id,
            abbreviation=data["abbreviation"],
            name=data["name"],
            color_bg=data["color_bg"],
            color_text=data["color_text"],
            seat_orientation=data["seat_orientation"],
        )
        for data in PARTIES
    }
    session.add_all(parties.values())

    pops = {
        data["key"]: Pop(
            world_id=world.id,
            name=data["name"],
            description=data["description"],
        )
        for data in POPS
    }
    session.add_all(pops.values())

    today = datetime.now(UTC).date()
    period = Period(
        world_id=world.id,
        voting_date=today,
        start_date=today,
        end_date=today.replace(year=today.year + 4),
        voting_system=VotingSystem.PROPORTIONAL_REPRESENTATION,
        seats=100,
    )
    session.add(period)
    session.flush()

    for data in PARTIES:
        session.add(
            PartyPeriod(
                party_id=parties[data["abbreviation"]].id,
                period_id=period.id,
                popularity=data["popularity"],
            )
        )
    for data in POPS:
        session.add(
            PopPeriod(
                pop_id=pops[data["key"]].id,
                period_id=period.id,
                population=data["population"],
                turnout=data["turnout"],
                eligibility=data["eligibility"],
            )
        )

    for topic_data in TOPICS:
        topic = Topic(world_id=world.id, name=topic_data["name"], description=topic_data["description"])
        session.add(topic)
        session.flush()
        session.add(TopicPeriod(topic_id=topic.id, period_id=period.id, importance=topic_data["importance"]))

        statements = {}
        for text in topic_data["statements"]:
            statement = Statement(topic_id=topic.id, text=text)
            session.add(statement)
            statements[text] = statement
        session.flush()

        for abbreviation, text in topic_data["party_approvals"].items():
            session.add(
                PartyStatement(
                    party_id=parties[abbreviation].id,
                    statement_id=statements[text].id,
                    period_id=period.id,
                    approved=True,
                )
            )

        for pop_key, approvals in topic_data["pop_approvals"].items():
            for text, value in zip(topic_data["statements"], approvals, strict=True):
                session.add(
                    PopStatement(
                        pop_id=pops[pop_key].id,
                        statement_id=statements[text].id,
                        period_id=period.id,
                        approval=value,
                    )
                )

    session.commit()
