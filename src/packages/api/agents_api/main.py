import asyncio
import os
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import Literal

from fastapi import Depends, FastAPI, HTTPException
from pydantic import BaseModel

from agents_api.agents import router as agents_router
from agents_api.auth import (
    AccessToken,
    JwksTokenVerifier,
    get_verifier,
    require_access_token,
)
from agents_api.workspaces import router as workspaces_router


class Health(BaseModel):
    status: Literal["ok"]


@asynccontextmanager
async def _lifespan(_app: FastAPI) -> AsyncIterator[None]:
    if "PYTEST_CURRENT_TEST" not in os.environ:
        await asyncio.to_thread(_warm_jwks)
    yield


def _warm_jwks() -> None:
    try:
        verifier = get_verifier()
    except HTTPException:
        return
    if isinstance(verifier, JwksTokenVerifier):
        verifier.warm()


app = FastAPI(title="AI Agents Builder", version="0.1.0", lifespan=_lifespan)
app.include_router(workspaces_router)
app.include_router(agents_router)


@app.get("/health")
async def health() -> Health:
    return Health(status="ok")


@app.get("/session")
async def session(token: AccessToken = Depends(require_access_token)) -> AccessToken:
    return token
