# Demo Mode Security Implementation

## Overview
Demo mode is now properly secured with backend session validation. Demo users can see the admin UI but **cannot access or modify real data**.

## Security Architecture

### 1. Backend Session Tracking
- **Session Interface**: Added `isDemoMode` flag to Session interface
- **Storage**: Demo sessions stored in memory (`Map`), not in database
- **Validation**: All requests verify demo mode status from session, not frontend

### 2. Middleware Protection

#### Auth Middleware
```typescript
// Attaches isDemoMode flag to every authenticated request
request.isDemoMode = session.isDemoMode || false;
```

#### Admin Middleware (Removed from preHandler)
- **Previous**: Blocked all demo users at middleware level
- **Current**: Removed from global preHandler hook
- **Reason**: Each endpoint now handles demo mode individually (read-only vs blocked)

### 3. Endpoint Security

#### Read Endpoints (Demo Users Get Mock Data)
- `GET /admin/users` → Returns `DEMO_USERS` for demo mode
- `GET /admin/audit-logs` → Returns `DEMO_AUDIT_LOGS` for demo mode

#### Write Endpoints (Demo Users Blocked)
- `POST /admin/users` → 403 "Demo mode is read-only"
- `DELETE /admin/users/:userId` → 403 "Demo mode is read-only"
- `PATCH /admin/users/:userId/role` → 403 "Demo mode is read-only"
- `PUT /admin/users/:userId/access` → 403 "Demo mode is read-only"

#### Real Admin Operations (Demo Users Blocked)
All write operations check:
```typescript
if (request.isDemoMode) {
  return reply.code(403).send({ error: 'Demo mode is read-only...' });
}

if (!request.user || request.user.role !== 'admin') {
  return reply.code(403).send({ error: 'Admin access required' });
}
```

### 4. Frontend (UI Only)

#### LocalStorage Check (Performance Optimization)
- **Purpose**: Avoid unnecessary API calls for device data
- **Security**: NOT used for authorization decisions
- **Benefit**: Faster UX (immediate display of demo devices)

#### Admin Route Access
- **Display**: Shows "Admin" button in demo mode for testing
- **Security**: Backend blocks real data access
- **Behavior**: Demo users see admin UI with mock data only

## Data Isolation

### Demo Data Sources
Located in `backend/src/data/demoAdminData.ts`:
- **DEMO_USERS**: 3 mock users (demo, john_doe, admin_demo)
- **DEMO_AUDIT_LOGS**: 7 mock audit log entries
- **Functions**: `getDemoUsers()`, `getDemoAuditLogs(filters)`

### Real Data Protection
- Demo sessions never touch the database (users, sessions, audit_logs, acl)
- Demo mode flag verified on every admin API request
- Write operations completely blocked for demo users

## Security Guarantees

✅ **Demo users cannot access real user data** - Backend returns mock data
✅ **Demo users cannot modify any real data** - All write operations blocked
✅ **Demo mode verified server-side** - Session-based, not localStorage
✅ **Demo sessions isolated** - Stored in memory, separate from database
✅ **Admin endpoints protected** - Role check + demo mode check on every request

## Testing Demo Mode Security

### 1. Verify Read-Only Behavior
- Login with `demo/demo1234`
- Navigate to Admin panel
- Try to create/delete/modify users → Should show "Demo mode is read-only" error

### 2. Verify Data Isolation
- Login as demo user
- Check Users list → Should see 3 demo users (not real users)
- Check Audit Logs → Should see 7 demo log entries (not real logs)

### 3. Verify Backend Protection
```bash
# Try to bypass frontend and directly call admin API
curl -X POST http://localhost:3001/api/admin/users \
  -H "Cookie: sessionId=<demo-session-id>" \
  -H "Content-Type: application/json" \
  -d '{"username":"hacker","password":"test","role":"admin"}'

# Expected response: 403 "Demo mode is read-only. Cannot create users."
```

## Migration from Previous Implementation

### What Changed
1. **Session tracking**: Added `isDemoMode: boolean` to Session interface
2. **Middleware**: Removed `adminMiddleware` from global preHandler
3. **Admin routes**: Each endpoint now checks demo mode individually
4. **Mock data**: Created `demoAdminData.ts` with isolated demo data
5. **Security model**: Changed from "block demo from admin" to "allow UI but return mock data"

### Why This Is Better
- **Better UX**: Demo users can test admin UI without risk
- **Better Security**: Backend enforces all protections
- **Better Isolation**: Demo data completely separate from real data
- **Better Testing**: Developers can test admin features without real SmartThings API

## Best Practices

### DO ✅
- Always check `request.isDemoMode` in admin endpoints
- Return mock data for demo read operations
- Block demo users from all write operations
- Use session-based demo mode verification

### DON'T ❌
- Trust `localStorage.getItem('demoMode')` for security decisions
- Allow demo users to modify any real data
- Store demo sessions in database
- Skip demo mode checks on admin endpoints

## Future Enhancements
- [ ] Add rate limiting for demo mode requests
- [ ] Log demo mode access attempts
- [ ] Add demo mode analytics (track feature usage)
- [ ] Implement demo session expiration (e.g., 1 hour)
