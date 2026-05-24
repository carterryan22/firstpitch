# Multi-stage Dockerfile for the Player Development Platform (apps/web).
# Bakes the Next.js app + all workspace packages into a slim runtime image.

FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
COPY packages ./packages
COPY apps ./apps
RUN npm install --no-audit --no-fund

FROM node:24-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build:web

FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3030
ENV PLATFORM_DATA_DIR=/data
RUN mkdir -p /data && addgroup -S app && adduser -S app -G app && chown -R app:app /data
COPY --from=build /app /app
USER app
EXPOSE 3030
CMD ["npm", "run", "start", "--", "-p", "3030"]
