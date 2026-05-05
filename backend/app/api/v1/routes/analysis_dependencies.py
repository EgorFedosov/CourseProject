from fastapi import Depends

from app.application.ports.ai_assistant import AiAssistant
from app.application.ports.analysis_pipeline import AnalysisPipeline
from app.application.ports.analysis_repository import AnalysisRepository
from app.application.ports.feedback_repository import FeedbackRepository
from app.application.ports.rule_read_repository import RuleReadRepository
from app.application.use_cases.get_analysis_status import GetAnalysisStatusUseCase
from app.application.use_cases.get_report import GetReportUseCase
from app.application.use_cases.start_analysis import StartAnalysisUseCase
from app.application.use_cases.submit_feedback_corrections import (
    SubmitFeedbackCorrectionsUseCase,
)
from app.core.config import Settings, get_settings
from app.infrastructure.ai.adaptation_assistant import AdaptationAiAssistant
from app.infrastructure.ai.gateway import HttpAiGateway
from app.infrastructure.ai.json_parser import StrictAiResponseParser
from app.infrastructure.ai.prompt_builder import AiPromptBuilder
from app.infrastructure.neo4j.cypher import CypherFileLoader
from app.infrastructure.neo4j.dependencies import get_neo4j_client
from app.infrastructure.neo4j.graph_initializer import get_neo4j_assets_root
from app.infrastructure.neo4j.repositories.analysis_repository import Neo4jAnalysisRepository
from app.infrastructure.neo4j.repositories.feedback_repository import Neo4jFeedbackRepository
from app.infrastructure.neo4j.repositories.rule_repository import Neo4jRuleRepository
from app.infrastructure.pipeline.deterministic_pipeline import DeterministicAnalysisPipeline


def get_cypher_loader(settings: Settings = Depends(get_settings)) -> CypherFileLoader:
    return CypherFileLoader(assets_root=get_neo4j_assets_root(settings))


def get_analysis_repository(
    cypher_loader: CypherFileLoader = Depends(get_cypher_loader),
) -> AnalysisRepository:
    return Neo4jAnalysisRepository(client=get_neo4j_client(), cypher_loader=cypher_loader)


def get_rule_repository(
    cypher_loader: CypherFileLoader = Depends(get_cypher_loader),
) -> RuleReadRepository:
    return Neo4jRuleRepository(client=get_neo4j_client(), cypher_loader=cypher_loader)


def get_feedback_repository(
    cypher_loader: CypherFileLoader = Depends(get_cypher_loader),
) -> FeedbackRepository:
    return Neo4jFeedbackRepository(client=get_neo4j_client(), cypher_loader=cypher_loader)


def get_ai_assistant(settings: Settings = Depends(get_settings)) -> AiAssistant | None:
    has_required_ai_config = bool(
        settings.ai_provider and settings.ai_api_key and settings.ai_model
    )
    if not has_required_ai_config:
        return None

    return AdaptationAiAssistant(
        gateway=HttpAiGateway(settings=settings),
        prompt_builder=AiPromptBuilder(),
        parser=StrictAiResponseParser(),
    )


def get_analysis_pipeline(
    rule_repository: RuleReadRepository = Depends(get_rule_repository),
    feedback_repository: FeedbackRepository = Depends(get_feedback_repository),
    ai_assistant: AiAssistant | None = Depends(get_ai_assistant),
    settings: Settings = Depends(get_settings),
) -> AnalysisPipeline:
    return DeterministicAnalysisPipeline(
        rule_repository=rule_repository,
        feedback_repository=feedback_repository,
        ai_assistant=ai_assistant,
        similar_cases_limit=settings.ai_similar_cases_limit,
    )


def get_start_analysis_use_case(
    repository: AnalysisRepository = Depends(get_analysis_repository),
    pipeline: AnalysisPipeline = Depends(get_analysis_pipeline),
) -> StartAnalysisUseCase:
    return StartAnalysisUseCase(repository=repository, pipeline=pipeline)


def get_analysis_status_use_case(
    repository: AnalysisRepository = Depends(get_analysis_repository),
) -> GetAnalysisStatusUseCase:
    return GetAnalysisStatusUseCase(repository=repository)


def get_report_use_case(
    repository: AnalysisRepository = Depends(get_analysis_repository),
) -> GetReportUseCase:
    return GetReportUseCase(repository=repository)


def get_submit_feedback_use_case(
    settings: Settings = Depends(get_settings),
    analysis_repository: AnalysisRepository = Depends(get_analysis_repository),
    feedback_repository: FeedbackRepository = Depends(get_feedback_repository),
    ai_assistant: AiAssistant | None = Depends(get_ai_assistant),
) -> SubmitFeedbackCorrectionsUseCase:
    return SubmitFeedbackCorrectionsUseCase(
        analysis_repository=analysis_repository,
        feedback_repository=feedback_repository,
        settings=settings,
        ai_assistant=ai_assistant,
    )
