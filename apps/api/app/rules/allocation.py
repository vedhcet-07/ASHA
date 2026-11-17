"""
Fair Allocation Engine — fully deterministic.
AI proposes. Rules calculate. Humans approve.

Scoring weights (from product spec):
  Skill match        30%
  Available capacity 25%
  Availability       20%
  Current workload   15%
  Past quality       10%
"""

from dataclasses import dataclass, field
from typing import Optional


WEIGHTS = {
    "skill":        0.30,
    "capacity":     0.25,
    "availability": 0.20,
    "workload":     0.15,
    "quality":      0.10,
}

AVAILABILITY_SCORES = {
    "available":           1.0,
    "partially_available": 0.5,
    "unavailable":         0.0,
}


@dataclass
class MemberProfile:
    id: str
    name: str
    skills: list[dict]              # [{skill, proficiency}]
    daily_capacity: int
    weekly_capacity: int
    availability_status: str
    current_workload: int           # units already assigned in active tasks
    past_acceptance_rate: float     # 0-100
    past_rework_rate: float         # 0-100
    past_on_time_rate: float        # 0-100


@dataclass
class AllocationLine:
    member_id: str
    member_name: str
    allocated_quantity: int
    score: float
    skill_score: float
    capacity_score: float
    availability_score: float
    workload_score: float
    quality_score: float
    reasons: list[str] = field(default_factory=list)


@dataclass
class AllocationProposal:
    total_quantity: int
    required_skill: Optional[str]
    allocations: list[AllocationLine]
    warnings: list[str] = field(default_factory=list)
    unallocated: int = 0


def _skill_score(member: MemberProfile, required_skill: Optional[str]) -> float:
    """1.0 if member has the skill at proficiency 5; scales down proportionally. 0.5 if no skill required."""
    if not required_skill:
        return 0.5
    for s in member.skills:
        if s["skill"] == required_skill:
            return s["proficiency"] / 5.0
    return 0.0


def _capacity_score(member: MemberProfile, quantity_per_member: int) -> float:
    """Score based on whether the member can handle the target quantity in their daily capacity."""
    if member.daily_capacity <= 0:
        return 0.0
    ratio = min(quantity_per_member / max(member.daily_capacity, 1), 1.0)
    # Lower ratio = more comfortable = higher score
    return max(0.0, 1.0 - ratio * 0.5)


def _availability_score(member: MemberProfile) -> float:
    return AVAILABILITY_SCORES.get(member.availability_status, 0.0)


def _workload_score(member: MemberProfile) -> float:
    """Higher existing workload = lower score."""
    if member.weekly_capacity <= 0:
        return 0.0
    ratio = min(member.current_workload / max(member.weekly_capacity, 1), 1.0)
    return max(0.0, 1.0 - ratio)


def _quality_score(member: MemberProfile) -> float:
    """Composite of acceptance rate, low rework, on-time delivery."""
    acceptance = member.past_acceptance_rate / 100.0
    rework_penalty = member.past_rework_rate / 100.0
    on_time = member.past_on_time_rate / 100.0
    return max(0.0, min(1.0, (acceptance * 0.5) + (on_time * 0.3) + ((1 - rework_penalty) * 0.2)))


def _build_reasons(
    member: MemberProfile,
    required_skill: Optional[str],
    sk: float, ca: float, av: float, wl: float, qu: float,
) -> list[str]:
    reasons = []
    if required_skill and sk >= 0.8:
        reasons.append(f"High {required_skill.lower()} proficiency")
    elif required_skill and sk >= 0.4:
        reasons.append(f"Has {required_skill.lower()} skill")
    elif required_skill and sk == 0.0:
        reasons.append(f"No {required_skill.lower()} skill — assigned as fallback")

    if av == 1.0:
        reasons.append("Fully available")
    elif av == 0.5:
        reasons.append("Partially available")
    else:
        reasons.append("Currently unavailable")

    if wl >= 0.7:
        reasons.append("Low current workload")
    elif wl <= 0.3:
        reasons.append("High current workload")

    if qu >= 0.9:
        reasons.append("Excellent quality history")
    elif qu >= 0.7:
        reasons.append("Good quality history")

    return reasons


def score_member(
    member: MemberProfile,
    required_skill: Optional[str],
    quantity_per_member: int,
) -> tuple[float, dict]:
    """Return (composite_score, component_scores)."""
    sk = _skill_score(member, required_skill)
    ca = _capacity_score(member, quantity_per_member)
    av = _availability_score(member)
    wl = _workload_score(member)
    qu = _quality_score(member)

    composite = (
        sk * WEIGHTS["skill"] +
        ca * WEIGHTS["capacity"] +
        av * WEIGHTS["availability"] +
        wl * WEIGHTS["workload"] +
        qu * WEIGHTS["quality"]
    )
    return round(composite, 4), {
        "skill": round(sk, 4),
        "capacity": round(ca, 4),
        "availability": round(av, 4),
        "workload": round(wl, 4),
        "quality": round(qu, 4),
    }


def propose_allocation(
    members: list[MemberProfile],
    total_quantity: int,
    required_skill: Optional[str] = None,
    max_members: int = 10,
) -> AllocationProposal:
    """
    Deterministically propose a fair allocation across members.

    1. Score every member.
    2. Sort by score descending.
    3. Distribute quantity proportionally to score, respecting daily capacity.
    4. Any remainder goes to the top-scored member.
    """
    warnings: list[str] = []

    if not members:
        return AllocationProposal(
            total_quantity=total_quantity,
            required_skill=required_skill,
            allocations=[],
            warnings=["No members available for allocation"],
            unallocated=total_quantity,
        )

    # Estimate target quantity per member for capacity scoring
    eligible = [m for m in members if m.availability_status != "unavailable"]
    if not eligible:
        warnings.append("All members are unavailable — using all members as fallback")
        eligible = members

    qty_per = max(1, total_quantity // max(len(eligible), 1))

    # Score all eligible members
    scored = []
    for m in eligible:
        total_score, components = score_member(m, required_skill, qty_per)
        reasons = _build_reasons(
            m, required_skill,
            components["skill"], components["capacity"],
            components["availability"], components["workload"], components["quality"]
        )
        scored.append((total_score, components, reasons, m))

    # Sort by score descending, then by name for determinism on ties
    scored.sort(key=lambda x: (-x[0], x[3].name))

    # Warn if top members lack the required skill
    if required_skill:
        skilled = [s for s in scored if s[1]["skill"] > 0]
        if not skilled:
            warnings.append(
                f"No member has the required skill: {required_skill}. "
                "Leader must assign manually or add a skilled member."
            )

    # Take top N members
    top = scored[:max_members]

    # Distribute quantity proportional to score
    total_score_sum = sum(s[0] for s in top)
    allocations: list[AllocationLine] = []
    allocated_so_far = 0

    for i, (score, components, reasons, member) in enumerate(top):
        if total_score_sum > 0:
            proportion = score / total_score_sum
        else:
            proportion = 1.0 / len(top)

        raw_qty = int(total_quantity * proportion)

        # Respect daily capacity (cap at 7 days worth)
        max_qty = member.daily_capacity * 7
        qty = min(raw_qty, max_qty) if max_qty > 0 else raw_qty
        qty = max(0, qty)

        # Give remainder to top scorer only if it won't bust their capacity
        if i == len(top) - 1:
            remainder = max(0, total_quantity - allocated_so_far)
            if max_qty > 0:
                qty = min(remainder, max_qty)
            else:
                qty = remainder

        allocated_so_far += qty

        allocations.append(AllocationLine(
            member_id=member.id,
            member_name=member.name,
            allocated_quantity=qty,
            score=score,
            skill_score=components["skill"],
            capacity_score=components["capacity"],
            availability_score=components["availability"],
            workload_score=components["workload"],
            quality_score=components["quality"],
            reasons=reasons,
        ))

    unallocated = max(0, total_quantity - sum(a.allocated_quantity for a in allocations))
    if unallocated > 0:
        warnings.append(f"{unallocated} units could not be allocated due to capacity constraints.")

    return AllocationProposal(
        total_quantity=total_quantity,
        required_skill=required_skill,
        allocations=allocations,
        warnings=warnings,
        unallocated=unallocated,
    )
