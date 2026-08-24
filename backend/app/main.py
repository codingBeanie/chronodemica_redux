from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.db.session import init_db
from app.dependencies import require_auth
from app.routers import (
    auth,
    coalitions,
    parliament_periods,
    parties,
    party_periods,
    party_statements,
    periods,
    pop_periods,
    pop_statements,
    pops,
    simulation,
    statements,
    topic_periods,
    topics,
    votes,
    voting_behaviour,
    voting_systems,
    world,
    worlds,
)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None]:
    init_db()
    yield


app = FastAPI(title=settings.app_name, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)

_authenticated_routers = (
    world.router,
    worlds.router,
    parties.router,
    pops.router,
    topics.router,
    statements.router,
    periods.router,
    party_periods.router,
    pop_periods.router,
    topic_periods.router,
    party_statements.router,
    pop_statements.router,
    votes.router,
    parliament_periods.router,
    simulation.router,
    voting_behaviour.router,
    coalitions.router,
    voting_systems.router,
)
for router in _authenticated_routers:
    app.include_router(router, dependencies=[Depends(require_auth)])


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
