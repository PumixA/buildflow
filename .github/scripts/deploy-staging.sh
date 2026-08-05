#!/usr/bin/env bash
set -euo pipefail

required_vars=(
  STAGING_URL
  STAGING_SSH_HOST
  STAGING_SSH_USER
  STAGING_DEPLOY_PATH
  STAGING_IMAGE
)

for var_name in "${required_vars[@]}"; do
  if [[ -z "${!var_name:-}" ]]; then
    echo "${var_name} non défini. Déploiement stoppé."
    exit 1
  fi
done

if [[ -z "${STAGING_SSH_PORT:-}" ]]; then
  STAGING_SSH_PORT="22"
fi

if [[ -z "${STAGING_IMAGE_TAG:-}" ]]; then
  STAGING_IMAGE_TAG="${GITHUB_SHA:-latest}"
fi

echo "Déploiement staging BuildFlow en cours..."
echo "Cible URL: ${STAGING_URL}"
echo "Hôte SSH: ${STAGING_SSH_USER}@${STAGING_SSH_HOST}:${STAGING_SSH_PORT}"
echo "Image: ${STAGING_IMAGE}:${STAGING_IMAGE_TAG}"

ssh -p "${STAGING_SSH_PORT}" "${STAGING_SSH_USER}@${STAGING_SSH_HOST}" "mkdir -p '${STAGING_DEPLOY_PATH}'"

ssh -p "${STAGING_SSH_PORT}" "${STAGING_SSH_USER}@${STAGING_SSH_HOST}" <<EOSSH
set -euo pipefail
cd "${STAGING_DEPLOY_PATH}"
cat > docker-compose.yml <<EOF
services:
  buildflow-api:
    image: ${STAGING_IMAGE}:${STAGING_IMAGE_TAG}
    container_name: buildflow-api
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${STAGING_DATABASE_URL:-}
      - OIDC_ISSUER=${OIDC_ISSUER:-}
      - OIDC_AUDIENCE=${OIDC_AUDIENCE:-}
      - OIDC_JWKS_URI=${OIDC_JWKS_URI:-}
      - OIDC_REQUIRE_MFA=true
      - S3_REGION=${S3_REGION:-}
      - S3_WORM_BUCKET=${S3_WORM_BUCKET:-}
      - AMQP_URL=${AMQP_URL:-}
EOF
docker compose pull
docker compose up -d --remove-orphans
EOSSH

if [[ $? -ne 0 ]]; then
  echo "Erreur de déploiement staging."
  exit 1
fi

echo "Déploiement staging terminé."
