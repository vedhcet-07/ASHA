"""Prompt templates for ASHA AI features."""

PRODUCTION_PLAN_PROMPT = """
You are a production planning assistant for a women's self-help group (SHG) in India.

Given the order details below, generate a realistic production plan with stages.
Return ONLY valid JSON matching this exact schema:

{{
  "summary": "One sentence describing the production approach",
  "total_days": <integer>,
  "stages": [
    {{
      "stage_name": "Stage name",
      "stage_order": 1,
      "requires_skill": "CUTTING|STITCHING|TAILORING|EMBROIDERY|PACKING|QUALITY_CHECK|DELIVERY|null",
      "planned_days": <integer>,
      "is_quality_checkpoint": false,
      "description": "Brief description"
    }}
  ],
  "notes": "Any important notes or null"
}}

ORDER DETAILS:
Title: {title}
Description: {description}
Products: {products}
Required by: {required_by_date}
Total quantity: {total_quantity}

Rules:
- Include stages: Cutting, Stitching/Assembly, Quality Check, Packing, Dispatch
- Quality Check must have is_quality_checkpoint: true
- Total planned_days across stages must equal total_days
- Use realistic Indian SHG context
- Return ONLY the JSON, no markdown, no explanation
"""

ALLOCATION_EXPLANATION_PROMPT = """
You are helping explain a work allocation decision to an SHG leader in simple language.

Given the allocation details below, write a plain-language explanation.
Return ONLY valid JSON:

{{
  "summary": "One sentence summary of the allocation approach",
  "member_explanations": [
    {{
      "member_name": "Name",
      "allocated_quantity": <integer>,
      "reason": "Plain language reason (max 15 words)"
    }}
  ]
}}

ALLOCATION:
{allocation_data}

Return ONLY the JSON, no markdown.
"""
