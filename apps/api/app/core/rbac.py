"""Role-based access control utilities.

This module provides reusable building blocks for enforcing RBAC both at
the FastAPI dependency layer and inside service-layer guards:

- ``check_role`` — a pure predicate used by service functions to guard
  privileged operations without going through the HTTP dependency stack.
- ``RoleChecker`` — a callable class that can be wired directly into a
  FastAPI endpoint via ``Depends(RoleChecker([...]))`` for more complex
  role checks (e.g. when the allowed set is computed at runtime).

``require_role`` (the dependency *factory* used by most routers) lives in
``app.core.dependencies`` and is built on top of ``check_role``.

Design references
-----------------
- Design: "Authorization layers — FastAPI RBAC + Supabase RLS. RBAC blocks
  requests at the API layer; RLS is a defence-in-depth backstop at the
  database row level."
- Requirement 1.4: enforce role-based access control for every API
  endpoint, returning HTTP 403 when a request does not match the required
  role.
"""

from __future__ import annotations

from collections.abc import Iterable

from fastapi import Depends

from app.core.errors import ForbiddenError
from app.core.security import CurrentUser, get_current_user

__all__ = ["RoleChecker", "check_role"]


# ---------------------------------------------------------------------------
# Pure predicate — usable in service-layer guards
# ---------------------------------------------------------------------------


def check_role(user_role: str, allowed_roles: Iterable[str]) -> bool:
    """Return ``True`` when *user_role* is authorized for *allowed_roles*.

    A caller with an empty/falsy role is never authorized, which lets
    service-layer guards reject tokens that resolved to no role (the
    ``CurrentUser`` produced by ``get_current_user`` uses ``""`` when no
    role claim is present).

    Parameters
    ----------
    user_role:
        The active role of the authenticated caller (e.g. ``"leader"``).
    allowed_roles:
        The collection of roles permitted to perform the operation.

    Returns
    -------
    bool
        ``True`` if access is allowed, ``False`` otherwise.
    """
    if not user_role:
        return False
    return user_role in allowed_roles


# ---------------------------------------------------------------------------
# Callable FastAPI dependency — for complex/runtime-computed role sets
# ---------------------------------------------------------------------------


class RoleChecker:
    """Callable FastAPI dependency that enforces a role allow-list.

    Instances are reusable and can be passed directly to ``Depends``::

        @router.get("/only-leaders")
        async def only_leaders(
            user: CurrentUser = Depends(RoleChecker(["leader", "approver"])),
        ):
            ...

    Unlike ``require_role`` (a factory that returns a fresh closure), a
    ``RoleChecker`` instance holds the allowed set as state, which is useful
    when the allowed roles are computed dynamically — for example, from a
    feature flag or an order's current state.

    The instance is async-callable: when FastAPI resolves the dependency it
    invokes ``__call__``, which resolves the authenticated caller via
    ``get_current_user`` and raises ``ForbiddenError`` (HTTP 403) when the
    caller's role is not in the allow-list.
    """

    def __init__(self, allowed_roles: list[str]) -> None:
        self.allowed_roles: list[str] = list(allowed_roles)

    async def __call__(
        self,
        current_user: CurrentUser = Depends(get_current_user),
    ) -> CurrentUser:
        if not check_role(current_user.role, self.allowed_roles):
            raise ForbiddenError(
                "Your active role is not authorized to access this resource."
            )
        return current_user
