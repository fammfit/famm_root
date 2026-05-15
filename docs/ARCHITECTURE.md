# System Architecture

## 1. Architecture Overview

This document describes the high-level architecture of the booking system, including components, layers, data flow, and technology choices.

### Architecture Pattern: Layered Architecture with Event-Driven Components

The system follows a classic three-tier architecture enhanced with event-driven patterns for asynchronous operations:

```
┌─────────────────────────────────────────────────────┐
│                  Presentation Layer                  │
│            (Web UI, Mobile App, API Client)         │
└────────────────────┬────────────────────────────────┘
                     │ REST/JSON
┌────────────────────▼────────────────────────────────┐
│                   API Gateway                        │
│        (Routing, Rate Limiting, Auth Check)         │
└────────────────────┬────────────────────────────────┘
                     │
    ┌────────────────┼────────────────┐
    │                │                │
┌───▼────┐    ┌─────▼──────┐  ┌──────▼───┐
│ Auth   │    │ Booking    │  │Availability│
│Service │    │ Service    │  │ Service   │
└───┬────┘    └─────┬──────┘  └──────┬───┘
    │               │               │
┌───▼───────────────▼───────────────▼──┐
│        Domain Logic Layer             │
│  (Rules Engine, Validators, etc.)    │
└───┬───────────────────────────────────┘
    │
┌───▼────────────────────────────────────┐
│         Data Access Layer              │
│  (Repositories, Query Builders)        │
└───┬────────────────────────────────────┘
    │
┌───▼────────────────────────────────────┐
│      Persistence & External Services   │
│  (PostgreSQL, Cache, Message Queue)    │
└─────────────────────────────────────────┘
```

## 2. Core Components

### 2.1 Authentication Service
**Responsibility**: User registration, login, session management, token generation

**Key Functions**:
- User credential validation
- JWT token generation and validation
- Role-based access control (RBAC)
- Session management
- Password hashing and verification

**Technology**: Node.js/Express, bcrypt, JWT (jsonwebtoken)

**Database Tables**:
- `users` - user accounts and profiles
- `sessions` - active user sessions
- `roles` - role definitions
- `user_roles` - user to role assignments

### 2.2 Availability Service
**Responsibility**: Managing availability windows, generating time slots, handling blocked periods

**Key Functions**:
- Create/update/delete availability rules
- Generate available slots for date ranges
- Handle blocked time periods
- Support recurring availability patterns
- Timezone conversion

**Technology**: Node.js/Express, PostgreSQL with full-text search

**Database Tables**:
- `availability_rules` - weekly availability patterns
- `blocked_periods` - specific time blocks
- `service_types` - service definitions
- `provider_services` - provider to service mapping

### 2.3 Booking Service
**Responsibility**: Booking management, reservation creation, booking validation

**Key Functions**:
- Create bookings
- Update booking status
- Cancel bookings
- Retrieve booking details
- Query bookings by user/provider/date

**Technology**: Node.js/Express, PostgreSQL with transactional integrity

**Database Tables**:
- `bookings` - booking records
- `booking_history` - audit trail
- `booking_notifications` - notification queue

### 2.4 Rules Engine
**Responsibility**: Validating bookings against business rules

**Key Functions**:
- Validate duration constraints
- Validate advance booking windows
- Validate cancellation notices
- Check maximum concurrent bookings
- Apply service-specific rules

**Technology**: Node.js, custom rule evaluation engine

**Configuration**:
- Stored in `booking_rules` table
- Cached in Redis for performance
- Hot-reload capability

### 2.5 Notification Service
**Responsibility**: Sending confirmations, reminders, and alerts

**Key Functions**:
- Send booking confirmations
- Send cancellation notifications
- Send reminders
- Queue notifications for retry
- Track notification delivery

**Technology**: Bull (job queue), Nodemailer (email)

**Message Queue**: Redis (for job queue)

### 2.6 API Gateway / Middleware
**Responsibility**: Request routing, authentication, rate limiting, request validation

**Key Functions**:
- JWT token validation
- Rate limiting per user/IP
- Request body validation
- CORS handling
- Error standardization
- Request logging

**Technology**: Express middleware stack

## 3. Data Flow Diagrams

### 3.1 Booking Flow
```
Customer                API Gateway          Booking Service       Database
   │                        │                      │                  │
   │─ POST /bookings ──────>│                      │                  │
   │                        │─ Validate token ─────>│                  │
   │                        │<─ Valid token ────────│                  │
   │                        │                      │                  │
   │                        │─ Check rules ───────>│                  │
   │                        │<─ Rules ok ──────────│                  │
   │                        │                      │─ Check availability
   │                        │                      │─────────────────>│
   │                        │                      │<─ Available ──────│
   │                        │                      │                  │
   │                        │                      │─ Create booking ─>│
   │                        │                      │<─ Booking ID ─────│
   │                        │<─ 201 Created ──────│                  │
   │<─ {booking} ──────────│                      │                  │
   │                        │                      │─ Queue notification
```

### 3.2 Slot Generation Flow
```
Customer        API Gateway       Availability Service     Database
   │                 │                     │                  │
   │─ GET /slots ───>│                     │                  │
   │ (date range)    │─ Validate token ───>│                  │
   │                 │<─ Valid ────────────│                  │
   │                 │                     │─ Get availability─>│
   │                 │                     │<─ Rules ──────────│
   │                 │                     │                  │
   │                 │                     │─ Get blocks ─────>│
   │                 │                     │<─ Blocked times ─│
   │                 │                     │                  │
   │                 │                     │─ Calculate slots
   │                 │<─ [slots] ────────│                  │
   │<─ 200 OK ──────│                     │                  │
```

## 4. Technology Stack

### Backend
- **Runtime**: Node.js 18+ (v18 LTS or v20 LTS)
- **Framework**: Express.js 4.x
- **Language**: JavaScript (ES2020+)
- **Package Manager**: npm or yarn

### Database
- **Primary**: PostgreSQL 14+ (ACID compliance, JSON support)
- **Cache**: Redis 6+ (session storage, queue, caching)
- **Connection Pool**: node-postgres with pg-pool

### Authentication & Security
- **Password Hashing**: bcrypt (salted hash)
- **Token**: JWT (jsonwebtoken 9.x)
- **Rate Limiting**: express-rate-limit
- **Validation**: joi or zod

### Job Queue & Async Processing
- **Queue**: Bull (built on Redis)
- **Email**: Nodemailer 6.x
- **Scheduler**: node-cron

### Testing & Quality
- **Testing Framework**: Jest 29+
- **Test Coverage**: Aim for >80%
- **Linting**: ESLint + Prettier
- **Type Safety**: Optional TypeScript conversion

### DevOps & Deployment
- **Containerization**: Docker + Docker Compose
- **Orchestration**: Kubernetes (optional, for scale)
- **CI/CD**: GitHub Actions
- **Monitoring**: Prometheus + Grafana (optional)
- **Logging**: Winston or Pino

## 5. Database Schema (High-Level)

### Users Table
```sql
users
  ├── id (PK)
  ├── email (UNIQUE)
  ├── password_hash
  ├── first_name
  ├── last_name
  ├── timezone
  ├── role
  ├── created_at
  └── updated_at
```

### Availability Rules Table
```sql
availability_rules
  ├── id (PK)
  ├── provider_id (FK)
  ├── service_type_id (FK)
  ├── day_of_week (0-6)
  ├── start_time
  ├── end_time
  ├── is_active
  ├── created_at
  └── updated_at
```

### Blocked Periods Table
```sql
blocked_periods
  ├── id (PK)
  ├── provider_id (FK)
  ├── start_time (timestamp)
  ├── end_time (timestamp)
  ├── reason
  ├── created_at
  └── updated_at
```

### Bookings Table
```sql
bookings
  ├── id (PK)
  ├── provider_id (FK)
  ├── customer_id (FK)
  ├── service_type_id (FK)
  ├── slot_start (timestamp)
  ├── slot_end (timestamp)
  ├── status (pending/confirmed/cancelled)
  ├── notes
  ├── created_at
  └── updated_at
```

### Booking Rules Table
```sql
booking_rules
  ├── id (PK)
  ├── provider_id (FK)
  ├── rule_type (duration/advance/notice/etc)
  ├── rule_config (JSON)
  ├── is_active
  ├── created_at
  └── updated_at
```

## 6. API Layer Design

### Request/Response Format
- All APIs accept and return JSON
- Standard HTTP status codes
- Consistent error response structure
- API versioning through URL path (/api/v1/)

### Authentication
- JWT tokens in Authorization header: `Bearer <token>`
- Token expiration: 24 hours
- Refresh token mechanism for long-lived sessions

### Rate Limiting
- 100 requests per minute per user
- 1000 requests per minute per IP
- Public endpoints have stricter limits

## 7. Deployment Architecture

### Development
- Single Docker container with postgres and redis
- Docker Compose for local dev environment

### Staging
- Kubernetes cluster with 2 node replicas
- Managed database (AWS RDS or Cloud SQL)
- Managed Redis (AWS ElastiCache or Cloud Memorystore)

### Production
- Kubernetes cluster with auto-scaling (3-10 replicas)
- Multi-AZ database with read replicas
- Redis cluster with high availability
- CDN for static assets
- Load balancer (ALB/GCP Load Balancer)

## 8. Scalability Considerations

### Horizontal Scaling
- Stateless API servers (share nothing)
- Session/JWT for distributed systems
- Database connection pooling

### Vertical Scaling
- Node.js cluster module for multi-core utilization
- Worker processes for CPU-intensive tasks
- Memory optimization for large datasets

### Caching Strategy
- User session caching (Redis)
- Availability rules caching (Redis, 1-hour TTL)
- Booking rules caching (Redis, 30-minute TTL)
- Database query result caching (selective)

### Database Optimization
- Indexes on frequently queried columns
- Query optimization and EXPLAIN analysis
- Connection pooling
- Read replicas for reporting queries

## 9. Security Architecture

### Transport Security
- HTTPS/TLS 1.2+ for all traffic
- HSTS headers enabled
- Certificate pinning for critical APIs

### Data Security
- Encryption at rest (DB and storage)
- Encryption in transit (TLS)
- PII encryption in database (password, email)
- Secrets management (environment variables, vault)

### Application Security
- Input validation and sanitization
- SQL injection prevention (parameterized queries)
- XSS prevention (Content-Security-Policy headers)
- CSRF tokens for state-changing operations
- Rate limiting to prevent brute force

### Authentication & Authorization
- Strong password requirements
- Bcrypt password hashing
- JWT-based stateless authentication
- Role-based access control (RBAC)
- Audit logging for sensitive operations

## 10. Error Handling & Observability

### Error Handling
- Global error handler middleware
- Specific error types and codes
- Stack traces in development only
- User-friendly error messages

### Logging
- Structured logging (JSON format)
- Log levels: debug, info, warn, error
- Request/response logging with correlation IDs
- Centralized log aggregation

### Monitoring
- Application metrics (response times, error rates)
- Database performance metrics
- Infrastructure metrics (CPU, memory, disk)
- Alert thresholds and notification channels

## 11. Design Patterns Used

- **Repository Pattern**: Data access abstraction
- **Service Pattern**: Business logic encapsulation
- **Strategy Pattern**: Rules engine implementation
- **Observer Pattern**: Event-driven notifications
- **Factory Pattern**: Object creation abstraction
- **Middleware Pattern**: Request processing pipeline

## 12. Performance Targets

- API response time (p95): < 100ms
- Slot generation time (1000 slots): < 500ms
- Booking creation time: < 200ms
- Database query time (p95): < 50ms
- Cache hit ratio: > 80% for rules
- Throughput: 1000+ requests/second

---

**Document Version**: 1.0
**Last Updated**: May 2026
**Owner**: Technical Lead / Architect
