# Backend Operational Guide

## Runtime
1. Create and activate virtual environment.
2. Install dependencies from `requirements.txt`.
3. Configure environment via `.env` (use `.env.example`).
4. Start API with `uvicorn app.main:app --reload`.

PowerShell example:
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
uvicorn app.main:app --reload
```

## Quality Gates
Run full local quality checks before commit:
```powershell
cd backend
.\scripts\quality_check.ps1
```

The script runs:
1. `ruff check app`
2. `black --check app`
3. `mypy app`
4. `pytest -q`

## Key Environment Variables
1. `APP_ENV`, `APP_HOST`, `APP_PORT`, `API_V1_PREFIX`
2. `FILE_STORAGE_PATH`, `MAX_UPLOAD_MB`
3. `NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD`, `NEO4J_DATABASE`
4. `NEO4J_INIT_ON_STARTUP`, `NEO4J_ASSETS_PATH`
5. `AI_PROVIDER`, `AI_API_KEY`, `AI_MODEL`
6. `AI_TIMEOUT_SECONDS`, `AI_MAX_RETRIES`, `AI_RETRY_BACKOFF_SECONDS`, `AI_RETRY_MAX_BACKOFF_SECONDS`
7. `AI_SIMILAR_CASES_LIMIT`

## Diagnostics
1. Health check: `GET /api/v1/health`.
2. If Neo4j is not configured, health returns `neo4j_status=not_configured`.
3. If AI is unavailable or misconfigured, analysis must continue in `RULE_ONLY` mode.
4. All errors return unified payload: `code`, `message`, `details`, `trace_id`.
5. Use `X-Trace-Id` header to correlate API logs and errors.

## Common Issues
1. `NEO4J_CONFIG_ERROR`: set `NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD`.
2. AI provider errors/timeouts: verify AI env vars; fallback mode should still work.
3. Validation errors (`422`): inspect `details` field for invalid DTO payload.
