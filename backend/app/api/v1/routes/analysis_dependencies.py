from fastapi import Depends

from app.application.ports.analysis_pipeline import AnalysisPipeline
from app.application.ports.analysis_repository import AnalysisRepository
from app.application.ports.rule_read_repository import RuleReadRepository
from app.application.use_cases.get_analysis_status import GetAnalysisStatusUseCase
from app.application.use_cases.get_report import GetReportUseCase
from app.application.use_cases.start_analysis import StartAnalysisUseCase
from app.core.config import Settings, get_settings
from app.infrastructure.neo4j.cypher import CypherFileLoader
from app.infrastructure.neo4j.dependencies import get_neo4j_client
from app.infrastructure.neo4j.graph_initializer import get_neo4j_assets_root
from app.infrastructure.neo4j.repositories.analysis_repository import Neo4jAnalysisRepository
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


def get_analysis_pipeline(
    rule_repository: RuleReadRepository = Depends(get_rule_repository),
) -> AnalysisPipeline:
    return DeterministicAnalysisPipeline(rule_repository=rule_repository)


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
