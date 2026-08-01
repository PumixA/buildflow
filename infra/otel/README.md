# OpenTelemetry Collector

Collecteur de télémétrie pour les traces et métriques.

## Rôle

- Reçoit les traces OTLP de l'API Gateway (gRPC :4317, HTTP :4318)
- Exporte en console (debug) et Prometheus (:9464)
- Applique des règles de détection SIEM (brute-force, accès non autorisé, modifications critiques)

## Règles SIEM

| Règle | Déclencheur | Niveau |
|---|---|---|
| Brute-force | >5 échecs `/auth/session` en 60s | WARN |
| Accès non autorisé | HTTP 403 | WARN |
| Modification critique | Route `/close` | INFO |

## Configuration

- `otel-collector.yml` : pipelines traces + métriques, règles de transformation

## Démarrage

```bash
docker compose up -d otel-collector
```

Métriques Prometheus : `http://localhost:9464/metrics`
