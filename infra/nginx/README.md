# Nginx — Reverse Proxy TLS

Reverse proxy devant l'API Gateway et le frontend Web.

## Rôle

- Termine le TLS (certificats auto-signés en développement, Let's Encrypt en production)
- Route `/api/*` → API Gateway (port 3000)
- Route `/` → Web Next.js (port 3001)
- Redirige HTTP → HTTPS

## Configuration

- `nginx.conf` : règles de proxy, headers de sécurité (HSTS, CSP, X-Frame-Options)
- `Dockerfile` : image nginx:alpine avec certificats auto-générés

## Démarrage

```bash
docker compose up -d nginx
```

Accès : `https://localhost/health`
