# Data Model

## 1. Overview

This document describes the data model for the booking system, including entity-relationship diagrams, table schemas, constraints, and design decisions.

## 2. Entity-Relationship Diagram

```
┌─────────────────┐
│     users       │
├─────────────────┤
│ id (PK)         │
│ email (UQ)      │
│ password_hash   │
│ first_name      │
│ last_name       │
│ timezone        │
│ role            │
│ is_active       │
│ created_at      │
│ updated_at      │
└────────┬────────┘
         │
    ┌────┴────────────────────────────────┬─────────────┐
    │                                      │             │
    ▼                                      ▼             ▼
┌──────────────────┐        ┌──────────────────────┐  ┌──────────────┐
│ availability_    │        │    bookings          │  │ booking_     │
│ rules            │        ├──────────────────────┤  │ rules        │
├──────────────────┤        │ id (PK)              │  ├──────────────┤
│ id (PK)          │        │ provider_id (FK)     │  │ id (PK)      │
│ provider_id (FK) │        │ customer_id (FK)     │  │ provider_id  │
│ service_type_id  │        │ service_type_id (FK) │  │ (FK)         │
│ day_of_week      │        │ slot_start           │  │ rule_type    │
│ start_time       │        │ slot_end             │  │ rule_config  │
│ end_time         │        │ status               │  │ is_active    │
│ is_active        │        │ notes                │  │ created_at   │
│ created_at       │        │ created_at           │  │ updated_at   │
│ updated_at       │        │ updated_at           │  └──────────────┘
└──────────────────┘        │ deleted_at (soft)    │
                            └──────────────────────┘
                                      │
                            ┌─────────┴──────────┐
                            ▼                    ▼
                      ┌──────────────┐  ┌──────────────────┐
                      │ service_     │  │ booking_         │
                      │ types        │  │ history          │
                      ├──────────────┤  ├──────────────────┤
                      │ id (PK)      │  │ id (PK)          │
                      │ provider_id  │  │ booking_id (FK)  │
                      │ (FK)         │  │ old_status       │
                      │ name         │  │ new_status       │
                      │ duration_min │  │ changed_by       │
                      │ duration_max │  │ changed_at       │
                      │ description  │  │ change_reason    │
                      │ is_active    │  └──────────────────┘
                      │ created_at   │
                      │ updated_at   │
                      └──────────────┘

    ┌─────────────────────────────────────────┐
    ▼                                         ▼
┌──────────────────┐         ┌──────────────────────────┐
│ blocked_periods  │         │ booking_notifications    │
├──────────────────┤         ├──────────────────────────┤
│ id (PK)          │         │ id (PK)                  │
│ provider_id (FK) │         │ booking_id (FK)          │
│ start_time       │         │ user_id (FK)             │
│ end_time         │         │ notification_type        │
│ reason           │         │ status                   │
│ created_at       │         │ sent_at                  │
│ updated_at       │         │ scheduled_for            │
└──────────────────┘         │ retry_count              │
                             │ created_at               │
                             └──────────────────────────┘
```

## 3. Table Schemas

### 3.1 users

**Purpose**: Store user accounts, authentication credentials, and user information

```sql
CREATE TABLE users (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone_number VARCHAR(20),
  timezone VARCHAR(50) NOT NULL DEFAULT 'UTC',
  role VARCHAR(20) NOT NULL DEFAULT 'customer', -- 'customer', 'provider', 'admin'
  is_active BOOLEAN NOT NULL DEFAULT true,
  email_verified BOOLEAN DEFAULT false,
  email_verified_at TIMESTAMP,
  last_login_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT email_format CHECK (email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$'),
  CONSTRAINT timezone_valid CHECK (timezone IN (SELECT tzname FROM pg_timezone_names))
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_is_active ON users(is_active);
```

**Columns**:
- `id`: Unique user identifier
- `email`: User email (used for login, unique)
- `password_hash`: Bcrypt hashed password
- `first_name`, `last_name`: User's name
- `phone_number`: Contact number
- `timezone`: User's default timezone (IANA format)
- `role`: User type (customer, provider, admin)
- `is_active`: Soft delete flag
- `email_verified`: Email verification status
- `last_login_at`: For security auditing

### 3.2 availability_rules

**Purpose**: Define when a service provider is available for bookings

```sql
CREATE TABLE availability_rules (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  provider_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  service_type_id BIGINT NOT NULL REFERENCES service_types(id) ON DELETE CASCADE,
  day_of_week INT NOT NULL, -- 0=Monday, 6=Sunday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT day_of_week_range CHECK (day_of_week BETWEEN 0 AND 6),
  CONSTRAINT start_before_end CHECK (start_time < end_time)
);

CREATE INDEX idx_availability_rules_provider ON availability_rules(provider_id);
CREATE INDEX idx_availability_rules_service_type ON availability_rules(service_type_id);
CREATE INDEX idx_availability_rules_active ON availability_rules(provider_id, is_active);
CREATE UNIQUE INDEX idx_availability_rules_unique 
  ON availability_rules(provider_id, service_type_id, day_of_week) 
  WHERE is_active = true;
```

**Columns**:
- `id`: Unique rule identifier
- `provider_id`: Reference to provider (users table)
- `service_type_id`: Reference to service type
- `day_of_week`: 0-6 (Monday-Sunday)
- `start_time`: Daily start time (e.g., 09:00:00)
- `end_time`: Daily end time (e.g., 17:00:00)
- `is_active`: Enable/disable this rule
- `notes`: Internal notes about this availability

**Design Notes**:
- Recurring weekly pattern supports most use cases
- TIME (not TIMESTAMP) stores local time, converted by application
- Unique constraint prevents duplicate rules for same provider/service/day

### 3.3 blocked_periods

**Purpose**: Define specific time periods when provider is unavailable (vacation, maintenance, breaks)

```sql
CREATE TABLE blocked_periods (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  provider_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  reason VARCHAR(255) NOT NULL,
  recurring_pattern VARCHAR(50), -- 'none', 'daily', 'weekly', 'monthly', 'yearly'
  recurring_end_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT start_before_end CHECK (start_time < end_time)
);

CREATE INDEX idx_blocked_periods_provider ON blocked_periods(provider_id);
CREATE INDEX idx_blocked_periods_time_range 
  ON blocked_periods(provider_id, start_time, end_time) 
  WHERE is_active = true;
```

**Columns**:
- `id`: Unique block identifier
- `provider_id`: Reference to provider
- `start_time`, `end_time`: Blocked time range (UTC timestamps)
- `reason`: Why blocked (vacation, meeting, maintenance)
- `recurring_pattern`: Support recurring blocks
- `recurring_end_date`: When recurring block ends
- `is_active`: Enable/disable this block

### 3.4 service_types

**Purpose**: Define different services offered by providers

```sql
CREATE TABLE service_types (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  provider_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  duration_minutes INT NOT NULL, -- Default slot duration
  buffer_minutes INT DEFAULT 0, -- Gap after booking before next can start
  color VARCHAR(7), -- Hex color for UI
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT duration_positive CHECK (duration_minutes > 0),
  CONSTRAINT buffer_non_negative CHECK (buffer_minutes >= 0),
  CONSTRAINT color_hex CHECK (color ~ '^#[0-9A-Fa-f]{6}$' OR color IS NULL)
);

CREATE INDEX idx_service_types_provider ON service_types(provider_id);
CREATE INDEX idx_service_types_active ON service_types(provider_id, is_active);
```

**Columns**:
- `id`: Unique service type identifier
- `provider_id`: Which provider offers this service
- `name`: Service name (e.g., "30-min consultation")
- `description`: Detailed description
- `duration_minutes`: How long a booking takes
- `buffer_minutes`: Break time after appointment
- `color`: UI color for visual distinction
- `is_active`: Enable/disable service

### 3.5 bookings

**Purpose**: Store booking/reservation records

```sql
CREATE TABLE bookings (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  provider_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  customer_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  service_type_id BIGINT NOT NULL REFERENCES service_types(id) ON DELETE RESTRICT,
  slot_start TIMESTAMP NOT NULL,
  slot_end TIMESTAMP NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, confirmed, cancelled, completed
  customer_name VARCHAR(100),
  customer_email VARCHAR(255),
  customer_phone VARCHAR(20),
  notes TEXT,
  cancellation_reason TEXT,
  cancelled_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  cancelled_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP, -- Soft delete
  
  CONSTRAINT slot_start_before_end CHECK (slot_start < slot_end),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  CONSTRAINT customer_not_provider CHECK (customer_id != provider_id)
);

CREATE INDEX idx_bookings_provider_date 
  ON bookings(provider_id, slot_start DESC) 
  WHERE status != 'cancelled' AND deleted_at IS NULL;
CREATE INDEX idx_bookings_customer 
  ON bookings(customer_id) 
  WHERE deleted_at IS NULL;
CREATE INDEX idx_bookings_time_range 
  ON bookings(slot_start, slot_end) 
  WHERE status = 'confirmed' AND deleted_at IS NULL;
CREATE INDEX idx_bookings_status 
  ON bookings(status) 
  WHERE deleted_at IS NULL;
```

**Columns**:
- `id`: Unique booking identifier
- `provider_id`: Provider for this booking
- `customer_id`: Customer making the booking
- `service_type_id`: What service is booked
- `slot_start`, `slot_end`: Booking time window (UTC)
- `status`: Current state of booking
- `customer_name`, `customer_email`, `customer_phone`: Capture customer info at booking time (denormalized)
- `notes`: Customer notes
- `cancellation_reason`: Why cancelled
- `cancelled_by`: User who cancelled (self or provider)
- `cancelled_at`: When cancelled
- `deleted_at`: Soft delete timestamp

**Design Notes**:
- All timestamps are in UTC
- Customer info denormalized to handle account deletion scenarios
- Status codes: pending (confirmation pending), confirmed (locked in), cancelled (withdrawn), completed (finished)
- Soft delete allows audit trails without losing history

### 3.6 booking_rules

**Purpose**: Store business rules that constrain bookings

```sql
CREATE TABLE booking_rules (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  provider_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  service_type_id BIGINT REFERENCES service_types(id) ON DELETE CASCADE, -- NULL = applies to all services
  rule_type VARCHAR(50) NOT NULL, -- 'min_duration', 'max_duration', 'advance_booking_days', 'min_notice_hours', 'max_concurrent_slots', 'custom'
  rule_config JSONB NOT NULL, -- Flexible config storage
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT valid_rule_type CHECK (rule_type IN ('min_duration', 'max_duration', 'advance_booking_days', 'min_notice_hours', 'max_concurrent_slots', 'custom'))
);

CREATE INDEX idx_booking_rules_provider 
  ON booking_rules(provider_id, is_active);
CREATE INDEX idx_booking_rules_service_type 
  ON booking_rules(service_type_id) 
  WHERE is_active = true;
```

**Columns**:
- `id`: Unique rule identifier
- `provider_id`: Which provider this rule applies to
- `service_type_id`: Specific service, or NULL for all services
- `rule_type`: Type of rule being enforced
- `rule_config`: JSON blob with rule parameters
- `is_active`: Enable/disable rule

**rule_config Examples**:
```json
// min_duration rule
{ "duration_minutes": 30 }

// max_duration rule
{ "duration_minutes": 120 }

// advance_booking_days rule
{ "max_days_advance": 365, "min_days_advance": 0 }

// min_notice_hours rule
{ "hours_notice": 24 }

// max_concurrent_slots rule
{ "max_slots": 5 }

// custom rule (application-specific)
{ "condition": "...", "action": "..." }
```

### 3.7 booking_history

**Purpose**: Audit trail of booking status changes

```sql
CREATE TABLE booking_history (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  booking_id BIGINT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  old_status VARCHAR(20),
  new_status VARCHAR(20) NOT NULL,
  changed_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  change_reason VARCHAR(255),
  notes TEXT
);

CREATE INDEX idx_booking_history_booking 
  ON booking_history(booking_id, changed_at DESC);
CREATE INDEX idx_booking_history_changed_by 
  ON booking_history(changed_by);
```

### 3.8 booking_notifications

**Purpose**: Queue and track notifications to be sent to users

```sql
CREATE TABLE booking_notifications (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  booking_id BIGINT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notification_type VARCHAR(50) NOT NULL, -- 'confirmation', 'reminder', 'cancellation', 'reminder_24h', 'reminder_1h'
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, sent, failed, skipped
  sent_at TIMESTAMP,
  scheduled_for TIMESTAMP,
  retry_count INT DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_booking_notifications_user 
  ON booking_notifications(user_id, status);
CREATE INDEX idx_booking_notifications_scheduled 
  ON booking_notifications(scheduled_for) 
  WHERE status = 'pending';
```

## 4. Key Design Decisions

### 4.1 UTC Timestamps
All timestamps are stored in UTC to avoid timezone complications. Conversion to user's local timezone happens in the application layer during display.

### 4.2 Denormalization in Bookings
Customer name, email, and phone are stored in the bookings table in addition to referencing the users table. This allows booking history to remain accurate even if user accounts are deleted.

### 4.3 Soft Deletes
The `deleted_at` timestamp allows logical deletion while preserving data for auditing and historical analysis. Hard deletes are avoided except when explicitly required.

### 4.4 JSONB for Rules Configuration
The `booking_rules.rule_config` is stored as JSONB to allow flexible rule definitions without schema migrations. Rules can be extended without database changes.

### 4.5 Index Strategy
Indexes are carefully chosen to optimize common queries:
- Provider with active status (for slot generation)
- Time range queries (for conflict detection)
- User lookups (for authentication and permissions)

### 4.6 Constraints
Database-level constraints ensure data integrity:
- Check constraints for valid time ranges and values
- Foreign key constraints for referential integrity
- Unique constraints to prevent duplicates

## 5. Data Relationships

### User as Provider
A user with `role = 'provider'` can:
- Have multiple service types
- Have multiple availability rules
- Have multiple bookings (provider side)
- Set booking rules

### User as Customer
A user with `role = 'customer'` can:
- Make multiple bookings
- Only see availability and book with providers

### Service Type
- Belongs to one provider
- Has one or more availability rules
- Can have one or more bookings
- Can have specific booking rules

## 6. Query Patterns

### Common Queries

**Find available slots for a date range**:
```sql
SELECT ar.start_time, ar.end_time 
FROM availability_rules ar
WHERE ar.provider_id = $1
  AND ar.service_type_id = $2
  AND ar.day_of_week = EXTRACT(DOW FROM $3::date)
  AND ar.is_active = true
EXCEPT
SELECT bp.start_time, bp.end_time 
FROM blocked_periods bp
WHERE bp.provider_id = $1
  AND bp.start_time::date <= $3
  AND bp.end_time::date >= $3
  AND bp.is_active = true;
```

**Find bookings for a provider on a date**:
```sql
SELECT b.* FROM bookings b
WHERE b.provider_id = $1
  AND DATE(b.slot_start AT TIME ZONE $2) = $3
  AND b.status = 'confirmed'
  AND b.deleted_at IS NULL
ORDER BY b.slot_start;
```

**Check for conflicts with existing bookings**:
```sql
SELECT COUNT(*) FROM bookings
WHERE provider_id = $1
  AND status = 'confirmed'
  AND deleted_at IS NULL
  AND slot_start < $2  -- new slot_end
  AND slot_end > $3;   -- new slot_start
```

## 7. Migration Strategy

Database migrations use a standard approach:
- Numbered migrations (001_, 002_, etc.)
- Both up and down migrations
- Migrations are idempotent
- Tested before deployment

---

**Document Version**: 1.0
**Last Updated**: May 2026
**Owner**: Database Architect
