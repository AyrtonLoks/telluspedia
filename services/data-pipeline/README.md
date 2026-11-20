# TellusPedia Data & Astronomy Pipeline

Serviço FastAPI responsável por cálculos astronômicos solares (NOAA) e proxy de clima (Open-Meteo com cache em Redis).

## Requisitos

- Python 3.12+
- [`uv`](https://docs.astral.sh/uv/) (recomendado, usa `uv.lock`) **ou** `python -m venv` + `pip` (usa `requirements.lock`)

## Ambiente local e testes (`pytest`)

### Opção 1 — com `uv` (reproduzível via `uv.lock`)

```bash
cd services/data-pipeline
uv sync --frozen
uv run pytest
```

### Opção 2 — com `python -m venv` e `pip`

```bash
cd services/data-pipeline
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.lock pytest==9.2.0
pytest
```

### Atualizar o lock de dependências

```bash
cd services/data-pipeline
uv lock
uv export --frozen --no-dev --no-hashes --no-emit-project --format requirements-txt -o requirements.lock
```

## Variáveis de ambiente

| Variável | Padrão | Descrição |
|---|---|---|
| `ALLOWED_ORIGINS` | `http://localhost:3000,http://127.0.0.1:3000` | Lista separada por vírgulas de origens permitidas no CORS (não aceita `*`). |
| `CORS_ALLOW_CREDENTIALS` | `false` | Permite credenciais CORS somente se explicitamente habilitado. |
| `REDIS_URL` | `redis://localhost:6379/0` | URL de conexão do Redis. |
| `REDIS_RECONNECT_BACKOFF_SECONDS` | `30` | Janela de backoff (segundos) sem novas tentativas de reconexão quando o Redis estiver indisponível. |
| `WEATHER_CACHE_TTL_SECONDS` | `900` | TTL do cache de clima em segundos (15 minutos). |

## Docker

```bash
# Na raiz do repositório
docker compose up --build -d data-pipeline

# Verificar healthcheck (deve reportar "healthy")
docker inspect --format '{{.State.Health.Status}}' telluspedia-data-pipeline

# Verificar usuário não-root (deve retornar "appuser")
docker exec telluspedia-data-pipeline whoami
```
