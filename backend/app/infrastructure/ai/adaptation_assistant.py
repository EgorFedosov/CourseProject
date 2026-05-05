from __future__ import annotations

from dataclasses import dataclass

from app.application.ports.ai_assistant import AiAssistant, AiSuggestion
from app.domain.entities.correction_case import CorrectionCase
from app.infrastructure.ai.gateway import HttpAiGateway
from app.infrastructure.ai.json_parser import StrictAiResponseParser
from app.infrastructure.ai.prompt_builder import AiPromptBuilder


@dataclass(frozen=True, slots=True)
class AdaptationAiAssistant(AiAssistant):
    gateway: HttpAiGateway
    prompt_builder: AiPromptBuilder
    parser: StrictAiResponseParser

    def suggest(
        self,
        *,
        doc_features: dict[str, object],
        similar_cases: list[CorrectionCase],
    ) -> AiSuggestion | None:
        prompt = self.prompt_builder.build(
            doc_features=doc_features,
            similar_cases=similar_cases,
        )

        try:
            raw_response = self.gateway.complete(prompt=prompt)
            return self.parser.parse(raw_text=raw_response)
        except Exception:  # noqa: BLE001
            return None
