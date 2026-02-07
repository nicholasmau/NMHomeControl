# Grafana & Prometheus - Quick Reference

## Access URLs

| Service | URL | Credentials |
|---------|-----|-------------|
| **Grafana** | http://localhost:3000 | admin / admin |
| **Prometheus** | http://localhost:9090 | (no auth) |
| **Prometheus Alerts** | http://localhost:9090/alerts | (no auth) |
| **Backend Metrics** | https://localhost:3001/metrics | (session required) |
| **Application** | http://localhost:5173 | demo / demo1234 |

## Available Dashboards

### 1. Home Control - System Overview
Real-time system health and activity monitoring.

**Panels:**
1. **Active Sessions** - Current users logged in
2. **Connected Devices** - Total smart home devices
3. **Device Command Success Rate** - % of successful commands
4. **HTTP Request Rate** - Requests/second by endpoint
5. **HTTP Request Duration (p95)** - 95th percentile latency
6. **Device Commands** - Success vs Failed over time
7. **Authentication Attempts** - Login success vs failures
8. **Device Command Duration (p95)** - Command execution time
9. **Error Rate by Type** - System errors grouped by category

### 2. Home Control - Performance Metrics (NEW)
Detailed performance analytics and latency tracking.

**Panels:**
1. **HTTP Request Latency** - p50, p95, p99 percentiles
2. **HTTP Request Rate by Endpoint** - Traffic breakdown
3. **Device Command Latency** - p50, p95, p99 percentiles
4. **SmartThings API Latency** - p50, p95, p99 percentiles
5. **HTTP Error Rate** - 4xx and 5xx error rates
6. **Command & API Failure Rates** - Integration reliability
7. **HTTP Status Code Distribution** - Success vs error patterns
8. **Error Rate by Type** - Detailed error categorization

## Alert Rules

**View Active Alerts**: http://localhost:9090/alerts

### Alert Severity Levels

🔴 **Critical** - Requires immediate action
- ServiceDown - Backend service unavailable

🟡 **Warning** - Requires attention
- High latency (HTTP > 2s, Device Commands > 3s, SmartThings API > 5s)
- High error rates (HTTP 5xx > 5%, Device Commands > 10%, SmartThings API > 20%)
- Authentication failure spike (> 0.5/sec)
- Unusual request rates (< 0.01/s or > 100/s)

🔵 **Info** - Informational
- No active sessions for 30 minutes
- Session count > 10 concurrent users
- Low request rate for 15 minutes

**Total Alert Rules**: 14 (see [ALERTING_PERFORMANCE.md](ALERTING_PERFORMANCE.md) for details)

## Quick Commands

```bash
# Start all services
docker-compose up -d

# View Grafana logs
docker logs home-control-grafana -f

# View Prometheus logs
docker logs home-control-prometheus -f

# Restart monitoring stack
docker-compose restart prometheus grafana

# Check Prometheus targets
curl http://localhost:9090/api/v1/targets

# Check alert rules status
curl http://localhost:9090/api/v1/rules

# Check active alerts
curl http://localhost:9090/api/v1/alerts

# View raw metrics
curl -k https://localhost:3001/metrics
```

## Monitoring Best Practices

1. **Dashboard Usage**
   - Use "Last 15 minutes" for real-time troubleshooting
   - Use "Last 1 hour" for recent trend analysis
   - Use "Last 24 hours" for daily pattern review

2. **Alert Response**
   - 🔴 Critical alerts: Investigate immediately
   - 🟡 Warning alerts: Review within 15-30 minutes
   - 🔵 Info alerts: Review during regular monitoring

3. **Performance Targets**
   - HTTP Request p95 latency: < 2 seconds
   - Device Command p95 latency: < 3 seconds
   - SmartThings API p95 latency: < 5 seconds
   - HTTP 5xx error rate: < 5%
   - Device command failure rate: < 10%

## Documentation

- **Detailed Setup**: [GRAFANA_SETUP.md](GRAFANA_SETUP.md)
- **Alerting & Performance**: [ALERTING_PERFORMANCE.md](ALERTING_PERFORMANCE.md)
- **Demo Mode Metrics**: [DEMO_MODE_METRICS.md](DEMO_MODE_METRICS.md)

## Default Settings

- **Refresh Interval:** 10 seconds
- **Time Range:** Last 1 hour
- **Prometheus Scrape:** Every 15 seconds
- **Data Retention:** 15 days (default)

## Common Issues

**No Data in Dashboard?**
1. Check time range (top-right)
2. Use the app to generate some activity
3. Wait 15-30 seconds for first scrape

**Grafana Won't Start?**
```bash
docker logs home-control-grafana
docker-compose restart grafana
```

**Change Admin Password:**
1. Login to http://localhost:3000
2. Click profile icon → Change Password
3. Or skip the prompt on first login

## Useful Prometheus Queries

```promql
# Total requests in last 5 minutes
sum(rate(http_requests_total[5m]))

# Device command success rate
sum(rate(device_commands_total{success="true"}[5m])) / 
sum(rate(device_commands_total[5m]))

# Demo vs Production activity
active_sessions  # Shows both modes
sum(device_commands_total{mode="demo"})  # Demo only
sum(device_commands_total{mode="production"})  # Production only

# Failed logins in last hour
increase(auth_attempts_total{success="false"}[1h])

# Top 5 most used devices
topk(5, sum by(device_id) (device_commands_total))
```

## Mode Tracking

All metrics include a `mode` label:
- **`mode="demo"`** - Demo mode with 8 simulated devices
- **`mode="production"`** - Real SmartThings devices

This allows separate tracking or combined views in dashboards.

## See Also
- [Full Setup Guide](GRAFANA_SETUP.md)
- [Architecture](ARCHITECTURE.md)
- [Metrics Service](../backend/src/services/metrics.service.ts)
