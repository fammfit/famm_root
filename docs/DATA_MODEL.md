# Data Model

## Core Entities

- User
- TrainerProfile
- Client
- AvailabilityBlock
- Booking
- BlackoutTime

---

## User

Represents an authenticated trainer.

### Fields

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| phone_number | string | Used for SMS authentication |
| timezone | string | IANA timezone, e.g. America/New_York |
| created_at | datetime | Stored in UTC |
| updated_at | datetime | Stored in UTC |

---

## TrainerProfile

Represents a trainer’s public booking profile.

### Fields

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| user_id | UUID | References User |
| display_name | string | Public trainer name |
| slug | string | Unique public booking URL slug |
| bio | text | Optional |
| session_duration_minutes | integer | Default session length |
| default_capacity | integer | Default booking capacity |
| is_active | boolean | Controls public visibility |
| created_at | datetime | Stored in UTC |
| updated_at | datetime | Stored in UTC |

---

## Client

Represents a client who books a session.

### Fields

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| name | string | Client name |
| phone_number | string | Optional |
| email | string | Optional |
| created_at | datetime | Stored in UTC |
| updated_at | datetime | Stored in UTC |

---

## AvailabilityBlock

Represents time when a trainer is available.

### Fields

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| trainer_profile_id | UUID | References TrainerProfile |
| start_time_utc | datetime | Stored in UTC |
| end_time_utc | datetime | Stored in UTC |
| capacity | integer | Max bookings per generated slot |
| is_recurring | boolean | Future-ready |
| created_at | datetime | Stored in UTC |
| updated_at | datetime | Stored in UTC |

---

## Booking

Represents a confirmed client session.

### Fields

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| trainer_profile_id | UUID | References TrainerProfile |
| client_id | UUID | References Client |
| start_time_utc | datetime | Stored in UTC |
| end_time_utc | datetime | Stored in UTC |
| status | enum | Allowed values: confirmed, cancelled |
| created_at | datetime | Stored in UTC |
| updated_at | datetime | Stored in UTC |

---

## BlackoutTime

Represents unavailable time inside otherwise available windows.

### Fields

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| trainer_profile_id | UUID | References TrainerProfile |
| start_time_utc | datetime | Stored in UTC |
| end_time_utc | datetime | Stored in UTC |
| reason | string | Optional |
| created_at | datetime | Stored in UTC |
| updated_at | datetime | Stored in UTC |
