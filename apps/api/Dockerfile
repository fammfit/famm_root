FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
RUN npm install -g turbo@2
WORKDIR /app

# Prune workspace
FROM base AS pruner
COPY . .
RUN turbo prune @famm/api --docker

# Install deps
FROM base AS deps
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/package-lock.json ./package-lock.json
RUN npm ci

# Development
FROM base AS development
COPY --from=deps /app/node_modules ./node_modules
COPY --from=pruner /app/out/full/ .
ENV NODE_ENV=development
EXPOSE 4000
CMD ["npm", "run", "dev", "--workspace=@famm/api"]

# Build
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=pruner /app/out/full/ .
ENV NODE_ENV=production
RUN npm run build --workspace=@famm/api

# Production
FROM node:20-alpine AS production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 apiuser
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder --chown=apiuser:nodejs /app/apps/api/dist ./dist
COPY --from=builder --chown=apiuser:nodejs /app/node_modules ./node_modules

USER apiuser
EXPOSE 4000
CMD ["node", "dist/index.js"]
