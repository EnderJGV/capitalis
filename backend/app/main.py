from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .infrastructure.config import settings
from .infrastructure.database.session import create_tables
from .presentation.error_handlers import register_error_handlers
from .presentation.routers import (
    accounts,
    auth,
    cards,
    catalog,
    categories,
    dashboard,
    rates,
    transactions,
    transfers,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_tables()
    yield


app = FastAPI(title="Capitalis API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.cors_origins.split(",")],
    allow_methods=["*"],
    allow_headers=["*"],
)
register_error_handlers(app)

for router in (
    auth.router,
    categories.router,
    accounts.router,
    cards.router,
    catalog.router,
    transactions.router,
    transfers.router,
    rates.router,
    dashboard.router,
):
    app.include_router(router, prefix="/api")


@app.get("/api/health")
def health():
    return {"status": "ok"}
