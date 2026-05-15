# Decision Log

## Overview

This document records significant architectural, technical, and product decisions made during the development of the booking system, including the rationale for each decision and any trade-offs involved.

---

## Decision 1: UTC Storage with User Timezone Preference

**Date**: 2026-01-15
**Status**: Accepted
**Owner**: Technical Lead

### Context
The system needs to support users across multiple timezones while avoiding complexity and data integrity issues.

### Options Considered

1. **Store times in user's local timezone** (e.g., store "2:30 PM PDT")
   - Pros: Times display naturally
   - Cons: DST ambiguity, comparison complexity, database queries harder

2. **Store all times in UTC with user timezone preference** (Selected)
   - Pros: Single source of truth, DST handled correctly, easy comparisons
   - Cons: Need conversion on display

3. **Store both UTC and local times**
   - Pros: Fast display, no conversion needed
   - Cons: Data duplication, sync issues, storage overhead

### Decision
Store all times in UTC in the database. Store user's timezone preference (IANA timezone name) in the users table. Convert to/from user's timezone in the application layer.

### Rationale
- Eliminates DST edge cases and ambiguity
- Makes queries and comparisons straightforward
- Easy to support multiple users in different timezones
- Can change timezone handling without data migration
- Industry standard practice

### Trade-offs
- Requires timezone conversion on every read/write
- Developers must always be aware of timezone context
- Slightly more complex API responses (include both UTC and local times)

### References
- See `TIMEZONE_HANDLING.md` for implementation details

---

## Decision 2: Layered Architecture with Service Pattern

**Date**: 2026-01-20
**Status**: Accepted
**Owner**: Architect

### Context
Need a scalable, testable architecture that separates concerns and allows independent development of features.

### Options Considered

1. **Monolithic application**
   - Single codebase, single deployment
   - Pros: Simple for MVP
   - Cons: Hard to scale, difficult to maintain

2. **Microservices architecture**
   - Separate services per domain (auth, bookings, slots)
   - Pros: Independent scaling, clear boundaries
   - Cons: Operational complexity, network latency

3. **Layered architecture with service pattern** (Selected)
   - Controller → Service → Repository → Database
   - Pros: Clear separation, scalable to teams, not over-engineered
   - Cons: Less decoupled than microservices

### Decision
Use layered architecture with clear service boundaries. Controllers handle HTTP, Services contain business logic, Repositories handle data access.

### Rationale
- Appropriate level of complexity for team size
- Can evolve to microservices later if needed
- Clear testing boundaries
- Easier onboarding for new team members
- Reduced operational complexity vs microservices

### Trade-offs
- Less independent scaling than microservices
- More tightly coupled than distributed architecture

### Implementation
```
src/
  controllers/    # HTTP handlers
  services/       # Business logic
  repositories/   # Data access
  models/         # Data structures
  middleware/     # Cross-cutting concerns
  utils/          # Helpers
```

---

## Decision 3: PostgreSQL with UTF-8 Support

**Date**: 2026-01-25
**Status**: Accepted
**Owner**: Database Architect

### Context
Need to select a relational database for storing bookings, users, and availability data.

### Options Considered

1. **MongoDB (NoSQL)**
   - Pros: Flexible schema, horizontal scaling, JSON native
   - Cons: No ACID transactions initially, eventual consistency

2. **PostgreSQL** (Selected)
   - Pros: ACID compliance, JSON support, full-text search, complex queries
   - Cons: Vertical scaling focus, schema migrations needed

3. **MySQL**
   - Pros: Widely used, MySQL 8 improvements
   - Cons: Less powerful than PostgreSQL, fewer advanced features

### Decision
Use PostgreSQL 14+ with UTF-8 encoding for character support.

### Rationale
- ACID guarantees critical for booking integrity (no double-booking)
- JSONB for flexible rule configurations
- Excellent timezone support
- Advanced features (indexes, full-text search) useful for queries
- Better JSON/geospatial support than MySQL
- Larger community in recent years

### Trade-offs
- Slightly higher operational complexity than MySQL
- Vertical scaling focus vs horizontal

### Implementation
- Connection pooling with pg-pool
- Migrations using Knex.js
- Backups via cloud provider (RDS/Cloud SQL)

---

## Decision 4: Redis for Caching and Session Storage

**Date**: 2026-02-01
**Status**: Accepted
**Owner**: Backend Lead

### Context
Need fast data access for session tokens, availability rules cache, and booking queue.

### Options Considered

1. **Memcached**
   - Pros: Simple, proven, fast
   - Cons: No persistence, limited data types

2. **Redis** (Selected)
   - Pros: Fast, persistence, rich data types, pub/sub
   - Cons: Memory-based, needs careful memory management

3. **In-memory Java cache (Ehcache)**
   - Pros: Process-local, no network latency
   - Cons: Not shared across processes, stateful

### Decision
Use Redis for:
- Session/token storage
- Availability rules cache (TTL: 1 hour)
- Booking rules cache (TTL: 30 minutes)
- Job queue for notifications
- Rate limiting counters

### Rationale
- Excellent performance for cache access
- TTL support for automatic cache invalidation
- Pub/sub for real-time features (future)
- Job queue (Bull) built on Redis
- Managed Redis available on all cloud platforms

### Trade-offs
- Additional infrastructure to manage
- Memory-limited
- Data loss on restart (mitigated with persistence)

### Implementation
- Connection pooling
- Cache invalidation on rule changes
- Automatic expiration for temporary data

---

## Decision 5: JWT for Stateless Authentication

**Date**: 2026-02-05
**Status**: Accepted
**Owner**: Security Lead

### Context
Need authentication that scales horizontally and doesn't require centralized session storage.

### Options Considered

1. **Session-based (server-side stored)**
   - Pros: Can instantly revoke, fine-grained control
   - Cons: Requires shared session store, doesn't scale easily

2. **JWT (Stateless tokens)** (Selected)
   - Pros: Stateless, scales horizontally, standard
   - Cons: Can't instantly revoke (except refresh token)

3. **OAuth2 with external provider**
   - Pros: Offload auth, social login
   - Cons: Dependency on external provider

### Decision
Use JWT with short-lived access tokens (24h) and refresh tokens (7d). Refresh tokens stored in database for revocation capability.

### Rationale
- Stateless authentication scales horizontally
- Standard approach (well-understood, many libraries)
- Short access token limits damage from theft
- Refresh token approach balances revocation capability
- Can implement OAuth2 later as optional

### Trade-offs
- Cannot instantly revoke access tokens (24h limit)
- Slightly more complex token management
- Need to refresh tokens periodically

### Security Considerations
- Access tokens: stored in memory/sessionStorage (not localStorage)
- Refresh tokens: stored in HttpOnly cookie or secure storage
- Token rotation on refresh
- Signature verification required

---

## Decision 6: Slot Generation Algorithm: Daily Intervals

**Date**: 2026-02-10
**Status**: Accepted
**Owner**: Backend Lead

### Context
Need to generate available time slots efficiently for display to customers.

### Options Considered

1. **Generate all slots for entire date range upfront**
   - Pros: Simple, deterministic
   - Cons: Memory intensive for large ranges, slow

2. **Generate slots on-demand per day** (Selected)
   - Pros: Efficient, pagination-friendly, fast queries
   - Cons: Slightly more complex algorithm

3. **Pre-generate and store slots in database**
   - Pros: No computation needed
   - Cons: Storage overhead, must regenerate when rules change

### Decision
Generate slots on-demand, day by day, removing blocked periods and existing bookings on-the-fly.

### Rationale
- Efficient for typical queries (1-3 month range)
- Responsive API (< 500ms for typical queries)
- Automatically handles rule changes (no pre-generation needed)
- Pagination-friendly (limit results per page)
- Caching availability rules reduces load

### Trade-offs
- More CPU per request vs pre-generated
- Requires careful optimization and indexing
- More complex algorithm

### Implementation
- Cache availability rules (1-hour TTL)
- Index on provider_id, service_type_id for fast lookups
- Pagination to limit result size
- Response includes both UTC and local timezone times

---

## Decision 7: Booking Rules as Flexible JSON Configuration

**Date**: 2026-02-15
**Status**: Accepted
**Owner**: Product Lead

### Context
Need to support diverse booking rules that vary by provider and service type.

### Options Considered

1. **Hard-coded rule types**
   - Pros: Fast, predictable
   - Cons: Adding new rules requires code changes

2. **Flexible JSON configuration in database** (Selected)
   - Pros: Add rules without code changes, hot-reload
   - Cons: Less type-safe, validation needed

3. **Separate table per rule type**
   - Pros: Type-safe, clear schema
   - Cons: Lots of joins, complex queries

### Decision
Store booking rules in `booking_rules` table with:
- `rule_type`: Enum of rule types (min_duration, max_duration, etc.)
- `rule_config`: JSONB with rule-specific configuration
- Application validates rule config against rule type schema

### Rationale
- New rule types can be added without schema migration
- Supports custom rules for specific providers
- Easy to enable/disable rules
- JSON allows flexible configuration options
- Cache rules for performance

### Trade-offs
- Less type safety (mitigated with validation)
- Requires application-level validation
- Slightly slower queries vs fixed schema

### Example Rules
```json
// Min duration
{ "rule_type": "min_duration", "rule_config": { "duration_minutes": 30 } }

// Advance booking
{ "rule_type": "advance_booking_days", "rule_config": { "max_days_advance": 90, "min_days_advance": 1 } }

// Min notice for cancellation
{ "rule_type": "min_notice_hours", "rule_config": { "hours_notice": 24 } }
```

---

## Decision 8: Soft Deletes for Data Retention

**Date**: 2026-02-20
**Status**: Accepted
**Owner**: Data Lead

### Context
Need to support historical data access while allowing "deletion" of user-facing records.

### Options Considered

1. **Hard deletes (physical deletion)**
   - Pros: Clean, GDPR compliance
   - Cons: Loses history, breaks foreign keys

2. **Soft deletes with deleted_at timestamp** (Selected)
   - Pros: Preserves history, maintains referential integrity, audit trail
   - Cons: Requires filtering in queries, storage overhead

3. **Archive tables**
   - Pros: Separates active from historical
   - Cons: Complex queries, migration overhead

### Decision
Use `deleted_at` timestamp column for soft deletes on:
- bookings
- users (optional)

Queries filter out soft-deleted records by default.

### Rationale
- Preserves audit trail and booking history
- Enables customer view of past bookings
- Supports GDPR requirements (data retention periods)
- Maintains referential integrity
- Can restore deleted records if needed

### Trade-offs
- All queries must filter `deleted_at IS NULL`
- Additional storage for historical data
- Slightly slower queries

### Implementation
```javascript
// Always filter out deleted records
Booking.find({ deleted_at: null })

// Cascade soft delete on user deletion
User.update({ deleted_at: now }, { cascade: true })
```

---

## Decision 9: Microservices vs Monolith: Future Migration Path

**Date**: 2026-02-25
**Status**: Deferred
**Owner**: Architect

### Context
Discussed whether to start with microservices or monolith.

### Decision
Start with monolith (layered architecture). Migrate to microservices only if/when needed.

### Rationale
- Team size doesn't warrant microservices complexity yet
- Easier to deploy, debug, and operate
- Can extract services later as specific boundaries become clear
- Microservices requirements:
  - Independent scaling needs (not present)
  - Team organization around services (not present)
  - Diverse technology needs (not present)

### Migration Path (if needed)
1. Authentication service (natural boundary)
2. Slot generation service (compute-intensive)
3. Notification service (background queue)
4. Provider-facing service (future)

### Revisit Criteria
- When load on slot generation becomes bottleneck
- When team splits across independent features
- When scheduling/timing service becomes complex

---

## Decision 10: Node.js + Express for API Framework

**Date**: 2026-03-01
**Status**: Accepted
**Owner**: Technical Lead

### Context
Select language and framework for the API server.

### Options Considered

1. **Python + FastAPI/Django**
   - Pros: Easy to learn, good ORM, large community
   - Cons: Slower for I/O, GIL issues

2. **Node.js + Express** (Selected)
   - Pros: Non-blocking I/O, JavaScript ecosystem, async/await
   - Cons: Less mature than Python for some problems, callback hell

3. **Go**
   - Pros: Fast, compiled, excellent concurrency
   - Cons: Different paradigm, smaller ecosystem

4. **Java + Spring Boot**
   - Pros: Very mature, fast, good ecosystem
   - Cons: Heavy, slower development, more boilerplate

### Decision
Use Node.js 18+ with Express.js 4.x for HTTP framework.

### Rationale
- Non-blocking I/O ideal for I/O-heavy booking operations
- JavaScript ecosystem has excellent libraries
- Modern async/await syntax
- Fast development velocity
- Good TypeScript support (future option)
- Team familiarity

### Trade-offs
- Single-threaded (mitigated with clustering)
- Smaller standard library than Python
- Less proven for CPU-intensive tasks

### Tooling Stack
- Express.js for HTTP server
- TypeScript (optional, future consideration)
- ESLint + Prettier for code quality
- Jest for testing
- Winston for logging

---

## Decision 11: Docker for Containerization

**Date**: 2026-03-05
**Status**: Accepted
**Owner**: DevOps Lead

### Context
Need consistent development, staging, and production environments.

### Options Considered

1. **Virtual machines (EC2 instances)**
   - Pros: Full OS, any language/framework
   - Cons: Heavy, slow startup, resource overhead

2. **Docker containers** (Selected)
   - Pros: Lightweight, consistent, fast startup
   - Cons: Container ecosystem complexity

3. **Serverless (AWS Lambda, GCP Functions)**
   - Pros: Pay-as-you-go, auto-scaling
   - Cons: Cold starts, timeouts, vendor lock-in

### Decision
Use Docker for containerization with:
- Single Dockerfile for all environments
- Docker Compose for local development
- Kubernetes for production orchestration

### Rationale
- Ensures dev/prod parity
- Easy to scale and deploy
- Industry standard
- Good tooling ecosystem
- Cost-effective

### Trade-offs
- Additional operational complexity
- Container orchestration learning curve
- Slightly more overhead vs bare metal

---

## Decision 12: GitHub for Source Control and CI/CD

**Date**: 2026-03-10
**Status**: Accepted
**Owner**: DevOps Lead

### Context
Need source control and continuous integration/deployment.

### Options Considered

1. **GitHub** (Selected)
   - Pros: Widely used, GitHub Actions, native to Git
   - Cons: Pricing for private repos

2. **GitLab**
   - Pros: Built-in CI/CD, can self-host
   - Cons: Different ecosystem

3. **Bitbucket**
   - Pros: Atlassian integration
   - Cons: Less community, weaker CI/CD

### Decision
Use GitHub with GitHub Actions for CI/CD.

### Rationale
- Team familiarity
- Integrated CI/CD (no separate service)
- Large open-source ecosystem
- Good documentation
- Security features (branch protection, CODEOWNERS)

### Trade-offs
- Pricing for private repos
- Limited self-hosting options

### GitHub Features Used
- Branch protection rules
- Required reviews
- Automated testing on PR
- Automated deployments
- Secrets management

---

## Decision 13: Test Pyramid: Unit > Integration > E2E

**Date**: 2026-03-15
**Status**: Accepted
**Owner**: QA Lead

### Context
Need a testing strategy that balances coverage with execution time.

### Options Considered

1. **Only unit tests**
   - Pros: Fast, good for components
   - Cons: Misses integration issues

2. **Test pyramid: 70% unit, 20% integration, 10% E2E** (Selected)
   - Pros: Good coverage, reasonable speed, catches issues at right level
   - Cons: More complex test infrastructure

3. **Only E2E tests**
   - Pros: Tests real scenarios
   - Cons: Slow, flaky, hard to debug

### Decision
Implement test pyramid:
- **Unit tests** (70%): Individual functions, services
- **Integration tests** (20%): Database, API endpoints, with test database
- **E2E tests** (10%): Critical user flows on staging

### Rationale
- Unit tests provide fast feedback
- Integration tests catch real issues
- E2E tests validate critical paths
- Balances speed with coverage
- Cost-effective

### Implementation
- Jest for unit and integration tests
- Playwright/Cypress for E2E (optional)
- Target: >80% code coverage
- Run on every PR

---

## Decision 14: Logging: JSON Structure

**Date**: 2026-03-20
**Status**: Accepted
**Owner**: DevOps Lead

### Context
Need structured logging for debugging and monitoring.

### Options Considered

1. **Unstructured text logs**
   - Pros: Human-readable
   - Cons: Hard to search, parse

2. **JSON structured logs** (Selected)
   - Pros: Machine-readable, easy to search/analyze
   - Cons: Less human-readable, more complex

### Decision
Use JSON structured logging with Winston logger.

### Rationale
- Easy integration with log aggregation (ELK, Splunk)
- Consistent format across all logs
- Can extract structured fields for analysis
- Better for production debugging

### Log Format
```json
{
  "timestamp": "2026-05-14T10:30:00Z",
  "level": "error",
  "message": "Failed to create booking",
  "request_id": "uuid-123",
  "user_id": "user_456",
  "error": "RULE_VIOLATION",
  "stack": "...",
  "context": {
    "provider_id": "provider_789",
    "service_type_id": "service_123"
  }
}
```

---

## Decision 15: Monitoring: Prometheus + Grafana

**Date**: 2026-03-25
**Status**: Accepted
**Owner**: DevOps Lead

### Context
Need real-time monitoring of application and infrastructure metrics.

### Options Considered

1. **CloudWatch (AWS) / Stackdriver (GCP)**
   - Pros: Cloud-native, easy to use
   - Cons: Vendor lock-in

2. **Prometheus + Grafana** (Selected)
   - Pros: Open-source, powerful, portable
   - Cons: Operational complexity

3. **Datadog / New Relic**
   - Pros: Comprehensive, support
   - Cons: Expensive, vendor lock-in

### Decision
Use Prometheus for metrics collection and Grafana for visualization.

### Rationale
- Open-source, no vendor lock-in
- Powerful query language (PromQL)
- Excellent visualization (Grafana)
- Large community
- Cost-effective

### Metrics Collected
- HTTP request latency
- Request rate and errors
- Database query time
- Cache hit ratio
- Job queue depth
- System resources (CPU, memory)

---

## Decision 16: Email Provider: SendGrid vs AWS SES

**Status**: Pending
**Owner**: Product Lead

### Context
Need to send transactional emails (confirmations, reminders).

### Options Considered

1. **SendGrid** 
   - Pros: Easy to use, great API, free tier, support
   - Cons: Monthly cost at scale

2. **AWS SES**
   - Pros: Cheap (~ $0.10 per 1000), AWS integrated
   - Cons: More setup, reputation management

### Decision
TBD - Evaluate based on volume and budget

### Criteria
- Cost per email
- Deliverability
- Template support
- Analytics
- Support level

---

## Decision 17: Error Tracking: Sentry

**Date**: 2026-04-01
**Status**: Accepted
**Owner**: DevOps Lead

### Context
Need to capture and track errors in production.

### Decision
Use Sentry for error tracking and monitoring.

### Rationale
- Real-time error notifications
- Stack traces and context
- Source map support
- Release tracking
- Affordable pricing tier

### Implementation
- Sentry SDK integrated in Express middleware
- Environment-specific DSN
- Source maps uploaded on deploy

---

## Decision 18: Rate Limiting Strategy

**Date**: 2026-04-05
**Status**: Accepted
**Owner**: Backend Lead

### Context
Need to prevent abuse and ensure fair resource usage.

### Decision
Implement rate limiting at API gateway:
- Authenticated users: 100 requests/minute
- Unauthenticated: 20 requests/minute
- Per-endpoint stricter limits (e.g., login: 5/minute)

### Rationale
- Prevents brute force attacks
- Fair resource allocation
- Protects against abuse
- Industry standard approach

### Implementation
- express-rate-limit middleware
- Redis for shared state (across servers)
- Per-user and per-IP tracking

---

## Decision 19: CORS and Security Headers

**Date**: 2026-04-10
**Status**: Accepted
**Owner**: Security Lead

### Context
Secure API from common web vulnerabilities.

### Decision
- CORS: Allow only specified frontend domain
- HSTS: Enforce HTTPS
- CSP: Restrict resource loading
- X-Frame-Options: DENY (no iframe)
- X-Content-Type-Options: nosniff

### Implementation
- Helmet.js for security headers
- CORS middleware with origin whitelist

---

## Decision 20: Backup Strategy: Daily Snapshots + Point-in-Time Recovery

**Date**: 2026-04-15
**Status**: Accepted
**Owner**: DevOps Lead

### Context
Protect data from loss or corruption.

### Decision
- Automated daily backups (via RDS/Cloud SQL)
- 30-day retention for production
- Point-in-time recovery enabled
- Monthly full backup snapshot
- Test restore monthly

### Rationale
- Automatic reduces human error
- 30-day retention balances cost and retention
- Point-in-time recovery for corruption scenarios
- Monthly tests ensure reliability

---

## Decisions Summary Table

| # | Decision | Status | Date | Owner |
|---|----------|--------|------|-------|
| 1 | UTC storage + user timezone | Accepted | 2026-01-15 | Tech Lead |
| 2 | Layered architecture | Accepted | 2026-01-20 | Architect |
| 3 | PostgreSQL database | Accepted | 2026-01-25 | DB Arch |
| 4 | Redis caching | Accepted | 2026-02-01 | Backend |
| 5 | JWT authentication | Accepted | 2026-02-05 | Security |
| 6 | On-demand slot generation | Accepted | 2026-02-10 | Backend |
| 7 | Flexible JSON rules | Accepted | 2026-02-15 | Product |
| 8 | Soft deletes | Accepted | 2026-02-20 | Data |
| 9 | Monolith (future migration) | Deferred | 2026-02-25 | Architect |
| 10 | Node.js + Express | Accepted | 2026-03-01 | Tech Lead |
| 11 | Docker containerization | Accepted | 2026-03-05 | DevOps |
| 12 | GitHub + Actions | Accepted | 2026-03-10 | DevOps |
| 13 | Test pyramid | Accepted | 2026-03-15 | QA |
| 14 | JSON structured logging | Accepted | 2026-03-20 | DevOps |
| 15 | Prometheus + Grafana | Accepted | 2026-03-25 | DevOps |
| 16 | Email provider | Pending | TBD | Product |
| 17 | Sentry error tracking | Accepted | 2026-04-01 | DevOps |
| 18 | Rate limiting | Accepted | 2026-04-05 | Backend |
| 19 | Security headers | Accepted | 2026-04-10 | Security |
| 20 | Backup strategy | Accepted | 2026-04-15 | DevOps |

---

**Document Version**: 1.0
**Last Updated**: May 2026
**Owner**: Technical Lead
