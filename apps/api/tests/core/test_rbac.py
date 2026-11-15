"""Unit tests for the RBAC dependency and helpers.

These tests exercise ``require_role`` (the FastAPI dependency factory),
``RoleChecker`` (the callable dependency class), and ``check_role`` (the
pure predicate reused by service-layer guards).

The dependency closures returned by ``require_role`` and the
``RoleChecker`` instances are async callables that take ``current_user`` as
a keyword argument. Passing ``current_user`` explicitly bypasses FastAPI's
``Depends(get_current_user)`` resolution, so no JWT/HTTP wiring is required
and the tests stay focused on the role-checking logic.

Validates: Requirements 1.4
"""

from __future__ import annotations

import pytest

from app.core.dependencies import require_role
from app.core.errors import ForbiddenError
from app.core.rbac import RoleChecker, check_role
from app.core.security import CurrentUser


def _user(role: str) -> CurrentUser:
    """Build a ``CurrentUser`` with a fixed identity and a given role."""
    return CurrentUser(user_id="user-1", role=role, shg_id="shg-1")


# ---------------------------------------------------------------------------
# require_role dependency
# ---------------------------------------------------------------------------


async def test_require_role_allows_authorized_role() -> None:
    """A caller whose role is in the allowed set is returned unchanged."""
    dep = require_role("leader")
    user = _user("leader")
    result = await dep(current_user=user)
    assert result is user


async def test_require_role_rejects_unauthorized_role() -> None:
    """A caller whose role is not in the allowed set gets HTTP 403."""
    dep = require_role("leader")
    with pytest.raises(ForbiddenError):
        await dep(current_user=_user("member"))


async def test_require_role_accepts_multiple_roles() -> None:
    """Every role listed in the factory call is accepted by the dependency."""
    dep = require_role("leader", "approver")

    result_leader = await dep(current_user=_user("leader"))
    assert result_leader.role == "leader"

    result_approver = await dep(current_user=_user("approver"))
    assert result_approver.role == "approver"

    # A role not in the set is still rejected.
    with pytest.raises(ForbiddenError):
        await dep(current_user=_user("member"))


async def test_require_role_rejects_user_with_no_role() -> None:
    """A caller that resolved to no role (empty string) is rejected."""
    dep = require_role("leader")
    with pytest.raises(ForbiddenError):
        await dep(current_user=_user(""))


# ---------------------------------------------------------------------------
# check_role predicate
# ---------------------------------------------------------------------------


def test_check_role_true_for_allowed_role() -> None:
    assert check_role("leader", ["leader", "approver"]) is True


def test_check_role_false_for_disallowed_role() -> None:
    assert check_role("member", ["leader"]) is False


def test_check_role_rejects_empty_role() -> None:
    """A user with no role is never authorized, regardless of the allow-list."""
    assert check_role("", ["leader"]) is False


# ---------------------------------------------------------------------------
# RoleChecker callable dependency
# ---------------------------------------------------------------------------


async def test_role_checker_allows_authorized_role() -> None:
    """The callable class returns the caller when the role is allowed."""
    checker = RoleChecker(["leader", "approver"])
    user = _user("approver")
    result = await checker(current_user=user)
    assert result is user


async def test_role_checker_rejects_unauthorized_role() -> None:
    """The callable class raises ForbiddenError for a disallowed role."""
    checker = RoleChecker(["leader"])
    with pytest.raises(ForbiddenError):
        await checker(current_user=_user("member"))


async def test_role_checker_rejects_user_with_no_role() -> None:
    checker = RoleChecker(["leader"])
    with pytest.raises(ForbiddenError):
        await checker(current_user=_user(""))
