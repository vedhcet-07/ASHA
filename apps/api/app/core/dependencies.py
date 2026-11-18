"""Shared FastAPI dependencies."""

import uuid
from datetime import datetime, timezone
from typing import Annotated

from fastapi import Depends
from supabase import create_client, Client

from .config import settings
from .security import TokenPayload, get_current_token


def get_supabase_client() -> Client:
    """Return a Supabase service-role client for all DB operations."""
    return create_client(settings.supabase_url, settings.supabase_service_role_key)


def get_supabase_anon_client() -> Client:
    """
    Return a Supabase anon/publishable client.
    Required for auth.sign_in_with_password and auth.sign_up —
    these calls must use the publishable key, not the service role key.
    """
    return create_client(settings.supabase_url, settings.supabase_anon_key)


SupabaseClient = Annotated[Client, Depends(get_supabase_client)]
SupabaseAnonClient = Annotated[Client, Depends(get_supabase_anon_client)]
CurrentToken = Annotated[TokenPayload, Depends(get_current_token)]


def success_response(data: object, **meta_kwargs) -> dict:
    """Wrap data in the standard ASHA success envelope."""
    return {
        "success": True,
        "data": data,
        "meta": {
            "request_id": str(uuid.uuid4()),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            **meta_kwargs,
        },
    }
