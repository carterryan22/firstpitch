# Multi-stage Dockerfile for the Player Development Platform (apps/web).
# Bakes the Next.js app + all workspace packages into a slim runtime image.
#
# BUILD CONTEXT IS THE REPO ROOT, not platform/:
#   docker build -f platform/Dockerfile .
# @platform/corpus static-imports `../../../../corpus/*.json`, which resolves to
# the repo-root corpus/ directory — outside platform/. The image mirrors the
# repo layout (/app/platform + /app/corpus) so that relative import resolves
# exactly as it does in the checkout.

FROM node:24-alpine AS deps
WORKDIR /app/platform
COPY platform/package.json platform/package-lock.json* ./
COPY platform/packages ./packages
COPY platform/apps ./apps
RUN npm install --no-audit --no-fund

FROM node:24-alpine AS build
WORKDIR /app/platform
COPY --from=deps /app/platform/node_modules ./node_modules
COPY platform/ ./
COPY corpus /app/corpus
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build:web

FROM node:24-alpine AS runtime
WORKDIR /app/platform
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3030
ENV PLATFORM_DATA_DIR=/data
RUN mkdir -p /data && addgroup -S app && adduser -S app -G app && chown -R app:app /data
COPY --from=build /app /app
USER app
EXPOSE 3030
CMD ["npm", "run", "start", "--", "-p", "3030"]
