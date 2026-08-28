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

# A Bourdieu-style volume x capital-composition grid of nine illustrative
# population groups — a reasonable, richly-described starting point, not a
# fixed/locked set. Shares follow the user-supplied working table, bumped by one
# point on S5 since the original table summed to 99%, not 100%.
POPS = [
    {
        "key": "S1",
        "name": "S1 Intellectuals",
        "description": (
            "Archetype: The Bohemian. Volume: high (+). Composition: culturally "
            "dominant (C+). Authority: very low (--). Voting lean: left-libertarian."
        ),
        "color_bg": "#7048e8",
        "color_text": "#ffffff",
        "share": 2,
        "turnout": 0.75,
    },
    {
        "key": "S2",
        "name": "S2 Professions",
        "description": (
            "Archetype: The Teacher. Volume: high (+). Composition: balanced (±). "
            "Authority: low (-). Voting lean: social liberal."
        ),
        "color_bg": "#4263eb",
        "color_text": "#ffffff",
        "share": 8,
        "turnout": 0.80,
    },
    {
        "key": "S3",
        "name": "S3 Business bourgeoisie",
        "description": (
            "Archetype: The Industrialist. Volume: high (+). Composition: economically "
            "dominant (E+). Authority: very high (++). Voting lean: conservative-liberal."
        ),
        "color_bg": "#1c7ed6",
        "color_text": "#ffffff",
        "share": 7,
        "turnout": 0.85,
    },
    {
        "key": "S4",
        "name": "S4 Cultural mediators",
        "description": (
            "Volume: middle (0). Composition: culturally dominant (C+). Authority: low (-). "
            "Voting lean: progressive, volatile."
        ),
        "color_bg": "#0ca678",
        "color_text": "#ffffff",
        "share": 12,
        "turnout": 0.60,
    },
    {
        "key": "S5",
        "name": "S5 Technical middle",
        "description": (
            "Archetype: The Skilled Worker. Volume: middle (0). Composition: balanced (±). "
            "Authority: low (-). Voting lean: social democratic."
        ),
        "color_bg": "#2b8a3e",
        "color_text": "#ffffff",
        "share": 36,
        "turnout": 0.70,
    },
    {
        "key": "S6",
        "name": "S6 Old middle class",
        "description": (
            "Archetype: The Civil Servant. Volume: middle (0). Composition: economically "
            "dominant (E+). Authority: high (+). Voting lean: conservative."
        ),
        "color_bg": "#e8a800",
        "color_text": "#000000",
        "share": 23,
        "turnout": 0.78,
    },
    {
        "key": "S7",
        "name": "S7 Credentialed precariat",
        "description": (
            "Archetype: The Dropout. Volume: low (-). Composition: culturally dominant (C+). "
            "Authority: very low (--). Voting lean: left protest."
        ),
        "color_bg": "#f76707",
        "color_text": "#ffffff",
        "share": 2,
        "turnout": 0.55,
    },
    {
        "key": "S8",
        "name": "S8 Skilled working class",
        "description": (
            "Archetype: The Left-Behind. Volume: low (-). Composition: slightly economic (-). "
            "Authority: neutral (0). Voting lean: abstain / left."
        ),
        "color_bg": "#e64980",
        "color_text": "#ffffff",
        "share": 6,
        "turnout": 0.58,
    },
    {
        "key": "S9",
        "name": "S9 Proletariat",
        "description": (
            "Archetype: The Night Watchman. Volume: low (-). Composition: economically "
            "dominant (E-). Authority: high (+). Voting lean: right protest."
        ),
        "color_bg": "#c92a2a",
        "color_text": "#ffffff",
        "share": 4,
        "turnout": 0.50,
    },
]
DEMO_TOTAL_POPULATION = 1_000_000

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
            "S1": [10, 30, 60],
            "S2": [15, 40, 45],
            "S3": [70, 15, 15],
            "S4": [10, 35, 55],
            "S5": [15, 55, 30],
            "S6": [45, 40, 15],
            "S7": [10, 60, 30],
            "S8": [20, 55, 25],
            "S9": [50, 30, 20],
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
            "S1": [70, 25, 5],
            "S2": [55, 35, 10],
            "S3": [15, 55, 30],
            "S4": [65, 30, 5],
            "S5": [35, 50, 15],
            "S6": [20, 55, 25],
            "S7": [50, 35, 15],
            "S8": [25, 45, 30],
            "S9": [10, 30, 60],
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
            "S1": [60, 35, 5],
            "S2": [40, 50, 10],
            "S3": [20, 50, 30],
            "S4": [55, 35, 10],
            "S5": [25, 55, 20],
            "S6": [15, 50, 35],
            "S7": [45, 40, 15],
            "S8": [20, 45, 35],
            "S9": [10, 30, 60],
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
            color_bg=data["color_bg"],
            color_text=data["color_text"],
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
        total_population=DEMO_TOTAL_POPULATION,
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
                share=data["share"],
                turnout=data["turnout"],
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
