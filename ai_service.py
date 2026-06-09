"""
ai_service.py — DevGuard AI
Provider-agnostic AI code-analysis layer.

Design
------
- ``AIProvider`` is an abstract base class defining the interface.
- ``GeminiProvider`` implements it using Google Gemini (free via AI Studio).
- ``ClaudeProvider`` implements it using Anthropic Claude.
- ``get_ai_provider()`` is a factory that reads ``AI_PROVIDER`` from the
  environment and returns the correct provider instance.

Switching providers requires only a change to the ``.env`` file:
  AI_PROVIDER=gemini   # default — Google AI Studio free tier
  AI_PROVIDER=claude   # switch to Claude (uses ANTHROPIC_API_KEY)

Stub mode
---------
When the required API key for the chosen provider is absent or still set
to a placeholder, the provider returns realistic demo issues so development
and frontend integration can continue unblocked.
"""

from __future__ import annotations

import json
import os
import re
from abc import ABC, abstractmethod
from typing import Optional

# ---------------------------------------------------------------------------
# Constants & shared schema
# ---------------------------------------------------------------------------

PLACEHOLDER_KEYS = {
    "", "your_free_api_key_here", "your_gemini_key_here",
    "sk-ant-xxxxx", "YOUR_API_KEY_HERE", "none", "null",
}

ISSUE_SCHEMA = """\
{
  "issues": [
    {
      "file_name": "<filename>",
      "line_number": "<line number or range, e.g. 42 or 10-15>",
      "issue_type": "<Bug|Security|Performance|Code Smell|Logic Error>",
      "severity": "<critical|high|medium|low>",
      "explanation": "<clear description of the problem>",
      "recommended_fix": "<concise description of how to fix it>",
      "corrected_code": "<corrected code snippet, or empty string if not applicable>"
    }
  ]
}\
"""

SYSTEM_PROMPT = (
    "You are a senior software engineer and security expert specialising in "
    "code review. You detect bugs, logical errors, security vulnerabilities, "
    "performance issues, and code smells. "
    "Always respond with valid JSON only — no markdown fences, no explanation, "
    "just the raw JSON object matching the schema provided."
)

RETRY_SUFFIX = "\n\nReturn only raw JSON — no markdown, no extra text."


def _build_user_prompt(file_name: str, code: str, retry: bool = False) -> str:
    prompt = (
        f"Analyze the following source code from file `{file_name}` "
        "and detect all issues.\n\n"
        f"```\n{code}\n```\n\n"
        f"Respond using this exact JSON schema:\n{ISSUE_SCHEMA}"
    )
    if retry:
        prompt += RETRY_SUFFIX
    return prompt


def _parse_json_response(raw: str) -> dict:
    """Strip accidental markdown fences then parse JSON."""
    cleaned = re.sub(r"^```(?:json)?\s*", "", raw.strip(), flags=re.MULTILINE)
    cleaned = re.sub(r"\s*```$", "", cleaned.strip(), flags=re.MULTILINE)
    return json.loads(cleaned.strip())


def _is_placeholder(key: Optional[str]) -> bool:
    return not key or key.strip() in PLACEHOLDER_KEYS


# ---------------------------------------------------------------------------
# Stub data
# ---------------------------------------------------------------------------

def _stub_issues(file_name: str) -> dict:
    """Return realistic demo issues when no valid API key is configured."""
    return {
        "issues": [
            {
                "file_name": file_name,
                "line_number": "12",
                "issue_type": "Security",
                "severity": "critical",
                "explanation": (
                    "Hardcoded credentials detected. Sensitive values "
                    "should never appear in source code."
                ),
                "recommended_fix": (
                    "Move secrets to environment variables and load them "
                    "with os.environ.get() or a secrets manager."
                ),
                "corrected_code": "password = os.environ.get('DB_PASSWORD')",
            },
            {
                "file_name": file_name,
                "line_number": "34",
                "issue_type": "Bug",
                "severity": "high",
                "explanation": (
                    "Unhandled exception — the function may raise a "
                    "KeyError if the expected key is absent from the dict."
                ),
                "recommended_fix": (
                    "Use dict.get() with a default value, or wrap in a try/except."
                ),
                "corrected_code": "value = data.get('key', default_value)",
            },
            {
                "file_name": file_name,
                "line_number": "58-62",
                "issue_type": "Performance",
                "severity": "medium",
                "explanation": (
                    "Nested loop with O(n²) complexity. For large inputs "
                    "this will degrade significantly."
                ),
                "recommended_fix": (
                    "Use a set or dict for O(1) lookups to reduce overall "
                    "complexity to O(n)."
                ),
                "corrected_code": "lookup = set(items)\nresult = [x for x in data if x in lookup]",
            },
            {
                "file_name": file_name,
                "line_number": "77",
                "issue_type": "Code Smell",
                "severity": "low",
                "explanation": "Magic number used directly in logic. Reduces readability.",
                "recommended_fix": "Extract to a named constant at module level.",
                "corrected_code": "MAX_RETRIES = 3\n...\nfor attempt in range(MAX_RETRIES):",
            },
        ],
        "_source": "stub",
        "_note": (
            "STUB MODE — set a valid API key in .env to enable "
            "AI-powered code analysis."
        ),
    }


# ---------------------------------------------------------------------------
# Abstract base
# ---------------------------------------------------------------------------

class AIProvider(ABC):
    """Abstract interface for AI code-analysis backends."""

    @property
    @abstractmethod
    def name(self) -> str:
        """Human-readable provider name."""

    @property
    @abstractmethod
    def is_configured(self) -> bool:
        """True when a valid (non-placeholder) API key is present."""

    @abstractmethod
    def analyze_code(self, file_name: str, code: str) -> dict:
        """
        Analyse source code and return a dict matching the issue schema.

        Falls back to stub if not configured.
        """


# ---------------------------------------------------------------------------
# Google Gemini provider
# ---------------------------------------------------------------------------

class GeminiProvider(AIProvider):
    """Gemini via Google AI Studio (free tier: 15 RPM, 1M TPM)."""

    MODEL = "gemini-2.5-flash"

    def __init__(self):
        self._key = os.environ.get("GEMINI_API_KEY", "").strip()

    @property
    def name(self) -> str:
        return "Google Gemini"

    @property
    def is_configured(self) -> bool:
        return not _is_placeholder(self._key)

    def _call(self, prompt: str) -> str:
        import google.generativeai as genai  # lazy import
        genai.configure(api_key=self._key)
        model = genai.GenerativeModel(
            model_name=self.MODEL,
            system_instruction=SYSTEM_PROMPT,
        )
        response = model.generate_content(prompt)
        return response.text

    def analyze_code(self, file_name: str, code: str) -> dict:
        if not self.is_configured:
            print(
                f"[ai_service] GeminiProvider: no valid key — "
                "returning stub issues (development mode)."
            )
            return _stub_issues(file_name)

        prompt = _build_user_prompt(file_name, code)
        raw = self._call(prompt)

        try:
            return _parse_json_response(raw)
        except (json.JSONDecodeError, ValueError):
            pass  # retry once

        raw = self._call(_build_user_prompt(file_name, code, retry=True))
        try:
            return _parse_json_response(raw)
        except (json.JSONDecodeError, ValueError) as exc:
            raise ValueError(
                f"Gemini returned unparseable JSON after retry.\n"
                f"Raw response:\n{raw}"
            ) from exc


# ---------------------------------------------------------------------------
# Anthropic Claude provider
# ---------------------------------------------------------------------------

class ClaudeProvider(AIProvider):
    """Anthropic Claude — drop-in replacement for GeminiProvider."""

    MODEL = "claude-sonnet-4-6"
    MAX_TOKENS = 2000

    def __init__(self):
        self._key = os.environ.get("ANTHROPIC_API_KEY", "").strip()

    @property
    def name(self) -> str:
        return "Anthropic Claude"

    @property
    def is_configured(self) -> bool:
        return (
            not _is_placeholder(self._key)
            and self._key.startswith("sk-ant-")
        )

    def _call(self, prompt: str) -> str:
        import anthropic  # lazy import
        client = anthropic.Anthropic(api_key=self._key)
        message = client.messages.create(
            model=self.MODEL,
            max_tokens=self.MAX_TOKENS,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": prompt}],
        )
        return message.content[0].text

    def analyze_code(self, file_name: str, code: str) -> dict:
        if not self.is_configured:
            print(
                "[ai_service] ClaudeProvider: no valid key — "
                "returning stub issues (development mode)."
            )
            return _stub_issues(file_name)

        prompt = _build_user_prompt(file_name, code)
        raw = self._call(prompt)

        try:
            return _parse_json_response(raw)
        except (json.JSONDecodeError, ValueError):
            pass

        raw = self._call(_build_user_prompt(file_name, code, retry=True))
        try:
            return _parse_json_response(raw)
        except (json.JSONDecodeError, ValueError) as exc:
            raise ValueError(
                f"Claude returned unparseable JSON after retry.\n"
                f"Raw response:\n{raw}"
            ) from exc


# ---------------------------------------------------------------------------
# Factory
# ---------------------------------------------------------------------------

_PROVIDERS: dict[str, type[AIProvider]] = {
    "gemini": GeminiProvider,
    "claude": ClaudeProvider,
}

# Module-level singleton cache
_provider_instance: Optional[AIProvider] = None


def get_ai_provider(force_reload: bool = False) -> AIProvider:
    """
    Return the active AI provider singleton.

    The provider is selected from the ``AI_PROVIDER`` environment variable:
      - ``gemini``  →  GeminiProvider  (default)
      - ``claude``  →  ClaudeProvider

    Set ``force_reload=True`` to recreate the instance (useful for tests).
    """
    global _provider_instance
    if _provider_instance is None or force_reload:
        name = os.environ.get("AI_PROVIDER", "gemini").strip().lower()
        provider_class = _PROVIDERS.get(name, GeminiProvider)
        _provider_instance = provider_class()
        print(f"[ai_service] Using provider: {_provider_instance.name} "
              f"(configured={_provider_instance.is_configured})")
    return _provider_instance
