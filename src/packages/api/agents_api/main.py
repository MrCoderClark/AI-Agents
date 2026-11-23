from typing import Literal

from fastapi import Depends, FastAPI
from pydantic import BaseModel

from agents_api.auth import AccessToken, require_access_token


class Health(BaseModel):
    status: Literal["ok"]


app = FastAPI(title="AI Agents Builder", version="0.1.0")


@app.get("/health")
async def health() -> Health:
    return Health(status="ok")


@app.get("/session")
async def session(token: AccessToken = Depends(require_access_token)) -> AccessToken:
    return token
