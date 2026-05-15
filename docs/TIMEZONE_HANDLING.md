# Timezone Handling

## 1. Overview

This document describes how the booking system handles timezones, including storage, conversion, daylight saving time (DST), and best practices for displaying times to users across different regions.

## 2. Timezone Architecture

### 2.1 Storage Strategy: UTC + User Preference

**Core Principle**:
- All timestamps stored in UTC in the database
- User timezone stored as IANA timezone name (e.g., 'America/Los_Angeles')
- Conversion happens at application boundaries

**Benefits**:
- Single source of truth (UTC)
- Consistent comparisons and queries
- Easy to support multiple users in different timezones
- Handles DST automatically (database level)
- No ambiguity around DST transitions

```
Database (UTC):          Application Layer:        Client Display:
2026-05-20T21:30:00Z  →  Convert to user TZ  →  5/20/2026 2:30 PM
                         using user's TZ pref      (in user's timezone)
```

### 2.2 User Timezone Preference

Store user's timezone in `users.timezone` table:

```javascript
{
  id: 'user_123',
  email: 'user@example.com',
  timezone: 'America/Los_Angeles', // IANA timezone name
  ...
}
```

**Allowed Values**:
- Must be valid IANA timezone name from `pg_timezone_names`
- Examples: 'UTC', 'America/New_York', 'Europe/London', 'Asia/Tokyo'
- Get list from database or moment-timezone library

```sql
-- Check available timezones
SELECT tzname FROM pg_timezone_names ORDER BY tzname;

-- Example timezones
SELECT * FROM pg_timezone_names WHERE tzname LIKE 'America/%';
```

## 3. Timezone Libraries

### 3.1 Library Options

**date-fns with date-fns-tz** (Recommended)
```javascript
import { format, parse } from 'date-fns';
import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz';

// UTC to local timezone
const utcDate = '2026-05-20T21:30:00Z';
const timezone = 'America/Los_Angeles';
const localDate = utcToZonedTime(utcDate, timezone);
console.log(format(localDate, 'YYYY-MM-DD HH:mm:ss')); // 2026-05-20 14:30:00

// Local timezone to UTC
const localDateTime = new Date('2026-05-20T14:30:00');
const utcDate = zonedTimeToUtc(localDateTime, timezone);
console.log(utcDate.toISOString()); // 2026-05-20T21:30:00Z
```

**moment-timezone** (Alternative)
```javascript
const moment = require('moment-timezone');

// UTC to local
const utcDate = moment.utc('2026-05-20 21:30:00');
const localDate = utcDate.tz('America/Los_Angeles');
console.log(localDate.format('YYYY-MM-DD HH:mm:ss')); // 2026-05-20 14:30:00

// Local to UTC
const localDate = moment.tz('2026-05-20 14:30:00', 'America/Los_Angeles');
const utcDate = localDate.utc();
console.log(utcDate.format()); // 2026-05-20T21:30:00Z
```

### 3.2 Setup and Configuration

```javascript
// utils/timezone.js
const { utcToZonedTime, zonedTimeToUtc } = require('date-fns-tz');
const { format, parse } = require('date-fns');

/**
 * Convert UTC date to user's local timezone
 */
function convertUtcToLocal(utcDate, timezone) {
  if (!utcDate) return null;
  
  const date = new Date(utcDate); // Ensure it's a Date object
  return utcToZonedTime(date, timezone);
}

/**
 * Convert user's local date to UTC
 */
function convertLocalToUtc(localDate, timezone) {
  if (!localDate) return null;
  
  // Parse if string
  const date = typeof localDate === 'string' 
    ? parse(localDate, 'yyyy-MM-dd HH:mm:ss', new Date())
    : localDate;
  
  return zonedTimeToUtc(date, timezone);
}

/**
 * Format date for user display
 */
function formatDateForDisplay(utcDate, timezone, formatString = 'yyyy-MM-dd HH:mm:ss') {
  const localDate = convertUtcToLocal(utcDate, timezone);
  return format(localDate, formatString);
}

module.exports = {
  convertUtcToLocal,
  convertLocalToUtc,
  formatDateForDisplay
};
```

## 4. DST (Daylight Saving Time) Handling

### 4.1 Understanding DST

**DST Transitions**:
- **Spring Forward**: 2:00 AM → 3:00 AM (lose 1 hour)
- **Fall Back**: 2:00 AM → 1:00 AM (gain 1 hour)

**Ambiguous and Non-existent Times**:
```
Fall Back (2:00 AM → 1:00 AM)
1:30 AM occurs TWICE

Spring Forward (2:00 AM → 3:00 AM)
2:30 AM never occurs
```

### 4.2 DST-Safe Slot Generation

When generating slots around DST transitions, use timezone-aware libraries:

```javascript
const { addMinutes } = require('date-fns');
const { utcToZonedTime, zonedTimeToUtc } = require('date-fns-tz');

/**
 * Generate slots safely across DST boundaries
 */
function generateSlotsAcrossDst(
  startDateLocal,  // Local date string or Date
  endDateLocal,
  duration,        // minutes
  timezone
) {
  const slots = [];
  let current = startDateLocal;
  
  while (current <= endDateLocal) {
    // Convert local time to UTC
    const startUtc = zonedTimeToUtc(current, timezone);
    
    // Add duration
    const endUtc = addMinutes(startUtc, duration);
    
    slots.push({
      start_time: startUtc,
      end_time: endUtc,
      start_time_local: utcToZonedTime(startUtc, timezone),
      end_time_local: utcToZonedTime(endUtc, timezone)
    });
    
    // Increment by duration (in UTC space to maintain consistency)
    current = addMinutes(current, duration);
  }
  
  return slots;
}
```

### 4.3 DST Transition Handling

```javascript
/**
 * Check if date crosses DST boundary
 */
function crossesDstBoundary(dateLocal, timezone) {
  const dateBefore = new Date(dateLocal);
  dateBefore.setDate(dateBefore.getDate() - 1);
  
  const timezoneDateBefore = convertLocalToUtc(dateBefore, timezone);
  const timezoneDateAfter = convertLocalToUtc(dateLocal, timezone);
  
  // Check UTC offset difference
  const offsetBefore = getTimezoneOffset(dateBefore, timezone);
  const offsetAfter = getTimezoneOffset(dateLocal, timezone);
  
  return offsetBefore !== offsetAfter;
}

/**
 * Get UTC offset for a date in timezone
 */
function getTimezoneOffset(date, timezone) {
  // Calculate offset by comparing UTC and local time
  const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
  const tzDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
  
  return (utcDate - tzDate) / 60000; // minutes
}
```

### 4.4 DST Edge Cases

**Spring Forward** (e.g., US, March 10, 2026):
```
Sunday, March 8, 2026
2:00 AM Pacific Time → 3:00 AM Pacific Time (1 hour skipped)

// Slot at 2:30 AM local time doesn't exist!
// Solution: Skip slots in non-existent time

const slotStart = new Date('2026-03-08T02:30:00');
const slotStartUtc = zonedTimeToUtc(slotStart, 'America/Los_Angeles');
const slotStartBackToLocal = utcToZonedTime(slotStartUtc, 'America/Los_Angeles');

// slotStartBackToLocal will be 3:30 AM (adjusted by library)
// Detect this discrepancy and skip the slot
```

**Fall Back** (e.g., US, November 1, 2026):
```
Sunday, November 1, 2026
1:30 AM Pacific Time occurs TWICE
- 1:30 AM PDT (UTC-7)
- 1:30 AM PST (UTC-8, after transition)

// Ambiguous time - need context to resolve

// Solution: Use is_dst flag or choose first occurrence
const option1 = zonedTimeToUtc(
  new Date('2026-11-01T01:30:00'),
  'America/Los_Angeles'
  // Returns PDT version
);
```

## 5. API Response Formatting

### 5.1 Response with Multiple Time Formats

Return both UTC and local timezone times in API responses:

```javascript
// GET /slots endpoint
app.get('/slots', async (req, res) => {
  const { provider_id, start_date, timezone } = req.query;
  
  const slots = await SlotService.generateSlots(provider_id, start_date);
  
  // Format slots for client
  const formattedSlots = slots.map(slot => ({
    id: slot.id,
    // UTC times (for internal use)
    start_time: slot.start_time.toISOString(),
    end_time: slot.end_time.toISOString(),
    // Local times (for display)
    start_time_local: formatDateForDisplay(
      slot.start_time,
      timezone,
      'yyyy-MM-dd HH:mm'
    ),
    end_time_local: formatDateForDisplay(
      slot.end_time,
      timezone,
      'yyyy-MM-dd HH:mm'
    ),
    timezone: timezone,
    duration_minutes: slot.duration_minutes,
    available: true
  }));
  
  res.json({
    success: true,
    data: formattedSlots
  });
});
```

### 5.2 Request Parsing with Timezone

When receiving date/time input from client:

```javascript
/**
 * Parse client datetime as local timezone to UTC
 */
function parseClientDateTime(dateTimeString, userTimezone) {
  // Client sends: "2026-05-20 14:30"
  // User timezone: "America/Los_Angeles"
  
  const localDate = parse(
    dateTimeString,
    'yyyy-MM-dd HH:mm',
    new Date()
  );
  
  const utcDate = zonedTimeToUtc(localDate, userTimezone);
  
  return utcDate;
}

// In controller
app.post('/bookings', async (req, res) => {
  const { slot_start_local, slot_end_local, timezone } = req.body;
  const { userId } = req.user;
  
  // Get user's timezone (or use provided)
  const userTz = timezone || (await User.getTz(userId));
  
  // Parse local times to UTC
  const slotStart = parseClientDateTime(slot_start_local, userTz);
  const slotEnd = parseClientDateTime(slot_end_local, userTz);
  
  // Create booking with UTC times
  const booking = await BookingService.create({
    slot_start: slotStart,
    slot_end: slotEnd,
    ...
  });
  
  res.json({ success: true, data: booking });
});
```

## 6. Client-Side Timezone Handling

### 6.1 JavaScript Date Handling

```javascript
// Client receives slot in UTC ISO format
const slotData = {
  start_time: "2026-05-20T21:30:00Z",  // UTC
  timezone: "America/Los_Angeles"
};

// Convert to local for display
import { utcToZonedTime, format } from 'date-fns-tz';

const utcDate = new Date(slotData.start_time);
const localDate = utcToZonedTime(utcDate, slotData.timezone);
const displayTime = format(localDate, 'MMM dd, yyyy h:mm aa'); // "May 20, 2026 2:30 PM"

// When booking, send back UTC time
const booking = await fetch('/bookings', {
  method: 'POST',
  body: JSON.stringify({
    slot_start: slotData.start_time, // Send UTC as-is
    slot_end: slotData.end_time,
    ...
  })
});
```

### 6.2 User Timezone Selection

UI for user to select their timezone:

```html
<select id="timezone">
  <option value="UTC">UTC</option>
  <option value="America/New_York">Eastern Time (US & Canada)</option>
  <option value="America/Chicago">Central Time (US & Canada)</option>
  <option value="America/Denver">Mountain Time (US & Canada)</option>
  <option value="America/Los_Angeles">Pacific Time (US & Canada)</option>
  <option value="Europe/London">London</option>
  <option value="Europe/Paris">Paris</option>
  <option value="Asia/Tokyo">Tokyo</option>
  <option value="Australia/Sydney">Sydney</option>
</select>
```

Or use browser's local timezone:

```javascript
// Get user's browser timezone
const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
console.log(userTimezone); // e.g., "America/Los_Angeles"

// Set this as default when user registers
const user = await User.create({
  email: 'user@example.com',
  timezone: userTimezone,
  ...
});
```

## 7. Booking Confirmation Example

### 7.1 Scenario

```
Provider: "Jane Consultant" (timezone: America/Los_Angeles)
Customer: "John Smith" (timezone: Europe/London)
Time: May 20, 2026, 2:30 PM-3:00 PM

Stored in DB (UTC): 2026-05-20T21:30:00Z - 2026-05-20T22:00:00Z

When provider views (PDT, UTC-7):
  May 20, 2:30 PM - 3:00 PM

When customer views (BST, UTC+1):
  May 21, 10:30 PM - 11:00 PM
```

### 7.2 Implementation

```javascript
const BookingService = {
  async formatForUser(booking, user) {
    return {
      id: booking.id,
      service: booking.service_name,
      status: booking.status,
      // Display in user's timezone
      date_local: formatDateForDisplay(
        booking.slot_start,
        user.timezone,
        'EEEE, MMMM d, yyyy'
      ),
      time_local: formatDateForDisplay(
        booking.slot_start,
        user.timezone,
        'h:mm aa zzz'  // includes timezone abbreviation
      ),
      start_time_utc: booking.slot_start.toISOString(),
      timezone: user.timezone
    };
  }
};

// Usage
const confirmation = await BookingService.formatForUser(booking, currentUser);
// For provider (PDT): "Tuesday, May 20, 2026 at 2:30 PM PDT"
// For customer (BST): "Wednesday, May 21, 2026 at 10:30 PM BST"
```

## 8. Testing Timezone Logic

### 8.1 Test Cases

```javascript
describe('Timezone Conversion', () => {
  it('should convert UTC to Pacific Time correctly', () => {
    const utcDate = new Date('2026-05-20T21:30:00Z');
    const localDate = convertUtcToLocal(utcDate, 'America/Los_Angeles');
    
    expect(localDate.getHours()).toBe(14); // 2:30 PM
    expect(localDate.getMinutes()).toBe(30);
  });
  
  it('should handle Spring Forward DST transition', () => {
    // March 8, 2026, 2:00 AM PDT → 3:00 AM PDT
    const preTransition = new Date('2026-03-08T02:00:00');
    const postTransition = new Date('2026-03-08T03:00:00');
    
    const preUtc = convertLocalToUtc(preTransition, 'America/Los_Angeles');
    const postUtc = convertLocalToUtc(postTransition, 'America/Los_Angeles');
    
    // Should be 1 hour apart in UTC
    expect(postUtc - preUtc).toBe(60 * 60 * 1000);
  });
  
  it('should handle Fall Back DST transition', () => {
    // November 1, 2026, 1:30 AM occurs twice
    // First: 1:30 AM PDT (UTC-7)
    // Second: 1:30 AM PST (UTC-8)
    
    const firstOccurrence = new Date('2026-11-01T01:30:00');
    const utc = convertLocalToUtc(firstOccurrence, 'America/Los_Angeles');
    
    // Should use first occurrence (PDT)
    expect(utc.toISOString()).toMatch(/2026-11-01T08:30:00/);
  });
  
  it('should return correct timezone abbreviation', () => {
    const date = new Date('2026-05-20T21:30:00Z');
    const formatted = formatDateForDisplay(
      date,
      'America/Los_Angeles',
      'h:mm aa zzz'
    );
    
    expect(formatted).toMatch(/PDT/); // May = Pacific Daylight Time
  });
});
```

## 9. Common Pitfalls

### 9.1 Pitfall 1: Comparing Times in Different Timezones

❌ **Wrong**:
```javascript
const slotStart = new Date('2026-05-20 14:30'); // Client local
const now = new Date(); // Client local
if (slotStart < now) { // Wrong! Not normalized
  console.log('Slot is in past');
}
```

✓ **Correct**:
```javascript
const slotStartUtc = zonedTimeToUtc(slotStart, userTimezone);
const nowUtc = new Date(); // JavaScript Date is always UTC
if (slotStartUtc < nowUtc) {
  console.log('Slot is in past');
}
```

### 9.2 Pitfall 2: Assuming Browser Timezone

❌ **Wrong**:
```javascript
// User's browser might not match their timezone preference
const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
```

✓ **Correct**:
```javascript
// Always use the user's stored timezone preference
const userTz = user.timezone;
```

### 9.3 Pitfall 3: Loose UTC Assumption

❌ **Wrong**:
```javascript
const now = new Date(); // Could be interpreted as local time
```

✓ **Correct**:
```javascript
const nowUtc = new Date(Date.now()); // Explicitly UTC
```

## 10. Migration Guide: Adding Timezone Support

### 10.1 Database Migration

```sql
-- Add timezone column to users
ALTER TABLE users ADD COLUMN timezone VARCHAR(50) DEFAULT 'UTC';

-- Add constraint
ALTER TABLE users ADD CONSTRAINT timezone_valid 
  CHECK (timezone IN (SELECT tzname FROM pg_timezone_names));

-- Set existing users' timezone based on registration location or default to UTC
UPDATE users SET timezone = 'UTC' WHERE timezone IS NULL;

-- Make column non-nullable
ALTER TABLE users ALTER COLUMN timezone SET NOT NULL;

-- Create index for timezone queries
CREATE INDEX idx_users_timezone ON users(timezone);
```

### 10.2 Backfill Existing Timestamps

All existing timestamps in database should be verified to be in UTC.

```javascript
// Verify
const bookings = await Booking.find();
for (const booking of bookings) {
  const utcIso = booking.slot_start.toISOString();
  // Should end with Z
  if (!utcIso.endsWith('Z')) {
    console.error('Non-UTC timestamp found:', booking.id);
  }
}
```

---

**Document Version**: 1.0
**Last Updated**: May 2026
**Owner**: Backend Lead
