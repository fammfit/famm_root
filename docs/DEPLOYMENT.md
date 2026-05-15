# Deployment

## 1. Overview

This document describes the deployment strategy for the booking system, including environments, release process, infrastructure setup, and operational procedures.

## 2. Environments

### 2.1 Development

**Purpose**: Local development and testing

**Configuration**:
- Single machine setup with Docker Compose
- Database: PostgreSQL (containerized)
- Cache: Redis (containerized)
- Email: Mailhog (local mail server)
- No external dependencies

**Setup**:
```bash
# Clone repository
git clone https://github.com/company/booking-system.git
cd booking-system

# Install dependencies
npm install

# Start services
docker-compose up

# Initialize database
npm run db:migrate
npm run db:seed

# Start application
npm run dev

# API available at http://localhost:3000
```

**docker-compose.yml**:
```yaml
version: '3.8'

services:
  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: development
      DATABASE_URL: postgresql://user:password@db:5432/booking_dev
      REDIS_URL: redis://cache:6379
      JWT_SECRET: dev_secret_key
    depends_on:
      - db
      - cache

  db:
    image: postgres:14
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
      POSTGRES_DB: booking_dev
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  cache:
    image: redis:6
    ports:
      - "6379:6379"

  mailhog:
    image: mailhog/mailhog
    ports:
      - "1025:1025"
      - "8025:8025"

volumes:
  postgres_data:
```

### 2.2 Staging

**Purpose**: Testing before production release

**Configuration**:
- Kubernetes cluster (single node or small multi-node)
- Managed database (AWS RDS or GCP Cloud SQL)
- Managed cache (AWS ElastiCache or GCP Memorystore)
- Email: SendGrid or AWS SES
- CDN: CloudFront or Cloudflare

**Infrastructure**:
- 2 API replicas (for redundancy testing)
- Load balancer
- Database backups (daily)
- Log aggregation

**Deployment**:
```bash
# Build and push image
docker build -t booking-system:staging .
docker tag booking-system:staging registry.example.com/booking-system:staging
docker push registry.example.com/booking-system:staging

# Deploy to Kubernetes
kubectl apply -f k8s/staging/deployment.yaml
kubectl set image deployment/booking-api \
  booking-api=registry.example.com/booking-system:staging \
  -n staging

# Verify rollout
kubectl rollout status deployment/booking-api -n staging
```

### 2.3 Production

**Purpose**: Live service for customers

**Configuration**:
- Kubernetes cluster (multi-node with auto-scaling)
- Managed database (AWS RDS Multi-AZ or GCP Cloud SQL HA)
- Managed cache (Redis Cluster or AWS ElastiCache Cluster)
- Email: Dedicated provider
- CDN: Global CDN with edge locations

**Infrastructure**:
- 5-10+ API replicas (auto-scaling 3-10)
- Load balancer with health checks
- Database read replicas
- Automated backups (hourly)
- Point-in-time recovery
- Log aggregation and monitoring
- Alerting and on-call rotation

**High Availability**:
- Multi-AZ database (automatic failover)
- Redis cluster (high availability)
- Blue-green deployments
- Canary deployments for gradual rollout
- Rollback capability

---

## 3. Release Process

### 3.1 Semantic Versioning

Version format: `MAJOR.MINOR.PATCH`

- **MAJOR**: Breaking API changes
- **MINOR**: New features, backward compatible
- **PATCH**: Bug fixes

Example: `1.2.5`

### 3.2 Release Workflow

```
1. Create release branch from main
2. Bump version number
3. Update CHANGELOG
4. Create pull request
5. Code review and approval
6. Merge to main (creates git tag)
7. Build Docker image
8. Push to image registry
9. Deploy to staging
10. Run integration tests
11. Get approval for production
12. Deploy to production
13. Monitor metrics
14. Send release notes
```

### 3.3 Branching Strategy

**Main**: Production-ready code
- Protected branch
- Requires pull request review
- Must pass all CI checks
- Automatically tagged on merge

**Develop**: Integration branch
- Default branch for pull requests
- Latest features merged here
- Pre-release testing

**Feature branches**: `feature/FEATURE-NAME`
- Branch from develop
- Merged via pull request
- Delete after merge

**Hotfix branches**: `hotfix/ISSUE-NAME`
- Branch from main for production issues
- Merged to main AND develop
- Used for emergency fixes

### 3.4 Pull Request Process

```yaml
1. Developer creates feature branch
2. Implements feature or fix
3. Pushes branch to repository
4. Opens pull request with:
   - Clear title and description
   - Reference to issue number
   - Checklist of changes
   - Screenshots (if UI changes)
5. CI/CD pipeline runs automatically
   - Linting checks
   - Unit tests
   - Integration tests
   - Code coverage
   - Security scanning
6. Code review by 2+ team members
   - Check code quality
   - Check for security issues
   - Check for performance implications
7. Approval and merge
8. CI/CD pipeline deploys changes
```

---

## 4. CI/CD Pipeline

### 4.1 GitHub Actions Workflow

**File**: `.github/workflows/ci-cd.yml`

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  lint-and-test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      
      redis:
        image: redis:6
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Lint
        run: npm run lint
      
      - name: Run unit tests
        run: npm run test:unit
        env:
          NODE_ENV: test
      
      - name: Run integration tests
        run: npm run test:integration
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/booking_test
          REDIS_URL: redis://localhost:6379
      
      - name: Generate coverage report
        run: npm run test:coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info

  build-and-push:
    runs-on: ubuntu-latest
    needs: lint-and-test
    if: github.event_name == 'push'
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2
      
      - name: Login to registry
        uses: docker/login-action@v2
        with:
          registry: registry.example.com
          username: ${{ secrets.REGISTRY_USERNAME }}
          password: ${{ secrets.REGISTRY_PASSWORD }}
      
      - name: Extract version
        id: version
        run: echo "::set-output name=tag::$(git describe --tags --always)"
      
      - name: Build and push
        uses: docker/build-push-action@v4
        with:
          context: .
          push: true
          tags: |
            registry.example.com/booking-system:latest
            registry.example.com/booking-system:${{ steps.version.outputs.tag }}
          cache-from: type=registry,ref=registry.example.com/booking-system:buildcache
          cache-to: type=registry,ref=registry.example.com/booking-system:buildcache,mode=max

  deploy-staging:
    runs-on: ubuntu-latest
    needs: build-and-push
    if: github.ref == 'refs/heads/develop'
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Configure kubectl
        run: |
          echo "${{ secrets.KUBE_CONFIG }}" | base64 -d > kubeconfig
          export KUBECONFIG=$(pwd)/kubeconfig
      
      - name: Deploy to staging
        run: |
          kubectl set image deployment/booking-api \
            booking-api=registry.example.com/booking-system:latest \
            -n staging
          kubectl rollout status deployment/booking-api -n staging

  deploy-production:
    runs-on: ubuntu-latest
    needs: [lint-and-test, build-and-push]
    if: github.ref == 'refs/heads/main'
    
    environment: production
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Configure kubectl
        run: |
          echo "${{ secrets.KUBE_CONFIG }}" | base64 -d > kubeconfig
          export KUBECONFIG=$(pwd)/kubeconfig
      
      - name: Blue-green deployment
        run: |
          # Deploy to green environment
          kubectl set image deployment/booking-api-green \
            booking-api=registry.example.com/booking-system:latest \
            -n production
          
          # Wait for green to be ready
          kubectl rollout status deployment/booking-api-green -n production
          
          # Switch traffic to green
          kubectl patch service booking-api -p '{"spec":{"selector":{"version":"green"}}}'
          
          # Keep blue for quick rollback
          sleep 300  # Monitor for 5 minutes
```

### 4.2 Docker Build

**Dockerfile**:

```dockerfile
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Runtime stage
FROM node:18-alpine

WORKDIR /app

# Install curl for health checks
RUN apk add --no-cache curl

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["node", "dist/index.js"]
```

---

## 5. Infrastructure as Code

### 5.1 Kubernetes Deployment

**File**: `k8s/production/deployment.yaml`

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: booking-api
  namespace: production
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: booking-api
  template:
    metadata:
      labels:
        app: booking-api
        version: v1
    spec:
      serviceAccountName: booking-api
      imagePullSecrets:
        - name: registry-credentials
      
      containers:
      - name: booking-api
        image: registry.example.com/booking-system:latest
        imagePullPolicy: IfNotPresent
        
        ports:
        - name: http
          containerPort: 3000
        
        env:
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: database-url
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: redis-url
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: jwt-secret
        - name: LOG_LEVEL
          value: "info"
        
        resources:
          requests:
            cpu: 250m
            memory: 256Mi
          limits:
            cpu: 500m
            memory: 512Mi
        
        livenessProbe:
          httpGet:
            path: /health
            port: http
          initialDelaySeconds: 15
          periodSeconds: 20
          timeoutSeconds: 5
          failureThreshold: 3
        
        readinessProbe:
          httpGet:
            path: /ready
            port: http
          initialDelaySeconds: 5
          periodSeconds: 10
          timeoutSeconds: 3
          failureThreshold: 2

---
apiVersion: v1
kind: Service
metadata:
  name: booking-api
  namespace: production
spec:
  type: ClusterIP
  selector:
    app: booking-api
  ports:
  - name: http
    port: 80
    targetPort: http

---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: booking-api-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: booking-api
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

### 5.2 Database Setup

```bash
# Create database
createdb booking_prod

# Run migrations
npm run db:migrate -- --env production

# Create backup schedule
# (Automated by cloud provider RDS/Cloud SQL)

# Enable automatic backups
# AWS: RDS backup retention = 30 days
# GCP: Automated backups enabled
```

### 5.3 Redis Cluster

```yaml
# For production high availability
# Use managed service: AWS ElastiCache or GCP Memorystore

# Redis configuration
cluster-enabled: yes
cluster-node-timeout: 5000
cluster-replica-validity-factor: 10
```

---

## 6. Database Migrations

### 6.1 Migration Framework

Use Knex.js for database migrations:

```javascript
// knexfile.js
module.exports = {
  development: {
    client: 'postgresql',
    connection: process.env.DATABASE_URL,
    migrations: { directory: './migrations' }
  },
  staging: {
    client: 'postgresql',
    connection: process.env.DATABASE_URL,
    migrations: { directory: './migrations' }
  },
  production: {
    client: 'postgresql',
    connection: process.env.DATABASE_URL,
    migrations: { directory: './migrations' }
  }
};
```

### 6.2 Creating Migrations

```bash
# Create migration
npm run db:migrate:create -- add_users_table

# Run migrations
npm run db:migrate -- --env production

# Rollback migrations
npm run db:rollback -- --env production
```

### 6.3 Migration Best Practices

- One change per migration
- Always provide down/rollback
- Test rollback before deploying
- Avoid long locks (drop table) on large tables
- Use `concurrent: false` if changing schema

---

## 7. Monitoring and Alerts

### 7.1 Health Checks

**Endpoint**: `GET /health`

```javascript
app.get('/health', async (req, res) => {
  try {
    // Check database connectivity
    await db.raw('SELECT 1');
    
    // Check Redis connectivity
    await redis.ping();
    
    res.json({
      status: 'healthy',
      timestamp: new Date(),
      uptime: process.uptime()
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});
```

### 7.2 Metrics Collection

```javascript
// Using Prometheus client
const prometheus = require('prom-client');

// Create metrics
const httpRequestDuration = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status']
});

const bookingCounter = new prometheus.Counter({
  name: 'bookings_total',
  help: 'Total bookings created',
  labelNames: ['status', 'provider']
});

// Expose metrics
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', prometheus.register.contentType);
  res.end(await prometheus.register.metrics());
});
```

### 7.3 Alert Rules

```yaml
# Prometheus alert rules
groups:
  - name: booking_system
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        annotations:
          summary: High error rate detected
      
      - alert: DatabaseConnectionFailure
        expr: pg_up == 0
        for: 1m
        annotations:
          summary: Database is down
      
      - alert: HighResponseTime
        expr: histogram_quantile(0.95, http_request_duration_seconds) > 1
        for: 5m
        annotations:
          summary: API response time is high
```

---

## 8. Rollback Procedures

### 8.1 Automatic Rollback

```yaml
# Kubernetes automatically rolls back failed deployments

# Example: Check rollout history
kubectl rollout history deployment/booking-api -n production

# Rollback to previous version
kubectl rollout undo deployment/booking-api -n production

# Rollback to specific revision
kubectl rollout undo deployment/booking-api --to-revision=3 -n production
```

### 8.2 Manual Rollback

```bash
# Identify previous stable version
PREVIOUS_TAG=$(git describe --tags --abbrev=0 --exclude="latest")

# Tag current version as rollback point
git tag rollback-$(date +%s)

# Deploy previous version
docker pull registry.example.com/booking-system:$PREVIOUS_TAG
kubectl set image deployment/booking-api \
  booking-api=registry.example.com/booking-system:$PREVIOUS_TAG \
  -n production

# Monitor
kubectl logs -f deployment/booking-api -n production
```

---

## 9. Post-Deployment Checklist

- [ ] All health checks passing
- [ ] No elevated error rates
- [ ] Response times normal
- [ ] Database queries performing well
- [ ] Cache hit ratio acceptable
- [ ] No warnings in logs
- [ ] Smoke tests passed
- [ ] Product team validation
- [ ] Monitoring alerts configured

---

## 10. Incident Response

### 10.1 Escalation Path

1. **On-call engineer** (5 min response)
2. **Team lead** (15 min if critical)
3. **Engineering manager** (escalate if > 30 min)
4. **VP Engineering** (escalate if > 60 min)

### 10.2 Incident Communication

- Notify team via Slack #incidents channel
- Post status page update every 15 minutes
- Notify customers if > 5 minutes
- Post-incident review within 24 hours

---

**Document Version**: 1.0
**Last Updated**: May 2026
**Owner**: DevOps Lead
