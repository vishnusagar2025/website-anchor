"""
chat_service.py — Anchor AI Chatbot
Multi-turn conversational AI using the configured provider (Gemini or Claude).

System prompt focuses on DevOps/SRE expertise so the chatbot is deeply
contextual for the Anchor use-case: log triage, runbook understanding,
incident response, and general engineering help.
"""

from __future__ import annotations

import os
import re
import json
from typing import Optional

# ---------------------------------------------------------------------------
# System prompt — gives the chatbot its persona
# ---------------------------------------------------------------------------

CHAT_SYSTEM_PROMPT = (
    "You are Anchor AI, an expert DevOps and Site Reliability Engineering (SRE) assistant "
    "embedded inside the Anchor engineering intelligence platform. "
    "You help engineers debug production incidents, understand log patterns, interpret runbooks, "
    "review code for issues, explain infrastructure concepts, and solve real-world engineering problems. "
    "Be concise, precise, and practical. Use markdown formatting in your responses (code blocks, bullet points). "
    "If the user shares logs or error output, analyze them thoroughly. "
    "If you don't know something, say so honestly. Never make up commands or API names."
)

# ---------------------------------------------------------------------------
# Gemini multi-turn chat
# ---------------------------------------------------------------------------

def _chat_with_gemini(history: list[dict], user_message: str, context: Optional[str]) -> str:
    """Use Gemini's multi-turn chat API."""
    import google.generativeai as genai

    api_key = os.environ.get("GEMINI_API_KEY", "").strip()
    genai.configure(api_key=api_key)

    model = genai.GenerativeModel(
        model_name="gemini-2.5-flash",
        system_instruction=CHAT_SYSTEM_PROMPT,
    )

    # Build Gemini-compatible history (role must be 'user' or 'model')
    gemini_history = []
    for msg in history:
        role = "user" if msg["role"] == "user" else "model"
        gemini_history.append({"role": role, "parts": [msg["content"]]})

    chat = model.start_chat(history=gemini_history)

    # Inject optional context into the user message
    full_message = user_message
    if context and context.strip():
        full_message = (
            f"[Context provided by user — use this to answer the question below]\n"
            f"```\n{context.strip()}\n```\n\n"
            f"{user_message}"
        )

    response = chat.send_message(full_message)
    return response.text


# ---------------------------------------------------------------------------
# Claude multi-turn chat
# ---------------------------------------------------------------------------

def _chat_with_claude(history: list[dict], user_message: str, context: Optional[str]) -> str:
    """Use Claude's messages API with conversation history."""
    import anthropic

    api_key = os.environ.get("ANTHROPIC_API_KEY", "").strip()
    client = anthropic.Anthropic(api_key=api_key)

    # Build messages list from history
    messages = []
    for msg in history:
        messages.append({"role": msg["role"], "content": msg["content"]})

    # Inject context into the new user message
    full_message = user_message
    if context and context.strip():
        full_message = (
            f"[Context provided by user — use this to answer the question below]\n"
            f"```\n{context.strip()}\n```\n\n"
            f"{user_message}"
        )

    messages.append({"role": "user", "content": full_message})

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2048,
        system=CHAT_SYSTEM_PROMPT,
        messages=messages,
    )
    return response.content[0].text


# ---------------------------------------------------------------------------
# Stub response (when no API key is configured)
# ---------------------------------------------------------------------------

STUB_RESPONSES = [
    "I'm Anchor AI, your DevOps assistant! I'm currently running in **demo mode** — no API key is configured.\n\nTo enable full AI responses, add your `GEMINI_API_KEY` or `ANTHROPIC_API_KEY` to the `.env` file.\n\nIn the meantime, ask me anything about logs, incidents, or runbooks!",
    "🔧 **Demo Mode Active** — I'd normally analyze that for you in detail, but I need a valid API key to generate real responses.\n\nSet `GEMINI_API_KEY=your_key` in `.env` to get started!",
    "Great question! In live mode, I can help you:\n- 🔍 **Analyze logs** and identify root causes\n- 📋 **Explain runbooks** step by step\n- 🛡️ **Review code** for security and bugs\n- ⚡ **Suggest fixes** for production incidents\n\nConfigure your API key to unlock full capabilities.",
]

_stub_index = 0

def _stub_response() -> str:
    global _stub_index
    response = STUB_RESPONSES[_stub_index % len(STUB_RESPONSES)]
    _stub_index += 1
    return response


# ---------------------------------------------------------------------------
# Public interface
# ---------------------------------------------------------------------------

PLACEHOLDER_KEYS = {
    "", "your_free_api_key_here", "your_gemini_key_here",
    "sk-ant-xxxxx", "YOUR_API_KEY_HERE", "none", "null",
}


def _is_placeholder(key: Optional[str]) -> bool:
    return not key or key.strip().lower() in PLACEHOLDER_KEYS


def chat(history: list[dict], user_message: str, context: Optional[str] = None) -> str:
    """
    Send a message and get a response from the configured AI provider.

    Args:
        history: List of previous messages [{"role": "user"|"assistant", "content": "..."}]
        user_message: The latest user message (NOT yet in history)
        context: Optional context (logs, runbook text) to inject into the prompt

    Returns:
        The AI assistant's response string (may contain markdown).
    """
    provider = os.environ.get("AI_PROVIDER", "gemini").strip().lower()

    if provider == "claude":
        api_key = os.environ.get("ANTHROPIC_API_KEY", "").strip()
        if _is_placeholder(api_key) or not api_key.startswith("sk-ant-"):
            print("[chat_service] Claude: no valid key — returning stub response.")
            return _stub_response()
        try:
            return _chat_with_claude(history, user_message, context)
        except Exception as exc:
            print(f"[chat_service] Claude error: {exc}")
            return f"⚠️ Claude API error: {exc}\n\nPlease check your API key or try again."

    else:  # gemini (default)
        api_key = os.environ.get("GEMINI_API_KEY", "").strip()
        if _is_placeholder(api_key):
            print("[chat_service] Gemini: no valid key — returning stub response.")
            return _stub_response()
        try:
            return _chat_with_gemini(history, user_message, context)
        except Exception as exc:
            print(f"[chat_service] Gemini error: {exc}")
            return f"⚠️ Gemini API error: {exc}\n\nPlease check your API key or try again."
