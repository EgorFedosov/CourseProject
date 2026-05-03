from dataclasses import dataclass

from app.application.dto.health import ServiceStatus
from app.infrastructure.neo4j.health_probe import Neo4jHealthProbe


@dataclass
class _StubSettings:
    has_neo4j_config: bool


class _StubClient:
    def __init__(self, *, has_config: bool, should_fail: bool) -> None:
        self.settings = _StubSettings(has_neo4j_config=has_config)
        self._should_fail = should_fail

    def verify_connectivity(self) -> None:
        if self._should_fail:
            raise RuntimeError("connectivity failed")


def test_health_probe_returns_not_configured_without_neo4j_settings() -> None:
    probe = Neo4jHealthProbe(client=_StubClient(has_config=False, should_fail=False))
    assert probe.check() == ServiceStatus.NOT_CONFIGURED


def test_health_probe_returns_down_when_connectivity_fails() -> None:
    probe = Neo4jHealthProbe(client=_StubClient(has_config=True, should_fail=True))
    assert probe.check() == ServiceStatus.DOWN


def test_health_probe_returns_up_when_connectivity_is_available() -> None:
    probe = Neo4jHealthProbe(client=_StubClient(has_config=True, should_fail=False))
    assert probe.check() == ServiceStatus.UP
