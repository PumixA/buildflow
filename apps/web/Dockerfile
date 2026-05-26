FROM node:20-alpine AS deps
WORKDIR /usr/src/app
COPY package*.json ./
COPY apps/web/package.json apps/web/package.json
RUN npm ci --workspace apps/web --include-workspace-root=false

FROM node:20-alpine AS builder
WORKDIR /usr/src/app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY --from=deps /usr/src/app/apps/web/node_modules ./apps/web/node_modules
COPY package*.json ./
COPY apps/web/package.json apps/web/package.json
COPY apps/web ./apps/web
RUN npm --workspace apps/web run build

FROM node:20-alpine AS runtime
WORKDIR /usr/src/app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY --from=deps /usr/src/app/apps/web/node_modules ./apps/web/node_modules
COPY package*.json ./
COPY apps/web/package.json apps/web/package.json
COPY --from=builder /usr/src/app/apps/web/.next ./apps/web/.next
COPY --from=builder /usr/src/app/apps/web/app ./apps/web/app
COPY --from=builder /usr/src/app/apps/web/components ./apps/web/components
COPY --from=builder /usr/src/app/apps/web/lib ./apps/web/lib
COPY --from=builder /usr/src/app/apps/web/next.config.js ./apps/web/next.config.js
EXPOSE 3000
CMD ["npm", "--workspace", "apps/web", "run", "start"]
