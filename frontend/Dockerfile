# syntax=docker/dockerfile:1
# Marketplace web app (Next.js, standalone output).
#
# NEXT_PUBLIC_* values are baked into the browser bundle at build time:
#   NEXT_PUBLIC_BACKEND_URL  backend URL as seen from the user's browser
#                            (images, WebSocket), e.g. https://api.example.sy
#   BACKEND_INTERNAL_URL     backend URL as seen from this container
#                            (the /api proxy), e.g. http://backend:3001

FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM deps AS build
ARG NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
ARG BACKEND_INTERNAL_URL=http://backend:3001
ENV NEXT_PUBLIC_API_URL=/api \
    NEXT_PUBLIC_BACKEND_URL=$NEXT_PUBLIC_BACKEND_URL \
    BACKEND_INTERNAL_URL=$BACKEND_INTERNAL_URL \
    NEXT_TELEMETRY_DISABLED=1
COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
WORKDIR /app
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
USER node
EXPOSE 3000
CMD ["node", "server.js"]
