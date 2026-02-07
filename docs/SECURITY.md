# Security Features Documentation

This document details all security features implemented in Home Control.

## Table of Contents

1. [Authentication & Authorization](#authentication--authorization)
2. [Encryption & HTTPS](#encryption--https)
3. [Secret Management](#secret-management)
4. [Access Control](#access-control)
5. [Audit Logging](#audit-logging)
6. [Rate Limiting & Protection](#rate-limiting--protection)
7. [Security Best Practices](#security-best-practices)
8. [Threat Model](#threat-model)

---

## Authentication & Authorization

### Session-Based Authentication

- **HTTP-Only Cookies**: Session IDs stored in secure, HTTP-only cookies
- **HTTPS Only**: All cookies marked as secure (HTTPS-only)
- **SameSite Protection**: CSRF protection via SameSite=Strict
- **Session Timeout**: Configurable timeout (default: 30 minutes)
- **Session Refresh**: Automatic refresh on activity

### WebSocket Authentication

- **Session ID Query Parameter**: WebSocket connects using `?sessionId=xxx` in URL
- **Session Validation**: Backend validates sessionId against database before accepting connection
- **Authenticated Connections Only**: Unauthenticated WebSocket connections are rejected
- **Auto-connect**: WebSocket connects automatically after successful login
- **Auto-disconnect**: WebSocket disconnects on logout
- **No Cookie Access**: WebSocket uses query parameter since httpOnly cookies aren't accessible to JavaScript

### Demo Mode Authentication

- **Demo Credentials**: `demo` / `demo1234` - Always valid
- **Demo Session**: Creates valid session with `demo-user-id`
- **Audit Exemption**: Demo user actions skip audit database logging
- **Full Features**: Demo mode has full UI and WebSocket functionality

### Password Security

- **Bcrypt Hashing**: All passwords hashed with bcrypt (12 rounds)
- **Minimum Length**: 8 characters minimum
- **No Password Storage**: Only hashes stored in database
- **Password Change Required**: First login forces password change
- **Initial Password**: Randomly generated, secure password

### PIN Support

- **4-6 Digit PINs**: Optional PIN authentication
- **Same Security**: PINs hashed with bcrypt like passwords
- **Rate Limited**: Brute force protection

### Role-Based Access Control (RBAC)

- **Admin Role**: Full system access
- **User Role**: Limited access based on ACL
- **Role Enforcement**: Middleware validates role on every request

---

## Encryption & HTTPS

### HTTPS Configuration

- **TLS/SSL**: All communication encrypted via HTTPS
- **Self-Signed Certificates**: For local network use
- **Certificate Generation**: Built-in utility for easy setup
- **No HTTP Fallback**: HTTPS enforced, no unencrypted option

### Certificate Management

```bash
# Generate new certificates
npm run generate-certs

# Certificates stored in: certs/
# - server.key (private key)
# - server.crt (certificate)
```

### Certificate Trust

Instructions provided for:
- Windows: Install to Trusted Root CA
- Mac: Add to System Keychain
- Linux: Add to ca-certificates
- Mobile: Install profile

---

## Secret Management

### Environment Variables

All secrets stored in `.env` file:

```env
SMARTTHINGS_TOKEN=xxxxx          # SmartThings API token
SESSION_SECRET=xxxxx              # Session signing secret
GOOGLE_CLIENT_SECRET=xxxxx        # Google Home (future)
```

### Protection Mechanisms

1. **`.gitignore`**: Prevents accidental commits
   ```
   .env
   .env.local
   .env.*.local
   ```

2. **Validation on Startup**: Fails fast if secrets missing
   ```typescript
   // Backend validates all required secrets
   // Exits with clear error if missing
   ```

3. **Never Logged**: Secrets masked in logs
   ```typescript
   logger.info(`Token: ${token ? '***SET***' : '***NOT SET***'}`);
   ```

4. **Backend Only**: Secrets never sent to frontend
   ```typescript
   // API calls proxied through backend
   // Frontend never sees tokens
   ```

### Secret Rotation

- **Token Update UI**: Admin can rotate SmartThings token
- **Session Secret**: Can be changed in .env (invalidates sessions)
- **No Downtime**: Token rotation without restart

---

## Access Control

### Access Control Lists (ACL)

#### Device-Level Access

- Users assigned specific devices
- Only assigned devices visible/controllable
- Admins have access to all devices

#### Room-Level Access

- Users assigned rooms
- Access to all devices in assigned rooms
- Efficient bulk permission management

### ACL Enforcement

```typescript
// Every device request checks ACL
if (user.role !== 'admin') {
  if (!ACLService.hasAccess(userId, 'device', deviceId)) {
    return 403; // Access denied
  }
}
```

### ACL Management

Admin features:
- Assign devices to users
- Assign rooms to users
- Bulk permission updates
- Visual ACL editor (Phase 2)

---

## Audit Logging

### What is Logged

Every action is logged with:
- **Timestamp**: ISO 8601 format
- **User**: Username and ID
- **Action**: What was done
- **Device**: Which device (if applicable)
- **Success/Failure**: Operation result
- **IP Address**: Source IP
- **Details**: Additional context

### Log Storage

1. **File Logs**: `logs/audit.log`
   - Structured JSON format
   - Searchable with standard tools
   - Configurable retention

2. **Database Logs**: SQLite table
   - Queryable via API
   - Indexed for performance
   - Admin UI for viewing

### Log Retention

- **Default**: 90 days
- **Configurable**: 30/60/90 days or forever
- **Automatic Cleanup**: Old logs purged automatically

### Example Log Entry

```json
{
  "timestamp": "2026-01-31T10:15:30Z",
  "action": "device.command",
  "user": "admin",
  "deviceId": "abc123",
  "deviceName": "Living Room Light",
  "command": "switch.on",
  "success": true,
  "ip": "192.168.1.50"
}
```

### Audit Log API

```typescript
// GET /api/admin/audit-logs
{
  logs: [...],
  total: 1234,
  limit: 100,
  offset: 0
}
```

---

## Rate Limiting & Protection

### Rate Limiting

- **100 requests per minute** (default, configurable)
- **Per IP address**: Prevents single-source abuse
- **Sliding window**: Consistent rate over time
- **Configurable**: Adjust limits in .env

### Brute Force Protection

- **Login Attempts**: Rate limited to prevent password guessing
- **PIN Attempts**: Same protection for PIN codes
- **Account Lockout**: Future enhancement (Phase 2)

### Request Validation

- **Input Validation**: All inputs validated with Zod schemas
- **Type Safety**: TypeScript ensures type correctness
- **Sanitization**: Inputs sanitized before use

---

## Security Best Practices

### For Administrators

1. **Change Initial Password Immediately**
   - First login forces password change
   - Use strong, unique password

2. **Rotate Tokens Periodically**
   - Update SmartThings token quarterly
   - Use token rotation UI

3. **Review Audit Logs**
   - Check for suspicious activity
   - Monitor failed login attempts

4. **Limit User Access**
   - Grant minimum necessary permissions
   - Review ACLs regularly

5. **Keep Software Updated**
   - Update dependencies: `npm audit fix`
   - Monitor security advisories

### For Users

1. **Use Strong Passwords**
   - Minimum 8 characters
   - Mix of letters, numbers, symbols

2. **Don't Share Credentials**
   - Each person gets their own account
   - No shared passwords

3. **Log Out When Done**
   - Especially on shared devices
   - Sessions timeout automatically

4. **Report Issues**
   - Report suspicious activity to admin
   - Don't attempt to bypass security

### For Developers

1. **Never Commit Secrets**
   - Check .gitignore is working
   - Use .env.example for templates

2. **Validate All Inputs**
   - Use Zod schemas
   - Sanitize user input

3. **Use Prepared Statements**
   - SQLite queries use prepared statements
   - Prevents SQL injection

4. **Security Headers**
   - CORS configured properly
   - Secure cookie settings

5. **Error Handling**
   - Never expose stack traces to users
   - Log errors server-side only

---

## Threat Model

### Threats Mitigated

✅ **Credential Theft**
- Bcrypt hashing
- HTTPS encryption
- HTTP-only cookies

✅ **Man-in-the-Middle**
- HTTPS required
- Certificate validation
- Secure cookie flags

✅ **Brute Force Attacks**
- Rate limiting
- Strong password requirements
- Session timeouts

✅ **Unauthorized Access**
- Authentication required
- RBAC enforcement
- ACL validation

✅ **CSRF Attacks**
- SameSite cookies
- Origin validation

✅ **SQL Injection**
- Prepared statements
- Input validation
- Type safety

✅ **Secret Exposure**
- .gitignore protection
- Backend-only storage
- Masked logging

✅ **Privilege Escalation**
- Role validation middleware
- ACL enforcement
- Audit logging

### Threats Not Mitigated (By Design)

⚠️ **Physical Access**
- Application runs on local machine
- Physical access = full control
- Mitigation: Secure your PC/Raspberry Pi

⚠️ **Local Network Attacks**
- Designed for trusted local network
- No protection against network-level MITM
- Mitigation: Secure your WiFi network

⚠️ **Insider Threats**
- Admins have full access
- Mitigation: Audit logging, least privilege

### Future Security Enhancements (Phase 2+)

- [ ] Account lockout after failed attempts
- [ ] Two-factor authentication (2FA)
- [ ] Certificate pinning
- [ ] Intrusion detection alerts
- [ ] Security event notifications
- [ ] Automated security scanning
- [ ] Penetration testing results

---

## Security Checklist

Before deploying to production:

- [ ] Changed initial admin password
- [ ] Generated HTTPS certificates
- [ ] Secured .env file (600 permissions)
- [ ] Configured firewall (block external access)
- [ ] Updated all dependencies
- [ ] Reviewed audit log retention
- [ ] Set session timeout appropriately
- [ ] Configured CORS origins
- [ ] Enabled rate limiting
- [ ] Tested backup/restore
- [ ] Documented recovery procedures

---

## Reporting Security Issues

If you discover a security vulnerability:

1. **Do NOT** create a public issue
2. Contact the maintainer privately
3. Provide detailed information:
   - Vulnerability description
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

Responsible disclosure appreciated!
