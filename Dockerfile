FROM node:20-alpine AS builder

WORKDIR /usr/src/app
COPY package*.json ./
COPY apps/web/package.json apps/web/package.json
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-alpine AS runtime

WORKDIR /usr/src/app
ENV NODE_ENV=production

COPY package*.json ./
COPY apps/web/package.json apps/web/package.json
RUN npm ci --omit=dev

COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/infra ./infra

EXPOSE 3000
CMD ["npm", "run", "start:prod"]
