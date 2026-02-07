# Demo Mode Metrics Enhancement

## Overview

The metrics system has been enhanced to properly track demo mode activity separately from production mode, providing full observability for both environments.

## Key Changes

### 1. Mode Label Added to All Metrics

All relevant metrics now include a `mode` label:
- `mode="demo"` - Demo mode with simulated devices
- `mode="production"` - Production mode with real SmartThings devices

### 2. Enhanced Metrics

#### System Metrics
- **`active_sessions{mode}`** - Tracks demo and production sessions separately
- **`connected_devices{mode}`** - Shows 8 devices for demo, actual count for production

#### Authentication Metrics
- **`auth_attempts_total{success, mode}`** - Distinguishes demo vs production logins
- Demo login increments `{success="true", mode="demo"}`
- Production login increments `{success="true", mode="production"}`

#### Device Command Metrics
- **`device_commands_total{device_id, capability, command, success, mode}`**
- **`device_command_duration_seconds{device_id, capability, mode}`**
- Both demo and production commands are tracked with proper mode labels

#### SmartThings API Metrics
- **`smartthings_api_calls_total{endpoint, success, mode}`**
- **`smartthings_api_duration_seconds{endpoint, mode}`**
- Demo mode now includes **mock API calls** for consistency
- Mock API calls simulate 50-150ms latency for realistic metrics

### 3. Backend Changes

#### `metrics.service.ts`
Added `mode` label to all relevant metrics:
```typescript
export const authAttempts = new Counter({
  labelNames: ['success', 'mode'],  // Added mode
  // ...
});

export const activeSessions = new Gauge({
  labelNames: ['mode'],  // Added mode
  // ...
});

export const deviceCommands = new Counter({
  labelNames: ['device_id', 'capability', 'command', 'success', 'mode'],  // Added mode
  // ...
});

export const connectedDevices = new Gauge({
  labelNames: ['mode'],  // Added mode
  // ...
});
```

#### `auth.routes.ts`
- Demo login: `authAttempts.inc({ success: 'true', mode: 'demo' })`
- Production login: `authAttempts.inc({ success: 'true', mode: 'production' })`
- Sets demo device count: `connectedDevices.set({ mode: 'demo' }, 8)`
- Tracks active sessions by mode: `activeSessions.inc({ mode })`

#### `device.routes.ts`
- Added mode detection: `const mode = request.isDemoMode ? 'demo' : 'production'`
- All device command metrics include mode label
- **Mock SmartThings API tracking** for demo mode:
  ```typescript
  if (request.isDemoMode) {
    smartthingsApiCalls.inc({ endpoint: 'executeCommand', success: 'true', mode: 'demo' });
    const mockApiDuration = (Math.random() * 0.1 + 0.05); // 50-150ms
    smartthingsApiDuration.observe({ endpoint: 'executeCommand', mode: 'demo' }, mockApiDuration);
  }
  ```

### 4. Frontend Changes

#### `api.ts`
Updated `executeCommand` to **always call the backend** even in demo mode:
```typescript
executeCommand: async (deviceId, capability, command, args) => {
  const isDemoMode = localStorage.getItem('demoMode') === 'true';
  
  // Always call backend to track metrics
  const response = await apiClient.post(`/devices/${deviceId}/command`, {
    capability, command, args
  });
  
  // In demo mode, also update local state for UI
  if (isDemoMode) {
    executeDemoCommand(deviceId, capability, command, args);
  }
  
  return response.data;
}
```

**Why this matters:**
- Previously, demo mode bypassed the backend entirely
- Now backend receives all demo commands and tracks them properly
- Frontend still manages local state for instant UI updates
- Backend records metrics with `mode="demo"` label

### 5. Grafana Dashboard Updates

Dashboard queries updated to aggregate mode labels:
```promql
# Active Sessions - shows total across both modes
sum(active_sessions)

# Connected Devices - shows total (8 demo + N production)
sum(connected_devices)

# Device Commands - grouped by success and mode
sum by(success, mode) (rate(device_commands_total[5m]))

# Auth Attempts - grouped by success and mode
sum by(success, mode) (rate(auth_attempts_total[5m]))
```

### 6. Documentation Updates

#### Updated Files:
- **`GRAFANA_SETUP.md`** - Added mode label documentation and demo-specific queries
- **`GRAFANA_QUICKSTART.md`** - Added mode tracking examples
- **`DEMO_MODE_METRICS.md`** (this file) - Comprehensive implementation guide

#### New Query Examples:
```promql
# Demo activity only
sum(device_commands_total{mode="demo"})
sum(active_sessions{mode="demo"})

# Production activity only
sum(device_commands_total{mode="production"})
sum(active_sessions{mode="production"})

# Compare demo vs production command rates
sum by(mode) (rate(device_commands_total[5m]))

# SmartThings API performance by mode
histogram_quantile(0.95, 
  sum by(le, mode) (rate(smartthings_api_duration_seconds_bucket[5m])))
```

## Benefits

### 1. Complete Observability
- Track demo and production usage separately
- Understand which environment is being used more
- Monitor performance differences between modes

### 2. Realistic Demo Metrics
- Demo mode generates full metric traces
- Mock SmartThings API calls provide realistic latency
- Device count properly reflects 8 demo devices

### 3. Accurate Analytics
- Distinguish between test/demo activity and real usage
- Alert on production issues without demo noise
- Compare demo vs production performance

### 4. Easier Debugging
- See exactly what's happening in each mode
- Track demo session activity
- Monitor mock API call patterns

## Testing

### Verify Demo Mode Metrics:

1. **Login with demo credentials:**
   ```
   Username: demo
   Password: demo1234
   ```

2. **Check metrics endpoint:**
   ```bash
   curl -k https://localhost:3001/metrics | grep mode
   ```

3. **Expected output:**
   ```
   active_sessions{mode="demo"} 1
   connected_devices{mode="demo"} 8
   auth_attempts_total{success="true",mode="demo"} 1
   device_commands_total{...,mode="demo"} N
   smartthings_api_calls_total{endpoint="executeCommand",success="true",mode="demo"} N
   ```

4. **Toggle devices in UI and verify:**
   - Device commands increment with `mode="demo"`
   - Command duration metrics include `mode="demo"`
   - Mock SmartThings API calls are recorded

5. **Check Grafana dashboard:**
   - http://localhost:3000
   - Open "Home Control - System Overview"
   - Active Sessions should show demo session
   - Connected Devices should show 8
   - Device Commands panels should show demo activity

### Verify Production Mode Metrics:

1. **Login with production user** (if configured)
2. **Check metrics:**
   ```
   active_sessions{mode="production"} 1
   auth_attempts_total{success="true",mode="production"} 1
   device_commands_total{...,mode="production"} N
   ```

## Migration Notes

### Breaking Changes
- Metrics queries without mode labels will aggregate across both modes
- Existing Grafana queries still work but show combined data
- Use `{mode="production"}` selector to filter production-only data

### Backward Compatibility
- Old dashboards continue to work (sum across modes)
- New queries can filter by mode
- No data loss from existing metrics

### Performance Impact
- Minimal - only adds one label dimension
- Cardinality increase: 2x (demo + production)
- Storage impact: negligible

## Future Enhancements

1. **Mode-specific Dashboards**
   - Separate dashboard for demo analytics
   - Production-only dashboard for real monitoring

2. **Advanced Queries**
   - Compare latency between modes
   - Track demo feature usage
   - Identify most-used demo devices

3. **Alerting**
   - Production-only alerts (ignore demo noise)
   - Demo availability monitoring
   - Mode-specific thresholds

## Related Documentation

- [Grafana Setup Guide](GRAFANA_SETUP.md) - Full setup and configuration
- [Grafana Quick Reference](GRAFANA_QUICKSTART.md) - Quick commands and queries
- [Demo Mode Documentation](README.md#demo-mode) - Demo mode credentials and features
- [Architecture](ARCHITECTURE.md) - System overview and roadmap
