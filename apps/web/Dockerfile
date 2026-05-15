FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
RUN npm install -g turbo@2
WORKDIR /app

# Prune workspace for web app
FROM base AS pruner
COPY . .
RUN turbo prune @famm/web --docker

# Install dependencies
FROM base AS deps
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/package-lock.json ./package-lock.json
RUN npm ci

# Development target
FROM base AS development
COPY --from=deps /app/node_modules ./node_modules
COPY --from=pruner /app/out/full/ .
ENV NODE_ENV=development
ENV NEXT_TELEMETRY_DISABLED=1
EXPOSE 3000
CMD ["npm", "run", "dev", "--workspace=@famm/web"]

# Build
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=pruner /app/out/full/ .
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN npm run build --workspace=@famm/web

# Production
FROM node:20-alpine AS production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

USER nextjs
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
