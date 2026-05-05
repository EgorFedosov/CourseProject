from __future__ import annotations

import json
from dataclasses import dataclass

from app.domain.entities.correction_case import CorrectionCase


@dataclass(frozen=True, slots=True)
class AiPromptBuilder:
    def build(
        self,
        *,
        doc_features: dict[str, object],
        similar_cases: list[CorrectionCase],
    ) -> str:
        examples = [
            {
                "case_id": case.case_id,
                "predicted_type": case.predicted_type,
                "final_type": case.final_type,
                "predicted_semester": case.predicted_semester,
                "final_semester": case.final_semester,
                "teacher_comment": case.teacher_comment,
                "predicted_violations": case.predicted_violations_json,
                "final_violations": case.final_violations_json,
            }
            for case in similar_cases
        ]

        return (
            "You are assisting with document classification. "
            "Use the corrected examples to refine your prediction. "
            "Return ONLY valid JSON with this exact schema: "
            "{predicted_type:str,type_confidence:0..1,predicted_semester:int,"
            "semester_confidence:0..1,explanations:list[str],risk_flags:list[str]}.\n"
            f"Document features: {json.dumps(doc_features, ensure_ascii=True)}\n"
            f"Similar corrected cases: {json.dumps(examples, ensure_ascii=True)}"
        )
