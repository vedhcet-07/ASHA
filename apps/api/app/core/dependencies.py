from typing import Optional
from supabase import create_client, Client
from app.core.config import get_settings

_supabase_client: Optional[Client] = None

def get_supabase_client() -> Optional[Client]:
    global _supabase_client
    settings = get_settings()
    if not _supabase_client and settings.SUPABASE_URL != "https://placeholder.supabase.co":
        try:
            _supabase_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
        except Exception:
            _supabase_client = None
    return _supabase_client
