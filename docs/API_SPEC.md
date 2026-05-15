# API Specification

## 1. Overview

This document defines all REST API endpoints for the booking system. All endpoints are served at `https://api.booking.com/v1/` and require authentication (except public endpoints).

## 2. Request/Response Standards

### 2.1 Headers

**Request Headers**:
```
Content-Type: application/json
Authorization: Bearer <JWT_TOKEN>
Accept-Language: en-US (optional)
X-Request-ID: <UUID> (optional, for tracing)
```

**Response Headers**:
```
Content-Type: application/json
X-Request-ID: <correlation-id>
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1684095600
```

### 2.2 Standard Response Format

**Success Response**:
```json
{
  "success": true,
  "data": { /* actual response body */ },
  "meta": {
    "timestamp": "2026-05-14T10:30:00Z",
    "version": "1.0"
  }
}
```

**Error Response**:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid email format",
    "details": [
      {
        "field": "email",
        "message": "Must be a valid email address"
      }
    ]
  },
  "meta": {
    "timestamp": "2026-05-14T10:30:00Z",
    "request_id": "uuid-here"
  }
}
```

### 2.3 Pagination

List endpoints support pagination with query parameters:
```
?page=1&limit=20&sort=-created_at
```

Response includes pagination metadata:
```json
{
  "success": true,
  "data": [/* items */],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8,
    "has_next": true,
    "has_prev": false
  }
}
```

### 2.4 HTTP Status Codes

| Code | Usage |
|------|-------|
| 200 | Successful GET/PUT/PATCH |
| 201 | Resource created (POST) |
| 204 | No content (successful DELETE) |
| 400 | Bad request (validation error) |
| 401 | Unauthorized (missing/invalid token) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not found |
| 409 | Conflict (e.g., slot no longer available) |
| 429 | Too many requests (rate limited) |
| 500 | Internal server error |
| 503 | Service unavailable |

---

## 3. Authentication Endpoints

### 3.1 Register User

**Endpoint**: `POST /auth/register`

**Authentication**: None

**Description**: Create a new user account

**Request**:
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "first_name": "John",
  "last_name": "Doe",
  "role": "customer",
  "timezone": "America/Los_Angeles"
}
```

**Response** (201):
```json
{
  "success": true,
  "data": {
    "id": "user_123",
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "role": "customer",
    "timezone": "America/Los_Angeles",
    "created_at": "2026-05-14T10:30:00Z"
  }
}
```

**Errors**:
- 400: Invalid email or password format
- 409: Email already registered

---

### 3.2 Login

**Endpoint**: `POST /auth/login`

**Authentication**: None

**Description**: Authenticate user and receive JWT token

**Request**:
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response** (200):
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
    "expires_in": 86400,
    "token_type": "Bearer",
    "user": {
      "id": "user_123",
      "email": "user@example.com",
      "role": "customer"
    }
  }
}
```

**Errors**:
- 401: Invalid credentials

---

### 3.3 Refresh Token

**Endpoint**: `POST /auth/refresh`

**Authentication**: Refresh token required (in body)

**Description**: Get new access token using refresh token

**Request**:
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response** (200):
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "expires_in": 86400,
    "token_type": "Bearer"
  }
}
```

---

### 3.4 Logout

**Endpoint**: `POST /auth/logout`

**Authentication**: Required

**Description**: Invalidate current session

**Request**: (no body)

**Response** (200):
```json
{
  "success": true,
  "data": { "message": "Logged out successfully" }
}
```

---

## 4. User Endpoints

### 4.1 Get Current User

**Endpoint**: `GET /users/me`

**Authentication**: Required

**Description**: Get authenticated user's profile

**Response** (200):
```json
{
  "success": true,
  "data": {
    "id": "user_123",
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "phone_number": "+1-555-0123",
    "role": "provider",
    "timezone": "America/Los_Angeles",
    "is_active": true,
    "email_verified": true,
    "created_at": "2026-05-14T10:30:00Z",
    "updated_at": "2026-05-14T10:30:00Z"
  }
}
```

---

### 4.2 Update User Profile

**Endpoint**: `PUT /users/me`

**Authentication**: Required

**Description**: Update current user's profile

**Request**:
```json
{
  "first_name": "Jane",
  "last_name": "Smith",
  "phone_number": "+1-555-0456",
  "timezone": "America/New_York"
}
```

**Response** (200): Updated user object

---

### 4.3 Change Password

**Endpoint**: `POST /users/change-password`

**Authentication**: Required

**Description**: Change user's password

**Request**:
```json
{
  "current_password": "OldPassword123!",
  "new_password": "NewPassword456!",
  "confirm_password": "NewPassword456!"
}
```

**Response** (200):
```json
{
  "success": true,
  "data": { "message": "Password changed successfully" }
}
```

---

## 5. Availability Endpoints

### 5.1 Create Availability Rule

**Endpoint**: `POST /availability-rules`

**Authentication**: Required (provider only)

**Description**: Define weekly availability for a service

**Request**:
```json
{
  "service_type_id": "service_456",
  "day_of_week": 0,
  "start_time": "09:00",
  "end_time": "17:00",
  "notes": "Available all day Monday"
}
```

**Response** (201):
```json
{
  "success": true,
  "data": {
    "id": "avail_789",
    "provider_id": "user_123",
    "service_type_id": "service_456",
    "day_of_week": 0,
    "start_time": "09:00:00",
    "end_time": "17:00:00",
    "is_active": true,
    "created_at": "2026-05-14T10:30:00Z"
  }
}
```

---

### 5.2 List Availability Rules

**Endpoint**: `GET /availability-rules`

**Authentication**: Required (provider only)

**Query Parameters**:
- `service_type_id` (optional): Filter by service
- `is_active` (optional): Filter by active status

**Response** (200):
```json
{
  "success": true,
  "data": [
    {
      "id": "avail_789",
      "provider_id": "user_123",
      "service_type_id": "service_456",
      "day_of_week": 0,
      "start_time": "09:00:00",
      "end_time": "17:00:00",
      "is_active": true,
      "created_at": "2026-05-14T10:30:00Z"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 5 }
}
```

---

### 5.3 Update Availability Rule

**Endpoint**: `PUT /availability-rules/:id`

**Authentication**: Required (provider only)

**Description**: Update an existing availability rule

**Request**:
```json
{
  "start_time": "08:30",
  "end_time": "18:00"
}
```

**Response** (200): Updated rule object

---

### 5.4 Delete Availability Rule

**Endpoint**: `DELETE /availability-rules/:id`

**Authentication**: Required (provider only)

**Response** (204): No content

---

## 6. Blocked Periods Endpoints

### 6.1 Create Blocked Period

**Endpoint**: `POST /blocked-periods`

**Authentication**: Required (provider only)

**Description**: Block out time (vacation, holiday, etc.)

**Request**:
```json
{
  "start_time": "2026-07-01T00:00:00Z",
  "end_time": "2026-07-15T23:59:59Z",
  "reason": "Summer vacation",
  "recurring_pattern": "none"
}
```

**Response** (201):
```json
{
  "success": true,
  "data": {
    "id": "block_234",
    "provider_id": "user_123",
    "start_time": "2026-07-01T00:00:00Z",
    "end_time": "2026-07-15T23:59:59Z",
    "reason": "Summer vacation",
    "is_active": true,
    "created_at": "2026-05-14T10:30:00Z"
  }
}
```

---

### 6.2 List Blocked Periods

**Endpoint**: `GET /blocked-periods`

**Authentication**: Required (provider only)

**Query Parameters**:
- `start_date`: Filter from this date
- `end_date`: Filter until this date

**Response** (200): Array of blocked period objects

---

### 6.3 Delete Blocked Period

**Endpoint**: `DELETE /blocked-periods/:id`

**Authentication**: Required (provider only)

**Response** (204): No content

---

## 7. Service Types Endpoints

### 7.1 Create Service Type

**Endpoint**: `POST /service-types`

**Authentication**: Required (provider only)

**Description**: Define a new service offering

**Request**:
```json
{
  "name": "30-minute consultation",
  "description": "Initial consultation call",
  "duration_minutes": 30,
  "buffer_minutes": 15,
  "color": "#FF5733"
}
```

**Response** (201):
```json
{
  "success": true,
  "data": {
    "id": "service_456",
    "provider_id": "user_123",
    "name": "30-minute consultation",
    "description": "Initial consultation call",
    "duration_minutes": 30,
    "buffer_minutes": 15,
    "color": "#FF5733",
    "is_active": true,
    "created_at": "2026-05-14T10:30:00Z"
  }
}
```

---

### 7.2 List Service Types

**Endpoint**: `GET /service-types`

**Authentication**: Optional

**Query Parameters**:
- `provider_id`: Filter by provider (required if accessing as customer)
- `is_active` (optional): Filter by active status

**Response** (200): Array of service type objects

---

### 7.3 Get Service Type

**Endpoint**: `GET /service-types/:id`

**Authentication**: Optional

**Response** (200): Service type object

---

### 7.4 Update Service Type

**Endpoint**: `PUT /service-types/:id`

**Authentication**: Required (provider only)

**Response** (200): Updated service type object

---

### 7.5 Delete Service Type

**Endpoint**: `DELETE /service-types/:id`

**Authentication**: Required (provider only)

**Response** (204): No content

---

## 8. Slots Endpoints

### 8.1 Generate Available Slots

**Endpoint**: `GET /slots`

**Authentication**: Optional

**Query Parameters**:
- `provider_id` (required): Provider to get slots for
- `service_type_id` (required): Service type
- `start_date` (required): Start date (YYYY-MM-DD)
- `end_date` (required): End date (YYYY-MM-DD)
- `timezone` (optional): Timezone for display (defaults to UTC)

**Description**: Get available time slots for a provider and service

**Response** (200):
```json
{
  "success": true,
  "data": [
    {
      "slot_id": "slot_001",
      "start_time": "2026-05-20T14:00:00Z",
      "end_time": "2026-05-20T14:30:00Z",
      "start_time_local": "2026-05-20T09:00:00",
      "end_time_local": "2026-05-20T09:30:00",
      "timezone": "America/Los_Angeles",
      "available": true,
      "duration_minutes": 30
    },
    {
      "slot_id": "slot_002",
      "start_time": "2026-05-20T14:45:00Z",
      "end_time": "2026-05-20T15:15:00Z",
      "start_time_local": "2026-05-20T09:45:00",
      "end_time_local": "2026-05-20T10:15:00",
      "timezone": "America/Los_Angeles",
      "available": true,
      "duration_minutes": 30
    }
  ],
  "pagination": { "page": 1, "limit": 100, "total": 247 }
}
```

**Errors**:
- 400: Missing required parameters
- 404: Provider or service not found

---

## 9. Booking Endpoints

### 9.1 Create Booking

**Endpoint**: `POST /bookings`

**Authentication**: Required

**Description**: Create a new booking for an available slot

**Request**:
```json
{
  "provider_id": "user_123",
  "service_type_id": "service_456",
  "slot_start": "2026-05-20T14:00:00Z",
  "slot_end": "2026-05-20T14:30:00Z",
  "customer_name": "Jane Smith",
  "customer_email": "jane@example.com",
  "customer_phone": "+1-555-0999",
  "notes": "Please call 5 minutes before"
}
```

**Response** (201):
```json
{
  "success": true,
  "data": {
    "id": "booking_001",
    "provider_id": "user_123",
    "customer_id": "customer_456",
    "service_type_id": "service_456",
    "slot_start": "2026-05-20T14:00:00Z",
    "slot_end": "2026-05-20T14:30:00Z",
    "status": "confirmed",
    "customer_name": "Jane Smith",
    "customer_email": "jane@example.com",
    "customer_phone": "+1-555-0999",
    "notes": "Please call 5 minutes before",
    "created_at": "2026-05-14T10:30:00Z"
  }
}
```

**Errors**:
- 400: Validation error (slot not available, rules violated)
- 404: Provider, service, or slot not found
- 409: Slot no longer available (double-booking)

---

### 9.2 Get Booking

**Endpoint**: `GET /bookings/:id`

**Authentication**: Required (customer, provider, or admin)

**Response** (200): Booking object

---

### 9.3 List Bookings

**Endpoint**: `GET /bookings`

**Authentication**: Required

**Query Parameters**:
- `provider_id` (optional): Filter by provider (provider view)
- `customer_id` (optional): Filter by customer
- `status` (optional): Filter by status (pending, confirmed, cancelled, completed)
- `start_date` (optional): Filter from date
- `end_date` (optional): Filter until date
- `page` (optional): Pagination
- `limit` (optional): Items per page

**Response** (200): Array of booking objects with pagination

---

### 9.4 Update Booking

**Endpoint**: `PUT /bookings/:id`

**Authentication**: Required (customer or provider)

**Description**: Update booking details (notes, etc.)

**Request**:
```json
{
  "notes": "Updated notes",
  "customer_phone": "+1-555-0888"
}
```

**Response** (200): Updated booking object

---

### 9.5 Cancel Booking

**Endpoint**: `DELETE /bookings/:id`

**Authentication**: Required (customer or provider)

**Request**:
```json
{
  "cancellation_reason": "Personal emergency"
}
```

**Response** (200):
```json
{
  "success": true,
  "data": {
    "id": "booking_001",
    "status": "cancelled",
    "cancelled_at": "2026-05-14T10:35:00Z",
    "cancellation_reason": "Personal emergency"
  }
}
```

**Errors**:
- 400: Cannot cancel (outside minimum notice period)
- 403: Not authorized to cancel this booking
- 409: Booking already cancelled

---

## 10. Booking Rules Endpoints

### 10.1 Create Booking Rule

**Endpoint**: `POST /booking-rules`

**Authentication**: Required (provider only)

**Description**: Create a business rule for bookings

**Request**:
```json
{
  "service_type_id": "service_456",
  "rule_type": "advance_booking_days",
  "rule_config": {
    "max_days_advance": 90,
    "min_days_advance": 1
  }
}
```

**Response** (201):
```json
{
  "success": true,
  "data": {
    "id": "rule_001",
    "provider_id": "user_123",
    "service_type_id": "service_456",
    "rule_type": "advance_booking_days",
    "rule_config": {
      "max_days_advance": 90,
      "min_days_advance": 1
    },
    "is_active": true,
    "created_at": "2026-05-14T10:30:00Z"
  }
}
```

---

### 10.2 List Booking Rules

**Endpoint**: `GET /booking-rules`

**Authentication**: Required (provider only)

**Query Parameters**:
- `service_type_id` (optional): Filter by service
- `rule_type` (optional): Filter by rule type

**Response** (200): Array of booking rules

---

### 10.3 Update Booking Rule

**Endpoint**: `PUT /booking-rules/:id`

**Authentication**: Required (provider only)

**Response** (200): Updated rule object

---

### 10.4 Delete Booking Rule

**Endpoint**: `DELETE /booking-rules/:id`

**Authentication**: Required (provider only)

**Response** (204): No content

---

## 11. Admin Endpoints

### 11.1 Get System Health

**Endpoint**: `GET /admin/health`

**Authentication**: Required (admin only)

**Response** (200):
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "uptime_seconds": 864000,
    "database": "connected",
    "cache": "connected",
    "queue": "connected"
  }
}
```

---

### 11.2 Get System Metrics

**Endpoint**: `GET /admin/metrics`

**Authentication**: Required (admin only)

**Response** (200):
```json
{
  "success": true,
  "data": {
    "active_users": 1250,
    "bookings_today": 450,
    "avg_response_time_ms": 87,
    "error_rate": 0.002,
    "cache_hit_ratio": 0.847
  }
}
```

---

## 12. Error Codes

| Code | Description |
|------|-------------|
| VALIDATION_ERROR | Request data is invalid |
| UNAUTHORIZED | Missing or invalid authentication |
| FORBIDDEN | Insufficient permissions |
| NOT_FOUND | Resource not found |
| CONFLICT | Resource state conflict (e.g., double-booking) |
| RULE_VIOLATION | Business rule violation |
| SLOT_UNAVAILABLE | Selected slot is no longer available |
| RATE_LIMIT_EXCEEDED | Too many requests |
| INTERNAL_ERROR | Unexpected server error |

---

## 13. Rate Limiting

**Authenticated requests**: 100 requests per minute per user
**Unauthenticated requests**: 20 requests per minute per IP

Headers included in response:
- `X-RateLimit-Limit`: Maximum requests in window
- `X-RateLimit-Remaining`: Requests remaining
- `X-RateLimit-Reset`: Unix timestamp when limit resets

---

## 14. Versioning

API versioning is handled through URL path:
- Current version: `/v1/`
- Deprecated endpoints will be marked for 6 months before removal
- Breaking changes increment major version

---

**Document Version**: 1.0
**Last Updated**: May 2026
**Owner**: API Lead
