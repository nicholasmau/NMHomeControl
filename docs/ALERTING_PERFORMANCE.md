# Alerting and Performance Monitoring Setup

## Overview
This document describes the alerting rules and performance monitoring dashboards configured for the Home Control application.

## Alert Rules Configuration

### File Location
- **Config File**: `monitoring/prometheus/alerts.yml`
- **Loaded by**: Prometheus automatically on startup
- **Evaluation Interval**: 30 seconds

### Alert Categories

#### 1. Service Health Alerts

**ServiceDown** (Critical)
- **Trigger**: Backend service is down for more than 1 minute
- **Severity**: Critical
- **Component**: Backend
- **Action**: Immediate investigation required

#### 2. Performance Alerts

**HighRequestLatency** (Warning)
- **Trigger**: 95th percentile HTTP request latency > 2 seconds for 5 minutes
- **Severity**: Warning
- **Component**: Performance
- **Threshold**: 2 seconds

**HighDeviceCommandLatency** (Warning)
- **Trigger**: 95th percentile device command latency > 3 seconds for 5 minutes
- **Severity**: Warning
- **Component**: Devices
- **Threshold**: 3 seconds

**HighSmartThingsAPILatency** (Warning)
- **Trigger**: 95th percentile SmartThings API latency > 5 seconds for 5 minutes
- **Severity**: Warning
- **Component**: SmartThings
- **Threshold**: 5 seconds

#### 3. Error Rate Alerts

**HighErrorRate** (Warning)
- **Trigger**: Overall error rate > 0.1 errors/second for 5 minutes
- **Severity**: Warning
- **Component**: Errors
- **Threshold**: 0.1 errors/second

**HighHTTPErrorRate** (Warning)
- **Trigger**: HTTP 5xx error rate > 5% for 5 minutes
- **Severity**: Warning
- **Component**: API
- **Threshold**: 5% of requests

**AuthenticationFailureSpike** (Warning)
- **Trigger**: Failed auth attempts > 0.5/second for 2 minutes
- **Severity**: Warning
- **Component**: Security
- **Threshold**: 0.5 failed attempts/second
- **Note**: May indicate brute force attack

**HighDeviceCommandFailureRate** (Warning)
- **Trigger**: Device command failure rate > 10% for 5 minutes
- **Severity**: Warning
- **Component**: Devices
- **Threshold**: 10% of commands

**SmartThingsAPIFailureRate** (Warning)
- **Trigger**: SmartThings API failure rate > 20% for 5 minutes
- **Severity**: Warning
- **Component**: SmartThings
- **Threshold**: 20% of API calls

#### 4. Session Alerts

**NoActiveSessions** (Info)
- **Trigger**: No active sessions for 30 minutes
- **Severity**: Info
- **Component**: Sessions
- **Note**: Informational alert for monitoring usage patterns

**UnusuallyHighSessionCount** (Info)
- **Trigger**: More than 10 active sessions for 5 minutes
- **Severity**: Info
- **Component**: Sessions
- **Threshold**: 10 concurrent sessions

#### 5. Request Rate Alerts

**LowRequestRate** (Info)
- **Trigger**: Request rate < 0.01 requests/second for 15 minutes
- **Severity**: Info
- **Component**: API
- **Note**: May indicate service not being used or network issues

**HighRequestRate** (Warning)
- **Trigger**: Request rate > 100 requests/second for 5 minutes
- **Severity**: Warning
- **Component**: API
- **Threshold**: 100 requests/second
- **Note**: May indicate DDoS attack or unusual load

## Performance Dashboard

### Dashboard Details
- **Name**: Home Control - Performance Metrics
- **UID**: home-control-performance
- **Refresh**: 10 seconds (auto-refresh enabled)
- **Location**: `monitoring/grafana/dashboards/home-control-performance.json`

### Dashboard Panels

#### 1. HTTP Request Latency (Percentiles)
- **Type**: Time series graph
- **Metrics**: p50, p95, p99 latency percentiles
- **Purpose**: Monitor API response times
- **Alert Threshold**: 2 seconds (shown as red line)

#### 2. HTTP Request Rate by Endpoint
- **Type**: Time series graph
- **Metrics**: Request rate per endpoint, method, and status code
- **Purpose**: Identify high-traffic endpoints and patterns

#### 3. Device Command Latency (Percentiles)
- **Type**: Time series graph
- **Metrics**: p50, p95, p99 command execution times
- **Purpose**: Monitor device control responsiveness
- **Alert Threshold**: 3 seconds

#### 4. SmartThings API Latency (Percentiles)
- **Type**: Time series graph
- **Metrics**: p50, p95, p99 API call latency
- **Purpose**: Monitor SmartThings service performance
- **Alert Threshold**: 5 seconds

#### 5. HTTP Error Rate
- **Type**: Time series graph
- **Metrics**: 5xx and 4xx error rates
- **Purpose**: Track client and server errors
- **Alert Threshold**: 5% for 5xx errors

#### 6. Command & API Failure Rates
- **Type**: Time series graph
- **Metrics**: Device command and SmartThings API failure rates
- **Purpose**: Monitor integration reliability
- **Alert Thresholds**: 10% for commands, 20% for API calls

#### 7. HTTP Status Code Distribution
- **Type**: Stacked time series
- **Metrics**: Request count by status code
- **Purpose**: Visualize success vs error patterns

#### 8. Error Rate by Type
- **Type**: Time series graph
- **Metrics**: Error rate grouped by error type
- **Purpose**: Identify specific error categories

## Accessing Monitoring Tools

### Prometheus
- **URL**: http://localhost:9090
- **Features**:
  - View alert rules: http://localhost:9090/alerts
  - Query metrics: http://localhost:9090/graph
  - Check targets: http://localhost:9090/targets

### Grafana Dashboards
- **URL**: http://localhost:3000
- **Login**: admin / admin (change on first login)
- **Dashboards**:
  1. Home Control - System Overview
  2. Home Control - Performance Metrics (NEW)

## Alert Rule Management

### Viewing Active Alerts
```bash
# Check alert status via Prometheus API
curl http://localhost:9090/api/v1/alerts

# View in Prometheus UI
http://localhost:9090/alerts
```

### Testing Alerts
Alerts can be tested by:
1. **ServiceDown**: Stop the backend service
2. **HighErrorRate**: Generate errors by calling non-existent endpoints
3. **NoActiveSessions**: Wait 30 minutes with no active users
4. **HighRequestRate**: Generate high load with load testing tools

### Modifying Alerts
1. Edit `monitoring/prometheus/alerts.yml`
2. Validate YAML syntax
3. Restart Prometheus: `docker-compose restart prometheus`
4. Verify rules loaded: Check http://localhost:9090/rules

## Metrics Already Instrumented

The backend already collects the following metrics:

### HTTP Metrics
- `http_request_duration_seconds` - Request latency histogram
- `http_requests_total` - Total HTTP requests counter

### Authentication Metrics
- `auth_attempts_total` - Authentication attempts (success/failure)
- `active_sessions` - Current active sessions gauge

### Device Metrics
- `device_commands_total` - Device commands executed
- `device_command_duration_seconds` - Command execution time
- `connected_devices` - Number of connected devices

### SmartThings API Metrics
- `smartthings_api_calls_total` - API call count
- `smartthings_api_duration_seconds` - API call latency

### Error Metrics
- `errors_total` - Total errors by type

### Mode Labels
All metrics include a `mode` label (`demo` or `production`) for separate tracking.

## Best Practices

### Alert Tuning
1. **Monitor alert frequency** - Adjust thresholds if too many false positives
2. **Review regularly** - Update thresholds based on actual usage patterns
3. **Severity levels** - Use appropriate severity (critical, warning, info)
4. **Alert fatigue** - Avoid too many low-priority alerts

### Performance Monitoring
1. **Baseline establishment** - Record normal performance metrics for comparison
2. **Trend analysis** - Look for gradual degradation over time
3. **Percentiles** - Focus on p95 and p99 for user experience
4. **Correlation** - Link performance issues to specific changes or events

### Dashboard Usage
1. **Time ranges** - Use appropriate time windows (5m, 1h, 24h, 7d)
2. **Refresh rate** - Balance between real-time and system load
3. **Filtering** - Use mode labels to separate demo from production data

## Next Steps

### Optional Enhancements
1. **Alertmanager** - Add alert routing, grouping, and notifications
2. **Alert Notifications** - Configure email, Slack, or webhook notifications
3. **Custom Dashboards** - Create device-specific or user activity dashboards
4. **Log Aggregation** - Integrate with Loki for log-based alerts
5. **SLO Tracking** - Define and monitor Service Level Objectives
6. **Anomaly Detection** - Add ML-based anomaly detection for metrics

### Alertmanager Configuration (Future)
To add alert notifications:
1. Add Alertmanager service to docker-compose.yml
2. Configure notification channels (email, Slack, etc.)
3. Update prometheus.yml with alertmanager endpoint
4. Define routing rules and grouping logic

## Troubleshooting

### Alerts Not Firing
- Check Prometheus targets are UP: http://localhost:9090/targets
- Verify alert rules syntax: http://localhost:9090/rules
- Check evaluation interval in prometheus.yml
- Review Prometheus logs: `docker logs home-control-prometheus`

### Dashboard Not Showing Data
- Verify Prometheus datasource in Grafana: Settings → Data Sources
- Check metrics are being collected: http://localhost:9090/graph
- Verify time range matches data availability
- Check panel queries for syntax errors

### High Alert Noise
- Increase alert duration (for parameter) to reduce flapping
- Adjust thresholds based on actual baseline
- Use alert inhibition rules to suppress dependent alerts
- Group related alerts together

## References

- Prometheus Alerting: https://prometheus.io/docs/alerting/latest/overview/
- Grafana Dashboards: https://grafana.com/docs/grafana/latest/dashboards/
- PromQL Query Language: https://prometheus.io/docs/prometheus/latest/querying/basics/
