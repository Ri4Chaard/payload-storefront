# syntax=docker/dockerfile:1

# Production image for the storefront and the Payload admin.
#
# The image is built on the machine it runs on (`docker compose ... up -d --build`), so the
# architecture always matches the host and sharp's native binaries resolve without cross-builds.

ARG NODE_VERSION=22.21.0

FROM node:${NODE_VERSION}-alpine AS base
# COREPACK_HOME lives outside root's home so the pnpm prepared at build time is visible to the
# unprivileged `node` user at runtime instead of being re-downloaded on every start.
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    COREPACK_HOME=/opt/corepack \
    NEXT_TELEMETRY_DISABLED=1
RUN corepack enable
WORKDIR /app

# --- dependencies ------------------------------------------------------------------------------
# `strict-dep-builds=false` downgrades pnpm's error about esbuild's unapproved postinstall (see
# pnpm-workspace.yaml) to a warning. esbuild ships prebuilt binaries and does not need it.

# Everything, dev dependencies included: the build needs Tailwind, TypeScript and tsx.
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --config.strict-dep-builds=false

# Runtime dependencies only — this is what the final image ships.
FROM base AS prod-deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --prod --config.strict-dep-builds=false

# --- build -------------------------------------------------------------------------------------
FROM base AS build

# `next build` inlines NEXT_PUBLIC_* into the client bundle, so the public origin is a build input.
# Changing it requires a rebuild, not a restart.
ARG NEXT_PUBLIC_SERVER_URL=http://localhost:3000
ARG NEXT_PUBLIC_SITE_NAME=
ENV NEXT_PUBLIC_SERVER_URL=$NEXT_PUBLIC_SERVER_URL \
    NEXT_PUBLIC_SITE_NAME=$NEXT_PUBLIC_SITE_NAME

# src/env.ts throws on any missing REQUIRED variable at import time, and payload.config.ts imports
# it. Nothing connects, encrypts or sends mail during the build, so placeholders are enough. They
# stay in this stage: the runner below starts from `base` and never inherits them.
# Keep this list in sync with REQUIRED in src/env.ts.
ENV DATABASE_URI=postgres://build:build@127.0.0.1:5432/build \
    PAYLOAD_SECRET=build-only-not-a-real-secret \
    RESEND_API_KEY=build-only-not-a-real-key \
    EMAIL_FROM_ADDRESS=build@example.invalid

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# The admin import map is gitignored and not produced by `next build`; generate it from this
# image's dependencies rather than trusting a local copy.
RUN pnpm payload generate:importmap
RUN pnpm build

# --- runner ------------------------------------------------------------------------------------
FROM base AS runner
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
# The Payload CLI (`payload migrate`, `payload run` for seeding) reads the TypeScript config,
# migrations and scripts from source. src comes from the build stage because it holds the
# generated admin import map; design/ backs the @tokens/* alias.
COPY --from=build /app/src ./src
COPY --from=build /app/migrations ./migrations
COPY --from=build /app/design ./design
COPY --from=build /app/scripts ./scripts
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml next.config.mjs tsconfig.json ./

# Bake in the pnpm version pinned by package.json so a container start never hits the registry.
RUN corepack prepare --activate && chmod -R a+rX /opt/corepack

# Uploads go to ./media. Creating it here lets a named volume mounted over it inherit ownership.
RUN mkdir -p media && chown -R node:node media .next

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=120s --retries=3 \
    CMD wget -q --spider http://127.0.0.1:3000/ || exit 1

# Apply committed migrations, then start. A failed migration stops the container instead of
# booting the app against the wrong schema. `exec` hands the process over for clean shutdowns.
CMD ["sh", "-c", "pnpm payload migrate && exec pnpm start"]
