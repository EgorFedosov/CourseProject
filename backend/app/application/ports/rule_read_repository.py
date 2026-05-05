from typing import Protocol

from app.domain.entities.requirement import Requirement


class RuleReadRepository(Protocol):
    def get_active_rules_for_type_and_semester(
        self,
        *,
        document_type_code: str,
        semester_number: int,
    ) -> list[Requirement]: ...
