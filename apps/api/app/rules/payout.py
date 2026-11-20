"""
Deterministic Payout Engine.
Member payout = accepted_quantity × rate.
Rework and rejected work are NEVER paid until accepted.
AI proposes. Rules calculate. Humans approve.
"""

from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP
from typing import Literal


PaymentBasis = Literal["PER_PIECE", "PER_HOUR", "FIXED"]


def _to_decimal(val: float | int | str) -> Decimal:
    return Decimal(str(val))


def _round_inr(d: Decimal) -> float:
    return float(d.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))


@dataclass
class TaskPayoutInput:
    task_id: str
    member_id: str
    member_name: str
    allocated_quantity: int
    completed_quantity: int
    accepted_quantity: int
    rework_quantity: int
    rejected_quantity: int
    payment_basis: PaymentBasis
    rate: float          # per piece rate OR hourly rate
    hours: float = 0.0   # only used for PER_HOUR


@dataclass
class PayoutLineResult:
    task_id: str
    member_id: str
    member_name: str
    allocated_quantity: int
    completed_quantity: int
    accepted_quantity: int
    rework_quantity: int
    rejected_quantity: int
    payment_basis: PaymentBasis
    rate: float
    hours: float
    payable_amount: float
    explanation: str


@dataclass
class PayoutSheetResult:
    lines: list[PayoutLineResult]
    total_payable_amount: float
    total_accepted_quantity: int
    warnings: list[str]


def calculate_line_payout(task: TaskPayoutInput) -> PayoutLineResult:
    """
    Calculate payout for one task assignment.
    Only accepted_quantity is payable — rework and rejected are excluded.
    """
    if task.payment_basis == "PER_PIECE":
        payable_dec = _to_decimal(task.accepted_quantity) * _to_decimal(task.rate)
        payable = _round_inr(payable_dec)
        explanation = (
            f"{task.accepted_quantity} accepted units × ₹{task.rate:.2f} = ₹{payable:.2f}"
        )
    elif task.payment_basis == "PER_HOUR":
        payable_dec = _to_decimal(task.hours) * _to_decimal(task.rate)
        payable = _round_inr(payable_dec)
        explanation = (
            f"{task.hours} approved hours × ₹{task.rate:.2f}/hr = ₹{payable:.2f}"
        )
    else:  # FIXED
        payable_dec = _to_decimal(task.rate)
        payable = _round_inr(payable_dec)
        explanation = f"Fixed payment: ₹{payable:.2f}"

    # Rework not paid until re-accepted
    if task.rework_quantity > 0 and task.payment_basis == "PER_PIECE":
        explanation += f" ({task.rework_quantity} units pending rework — not payable yet)"

    return PayoutLineResult(
        task_id=task.task_id,
        member_id=task.member_id,
        member_name=task.member_name,
        allocated_quantity=task.allocated_quantity,
        completed_quantity=task.completed_quantity,
        accepted_quantity=task.accepted_quantity,
        rework_quantity=task.rework_quantity,
        rejected_quantity=task.rejected_quantity,
        payment_basis=task.payment_basis,
        rate=task.rate,
        hours=task.hours,
        payable_amount=payable,
        explanation=explanation,
    )


def calculate_payout_sheet(tasks: list[TaskPayoutInput]) -> PayoutSheetResult:
    """
    Calculate the full payout sheet for all tasks in an order.
    Returns line-by-line breakdown and totals.
    """
    warnings: list[str] = []
    lines: list[PayoutLineResult] = []

    for task in tasks:
        if task.rate <= 0:
            warnings.append(
                f"Task '{task.task_id}': rate is ₹0 — member will receive no payment."
            )
        line = calculate_line_payout(task)
        lines.append(line)

    total_payable_dec = sum((_to_decimal(l.payable_amount) for l in lines), Decimal("0.00"))
    total_payable = _round_inr(total_payable_dec)
    total_accepted = sum(l.accepted_quantity for l in lines)

    if total_payable == 0:
        warnings.append("Total payable is ₹0. Ensure quality review is complete and rates are set.")

    unpaid_rework = sum(l.rework_quantity for l in lines)
    if unpaid_rework > 0:
        warnings.append(
            f"{unpaid_rework} units are in rework and not yet payable. "
            "They will be included once accepted."
        )

    return PayoutSheetResult(
        lines=lines,
        total_payable_amount=total_payable,
        total_accepted_quantity=total_accepted,
        warnings=warnings,
    )
