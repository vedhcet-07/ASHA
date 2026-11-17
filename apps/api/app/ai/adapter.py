"""
Provider-agnostic AI adapter.
AI proposes. Rules calculate. Humans approve.
All AI output is a draft — never finalises allocation, cost, or payout.
"""

import json
import logging
from app.core.config import settings
from app.ai.schemas import ProductionPlanOutput, AllocationExplanationOutput

logger = logging.getLogger("asha.ai")


class AIAdapter:
    """Single interface for all LLM providers."""

    def __init__(self):
        self.provider = settings.ai_provider
        self.model = settings.ai_model

    def _call(self, prompt: str) -> str:
        """Call the configured LLM and return raw text."""
        provider = self.provider.lower()

        if provider == "openai":
            return self._call_openai(prompt)
        elif provider == "gemini":
            return self._call_gemini(prompt)
        elif provider == "groq":
            return self._call_groq(prompt)
        elif provider == "anthropic":
            return self._call_anthropic(prompt)
        elif provider == "ollama":
            return self._call_ollama(prompt)
        else:
            raise ValueError(f"Unknown AI provider: {provider}")

    def _call_openai(self, prompt: str) -> str:
        from openai import OpenAI
        client = OpenAI(api_key=settings.openai_api_key)
        response = client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            response_format={"type": "json_object"},
        )
        return response.choices[0].message.content or ""

    def _call_gemini(self, prompt: str) -> str:
        from google import genai
        client = genai.Client(api_key=settings.gemini_api_key)
        response = client.models.generate_content(
            model=self.model or "gemini-2.0-flash",
            contents=prompt,
        )
        return response.text or ""

    def _call_groq(self, prompt: str) -> str:
        from groq import Groq
        client = Groq(api_key=settings.groq_api_key)
        response = client.chat.completions.create(
            model=self.model or "llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
        )
        return response.choices[0].message.content or ""

    def _call_anthropic(self, prompt: str) -> str:
        import anthropic
        client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
        response = client.messages.create(
            model=self.model or "claude-3-5-haiku-latest",
            max_tokens=2048,
            messages=[{"role": "user", "content": prompt}],
        )
        return response.content[0].text or ""

    def _call_ollama(self, prompt: str) -> str:
        import httpx
        response = httpx.post(
            f"{settings.ollama_base_url}/api/generate",
            json={"model": self.model or "llama3.2", "prompt": prompt, "stream": False},
            timeout=60,
        )
        return response.json().get("response", "")

    def _parse_json(self, raw: str) -> dict:
        """Extract and parse JSON from LLM output."""
        # Strip markdown fences if present
        text = raw.strip()
        if text.startswith("```"):
            lines = text.split("\n")
            text = "\n".join(lines[1:-1] if lines[-1] == "```" else lines[1:])
        return json.loads(text)

    def generate_production_plan(self, order_context: dict) -> ProductionPlanOutput | None:
        """
        Generate a draft production plan from order context.
        Returns None if the AI call fails or output is invalid.
        AI output is always a DRAFT — leader must confirm before it becomes operational.
        """
        from app.ai.prompts import PRODUCTION_PLAN_PROMPT

        products_text = "; ".join(
            f"{item['product_name']} x{item['quantity']}"
            for item in order_context.get("items", [])
        )
        total_qty = sum(i["quantity"] for i in order_context.get("items", []))

        prompt = PRODUCTION_PLAN_PROMPT.format(
            title=order_context.get("title", ""),
            description=order_context.get("description", ""),
            products=products_text,
            required_by_date=order_context.get("required_by_date", ""),
            total_quantity=total_qty,
        )

        try:
            raw = self._call(prompt)
            data = self._parse_json(raw)
            return ProductionPlanOutput(**data)
        except Exception as exc:
            logger.warning("AI production plan generation failed: %s", exc)
            return None

    def explain_allocation(self, allocation_data: dict) -> AllocationExplanationOutput | None:
        """
        Generate a human-readable explanation of an allocation proposal.
        Returns None on failure.
        """
        from app.ai.prompts import ALLOCATION_EXPLANATION_PROMPT

        prompt = ALLOCATION_EXPLANATION_PROMPT.format(
            allocation_data=json.dumps(allocation_data, indent=2)
        )
        try:
            raw = self._call(prompt)
            data = self._parse_json(raw)
            return AllocationExplanationOutput(**data)
        except Exception as exc:
            logger.warning("AI allocation explanation failed: %s", exc)
            return None


# Singleton — reused across requests
ai_adapter = AIAdapter()
