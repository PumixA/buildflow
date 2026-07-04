FROM nginx:alpine

# Generate self-signed cert for dev
RUN apk add --no-cache openssl && \
    mkdir -p /etc/nginx/certs && \
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/nginx/certs/key.pem \
    -out /etc/nginx/certs/cert.pem \
    -subj "/CN=localhost"

COPY nginx.conf /etc/nginx/conf.d/default.conf
