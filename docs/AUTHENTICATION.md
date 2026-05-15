# Authentication & Authorization

## 1. Overview

This document describes the authentication and authorization mechanisms for the booking system, including user registration, login flows, token management, and role-based access control.

## 2. Security Architecture

### 2.1 Principles

- **Principle of Least Privilege**: Users have minimum necessary permissions
- **Defense in Depth**: Multiple layers of security controls
- **Fail Secure**: Default deny; explicit allow only
- **Separation of Concerns**: Auth separate from business logic

### 2.2 Security Assumptions

- HTTPS/TLS is enforced for all traffic
- Secrets are stored in environment variables, not in code
- Database connections are encrypted
- All user input is treated as untrusted

## 3. Authentication Flow

### 3.1 User Registration

**Flow**:
```
1. User submits email, password, and profile info
2. System validates input (email format, password strength)
3. System checks if email already exists
4. System hashes password with bcrypt
5. System creates user record in database
6. System sends verification email
7. User must verify email before first login
```

**Password Requirements**:
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one digit
- At least one special character (!@#$%^&*)

**Validation**:
```javascript
const passwordRegex = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[!@#$%^&*]).{8,}$/;
```

### 3.2 User Login

**Flow**:
```
1. User submits email and password
2. System finds user by email
3. System compares submitted password with stored hash (bcrypt)
4. If invalid, return 401 error with rate limiting
5. If valid, generate JWT access token and refresh token
6. Update last_login_at timestamp
7. Return tokens to client
```

**Rate Limiting**:
- Failed login attempts are tracked per email
- After 5 failed attempts in 15 minutes, account is temporarily locked
- Lock duration: 15 minutes
- Admin can manually unlock

**Session Token Generation**:
```javascript
// Access token
const accessToken = jwt.sign(
  {
    userId: user.id,
    email: user.email,
    role: user.role,
    type: 'access'
  },
  process.env.JWT_SECRET,
  { expiresIn: '24h' }
);

// Refresh token
const refreshToken = jwt.sign(
  {
    userId: user.id,
    type: 'refresh'
  },
  process.env.JWT_REFRESH_SECRET,
  { expiresIn: '7d' }
);
```

### 3.3 Token Refresh

**Flow**:
```
1. Client sends refresh token
2. System validates refresh token signature and expiration
3. System verifies token is stored in database (not revoked)
4. System generates new access token
5. System optionally rotates refresh token
6. Return new tokens
```

**Refresh Token Rotation**:
- Optional for security; trade-off with convenience
- When enabled, old refresh token is invalidated
- Client must store new refresh token
- Prevents token compromise exploitation

### 3.4 Logout

**Flow**:
```
1. User requests logout
2. System invalidates refresh token (add to revocation list)
3. System invalidates all active sessions for user
4. Client clears localStorage/cookies
5. Return success response
```

**Implementation**:
```javascript
// Add refresh token to revocation list (Redis)
const key = `revoked_token:${refreshToken}`;
redis.setex(key, 7 * 24 * 60 * 60, 'true'); // 7 days
```

## 4. Token Management

### 4.1 JWT Structure

**Header**:
```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

**Payload (Access Token)**:
```json
{
  "userId": "user_123",
  "email": "user@example.com",
  "role": "provider",
  "type": "access",
  "iat": 1684095600,
  "exp": 1684182000
}
```

**Payload (Refresh Token)**:
```json
{
  "userId": "user_123",
  "type": "refresh",
  "iat": 1684095600,
  "exp": 1691871600
}
```

### 4.2 Token Validation

**On every protected request**:
```javascript
1. Extract token from Authorization header
2. Verify signature using JWT_SECRET
3. Check expiration (exp claim)
4. Check if token is revoked (for refresh tokens)
5. Check if user still exists and is active
6. Attach user info to request context
```

**Invalid token scenarios**:
- Missing Authorization header → 401
- Invalid format (not Bearer token) → 401
- Expired token → 401
- Invalid signature → 401
- Token type mismatch (refresh instead of access) → 401
- User account disabled → 401

### 4.3 Token Security

**Storage**:
- Access token: Stored in memory or sessionStorage (not localStorage)
- Refresh token: Stored in secure HttpOnly cookie or secured localStorage
- Never transmit in URL parameters

**HttpOnly Cookie Option**:
```javascript
res.cookie('refreshToken', token, {
  httpOnly: true,      // Prevent XSS access
  secure: true,        // Only HTTPS
  sameSite: 'strict',  // CSRF protection
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
});
```

**Transmission**:
```
Authorization: Bearer <access_token>
```

### 4.4 Token Rotation

**Strategy**: Automatic rotation on refresh
- Every successful refresh issues new tokens
- Old refresh token becomes invalid
- Prevents token compromise (limited replay window)
- Graceful degradation if old token used

## 5. Role-Based Access Control (RBAC)

### 5.1 Role Definitions

**Customer**
- Can view own profile
- Can view available slots
- Can create bookings
- Can view own bookings
- Can cancel own bookings
- Can't view other users' data

**Provider**
- Can view own profile
- Can manage availability rules
- Can manage blocked periods
- Can manage service types
- Can manage booking rules
- Can view own bookings
- Can view bookings for their services
- Can't view other providers' data

**Admin**
- Can view any user's profile
- Can view all bookings
- Can view system metrics
- Can manage system settings
- Can disable user accounts
- Full system access

### 5.2 Permission Matrix

| Resource | Customer | Provider | Admin |
|----------|----------|----------|-------|
| User Profile (own) | RW | RW | RW |
| User Profile (others) | - | - | R |
| Availability Rules | - | RW | R |
| Blocked Periods | - | RW | R |
| Service Types | R | RW | R |
| Bookings (own) | RW | RW | RW |
| Bookings (provider's) | - | R | R |
| Booking Rules | - | RW | R |
| System Metrics | - | - | R |
| System Settings | - | - | RW |

### 5.3 Authorization Checks

**On every request**:
```javascript
// Middleware checks
1. Is user authenticated?
2. Does token match user account?
3. Is user account active?
4. Does user have required role?
5. Does user have specific resource permission?
```

**Example middleware**:
```javascript
async function checkPermission(req, res, next) {
  const { userId, role } = req.user;
  const resourceId = req.params.id;
  
  // Role-based check
  if (!allowedRoles.includes(role)) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  
  // Resource-specific check
  if (role === 'customer') {
    const booking = await Booking.findById(resourceId);
    if (booking.customer_id !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }
  }
  
  next();
}
```

## 6. Session Management

### 6.1 Session Storage

**Option 1: JWT Stateless (Recommended)**
- No server-side session storage
- Token contains all necessary info
- Scales better horizontally
- Trade-off: Can't instantly revoke (except refresh token)

**Option 2: Session Store (Redis)**
- Server-side session storage
- Better for instant revocation
- Trade-off: Requires session lookup per request
- Implementation:
  ```javascript
  // Store session on login
  const sessionId = generateId();
  redis.setex(
    `session:${sessionId}`,
    24 * 60 * 60,
    JSON.stringify({
      userId, role, createdAt, lastActivity
    })
  );
  
  // Return sessionId in token
  const token = jwt.sign({ sessionId }, JWT_SECRET);
  
  // Verify session on request
  const session = await redis.get(`session:${sessionId}`);
  if (!session) throw new Error('Invalid session');
  ```

### 6.2 Session Expiration

**Access Token**: 24 hours
**Refresh Token**: 7 days
**Idle Session**: 30 minutes inactivity (optional)

**Idle timeout implementation**:
```javascript
// Update last activity on each request
redis.setex(
  `activity:${userId}`,
  30 * 60,  // 30 minutes
  Date.now()
);

// Check on token refresh
const lastActivity = await redis.get(`activity:${userId}`);
if (Date.now() - lastActivity > 30 * 60 * 1000) {
  throw new Error('Session expired due to inactivity');
}
```

### 6.3 Concurrent Sessions

**Policy**: Allow multiple concurrent sessions per user
- User can be logged in on multiple devices
- Logout affects current session only
- Optional: Admin can force logout all sessions

## 7. Password Management

### 7.1 Password Hashing

**Algorithm**: bcrypt
**Cost factor (rounds)**: 10-12 (balance security/performance)

```javascript
const bcrypt = require('bcrypt');

// Hash password on registration/change
const saltRounds = 12;
const passwordHash = await bcrypt.hash(password, saltRounds);

// Verify password on login
const isValid = await bcrypt.compare(submittedPassword, passwordHash);
```

### 7.2 Password Reset Flow

**Flow**:
```
1. User requests password reset with email
2. System generates secure reset token (crypto.randomBytes)
3. System stores token with expiration (1 hour) in database
4. System sends reset link via email
5. User clicks link with token
6. System verifies token is valid and not expired
7. User submits new password
8. System hashes new password
9. System stores new hash and invalidates reset token
```

**Token generation**:
```javascript
const resetToken = crypto.randomBytes(32).toString('hex');
const resetTokenHash = crypto
  .createHash('sha256')
  .update(resetToken)
  .digest('hex');

await PasswordReset.create({
  user_id: user.id,
  token_hash: resetTokenHash,
  expires_at: Date.now() + 60 * 60 * 1000 // 1 hour
});

// Send reset link
const resetLink = `${FRONTEND_URL}/reset-password/${resetToken}`;
```

### 7.3 Password History

**Policy**: Prevent reuse of recent passwords
- Track last 5 passwords
- Can't reuse within 6 months
- Only for password changes (not reset)

```javascript
// Store previous password hash
await PasswordHistory.create({
  user_id: user.id,
  password_hash: oldPasswordHash,
  created_at: new Date()
});

// Check on password change
const recentPasswords = await PasswordHistory.findRecent(userId, 5);
for (const record of recentPasswords) {
  if (await bcrypt.compare(newPassword, record.password_hash)) {
    throw new Error('Cannot reuse recent password');
  }
}
```

## 8. Multi-Factor Authentication (MFA)

### 8.1 MFA Types

**TOTP (Time-based One-Time Password)**
- Using authenticator app (Google Authenticator, Authy)
- Industry standard
- No external dependency

**Email OTP**
- Send code via email
- User enters code
- Lower security than TOTP but more user-friendly

### 8.2 MFA Setup Flow

```
1. User enables MFA in settings
2. System generates secret key (base32 encoded)
3. System generates QR code for scanning
4. User scans QR with authenticator app
5. User verifies by entering current code
6. System stores secret and enables MFA
7. System generates backup codes (10 codes)
8. User saves backup codes securely
```

### 8.3 MFA Login Flow

```
1. User enters email and password
2. System validates credentials
3. If valid, prompt for MFA code
4. User enters code from authenticator app
5. System validates code (within 30-second window)
6. System verifies backup codes if authenticator lost
7. If valid, issue tokens and create session
```

**TOTP Validation**:
```javascript
const speakeasy = require('speakeasy');

// Setup MFA
const secret = speakeasy.generateSecret({
  name: `Booking System (${user.email})`,
  issuer: 'Booking System'
});

// Verify MFA code
const isValid = speakeasy.totp.verify({
  secret: user.mfa_secret,
  encoding: 'base32',
  token: submittedCode,
  window: 2 // Allow ±1 time steps (30 seconds each)
});
```

## 9. OAuth2 / Social Login (Optional)

### 9.1 Supported Providers

- Google
- GitHub
- Microsoft

### 9.2 OAuth2 Flow

```
1. User clicks "Login with Google"
2. Redirect to Google authorization endpoint
3. User grants permission
4. Google redirects back with authorization code
5. System exchanges code for access token
6. System fetches user profile from Google
7. System checks if user exists, if not create
8. System issues JWT tokens
9. System creates booking system session
```

### 9.3 Linking Accounts

**Flow**: User can link OAuth provider to existing account
```
1. Authenticated user goes to security settings
2. Clicks "Link Google Account"
3. Redirects to Google with user context
4. After successful auth, links to account
5. User can now login with Google
6. Manual password not needed for OAuth logins
```

## 10. Audit Logging

### 10.1 Logged Events

- User registration
- User login (success and failure)
- Password change
- Password reset
- Permission changes
- Account disable/enable
- MFA enable/disable
- Sensitive data access

### 10.2 Audit Log Schema

```sql
CREATE TABLE audit_logs (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id BIGINT REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50),
  resource_id VARCHAR(100),
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  status VARCHAR(20), -- success, failure
  error_message TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);
```

## 11. Security Best Practices

### 11.1 HTTPS/TLS

- All traffic must be HTTPS
- TLS 1.2 or higher
- Strong cipher suites only
- HSTS header: `Strict-Transport-Security: max-age=31536000; includeSubDomains`

### 11.2 CORS

```javascript
const cors = require('cors');

app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

### 11.3 CSRF Protection

**For stateless JWT**: CSRF less critical (no session cookies)
**For session-based**: Use CSRF tokens
```javascript
const csrf = require('csurf');
const csrfProtection = csrf({ cookie: false });
app.post('/bookings', csrfProtection, (req, res) => {
  // Process booking
});
```

### 11.4 Security Headers

```javascript
const helmet = require('helmet');
app.use(helmet());

// Specifically:
// - Content-Security-Policy
// - X-Frame-Options: DENY
// - X-Content-Type-Options: nosniff
// - X-XSS-Protection: 1; mode=block
// - Referrer-Policy: strict-origin-when-cross-origin
```

### 11.5 Input Validation

- Validate all inputs on server (not just client)
- Use schema validation (Joi, Zod)
- Sanitize output to prevent XSS
- Parameterized queries to prevent SQL injection

### 11.6 Error Messages

- Don't reveal sensitive information in error messages
- Log full details on server
- Return generic messages to client
  ```
  ✓ "Invalid email or password"
  ✗ "Email not found in database"
  ✗ "Password hash mismatch"
  ```

## 12. Threat Model

### 12.1 Identified Threats

| Threat | Mitigation |
|--------|-----------|
| Brute force login | Rate limiting, account lockout |
| Password compromise | Strong password requirements, bcrypt |
| Token theft | HTTPS only, HttpOnly cookies, short expiration |
| Token replay | Token rotation, short expiration window |
| Privilege escalation | RBAC enforcement, permission checks |
| Session hijacking | Secure tokens, IP tracking (optional) |
| SQL injection | Parameterized queries, ORM |
| XSS attacks | Input sanitization, CSP headers |
| CSRF attacks | CSRF tokens, SameSite cookies |
| Enum attacks | Generic error messages |

### 12.2 Mitigation Strategies

- Principle of least privilege
- Defense in depth
- Regular security audits
- Dependency scanning
- Penetration testing
- Incident response plan

## 13. Compliance

### 13.1 Standards

- OWASP Top 10
- OAuth 2.0 (RFC 6749)
- JWT (RFC 7519)
- GDPR (where applicable)

### 13.2 Data Protection

- Password hashing and salt (bcrypt)
- Encrypted communication (HTTPS)
- Encryption at rest (database encryption)
- PII handling and retention policies
- Right to be forgotten (account deletion)

---

**Document Version**: 1.0
**Last Updated**: May 2026
**Owner**: Security Lead
