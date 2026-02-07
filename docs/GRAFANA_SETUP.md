# Grafana & Prometheus Setup Guide

This guide covers setting up Grafana dashboards for monitoring your Home Control system.

## Quick Start

The Grafana and Prometheus services are included in the Docker Compose setup and will start automatically.

### Access Grafana

1. **Start the services:**
   ```bash
   docker-compose up -d
   ```

2. **Access Grafana:**
   - URL: http://localhost:3000
   - Username: `admin`
   - Password: `admin` (change on first login)

3. **View Dashboards:**
   - Navigate to **Dashboards** → **Home Control - System Overview**
   - The dashboard is pre-configured with all metrics

### Access Prometheus

- URL: http://localhost:9090
- View raw metrics at: https://localhost:3001/metrics

---

## Available Metrics

All metrics include a `mode` label to distinguish between:
- `mode="demo"` - Demo mode activity (simulated devices)
- `mode="production"` - Production mode activity (real SmartThings devices)

This allows you to track demo and production usage separately or combined.

### System Metrics

| Metric | Description | Type | Labels |
|--------|-------------|------|--------|
| `active_sessions` | Current active user sessions | Gauge | `mode` |
| `connected_devices` | Number of connected smart devices | Gauge | `mode` |

### HTTP Metrics

| Metric | Description | Type | Labels |
|--------|-------------|------|--------|
| `http_requests_total` | Total HTTP requests | Counter | `method`, `route`, `status_code` |
| `http_request_duration_seconds` | HTTP request latency | Histogram | `method`, `route`, `status_code` |

### Authentication Metrics

| Metric | Description | Type | Labels |
|--------|-------------|------|--------|
| `auth_attempts_total` | Authentication attempts | Counter | `success`, `mode` |

### Device Command Metrics

| Metric | Description | Type | Labels |
|--------|-------------|------|--------|
| `device_commands_total` | Device commands executed | Counter | `device_id`, `capability`, `command`, `success`, `mode` |
| `device_command_duration_seconds` | Device command execution time | Histogram | `device_id`, `capability`, `mode` |

### SmartThings API Metrics

| Metric | Description | Type | Labels |
|--------|-------------|------|--------|
| `smartthings_api_calls_total` | SmartThings API calls (includes mock demo calls) | Counter | `endpoint`, `success`, `mode` |
| `smartthings_api_duration_seconds` | SmartThings API latency | Histogram | `endpoint`, `mode` |

### Error Metrics

| Metric | Description | Type | Labels |
|--------|-------------|------|--------|
| `errors_total` | Total errors by type | Counter | `type` |

---

## Available Dashboards

### 1. Home Control - System Overview

Real-time system health and activity monitoring dashboard.

**Panels:**
1. **Active Sessions** - Current logged-in users
2. **Connected Devices** - Total smart devices
3. **Device Command Success Rate** - Success percentage (last 5 minutes)
4. **HTTP Request Rate** - Requests per second by endpoint
5. **HTTP Request Duration (p95)** - 95th percentile latency
6. **Device Commands** - Success vs Failed over time
7. **Authentication Attempts** - Success vs Failed login attempts
8. **Device Command Duration (p95)** - Command execution time
9. **Error Rate by Type** - Errors grouped by type

### 2. Home Control - Performance Metrics (NEW)

Detailed performance analytics with latency percentiles and error tracking.

**Panels:**
1. **HTTP Request Latency (Percentiles)** - p50, p95, p99 latency tracking
2. **HTTP Request Rate by Endpoint** - Traffic breakdown by route and status
3. **Device Command Latency (Percentiles)** - Command execution performance
4. **SmartThings API Latency (Percentiles)** - External API performance
5. **HTTP Error Rate** - 4xx and 5xx error tracking
6. **Command & API Failure Rates** - Integration reliability metrics
7. **HTTP Status Code Distribution** - Status code patterns over time
8. **Error Rate by Type** - Detailed error categorization

**Access**: Grafana → Dashboards → Home Control - Performance Metrics

## Alert Rules

Prometheus continuously monitors your application and can alert on various conditions.

### Viewing Alerts

- **Prometheus Alerts UI**: http://localhost:9090/alerts
- **Alert Rules**: http://localhost:9090/rules
- **API**: `curl http://localhost:9090/api/v1/alerts`

### Alert Severity Levels

#### 🔴 Critical (Immediate Action Required)
- **ServiceDown** - Backend service has been down for > 1 minute
  - Check: `docker ps` and `docker logs home-control-backend`

#### 🟡 Warning (Requires Attention)
- **HighRequestLatency** - HTTP p95 latency > 2 seconds for 5 minutes
- **HighDeviceCommandLatency** - Device command p95 latency > 3 seconds for 5 minutes
- **HighSmartThingsAPILatency** - SmartThings API p95 latency > 5 seconds for 5 minutes
- **HighErrorRate** - Error rate > 0.1 errors/second for 5 minutes
- **HighHTTPErrorRate** - HTTP 5xx error rate > 5% for 5 minutes
- **AuthenticationFailureSpike** - Failed auth > 0.5/second for 2 minutes (potential attack)
- **HighDeviceCommandFailureRate** - Device command failure rate > 10% for 5 minutes
- **SmartThingsAPIFailureRate** - SmartThings API failure rate > 20% for 5 minutes
- **HighRequestRate** - Request rate > 100 req/sec for 5 minutes (potential DDoS)

#### 🔵 Info (Informational)
- **NoActiveSessions** - No active sessions for 30 minutes
- **UnusuallyHighSessionCount** - More than 10 concurrent sessions
- **LowRequestRate** - Request rate < 0.01 req/sec for 15 minutes

**Total Active Alert Rules**: 14

For complete alert documentation, see [ALERTING_PERFORMANCE.md](ALERTING_PERFORMANCE.md)

---

## Configuration

### Prometheus Scrape Configuration

Located at `monitoring/prometheus.yml`:

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'home-control-backend'
    static_configs:
      - targets: ['backend:3001']
    metrics_path: '/metrics'
    scheme: https
    tls_config:
      insecure_skip_verify: true
```

### Grafana Datasource

Auto-configured via provisioning at `monitoring/grafana/provisioning/datasources/prometheus.yml`.

### Dashboard Auto-Loading

Dashboards in `monitoring/grafana/dashboards/` are automatically loaded on startup.

---

## Creating Custom Dashboards

1. **In Grafana UI:**
   - Go to **Dashboards** → **New** → **New Dashboard**
   - Add panels with Prometheus queries
   - Save the dashboard

2. **Export Dashboard JSON:**
   - Click **Share** → **Export** → **Save to file**
   - Place JSON in `monitoring/grafana/dashboards/`
   - Restart Grafana: `docker-compose restart grafana`

3. **Example Query:**
   ```promql
   # Success rate of device commands
   sum(rate(device_commands_total{success="true"}[5m])) / 
   sum(rate(device_commands_total[5m]))
   ```

---

## Common Queries

### Demo vs Production Activity

```promql
# Active sessions by mode
active_sessions

# Demo device commands only
sum(rate(device_commands_total{mode="demo"}[5m]))

# Production device commands only
sum(rate(device_commands_total{mode="production"}[5m]))
```

### Top 5 Most Used Devices

```promql
topk(5, sum by(device_id) (device_commands_total))
```

### Failed Commands by Device

```promql
sum by(device_id) (device_commands_total{success="false"})
```

### Average Response Time by Endpoint

```promql
rate(http_request_duration_seconds_sum[5m]) / 
rate(http_request_duration_seconds_count[5m])
```

### Failed Login Attempts (Last Hour)

```promql
# All modes
increase(auth_attempts_total{success="false"}[1h])

# Production only
increase(auth_attempts_total{success="false", mode="production"}[1h])
```

### SmartThings API Performance

```promql
# API call rate by mode
sum by(mode) (rate(smartthings_api_calls_total[5m]))

# Demo mode includes mock API calls for consistency
histogram_quantile(0.95, 
  rate(smartthings_api_duration_seconds_bucket{mode="demo"}[5m]))
```

---

## Alerting (Optional)

Configure Grafana alerts for critical metrics:

1. **High Error Rate:**
   ```promql
   rate(errors_total[5m]) > 1
   ```

2. **Low Command Success Rate:**
   ```promql
   (sum(rate(device_commands_total{success="true"}[5m])) / 
    sum(rate(device_commands_total[5m]))) < 0.9
   ```

3. **No Active Production Sessions:**
   ```promql
   sum(active_sessions{mode="production"}) == 0
   ```

4. **SmartThings API Failures (Production Only):**
   ```promql
   rate(smartthings_api_calls_total{success="false", mode="production"}[5m]) > 0.1
   ```

---

## Troubleshooting

### Grafana Not Loading

```bash
# Check Grafana logs
docker logs home-control-grafana

# Restart Grafana
docker-compose restart grafana
```

### Prometheus Not Scraping

```bash
# Check Prometheus targets
# Navigate to: http://localhost:9090/targets

# Verify backend metrics endpoint
curl -k https://localhost:3001/metrics
```

### Dashboard Not Showing Data

1. Check time range (top-right in Grafana)
2. Verify data source is working: **Configuration** → **Data Sources** → **Prometheus** → **Test**
3. Ensure backend is generating metrics by using the app

### Data Retention

By default, Prometheus retains data for 15 days. To change:

Edit `monitoring/prometheus.yml` and add:
```yaml
storage:
  tsdb:
    retention.time: 30d  # Keep data for 30 days
```

---

## Security Considerations

### Change Default Passwords

On first Grafana login, change the admin password:
1. Login with `admin/admin`
2. Click **Skip** or set new password
3. Go to **Profile** → **Change Password**

### Production Recommendations

1. **Enable authentication:**
   - Edit `GF_SECURITY_ADMIN_PASSWORD` in `docker-compose.yml`
   - Use strong passwords

2. **Restrict access:**
   - Bind to localhost: `127.0.0.1:3000:3000` in docker-compose
   - Use reverse proxy with authentication

3. **TLS for Prometheus:**
   - Already configured with `insecure_skip_verify` for self-signed certs
   - For production, use valid certificates

---

## Next Steps

- Create custom dashboards for specific use cases
- Set up alerting rules for critical metrics
- Export dashboards to share with team
- Configure email/Slack notifications for alerts

For more advanced Grafana features, see the [official documentation](https://grafana.com/docs/).
