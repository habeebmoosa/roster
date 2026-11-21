# Production-style image for self-hosting Roster.
#   docker build -t roster .
# Normally used through docker-compose.yml (app + Postgres/pgvector).

FROM node:22-slim AS base
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

FROM deps AS build
COPY . .
# Build-time placeholders only: env is validated lazily at runtime, but a few
# modules read process.env while `next build` collects page data.
ENV NEXT_TELEMETRY_DISABLED=1 \
    DATABASE_URL=postgresql://build:build@localhost:5432/build \
    APP_URL=http://localhost:3005
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
COPY --from=build /app ./
RUN chmod +x docker/entrypoint.sh
EXPOSE 3005
# Applies migrations, seeds the agents + connector directory, then starts Next.
ENTRYPOINT ["docker/entrypoint.sh"]
CMD ["npm", "run", "start"]
