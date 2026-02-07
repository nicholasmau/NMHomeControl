# Security Audit Report
**Date:** January 2025  
**Project:** NMHomeControl - Smart Home Control System  
**Audit Type:** Pre-Production Security Assessment

---

## Executive Summary

This security audit was performed to ensure all endpoints are secure, data is properly protected, and sensitive information is not exposed before connecting to the production SmartThings API. The audit covered authentication, authorization, data storage, API security, session management, and potential information disclosure.

**Overall Security Status:** ✅ **GOOD** with minor improvements recommended

---

## 1. Endpoint Authentication & Authorization

### ✅ Authentication Coverage
**Status:** **SECURE**

All sensitive endpoints are properly protected with authentication middleware:

- **Auth Routes** (`/api/auth/*`):
  - `/login` - Public (required for authentication)
  - `/logout` - Protected by `authMiddleware`
  - `/me` - Protected by `authMiddleware`
  - `/change-password` - Protected by `authMiddleware`

- **Device Routes** (`/api/devices/*`):
  - All routes protected by `authMiddleware` via `fastify.addHook('preHandler')`
  - Individual device operations protected by `deviceACLMiddleware`
  - ACL enforcement ensures users only access authorized devices

- **Scene Routes** (`/api/scenes/*`):
  - All routes protected by `authMiddleware` and `firstLoginMiddleware`
  - Demo mode properly separates mock data from production API calls

- **Analytics Routes** (`/api/analytics/*`):
  - All routes protected by `authMiddleware` and `firstLoginMiddleware`
  - Usage stats, device history, time series data all require authentication

- **Admin Routes** (`/api/admin/*`):
  - All routes protected by `authMiddleware` and `firstLoginMiddleware`
  - Admin role verification enforced for production mode
  - Demo mode returns read-only mock data (write operations blocked)

**Middleware Chain:**
1. `auditMiddleware` - Global audit logging
2. `authMiddleware` - Session validation
3. `firstLoginMiddleware` - Forces password change on first login
4. `deviceACLMiddleware` - Device-level access control
5. `adminMiddleware` - Admin role verification

### ✅ Public Endpoints (Intentional)
- `/api/health` - Health check endpoint
- `/metrics` - Prometheus metrics endpoint
- `/api/auth/login` - Required for authentication

---

## 2. Session Security

### ✅ Session Configuration
**Status:** **SECURE**

**Session Cookie Settings:**
```typescript
reply.setCookie('sessionId', session.id, {
  httpOnly: true,     // ✅ Prevents JavaScript access
  secure: true,       // ✅ HTTPS-only (when HTTPS enabled)
  sameSite: 'strict', // ✅ CSRF protection
  path: '/',
  maxAge: 60 * 60 * 24 * 7, // 7 days
});
```

**Session Management:**
- Session IDs generated using `crypto.randomBytes(32)` - cryptographically secure
- Session storage: Database (SQLite) with expiration tracking
- Demo sessions: In-memory storage (not persisted to database)
- Session timeout: Configurable (default 30 minutes)
- Automatic session cleanup on expiration

**Strengths:**
- ✅ HttpOnly cookies prevent XSS-based session theft
- ✅ Secure flag ensures HTTPS transmission
- ✅ SameSite strict prevents CSRF attacks
- ✅ Cryptographically secure session ID generation
- ✅ Proper session expiration and cleanup

---

## 3. Password Security

### ✅ Password Hashing
**Status:** **SECURE**

- **Algorithm:** bcrypt
- **Rounds:** 12 (configurable via `BCRYPT_ROUNDS`)
- **Salt:** Automatically generated per password by bcrypt
- **Storage:** Only hashed passwords stored in database

**Password Generation:**
- Initial admin password: `crypto.randomBytes()` - cryptographically secure
- Password length: 16 characters + prefix
- Character set: alphanumeric + special characters

**First Login Enforcement:**
- Users required to change initial password on first login
- Enforced via `firstLoginMiddleware`

### ⚠️ Password Exposure Issues

**SECURITY CONCERN - HIGH PRIORITY:**

**Issue 1: Console Logging of Initial Password**  
**File:** [backend/src/services/user.service.ts](backend/src/services/user.service.ts#L44-L50)

```typescript
console.log('\n' + '='.repeat(60));
console.log('  INITIAL ADMIN PASSWORD');
console.log('='.repeat(60));
console.log(`\n  ${initialPassword}\n`); // ⚠️ PASSWORD EXPOSED IN LOGS
console.log('  Saved to: initial-password.txt');
console.log('  You will be required to change this on first login.');
console.log('='.repeat(60) + '\n');
```

**Risk:** Initial admin password visible in:
- Docker container logs (`docker logs`)
- System logs (if redirected)
- Terminal history
- Log aggregation systems (if deployed)

**Recommendation:**
- Remove console.log statements displaying the password
- Keep only the file reference: `console.log('Initial password saved to: initial-password.txt')`
- Alternatively, only display in development mode: `if (config.isDevelopment) { ... }`

**Issue 2: Weak Password Generation in Setup Script**  
**File:** [scripts/setup.js](scripts/setup.js#L26-L28)

```javascript
const useSpecial = Math.random() > 0.7;
const chars = useSpecial ? specialChars : charset;
password += chars.charAt(Math.floor(Math.random() * chars.length));
```

**Risk:** `Math.random()` is not cryptographically secure

**Recommendation:**
```javascript
const crypto = require('crypto');
// Use crypto.randomBytes() instead of Math.random()
const randomIndex = crypto.randomInt(0, chars.length);
password += chars.charAt(randomIndex);
```

**Positive Note:**
- ✅ Password saved to `initial-password.txt` with mode `0o600` (user-only read/write)
- ✅ File properly excluded from git via `.gitignore`

---

## 4. API Token Storage & Protection

### ✅ Token Security
**Status:** **SECURE**

**SmartThings Token:**
- Stored in `.env` file (excluded from git)
- Loaded via environment variables
- Validated at startup (minimum length check)
- Used in Authorization header: `Bearer ${token}`
- **Masked in logs:** `***SET***` instead of actual token ✅

**Token Usage:**
```typescript
// In smartthings.service.ts
headers: {
  'Authorization': `Bearer ${config.smartthings.token}`,
  'Content-Type': 'application/json',
}
```

**Console Output (Secure):**
```typescript
// In env.ts - Token properly masked
console.log(`SmartThings Token: ${config.smartthings.token ? '***SET***' : '***NOT SET***'}`);
```

**Session Secret:**
- Required minimum 32 characters
- Stored in `.env` file
- Validated at startup
- Used for session signing

**Strengths:**
- ✅ All secrets in environment variables (not hardcoded)
- ✅ `.env` file excluded from git
- ✅ Token masked in console output
- ✅ Validation at startup prevents missing secrets

---

## 5. Database Security

### ✅ SQL Injection Protection
**Status:** **SECURE**

**Database:** SQLite with `better-sqlite3` library

**Parameterized Queries:**
All database queries use parameterized statements (prepared statements):

```typescript
// Example from user.service.ts
db.prepare(`
  INSERT INTO users (id, username, password_hash, role, first_login, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
`).run(adminId, 'admin', passwordHash, 'admin', 1);

// Example from acl.service.ts
db.prepare(`
  SELECT resource_type as resourceType, resource_id as resourceId, created_at as createdAt
  FROM access_control
  WHERE user_id = ?
`).all(userId);
```

**Search Results:**
- ✅ No dynamic SQL string concatenation found
- ✅ No `${variable}` interpolation in SQL queries
- ✅ All user input passed via parameterized placeholders

**Database File Security:**
- Location: `./data/app.sqlite`
- Excluded from git via `.gitignore`
- WAL mode enabled for better concurrency
- Foreign key constraints enabled
- Indexes created for performance (no security impact)

**Strengths:**
- ✅ Complete SQL injection protection via parameterized queries
- ✅ Database file properly excluded from version control
- ✅ Proper schema design with constraints

---

## 6. Error Message Disclosure

### ✅ Error Handling
**Status:** **SECURE**

**Global Error Handler:**
```typescript
// In server.ts
fastify.setErrorHandler((error, request, reply) => {
  fastify.log.error(error);
  
  // Don't expose internal errors in production
  const message = config.isDevelopment ? error.message : 'Internal server error';
  
  reply.code(error.statusCode || 500).send({
    error: message,
  });
});
```

**Error Responses:**
- **Development:** Detailed error messages (for debugging)
- **Production:** Generic "Internal server error" message
- **Validation Errors:** Zod validation errors exposed (schema validation only, no sensitive data)

**Example Error Responses:**
```typescript
// Generic errors - no sensitive data
{ error: 'Failed to fetch devices' }
{ error: 'Failed to execute command' }
{ error: 'Not authenticated' }
{ error: 'Invalid credentials' }

// Validation errors - safe to expose
{ error: 'Invalid request', details: zodErrorDetails }
```

**Strengths:**
- ✅ Production mode hides internal error details
- ✅ No stack traces exposed to clients
- ✅ Generic error messages prevent information leakage
- ✅ Validation errors don't expose sensitive data

---

## 7. Rate Limiting & CORS

### ⚠️ Rate Limiting
**Status:** **TEMPORARILY DISABLED**

**Current Configuration:**
```typescript
// In server.ts
fastify.register(fastifyRateLimit, {
  max: 10000, // ⚠️ Increased from 100 to 10000
  timeWindow: config.security.rateLimitWindowMs,
});
```

**Comment in code:**
```typescript
// Temporarily disable rate limiting for debugging
```

**Issue:**
Rate limiting effectively disabled for debugging (10,000 requests per window is extremely high)

**Default Configuration (from .env.example):**
```
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW_MS=60000
```

**Recommendation:**
- ✅ Restore rate limiting before production deployment
- Set `max: config.security.rateLimitMax` (100 requests per minute)
- Document reason for high limit during development
- Consider different limits for different endpoints:
  - Authentication: 5-10 attempts per minute
  - API endpoints: 100 requests per minute
  - Health check: Unlimited

### ✅ CORS Configuration
**Status:** **SECURE**

**Configuration:**
```typescript
fastify.register(fastifyCors, {
  origin: config.cors.origins, // From ALLOWED_ORIGINS env variable
  credentials: true,
});
```

**Default Origins (.env.example):**
```
ALLOWED_ORIGINS=https://localhost:5173,https://192.168.1.0/24
```

**Strengths:**
- ✅ Credentials enabled for session cookies
- ✅ Origins configurable via environment variable
- ✅ Localhost for development
- ✅ Subnet notation supported for local network

**Recommendation:**
- Verify `ALLOWED_ORIGINS` is set correctly in production `.env`
- Consider restricting to specific domain in production
- Remove localhost origins in production

---

## 8. Sensitive Data in Files

### ✅ .gitignore Configuration
**Status:** **SECURE**

**Protected Files:**
```gitignore
# Environment files
.env
.env.*
!.env.example

# Database
*.db
*.sqlite
data/

# Secrets
initial-password.txt
config-sensitive.json

# Certificates
*.key
*.crt
*.pem
certs/
```

**Verification:**
- ✅ `.env` excluded
- ✅ `initial-password.txt` excluded
- ✅ Database files excluded
- ✅ SSL certificates excluded
- ✅ `.env.example` intentionally included (no secrets)

---

## 9. Additional Security Considerations

### ✅ HTTPS Configuration
- Self-signed certificates for development
- HTTPS optional (configurable via `HTTPS_ENABLED`)
- Certificate paths configurable
- Graceful fallback to HTTP if certificates missing

### ✅ Audit Logging
- All authentication attempts logged
- Device commands logged with user attribution
- Admin actions logged
- Timestamps, IP addresses, and success/failure tracked
- Audit logs stored in database
- Retention period configurable (default 90 days)

### ✅ Access Control Lists (ACL)
- Device-level access control
- Room-level access control
- Admin users bypass ACL checks
- Regular users restricted to authorized devices/rooms
- Demo mode properly isolated

### ✅ Demo Mode Security
- Separate session storage (in-memory, not database)
- Read-only operations (write operations blocked)
- Mock data isolation (no access to real data)
- Separate metrics tracking

---

## Security Recommendations

### High Priority (Before Production)

1. **Remove Password from Console Logs**
   - File: [backend/src/services/user.service.ts](backend/src/services/user.service.ts#L44-L50)
   - Action: Remove `console.log(initialPassword)` or restrict to development mode
   - Impact: Prevents password exposure in Docker logs

2. **Restore Rate Limiting**
   - File: [backend/src/server.ts](backend/src/server.ts#L57-L60)
   - Action: Change `max: 10000` to `max: config.security.rateLimitMax`
   - Impact: Prevents brute force and DoS attacks

3. **Fix Setup Script Password Generation**
   - File: [scripts/setup.js](scripts/setup.js#L26-L28)
   - Action: Replace `Math.random()` with `crypto.randomInt()`
   - Impact: Ensures cryptographically secure password generation

### Medium Priority (Recommended)

4. **Add Security Headers**
   - Install and configure `@fastify/helmet`
   - Add HSTS, X-Frame-Options, X-Content-Type-Options headers
   - Impact: Additional layer of security against common attacks

5. **Verify Production CORS**
   - Review `ALLOWED_ORIGINS` in production `.env`
   - Remove localhost origins
   - Restrict to specific production domain
   - Impact: Prevents unauthorized cross-origin requests

6. **Add Request Size Limits**
   - Configure max request body size
   - Prevent large payload DoS attacks
   - Impact: Resource exhaustion prevention

7. **Implement Login Attempt Tracking**
   - Track failed login attempts per IP/username
   - Temporary account lockout after X failed attempts
   - Impact: Brute force attack prevention

### Low Priority (Nice to Have)

8. **Add Content Security Policy (CSP)**
   - Configure CSP headers for frontend
   - Impact: XSS protection

9. **Implement API Key Rotation**
   - Document process for rotating SmartThings token
   - Consider automatic expiration reminders
   - Impact: Regular credential refresh

10. **Add Security Logging**
    - Log security-relevant events separately
    - Monitor for suspicious patterns
    - Impact: Security incident detection

---

## Compliance Checklist

- ✅ All endpoints require authentication (except public endpoints)
- ✅ Data stored securely (bcrypt for passwords, parameterized queries)
- ✅ API keys securely stored (environment variables, masked in logs)
- ✅ No sensitive data in accessible directories (gitignore configured)
- ✅ Session security (HttpOnly, Secure, SameSite cookies)
- ✅ SQL injection protection (parameterized queries only)
- ✅ CSRF protection (SameSite cookies)
- ✅ Access control (ACL system implemented)
- ✅ Audit logging (comprehensive tracking)
- ⚠️ Rate limiting (temporarily disabled - restore before production)
- ⚠️ Password exposure (console logs - fix before production)

---

## Conclusion

The NMHomeControl application demonstrates **strong security fundamentals** with comprehensive authentication, authorization, and data protection mechanisms. The identified issues are **minor and easily fixable** before production deployment.

**Immediate Actions Required:**
1. Remove password from console output
2. Restore rate limiting configuration
3. Fix setup script password generation

After implementing these three fixes, the application will be **production-ready** from a security perspective.

**Security Posture:** ✅ **GOOD** (after addressing high-priority items)

---

**Audited by:** GitHub Copilot  
**Review Date:** January 2025  
**Next Review:** After production deployment or quarterly
