# Slot Generation

## 1. Overview

This document describes the algorithm for generating available time slots based on provider availability, service duration, blocked periods, and existing bookings.

## 2. Slot Generation Algorithm

### 2.1 High-Level Flow

```
Input: provider_id, service_type_id, start_date, end_date, timezone
Output: Array of available slots

1. Validate inputs
2. Get provider's availability rules
3. Get provider's blocked periods
4. Get existing confirmed bookings
5. For each day in date range:
   a. Get availability windows for that day
   b. Remove blocked periods from windows
   c. Remove booked slots from windows
   d. Split remaining time into slot chunks
   e. Add to results
6. Sort slots chronologically
7. Return slots
```

### 2.2 Detailed Algorithm

```javascript
async function generateSlots(
  providerId,
  serviceTypeId,
  startDate,
  endDate,
  duration,
  timezone = 'UTC'
) {
  const slots = [];
  const errors = [];
  
  // Validation
  if (startDate > endDate) {
    throw new Error('Start date must be before end date');
  }
  
  if (startDate < today) {
    throw new Error('Cannot generate slots for past dates');
  }
  
  // Fetch availability rules
  const availabilityRules = await AvailabilityRule.find({
    provider_id: providerId,
    service_type_id: serviceTypeId,
    is_active: true
  });
  
  if (!availabilityRules.length) {
    return { slots: [], error: 'No availability rules configured' };
  }
  
  // Fetch blocked periods
  const blockedPeriods = await BlockedPeriod.find({
    provider_id: providerId,
    start_time: { $lte: endDate },
    end_time: { $gte: startDate },
    is_active: true
  });
  
  // Fetch existing bookings
  const existingBookings = await Booking.find({
    provider_id: providerId,
    service_type_id: serviceTypeId,
    slot_start: { $lte: endDate },
    slot_end: { $gte: startDate },
    status: 'confirmed',
    deleted_at: null
  });
  
  // Get service type for buffer time
  const serviceType = await ServiceType.findById(serviceTypeId);
  const bufferMinutes = serviceType.buffer_minutes || 0;
  
  // Process each day
  let currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const daySlots = generateSlotsForDay(
      currentDate,
      availabilityRules,
      blockedPeriods,
      existingBookings,
      duration,
      bufferMinutes,
      timezone
    );
    slots.push(...daySlots);
    
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return {
    slots: slots.sort((a, b) => a.start_time - b.start_time),
    total: slots.length
  };
}
```

### 2.3 Daily Slot Generation

```javascript
function generateSlotsForDay(
  date,
  availabilityRules,
  blockedPeriods,
  existingBookings,
  duration,
  buffer,
  timezone
) {
  const slots = [];
  const dayOfWeek = date.getDay(); // 0-6, where 0 is Sunday
  
  // Get availability windows for this day of week
  const dayRules = availabilityRules.filter(
    r => r.day_of_week === dayOfWeek
  );
  
  if (!dayRules.length) {
    // No availability this day of week
    return slots;
  }
  
  // Convert to UTC timestamps
  const dayStart = startOfDay(date, timezone);
  const dayEnd = endOfDay(date, timezone);
  
  // Build availability windows (merge overlapping rules)
  let availableWindows = [];
  for (const rule of dayRules) {
    const ruleStart = timeToTimestamp(date, rule.start_time);
    const ruleEnd = timeToTimestamp(date, rule.end_time);
    availableWindows.push({
      start: ruleStart,
      end: ruleEnd
    });
  }
  
  // Merge overlapping windows
  availableWindows = mergeWindows(availableWindows);
  
  // Remove blocked periods from windows
  const blockedForDay = blockedPeriods.filter(
    b => b.start_time <= dayEnd && b.end_time >= dayStart
  );
  
  for (const block of blockedForDay) {
    availableWindows = subtractTimeFromWindows(
      availableWindows,
      block.start_time,
      block.end_time
    );
  }
  
  // Remove existing bookings from windows
  const bookingsForDay = existingBookings.filter(
    b => b.slot_start <= dayEnd && b.slot_end >= dayStart
  );
  
  for (const booking of bookingsForDay) {
    // Account for buffer time after booking
    const blockStart = booking.slot_start;
    const blockEnd = addMinutes(booking.slot_end, buffer);
    
    availableWindows = subtractTimeFromWindows(
      availableWindows,
      blockStart,
      blockEnd
    );
  }
  
  // Generate slot chunks from windows
  for (const window of availableWindows) {
    let slotStart = new Date(window.start);
    const windowEnd = new Date(window.end);
    
    while (addMinutes(slotStart, duration) <= windowEnd) {
      const slotEnd = addMinutes(slotStart, duration);
      
      slots.push({
        slot_id: generateId(),
        start_time: slotStart,
        end_time: slotEnd,
        duration_minutes: duration,
        available: true
      });
      
      slotStart = addMinutes(slotStart, duration);
    }
  }
  
  return slots;
}
```

### 2.4 Helper Functions

**Merge Overlapping Windows**:
```javascript
function mergeWindows(windows) {
  if (!windows.length) return [];
  
  // Sort by start time
  windows.sort((a, b) => a.start - b.start);
  
  const merged = [windows[0]];
  
  for (let i = 1; i < windows.length; i++) {
    const last = merged[merged.length - 1];
    const current = windows[i];
    
    if (current.start <= last.end) {
      // Overlapping or adjacent, merge
      last.end = Math.max(last.end, current.end);
    } else {
      // Non-overlapping, add as new window
      merged.push(current);
    }
  }
  
  return merged;
}
```

**Subtract Time from Windows**:
```javascript
function subtractTimeFromWindows(windows, blockStart, blockEnd) {
  const result = [];
  
  for (const window of windows) {
    // Check if block overlaps with window
    if (blockEnd <= window.start || blockStart >= window.end) {
      // No overlap
      result.push(window);
      continue;
    }
    
    // Block overlaps, may create 1-2 new windows
    if (blockStart > window.start) {
      // Add time before block
      result.push({
        start: window.start,
        end: blockStart
      });
    }
    
    if (blockEnd < window.end) {
      // Add time after block
      result.push({
        start: blockEnd,
        end: window.end
      });
    }
  }
  
  return result;
}
```

**Time to Timestamp**:
```javascript
function timeToTimestamp(date, timeString) {
  // timeString format: "09:30:00"
  const [hours, minutes, seconds] = timeString.split(':');
  
  const timestamp = new Date(date);
  timestamp.setHours(parseInt(hours));
  timestamp.setMinutes(parseInt(minutes));
  timestamp.setSeconds(parseInt(seconds));
  timestamp.setMilliseconds(0);
  
  return timestamp;
}
```

**Add Minutes**:
```javascript
function addMinutes(date, minutes) {
  const result = new Date(date);
  result.setMinutes(result.getMinutes() + minutes);
  return result;
}
```

## 3. Timezone Handling

### 3.1 Timezone Conversion

All internal calculations use UTC. Conversion happens at boundaries:

**Input Conversion (Customer timezone → UTC)**:
```javascript
function customerDateToUtc(date, timezone) {
  // Use library like date-fns-tz or moment-timezone
  return zonedTimeToUtc(date, timezone);
}

// Example
const customerDate = '2026-05-20'; // in customer's timezone
const customerTz = 'America/Los_Angeles';
const utcDate = zonedTimeToUtc(parseISO(customerDate), customerTz);
```

**Output Conversion (UTC → Customer timezone)**:
```javascript
function utcDateToCustomer(utcDate, timezone) {
  return utcToZonedTime(utcDate, timezone);
}

// Example
const slots = [
  {
    start_time: '2026-05-20T17:00:00Z', // UTC
    end_time: '2026-05-20T17:30:00Z'
  }
];

const customerSlots = slots.map(slot => ({
  ...slot,
  start_time_local: utcToZonedTime(slot.start_time, 'America/Los_Angeles'),
  end_time_local: utcToZonedTime(slot.end_time, 'America/Los_Angeles')
}));
```

### 3.2 DST (Daylight Saving Time) Handling

Properly handle DST transitions when generating slots:

```javascript
function generateSlotsForDay(date, rules, ..., timezone) {
  // When date crosses DST boundary, handle carefully
  
  // Example: Spring forward (2:00 AM → 3:00 AM)
  // A 1-hour slot at 1:30 AM becomes 30 minutes
  
  // Solution: Work with timezone-aware dates
  const timeZoneDate = utcToZonedTime(date, timezone);
  
  // Generate times in the specified timezone
  // Then convert back to UTC for storage
  const localStart = new Date(timeZoneDate);
  localStart.setHours(9, 0, 0, 0); // 9:00 AM in customer timezone
  
  const utcStart = zonedTimeToUtc(localStart, timezone);
  
  // Create slot
  const slot = {
    start_time: utcStart,
    end_time: addMinutes(utcStart, duration)
  };
}
```

## 4. Performance Optimization

### 4.1 Caching Strategy

Cache availability rules and blocked periods for fast access:

```javascript
const CACHE_TTL = 60 * 60; // 1 hour

async function getAvailabilityRules(providerId) {
  const cacheKey = `availability_rules:${providerId}`;
  
  // Try cache first
  let rules = await redis.get(cacheKey);
  if (rules) {
    return JSON.parse(rules);
  }
  
  // Fetch from database
  rules = await AvailabilityRule.find({
    provider_id: providerId,
    is_active: true
  });
  
  // Store in cache
  await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(rules));
  
  return rules;
}

// Invalidate cache on rule change
async function updateAvailabilityRule(id, updates) {
  const rule = await AvailabilityRule.findByIdAndUpdate(id, updates);
  
  // Clear cache
  await redis.del(`availability_rules:${rule.provider_id}`);
  
  return rule;
}
```

### 4.2 Query Optimization

Use database indexes for fast queries:

```sql
-- Index for availability rules lookup
CREATE INDEX idx_availability_rules_provider_active 
ON availability_rules(provider_id, is_active);

-- Index for blocked periods within date range
CREATE INDEX idx_blocked_periods_range 
ON blocked_periods(provider_id, start_time, end_time) 
WHERE is_active = true;

-- Index for bookings within date range
CREATE INDEX idx_bookings_date_range 
ON bookings(provider_id, service_type_id, slot_start, slot_end)
WHERE status = 'confirmed' AND deleted_at IS NULL;
```

### 4.3 Pagination for Large Results

For queries generating many slots, implement pagination:

```javascript
async function generateSlotsWithPagination(
  providerId,
  serviceTypeId,
  startDate,
  endDate,
  page = 1,
  pageSize = 100
) {
  const result = await generateSlots(
    providerId,
    serviceTypeId,
    startDate,
    endDate
  );
  
  const total = result.slots.length;
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  
  return {
    slots: result.slots.slice(start, end),
    pagination: {
      page,
      pageSize,
      total,
      pages: Math.ceil(total / pageSize),
      hasNext: end < total,
      hasPrev: page > 1
    }
  };
}
```

## 5. Error Handling

### 5.1 Common Errors

**No Availability Rules**:
```javascript
if (!availabilityRules.length) {
  return {
    slots: [],
    error: 'SLOT_ERROR_NO_AVAILABILITY',
    message: 'Provider has no availability configured for this service'
  };
}
```

**Invalid Date Range**:
```javascript
if (startDate > endDate) {
  throw new ValidationError('SLOT_ERROR_INVALID_DATE_RANGE', {
    message: 'Start date must be before end date'
  });
}

if (startDate < today) {
  throw new ValidationError('SLOT_ERROR_PAST_DATE', {
    message: 'Cannot generate slots for past dates'
  });
}
```

**Duration Mismatch**:
```javascript
const { duration_min, duration_max } = serviceType;
if (duration < duration_min || duration > duration_max) {
  throw new ValidationError('SLOT_ERROR_INVALID_DURATION', {
    message: `Duration must be between ${duration_min} and ${duration_max} minutes`,
    min: duration_min,
    max: duration_max
  });
}
```

### 5.2 Graceful Degradation

If parts of query fail, return partial results:

```javascript
async function generateSlots(...) {
  const slots = [];
  const warnings = [];
  
  try {
    // ... generate slots
  } catch (error) {
    if (error.code === 'BLOCKED_PERIODS_FETCH_FAILED') {
      warnings.push('Could not load blocked periods; showing all available time');
      // Continue without blocked period filtering
    } else {
      throw error;
    }
  }
  
  return {
    slots,
    warnings: warnings.length ? warnings : undefined
  };
}
```

## 6. Examples

### 6.1 Simple Case: No Blocks

**Scenario**:
- Provider works 9 AM - 5 PM, Monday-Friday
- No blocked periods
- No existing bookings
- Generate 30-minute slots for May 20-24 (Mon-Fri)

**Result**:
```
Monday, May 20
  9:00 AM - 9:30 AM ✓
  9:30 AM - 10:00 AM ✓
  ...
  4:30 PM - 5:00 PM ✓

Tuesday-Friday
  (Same pattern)
```

### 6.2 Complex Case: With Blocks and Bookings

**Scenario**:
- Provider works 9 AM - 6 PM, Monday-Friday (30-min buffer)
- Blocked: May 20, 12 PM - 1 PM (lunch)
- Booked: May 20, 2 PM - 2:30 PM (existing booking)
- Generate 30-minute slots for May 20

**Timeline**:
```
9:00 AM - 9:30 AM ✓
9:30 AM - 10:00 AM ✓
...
11:30 AM - 12:00 PM ✓
12:00 PM - 1:00 PM ✗ (lunch block)
1:00 PM - 1:30 PM ✓
1:30 PM - 2:00 PM ✓
2:00 PM - 2:30 PM ✗ (booking)
2:30 PM - 3:00 PM ✗ (buffer from booking)
3:00 PM - 3:30 PM ✓
...
5:30 PM - 6:00 PM ✓
```

### 6.3 Timezone Example

**Scenario**:
- Provider in 'America/Los_Angeles' (PDT, UTC-7)
- Works 9 AM - 5 PM Pacific Time
- Customer in 'Europe/London' (BST, UTC+1)
- Generate slots for May 20

**Internal Processing**:
```
Provider's 9 AM PDT = 4 PM UTC
Provider's 5 PM PDT = 12 AM UTC (next day)

Generate slots in UTC:
May 20 4:00 PM - 4:30 PM UTC ✓
May 20 4:30 PM - 5:00 PM UTC ✓
...
May 21 12:00 AM - 12:30 AM UTC ✓
```

**Display to Customer**:
```
May 20 5:00 PM - 5:30 PM BST
May 20 5:30 PM - 6:00 PM BST
...
May 21 1:00 AM - 1:30 AM BST
```

## 7. Performance Benchmarks

**Target Performance**:
- Generate 1000 slots: < 500ms
- Generate 100 slots: < 100ms
- Cached rules lookup: < 10ms

**Optimization Checklist**:
- ✓ Database queries indexed
- ✓ Rules cached in Redis
- ✓ Pagination for large results
- ✓ Minimal object creation in loops
- ✓ Early exits for common cases
- ✓ Batch queries when possible

---

**Document Version**: 1.0
**Last Updated**: May 2026
**Owner**: Backend Lead
