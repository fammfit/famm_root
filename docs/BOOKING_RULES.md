# Booking Rules

## 1. Overview

This document describes the booking rules engine, including rule types, validation logic, configuration options, and enforcement strategies.

## 2. Rule Types

### 2.1 Duration Rules

Control the allowed length of bookings for a service.

#### Min Duration
**Purpose**: Set minimum booking length to prevent too-short appointments

**Configuration**:
```json
{
  "rule_type": "min_duration",
  "rule_config": {
    "duration_minutes": 30
  }
}
```

**Validation**:
```javascript
function validateMinDuration(booking, rule) {
  const bookingDuration = (booking.slot_end - booking.slot_start) / (1000 * 60);
  const minDuration = rule.rule_config.duration_minutes;
  
  if (bookingDuration < minDuration) {
    return {
      valid: false,
      error: 'BOOKING_TOO_SHORT',
      message: `Booking must be at least ${minDuration} minutes`,
      detail: {
        requested_duration: bookingDuration,
        minimum_duration: minDuration
      }
    };
  }
  
  return { valid: true };
}
```

**Example**: "Consultation must be at least 30 minutes"

#### Max Duration
**Purpose**: Set maximum booking length to limit per-appointment time

**Configuration**:
```json
{
  "rule_type": "max_duration",
  "rule_config": {
    "duration_minutes": 120
  }
}
```

**Example**: "Consultation cannot exceed 2 hours"

---

### 2.2 Advance Booking Rules

Control how far in advance bookings can be made.

#### Max Advance Days
**Purpose**: Prevent booking too far in future (limit availability window)

**Configuration**:
```json
{
  "rule_type": "advance_booking_days",
  "rule_config": {
    "max_days_advance": 90,
    "min_days_advance": 0
  }
}
```

**Validation**:
```javascript
function validateAdvanceBooking(booking, rule) {
  const now = new Date();
  const daysUntilBooking = (booking.slot_start - now) / (1000 * 60 * 60 * 24);
  const maxDays = rule.rule_config.max_days_advance;
  const minDays = rule.rule_config.min_days_advance;
  
  if (daysUntilBooking > maxDays) {
    return {
      valid: false,
      error: 'BOOKING_TOO_FAR_ADVANCE',
      message: `Cannot book more than ${maxDays} days in advance`,
      detail: {
        requested_days_advance: Math.ceil(daysUntilBooking),
        max_days_advance: maxDays
      }
    };
  }
  
  if (daysUntilBooking < minDays) {
    return {
      valid: false,
      error: 'BOOKING_TOO_SOON',
      message: `Must book at least ${minDays} days in advance`,
      detail: {
        requested_days_advance: Math.ceil(daysUntilBooking),
        min_days_advance: minDays
      }
    };
  }
  
  return { valid: true };
}
```

**Example**: "Can only book 1-90 days in advance"

---

### 2.3 Cancellation Rules

Control when bookings can be modified or cancelled.

#### Minimum Notice Hours
**Purpose**: Require cancellation/modification notice before appointment

**Configuration**:
```json
{
  "rule_type": "min_notice_hours",
  "rule_config": {
    "hours_notice": 24
  }
}
```

**Validation** (for cancellation request):
```javascript
function validateCancellationNotice(booking, rule, currentTime = new Date()) {
  const hoursUntilBooking = (booking.slot_start - currentTime) / (1000 * 60 * 60);
  const requiredHours = rule.rule_config.hours_notice;
  
  if (hoursUntilBooking < requiredHours) {
    return {
      valid: false,
      error: 'INSUFFICIENT_NOTICE',
      message: `Must cancel at least ${requiredHours} hours in advance`,
      detail: {
        hours_until_booking: Math.floor(hoursUntilBooking),
        required_hours_notice: requiredHours,
        cancellation_deadline: new Date(booking.slot_start - requiredHours * 60 * 60 * 1000)
      }
    };
  }
  
  return { valid: true };
}
```

**Example**: "Must cancel at least 24 hours before appointment"

---

### 2.4 Slot Availability Rules

Control how many concurrent bookings are allowed.

#### Max Concurrent Slots
**Purpose**: Limit number of simultaneous appointments

**Configuration**:
```json
{
  "rule_type": "max_concurrent_slots",
  "rule_config": {
    "max_slots": 1
  }
}
```

**Validation**:
```javascript
async function validateMaxConcurrentSlots(booking, rule, existingBookings) {
  const maxSlots = rule.rule_config.max_slots;
  
  // Count overlapping confirmed bookings
  const overlappingBookings = existingBookings.filter(b =>
    b.status === 'confirmed' &&
    b.slot_start < booking.slot_end &&
    b.slot_end > booking.slot_start &&
    b.id !== booking.id
  );
  
  if (overlappingBookings.length >= maxSlots) {
    return {
      valid: false,
      error: 'MAX_CONCURRENT_SLOTS_EXCEEDED',
      message: `Cannot exceed ${maxSlots} concurrent appointment(s)`,
      detail: {
        max_slots: maxSlots,
        current_concurrent_slots: overlappingBookings.length
      }
    };
  }
  
  return { valid: true };
}
```

**Example**: "Only 1 customer at a time"

---

### 2.5 Day/Time Rules

Control which days and times bookings are allowed.

#### Day of Week Restrictions
**Purpose**: Disable bookings on certain days

**Configuration**:
```json
{
  "rule_type": "allowed_days_of_week",
  "rule_config": {
    "allowed_days": [0, 1, 2, 3, 4] // Monday-Friday only
  }
}
```

**Validation**:
```javascript
function validateDayOfWeek(booking, rule) {
  const dayOfWeek = booking.slot_start.getDay();
  const allowedDays = rule.rule_config.allowed_days;
  
  if (!allowedDays.includes(dayOfWeek)) {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const bookingDay = dayNames[dayOfWeek];
    const workingDays = allowedDays.map(d => dayNames[d]).join(', ');
    
    return {
      valid: false,
      error: 'INVALID_DAY_OF_WEEK',
      message: `Bookings not available on ${bookingDay}. Available on: ${workingDays}`,
      detail: {
        booking_day: dayOfWeek,
        booking_day_name: bookingDay,
        allowed_days: allowedDays,
        allowed_day_names: workedDays
      }
    };
  }
  
  return { valid: true };
}
```

---

### 2.6 Special Rules

Custom rules for specific business logic.

#### Birthday/Anniversary Exemption
**Purpose**: Allow free bookings on special dates

**Configuration**:
```json
{
  "rule_type": "special_dates_free",
  "rule_config": {
    "dates": ["2026-12-25", "2027-01-01"]
  }
}
```

#### Service-Specific Rules
**Purpose**: Different rules for different service types

**Configuration**:
```json
{
  "rule_type": "service_specific",
  "service_type_id": "service_456",
  "rule_config": {
    "rule_type": "min_duration",
    "duration_minutes": 60
  }
}
```

---

## 3. Rules Engine Architecture

### 3.1 Rule Evaluation Flow

```
Request to create booking
    ↓
Load provider's booking rules
    ↓
For each rule:
  1. Check if rule applies to this service
  2. Check if rule applies to this date/time
  3. Validate booking against rule
  4. If invalid, return error
    ↓
All rules passed
    ↓
Create booking
```

### 3.2 Rules Engine Implementation

```javascript
class BookingRulesEngine {
  constructor(rulesRepository, bookingRepository) {
    this.rulesRepository = rulesRepository;
    this.bookingRepository = bookingRepository;
  }
  
  /**
   * Validate booking against all applicable rules
   */
  async validateBooking(booking, providerId) {
    // Get all active rules for provider
    const rules = await this.rulesRepository.getActiveRules(providerId);
    
    // Filter to applicable rules
    const applicableRules = rules.filter(rule =>
      !rule.service_type_id || rule.service_type_id === booking.service_type_id
    );
    
    // Validate against each rule
    for (const rule of applicableRules) {
      const validator = this.getValidator(rule.rule_type);
      
      // Get any additional data needed for validation
      let validationData = {};
      if (rule.rule_type === 'max_concurrent_slots') {
        validationData.existingBookings = await this.bookingRepository.find({
          provider_id: providerId,
          status: 'confirmed'
        });
      }
      
      const result = await validator(booking, rule, validationData);
      
      if (!result.valid) {
        return result; // Return first error
      }
    }
    
    return { valid: true };
  }
  
  /**
   * Get validator function for rule type
   */
  getValidator(ruleType) {
    const validators = {
      'min_duration': validateMinDuration,
      'max_duration': validateMaxDuration,
      'advance_booking_days': validateAdvanceBooking,
      'min_notice_hours': validateCancellationNotice,
      'max_concurrent_slots': validateMaxConcurrentSlots,
      'allowed_days_of_week': validateDayOfWeek
    };
    
    return validators[ruleType] || (() => ({ valid: true }));
  }
  
  /**
   * Check if cancellation is allowed
   */
  async validateCancellation(booking, providerId) {
    const rules = await this.rulesRepository.getActiveRules(providerId);
    
    for (const rule of rules) {
      if (rule.rule_type === 'min_notice_hours') {
        const result = validateCancellationNotice(booking, rule);
        if (!result.valid) {
          return result;
        }
      }
    }
    
    return { valid: true };
  }
}
```

### 3.3 Integration with Booking Service

```javascript
class BookingService {
  constructor(bookingRepository, rulesEngine) {
    this.bookingRepository = bookingRepository;
    this.rulesEngine = rulesEngine;
  }
  
  async createBooking(bookingData) {
    // Validate against rules
    const validation = await this.rulesEngine.validateBooking(
      bookingData,
      bookingData.provider_id
    );
    
    if (!validation.valid) {
      throw new BookingRuleError(validation);
    }
    
    // Create booking
    const booking = await this.bookingRepository.create(bookingData);
    
    return booking;
  }
  
  async cancelBooking(bookingId, cancelledBy) {
    const booking = await this.bookingRepository.findById(bookingId);
    
    // Validate cancellation is allowed
    const validation = await this.rulesEngine.validateCancellation(
      booking,
      booking.provider_id
    );
    
    if (!validation.valid) {
      throw new BookingRuleError(validation);
    }
    
    // Cancel booking
    booking.status = 'cancelled';
    booking.cancelled_by = cancelledBy;
    booking.cancelled_at = new Date();
    
    return await this.bookingRepository.update(booking);
  }
}
```

---

## 4. Caching Rules for Performance

### 4.1 Rules Cache Strategy

```javascript
const RULES_CACHE_TTL = 30 * 60; // 30 minutes

async function getRulesWithCache(providerId) {
  const cacheKey = `booking_rules:${providerId}`;
  
  // Try cache
  let rules = await redis.get(cacheKey);
  if (rules) {
    return JSON.parse(rules);
  }
  
  // Fetch from database
  rules = await BookingRule.find({
    provider_id: providerId,
    is_active: true
  });
  
  // Cache rules
  await redis.setex(cacheKey, RULES_CACHE_TTL, JSON.stringify(rules));
  
  return rules;
}

// Invalidate cache when rules change
async function updateRule(ruleId, updates) {
  const rule = await BookingRule.findByIdAndUpdate(ruleId, updates);
  
  // Clear cache
  await redis.del(`booking_rules:${rule.provider_id}`);
  
  return rule;
}
```

---

## 5. Rule Configuration Examples

### 5.1 Therapy Appointment Service

```javascript
[
  {
    rule_type: 'min_duration',
    rule_config: { duration_minutes: 45 }
  },
  {
    rule_type: 'max_duration',
    rule_config: { duration_minutes: 60 }
  },
  {
    rule_type: 'advance_booking_days',
    rule_config: {
      max_days_advance: 30,
      min_days_advance: 1
    }
  },
  {
    rule_type: 'min_notice_hours',
    rule_config: { hours_notice: 24 }
  },
  {
    rule_type: 'allowed_days_of_week',
    rule_config: { allowed_days: [1, 2, 3, 4, 5] } // Mon-Fri only
  }
]
```

### 5.2 Medical Appointment Service

```javascript
[
  {
    rule_type: 'min_duration',
    rule_config: { duration_minutes: 15 }
  },
  {
    rule_type: 'max_duration',
    rule_config: { duration_minutes: 30 }
  },
  {
    rule_type: 'advance_booking_days',
    rule_config: {
      max_days_advance: 60,
      min_days_advance: 0 // Can book same day
    }
  },
  {
    rule_type: 'min_notice_hours',
    rule_config: { hours_notice: 4 } // 4-hour cancellation notice
  },
  {
    rule_type: 'max_concurrent_slots',
    rule_config: { max_slots: 3 } // Multiple exam rooms
  }
]
```

### 5.3 Consultation Service

```javascript
[
  {
    rule_type: 'min_duration',
    rule_config: { duration_minutes: 30 }
  },
  {
    rule_type: 'max_duration',
    rule_config: { duration_minutes: 90 }
  },
  {
    rule_type: 'advance_booking_days',
    rule_config: {
      max_days_advance: 180,
      min_days_advance: 3 // Must book at least 3 days ahead
    }
  },
  {
    rule_type: 'min_notice_hours',
    rule_config: { hours_notice: 48 } // 2-day cancellation notice
  }
]
```

---

## 6. Error Handling

### 6.1 Error Response Format

```javascript
class BookingRuleError extends Error {
  constructor(validation) {
    super(validation.message);
    this.code = validation.error;
    this.detail = validation.detail;
    this.httpStatus = 400; // Bad request
  }
  
  toJSON() {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        detail: this.detail
      }
    };
  }
}
```

### 6.2 API Error Response

```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_NOTICE",
    "message": "Must cancel at least 24 hours in advance",
    "detail": {
      "hours_until_booking": 12,
      "required_hours_notice": 24,
      "cancellation_deadline": "2026-05-20T14:30:00Z"
    }
  }
}
```

---

## 7. Testing Rules

### 7.1 Unit Tests

```javascript
describe('Booking Rules Engine', () => {
  let rulesEngine;
  
  beforeEach(() => {
    rulesEngine = new BookingRulesEngine(rulesRepo, bookingRepo);
  });
  
  describe('Duration rules', () => {
    it('should reject booking shorter than min duration', async () => {
      const rule = {
        rule_type: 'min_duration',
        rule_config: { duration_minutes: 30 }
      };
      
      const booking = {
        slot_start: new Date('2026-05-20T14:00:00Z'),
        slot_end: new Date('2026-05-20T14:15:00Z') // 15 minutes
      };
      
      const result = validateMinDuration(booking, rule);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('BOOKING_TOO_SHORT');
    });
  });
  
  describe('Advance booking rules', () => {
    it('should reject booking beyond max advance days', async () => {
      const rule = {
        rule_type: 'advance_booking_days',
        rule_config: {
          max_days_advance: 90,
          min_days_advance: 0
        }
      };
      
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 120); // 120 days from now
      
      const booking = {
        slot_start: futureDate,
        slot_end: new Date(futureDate.getTime() + 30 * 60 * 1000)
      };
      
      const result = validateAdvanceBooking(booking, rule);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('BOOKING_TOO_FAR_ADVANCE');
    });
  });
  
  describe('Cancellation rules', () => {
    it('should reject cancellation without sufficient notice', async () => {
      const rule = {
        rule_type: 'min_notice_hours',
        rule_config: { hours_notice: 24 }
      };
      
      const bookingTime = new Date();
      bookingTime.setHours(bookingTime.getHours() + 12); // 12 hours from now
      
      const booking = {
        slot_start: bookingTime,
        slot_end: new Date(bookingTime.getTime() + 30 * 60 * 1000)
      };
      
      const result = validateCancellationNotice(booking, rule);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('INSUFFICIENT_NOTICE');
    });
  });
});
```

---

## 8. Migration: Adding Rules to Existing System

### 8.1 Database Setup

```sql
-- Create booking_rules table
CREATE TABLE booking_rules (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  provider_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  service_type_id BIGINT REFERENCES service_types(id) ON DELETE CASCADE,
  rule_type VARCHAR(50) NOT NULL,
  rule_config JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_booking_rules_provider ON booking_rules(provider_id, is_active);
```

### 8.2 Phased Rollout

1. **Phase 1**: Add rules table, deploy code (rules not enforced)
2. **Phase 2**: Add default rules for all providers (enforcement OFF)
3. **Phase 3**: Enable enforcement for subset of providers (beta)
4. **Phase 4**: Enable for all providers, update documentation
5. **Phase 5**: Monitor and refine

---

**Document Version**: 1.0
**Last Updated**: May 2026
**Owner**: Product Lead
