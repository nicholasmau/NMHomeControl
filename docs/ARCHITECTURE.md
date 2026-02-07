# System Architecture

This document provides a comprehensive overview of the Home Control system architecture, design decisions, and data flow.

## Table of Contents

1. [High-Level Architecture](#high-level-architecture)
2. [Technology Stack](#technology-stack)
3. [Component Overview](#component-overview)
4. [Data Flow](#data-flow)
5. [Security Architecture](#security-architecture)
6. [Database Schema](#database-schema)
7. [API Design](#api-design)
8. [Future Enhancements](#future-enhancements)

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     User's Browser                      │
│                   (React Frontend)                      │
└────────┬──────────────────────────┬─────────────────────┘
         │ HTTPS (Session Auth)     │ WSS (WebSocket)
         │                          │ Real-time Updates
┌────────▼──────────────────────────▼─────────────────────┐
│              Fastify Backend Server                     │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Authentication & Authorization Middleware       │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │  REST API Routes                                 │  │
│  │  - Auth Routes    - Device Routes               │  │
│  │  - Admin Routes   - Metrics Routes               │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Business Logic Services                         │  │
│  │  - User Service     - Session Service            │  │
│  │  - ACL Service      - SmartThings Service        │  │
│  │  - Metrics Service  - Google Home (Placeholder)  │  │
│  └──────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Data Layer                                      │  │
│  │  - SQLite Database  - File System (Logs)         │  │
│  └──────────────────────────────────────────────────┘  │
└────────┬──────────────────────────┬───────────────────┘
         │                          │
         │ HTTPS API Calls          │ Prometheus Scrape
         │                          │
┌────────▼──────────┐      ┌────────▼──────────┐
│  SmartThings API  │      │    Prometheus     │
│  (Samsung Cloud)  │      │  (Telemetry DB)   │
└───────────────────┘      └───────────────────┘
         │                          │
         │                          │
┌────────▼──────────┐      ┌────────▼──────────┐
│  Smart Devices    │      │     Grafana       │
│  - Lights         │      │  (Dashboards)     │
│  - Switches       │      │   (Optional)      │
│  - Sensors        │      └───────────────────┘
│  - Thermostats    │
└───────────────────┘
```

---

## Demo Mode

The application includes a built-in demo mode that allows users to try the interface without connecting to real SmartThings devices:

### Demo Credentials
- **Username:** `demo`
- **Password:** `demo1234`

### Demo Features
- Simulated devices (lights, switches, thermostats)
- Full UI functionality with local state management
- WebSocket real-time updates (simulated)
- No audit logging to database (avoids foreign key constraints)
- Perfect for testing, development, or demonstrations

### Demo Mode Architecture
```
Frontend (Demo Mode)
├── demoData.ts - Simulated device data
├── executeDemoCommand() - Local state updates
└── WebSocket - Real connection (simulated broadcasts)

Backend (Demo Mode)
├── auth: demo user authenticated
├── session: demo-user-id in sessions table
├── audit: skips database insert (no foreign key issues)
└── WebSocket: full authentication and connection
```

---

## Technology Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.2 | UI framework |
| TypeScript | 5.3 | Type safety |
| Vite | 5.0 | Build tool & dev server |
| TailwindCSS | 3.4 | Styling |
| shadcn/ui | Latest | Component library |
| React Router | 6.22 | Routing |
| TanStack Query | 5.20 | Data fetching & caching |
| Zustand | 4.5 | State management |
| Axios | 1.6 | HTTP client |
| Lucide React | 0.323 | Icons |

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 18+ | Runtime |
| Fastify | 4.26 | Web framework |
| TypeScript | 5.3 | Type safety |
| better-sqlite3 | 9.4 | Database |
| bcrypt | 5.1 | Password hashing |
| Zod | 3.22 | Schema validation |
| Pino | 8.18 | Logging |
| prom-client | 15.1 | Prometheus metrics |
| Axios | 1.6 | HTTP client (SmartThings) |

### Why These Choices?

**Fastify over Express**:
- 2-3x faster
- Better TypeScript support
- Built-in schema validation
- Lower memory footprint (important for Raspberry Pi)

**SQLite over PostgreSQL/MySQL**:
- No separate database server
- Perfect for single-user/small-team
- Zero configuration
- Easy backup (copy file)
- Sufficient performance for home automation

**React over Vue/Angular**:
- Largest ecosystem
- Best TypeScript support
- Excellent component libraries (shadcn/ui)
- Strong community

**TailwindCSS over CSS-in-JS**:
- Smaller bundle size
- Better performance
- Utility-first approach
- Easy responsive design

---

## Component Overview

### Frontend Components

```
src/
├── components/
│   ├── ui/                      # Base UI components (shadcn/ui)
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Card.tsx
│   │   └── ...
│   ├── auth/                    # Authentication components
│   │   ├── LoginForm.tsx
│   │   └── ChangePasswordForm.tsx
│   ├── devices/                 # Device components
│   │   ├── DeviceCard.tsx       # Individual device card
│   │   ├── DeviceGrid.tsx       # Grid layout
│   │   └── DeviceControls.tsx   # Control widgets
│   ├── admin/                   # Admin-only components
│   │   ├── UserManagement.tsx
│   │   ├── ACLEditor.tsx
│   │   └── AuditLogViewer.tsx
│   └── dashboard/               # Dashboard components
│       └── Overview.tsx
├── pages/                       # Page components
│   ├── LoginPage.tsx
│   ├── DashboardPage.tsx
│   ├── ChangePasswordPage.tsx
│   └── AdminPage.tsx
├── lib/                         # Utilities & API
│   ├── api.ts                   # API client
│   ├── auth.ts                  # Auth store (Zustand)
│   └── utils.ts                 # Utility functions
└── App.tsx                      # Main app component
```

### Backend Services

```
src/
├── config/
│   └── env.ts                   # Environment configuration
├── database/
│   └── db.ts                    # SQLite setup & schema
├── middleware/
│   ├── auth.middleware.ts       # Authentication check
│   ├── acl.middleware.ts        # Access control check
│   └── audit.middleware.ts      # Audit logging
├── routes/
│   ├── auth.routes.ts           # Login, logout, change password
│   ├── device.routes.ts         # Device CRUD & control
│   └── admin.routes.ts          # User & ACL management
├── services/
│   ├── user.service.ts          # User CRUD
│   ├── session.service.ts       # Session management
│   ├── acl.service.ts           # Access control logic
│   ├── smartthings.service.ts   # SmartThings API client
│   └── metrics.service.ts       # Prometheus metrics
├── utils/
│   └── logger.ts                # Logging utilities
└── server.ts                    # Main server file
```

---

## Data Flow

### Authentication Flow

```
1. User enters credentials
   ↓
2. Frontend: POST /api/auth/login
   ↓
3. Backend: Validate credentials (bcrypt compare)
   - Demo mode: username="demo", password="demo1234"
   - Admin/User: Validate against database
   ↓
4. Backend: Create session in database
   ↓
5. Backend: Set HTTP-only cookie with session ID
   ↓
6. Backend: Return sessionId for WebSocket authentication
   ↓
7. Frontend: Store user info in Zustand state
   ↓
8. Frontend: Connect WebSocket with sessionId query parameter
   ↓
9. Frontend: Redirect to dashboard
```

### Device Control Flow

```
1. User clicks "Turn On" button
   ↓
2. Frontend: POST /api/devices/{id}/command
   ↓
3. Backend: Auth middleware validates session
   ↓
4. Backend: ACL middleware checks device permission
   ↓
5. Backend: SmartThings service executes command
   ↓
6. SmartThings API: Sends command to device
   ↓
7. Backend: Log to audit log & telemetry
   ↓
8. Backend: Update Prometheus metrics
   ↓
9. Frontend: Receive success response
   ↓
10. Frontend: Refetch device status
```

### ACL Check Flow

```
1. User requests device action
   ↓
2. Is user admin?
   ├─ Yes → Allow access
   └─ No → Check ACL
       ↓
3. Does user have direct device access?
   ├─ Yes → Allow access
   └─ No → Check room access
       ↓
4. Is device in allowed room?
   ├─ Yes → Allow access
   └─ No → Deny (403 Forbidden)
```

---

## Security Architecture

### Defense in Depth

Multiple layers of security:

1. **Network Layer**: HTTPS encryption, local network only
2. **Application Layer**: Authentication, authorization, rate limiting
3. **Data Layer**: Encrypted passwords, secure sessions
4. **Audit Layer**: Comprehensive logging

### Authentication Chain

```
Request → Cookie Check → Session Valid? → User Exists? → Role Check → ACL Check → Allow
            ↓               ↓                ↓              ↓            ↓
           401             401              401            403          403
```

### Secret Management

```
.env file (git-ignored)
   ↓
Environment variables
   ↓
Validated on startup (Zod)
   ↓
Used only in backend services
   ↓
NEVER sent to frontend
   ↓
Masked in logs
```

---

## Database Schema

### Users Table

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,              -- UUID
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,      -- bcrypt hash
  role TEXT NOT NULL,               -- 'admin' | 'user'
  first_login INTEGER DEFAULT 1,   -- Boolean flag
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

### Sessions Table

```sql
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,              -- Session ID (in cookie)
  user_id TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
```

### Access Control Table

```sql
CREATE TABLE access_control (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  resource_type TEXT NOT NULL,      -- 'device' | 'room'
  resource_id TEXT NOT NULL,        -- Device/Room ID
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, resource_type, resource_id)
);

CREATE INDEX idx_acl_user_id ON access_control(user_id);
CREATE INDEX idx_acl_resource ON access_control(resource_type, resource_id);
```

### Audit Logs Table

```sql
CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL,
  action TEXT NOT NULL,
  user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  device_id TEXT,
  device_name TEXT,
  command TEXT,
  success INTEGER NOT NULL,         -- Boolean
  ip TEXT,
  details TEXT,                     -- JSON
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_audit_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_audit_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_device_id ON audit_logs(device_id);
```

### Settings Table

```sql
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  updated_by TEXT,
  FOREIGN KEY (updated_by) REFERENCES users(id)
);
```

---

## API Design

### RESTful Principles

- **Resources**: Users, Devices, Sessions
- **HTTP Methods**: GET, POST, PUT, PATCH, DELETE
- **Status Codes**: 200, 201, 400, 401, 403, 404, 500
- **JSON Format**: All requests/responses in JSON

### API Endpoints

#### Authentication

```
POST   /api/auth/login              # Login
POST   /api/auth/logout             # Logout
GET    /api/auth/me                 # Get current user
POST   /api/auth/change-password    # Change password
```

#### Devices

```
GET    /api/devices                 # List devices (ACL-filtered)
GET    /api/devices/:id             # Get device details
GET    /api/devices/:id/status      # Get device status
POST   /api/devices/:id/command     # Execute command
GET    /api/devices/rooms/list      # List rooms
```

#### Admin

```
GET    /api/admin/users                      # List all users
POST   /api/admin/users                      # Create user
DELETE /api/admin/users/:id                  # Delete user
PATCH  /api/admin/users/:id/role             # Update role
PUT    /api/admin/users/:id/access           # Update ACL
GET    /api/admin/audit-logs                 # Get audit logs
```

#### System

```
GET    /api/health                  # Health check
GET    /metrics                     # Prometheus metrics
```

### Error Responses

Standard error format:

```json
{
  "error": "Human-readable error message",
  "details": {
    // Optional additional context
  }
}
```

---

## Future Enhancements

### Phase 2: Full Multi-User & Telemetry

- [x] Complete admin UI for user management
- [ ] Visual ACL editor with drag-and-drop
- [x] **Full audit log viewer with search/filter** ✅ **COMPLETE**
  - Real-time audit log display with auto-refresh
  - Search by action, user, device, or IP
  - Filter by status (success/failed)
  - Filter by username
  - Relative timestamps (e.g., "5m ago")
  - Pagination for large datasets
  - CSV export functionality
  - Responsive design for mobile/tablet
- [✓] **Prometheus + Grafana dashboard setup** - **COMPLETED**
  - Grafana and Prometheus added to Docker Compose
  - Pre-configured data sources and dashboards
  - System overview dashboard with 9 panels
  - Metrics for HTTP, auth, devices, commands, and errors
  - Auto-refresh every 10 seconds
- [✓] Real-time device status updates (WebSockets) - **COMPLETED**
  - WebSocket server with session-based authentication
  - Real-time device state broadcasts to connected clients
  - Auto-reconnection with exponential backoff
  - Heartbeat monitoring for connection health
- [ ] Scene/routine management

### Phase 3: Google Home Integration

- [ ] Google Home OAuth flow
- [ ] Google Home device discovery
- [ ] Unified device interface
- [ ] Cross-platform routines

### Phase 4: Advanced Features

- [ ] Voice control integration
- [ ] Automation builder (if-this-then-that)
- [ ] Device grouping
- [ ] Historical data & analytics
- [ ] Mobile app (React Native)
- [ ] Multi-location support

---

## Performance Considerations

### Optimization Strategies

1. **Caching**: TanStack Query caches API responses
2. **Lazy Loading**: Routes code-split by default (Vite)
3. **Database Indexes**: All query paths indexed
4. **Connection Pooling**: SQLite WAL mode for concurrency
5. **Rate Limiting**: Prevents API abuse

### Scalability

**Current Capacity**:
- 10-50 concurrent users
- 100-500 devices
- 1000s of commands per hour

**Bottlenecks**:
- SQLite (sufficient for home use)
- SmartThings API rate limits
- Single server deployment

**If Scaling Needed**:
- Migrate to PostgreSQL
- Add Redis for sessions
- Load balancer + multiple backends
- Message queue for commands

---

## Design Decisions

### Why Monorepo?

- Shared TypeScript types
- Easier dependency management
- Simplified deployment
- Single git repository

### Why Session Auth over JWT?

- Revocable (logout works immediately)
- Less secure storage concerns
- Simpler implementation
- Better for server-rendered apps

### Why SQLite?

- Zero administration
- Perfect for < 100 users
- Easy backup (file copy)
- Excellent performance for reads
- Sufficient write performance

### Why Not Separate Microservices?

- Unnecessary complexity for home use
- Monolith easier to deploy
- Better performance (no network hops)
- Simpler debugging

---

## Deployment Architecture

### Development

```
Your PC
├── Frontend Dev Server (Vite) → https://localhost:5173
└── Backend Dev Server (tsx) → https://localhost:3001
```

### Production

```
Raspberry Pi / Home Server
└── Node.js Process
    ├── Backend (Fastify) → https://192.168.1.100:3001
    └── Serves Static Frontend → https://192.168.1.100:3001/
```

### Docker (Optional)

```
Docker Container
├── Node.js 18 Alpine
├── App Files
├── SQLite Database (volume)
└── Logs (volume)
```

For detailed deployment instructions, see [DEPLOYMENT.md](DEPLOYMENT.md).
