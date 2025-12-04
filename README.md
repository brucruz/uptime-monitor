# Uptime Monitor

A hybrid uptime monitoring system combining HTTP health checks with browser-based login verification. Built to explore ClickHouse for time-series data and OpenTelemetry for distributed tracing.

Currently monitoring [GlobalDial](https://globaldial.co) as a real-world test case.

## Features

- **HTTP Health Checks** - Every minute via fetch API
- **Browser Login Verification** - Every 5 minutes using Playwright
- **Time-Series Storage** - ClickHouse with automatic 30-day TTL
- **Distributed Tracing** - OpenTelemetry auto-instrumentation
- **REST API** - Query check history and aggregated metrics

## Tech Stack

- **Backend:** Hapi.js + TypeScript
- **Database:** ClickHouse Cloud
- **Observability:** OpenTelemetry → Grafana Cloud
- **Browser Testing:** Playwright
- **Deployment:** Railway (Docker)

## Architecture

```
┌─────────────────────────────────────────┐
│  Uptime Monitor (Node.js + TypeScript)  │
│  - HTTP checks (every 1 min)            │
│  - Browser checks (every 5 min)         │
│  - API for querying results             │
└─────────────┬───────────────────────────┘
              │
      ┌───────┴────────┐
      ▼                ▼
┌─────────────┐  ┌──────────────┐
│ ClickHouse  │  │ Grafana Cloud│
│ (metrics)   │  │ (traces)     │
└─────────────┘  └──────────────┘
```

## Live Demo

🔗 **API Endpoint:** https://uptime-monitor-production-e13b.up.railway.app

```bash
# View aggregated metrics
curl https://uptime-monitor-production-e13b.up.railway.app/stats | jq

# Recent HTTP checks
curl https://uptime-monitor-production-e13b.up.railway.app/checks/http | jq

# Recent browser checks
curl https://uptime-monitor-production-e13b.up.railway.app/checks/browser | jq
```

### Example Response (`/stats`)

```json
{
  "url": "https://globaldial.co",
  "period": "1 hour",
  "http": {
    "total_checks": 60,
    "successful": 60,
    "failed": 0,
    "uptime_percent": 100,
    "avg_latency_ms": 234,
    "p95_latency_ms": 287
  },
  "browser": {
    "total_checks": 12,
    "successful": 12,
    "failed": 0,
    "uptime_percent": 100,
    "avg_latency_ms": 3542,
    "p95_latency_ms": 4123
  }
}
```

## API Endpoints

| Method | Path                  | Description                        |
| ------ | --------------------- | ---------------------------------- |
| `GET`  | `/health`             | Service health check               |
| `GET`  | `/checks/http`        | Recent HTTP check history          |
| `GET`  | `/checks/browser`     | Recent browser check history       |
| `GET`  | `/stats`              | Aggregated metrics (1 hour window) |
| `POST` | `/checks/http/run`    | Manually trigger HTTP check        |
| `POST` | `/checks/browser/run` | Manually trigger browser check     |

## Key Implementation Details

**ClickHouse Schema**

- Two tables: `http_checks` and `browser_checks`
- MergeTree engine for fast time-series queries
- 30-day TTL for automatic data cleanup
- Optimized for aggregations (p95 latency, uptime %)

**OpenTelemetry Tracing**

- Auto-instrumentation for HTTP, DNS, and database queries
- Each check result includes a `trace_id` linking to distributed traces
- Exported to Grafana Cloud via OTLP

**Browser Checks**

- Playwright with Chromium in headless mode
- Reuses browser instance across checks for efficiency
- Validates full login flow (not just server availability)

## Running Locally

```bash
# Install dependencies
npm install
npx playwright install chromium

# Configure environment
cp .env.example .env
# Add your ClickHouse, Grafana Cloud, and target credentials

# Run development server
npm run dev

# or run it with Docker (requires Docker and Docker Compose)
docker-compose up -d
```

## Deployment

Deployed on Railway using a Dockerfile based on the official Playwright image (includes Chromium).

The application auto-creates ClickHouse tables on startup and begins running scheduled checks immediately.
