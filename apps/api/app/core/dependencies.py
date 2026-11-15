"""Central dependency re-export module.

All FastAPI Depends injectors that are shared across modules are imported
from here, so individual routers only need a single import:

    from app.core.dependencies import get_current_user, get_db, require_role

Responsibilities
----------------
- Re-export ``get_current_user`` and ``get_db`` from ``core.security``.
- Provide ``require_role`` — a dependency factory that restricts an endpoint
  to callers whose active role is in the allowed set, raising HTTP 403
  (``ForbiddenError``) otherwise.

The role-check predicate itself lives in ``app.core.rbac`` so that
service-layer guards can reuse it without going through the FastAPI
dependency stack.
"""

from __future__ import annotations

from collections.abc import Callable

from fastapi import Depends

from app.core.errors import ForbiddenError
from app.core.rbac import check_role

# Re-exports — the canonical source of truth is core.security.
from app.core.security import CurrentUser, get_current_user, get_db

__all__ = [
    "get_current_user",
    "get_db",
    "require_role",
]


# ---------------------------------------------------------------------------
# require_role — role-based access control dependency factory
# ---------------------------------------------------------------------------


def require_role(*roles: str) -> Callable[..., CurrentUser]:
    """Dependency factory — restrict an endpoint to callers with an allowed role.

    Parameters
    ----------
    *roles:
        One or more role strings (e.g. ``"leader"``, ``"approver"``). The
        allowed set is built once when the factory is called.

    Returns
    -------
    Callable
        A FastAPI dependency that:

        1. resolves the authenticated caller via ``get_current_user``,
        2. checks ``current_user.role`` against the allowed *roles* set,
        3. raises ``ForbiddenError`` (HTTP 403) when the role is not allowed,
        4. returns the ``CurrentUser`` unchanged when the role is allowed.

    Example::

        @router.post("/orders/{order_id}/accept")
        async def accept_order(
            order_id: str,
            user: CurrentUser = Depends(require_role("leader")),
        ):
            ...

    A caller that resolved to no role (``current_user.role == ""``) is always
    rejected, because ``check_role`` treats an empty role as unauthorized.
    """

    # Build the allow-list once; ``set`` gives O(1) membership checks and
    # de-duplicates repeated role strings.
    allowed_roles: set[str] = set(roles)

    async def _dependency(
        current_user: CurrentUser = Depends(get_current_user),
    ) -> CurrentUser:
        if not check_role(current_user.role, allowed_roles):
            raise ForbiddenError(
                "Your active role is not authorized to access this resource."
            )
        return current_user

    return _dependency
