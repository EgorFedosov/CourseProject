import pytest
from pydantic import ValidationError

from app.infrastructure.ai.json_parser import StrictAiResponseParser


def test_strict_ai_response_parser_parses_valid_contract() -> None:
    parser = StrictAiResponseParser()
    raw = (
        '{"predicted_type":"COURSE_PROJECT_NOTE",'
        '"type_confidence":0.87,'
        '"predicted_semester":4,'
        '"semester_confidence":0.91,'
        '"explanations":["marker found"],'
        '"risk_flags":[]}'
    )

    suggestion = parser.parse(raw_text=raw)

    assert suggestion.predicted_type == "COURSE_PROJECT_NOTE"
    assert suggestion.predicted_semester == 4
    assert suggestion.type_confidence == 0.87


def test_strict_ai_response_parser_rejects_invalid_payload() -> None:
    parser = StrictAiResponseParser()

    with pytest.raises(ValidationError):
        parser.parse(raw_text='{"predicted_type":"COURSE_PROJECT_NOTE"}')
