from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import httpx
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from app.core.config import Settings
from app.infrastructure.ai.exceptions import AiProviderError, AiProviderUnavailableError


@dataclass(frozen=True, slots=True)
class HttpAiGateway:
    settings: Settings

    def complete(self, *, prompt: str) -> str:
        if not (self.settings.ai_provider and self.settings.ai_api_key and self.settings.ai_model):
            raise AiProviderUnavailableError("AI configuration is incomplete")

        provider = self.settings.ai_provider.lower()
        if provider == "gemini":
            return self._gemini_complete(prompt=prompt)
        if provider == "openai":
            return self._openai_complete(prompt=prompt)

        raise AiProviderUnavailableError(f"Unsupported AI provider: {provider}")

    def _retry_decorator(self):
        attempts = max(1, self.settings.ai_max_retries + 1)
        return retry(
            stop=stop_after_attempt(attempts),
            wait=wait_exponential(
                multiplier=self.settings.ai_retry_backoff_seconds,
                max=self.settings.ai_retry_max_backoff_seconds,
            ),
            retry=retry_if_exception_type((httpx.RequestError, httpx.HTTPStatusError, AiProviderError)),
            reraise=True,
        )

    def _gemini_complete(self, *, prompt: str) -> str:
        decorated = self._retry_decorator()(self._gemini_request)
        return decorated(prompt)

    def _openai_complete(self, *, prompt: str) -> str:
        decorated = self._retry_decorator()(self._openai_request)
        return decorated(prompt)

    def _gemini_request(self, prompt: str) -> str:
        model = self.settings.ai_model
        api_key = self.settings.ai_api_key
        if model is None or api_key is None:
            raise AiProviderUnavailableError("Gemini settings are incomplete")

        url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
            f"?key={api_key}"
        )
        payload = {"contents": [{"parts": [{"text": prompt}]}]}

        with httpx.Client(timeout=self.settings.ai_timeout_seconds) as client:
            response = client.post(url, json=payload)
            response.raise_for_status()
            data = response.json()

        try:
            return data["candidates"][0]["content"]["parts"][0]["text"]
        except (KeyError, IndexError, TypeError) as exc:
            raise AiProviderError("Unexpected Gemini response schema") from exc

    def _openai_request(self, prompt: str) -> str:
        model = self.settings.ai_model
        api_key = self.settings.ai_api_key
        if model is None or api_key is None:
            raise AiProviderUnavailableError("OpenAI settings are incomplete")

        url = "https://api.openai.com/v1/responses"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        payload = {"model": model, "input": prompt}

        with httpx.Client(timeout=self.settings.ai_timeout_seconds) as client:
            response = client.post(url, json=payload, headers=headers)
            response.raise_for_status()
            data: dict[str, Any] = response.json()

        try:
            output = data["output"]
            content = output[0]["content"]
            text = content[0]["text"]
        except (KeyError, IndexError, TypeError) as exc:
            raise AiProviderError("Unexpected OpenAI response schema") from exc

        if not isinstance(text, str):
            raise AiProviderError("OpenAI response text is invalid")

        return text
