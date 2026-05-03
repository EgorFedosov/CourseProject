from typing import Protocol

from app.domain.entities.correction_case import CorrectionCase


class FeedbackRepository(Protocol):
    def save_correction_case(self, *, correction_case: CorrectionCase) -> None:
        ...

    def get_similar_correction_cases(
        self,
        *,
        document_type_code: str | None,
        semester_number: int | None,
        limit: int = 5,
    ) -> list[CorrectionCase]:
        ...
