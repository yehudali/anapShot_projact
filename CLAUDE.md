# AnapShot Project — Backend

## Project Purpose
Real-time situational awareness system. When an event is created,
the system wakes up all active devices via Kafka, collects their
live GPS locations, and streams them in real-time until the event closes.

## Tech Stack
- **FastAPI** (Python 3.11) — main framework
- **MongoDB** (Motor async) — devices, users, events, location history
- **Redis** — live location snapshot per event
- **Kafka** (aiokafka) — wake-up signal to devices
- **WebSocket** (FastAPI built-in) — live location streaming to clients
- **Pydantic v2** — all data models
- **python-jose + passlib** — JWT authentication
- **Docker Compose** — local development

## Architecture Flow
1. POST /events → create event → publish to Kafka topic `device.wakeup`
2. `consumer` service consumes Kafka → simulates active devices → POST /devices/{id}/location
   (in production: real devices would report directly)
3. Location saved to Redis HSET `event:{id}` → `device_id: json` (live, one entry per device)
   + MongoDB `locations` collection (full history)
4. WebSocket /ws/events/{event_id} → streams live locations to frontend every 2s
5. On event close → stop streaming, delete Redis key

## Device States
- ACTIVE — participates in events, receives wake-up
- INACTIVE — excluded from events (user decision)
- UNREACHABLE — ACTIVE but did not report within timeout (30s default)

## Auth Roles
- ADMIN — full access, creates events, manages devices
- MANAGER — read access to map and events
- DEVICE — only reports location (no UI access)

## Device Location Auth
- Location report (`POST /devices/{id}/location`) uses `X-Api-Key` header (not Bearer token)
- Each device has a unique `api_key` generated on creation
- All other endpoints use `Authorization: Bearer <token>`

## First-Time Setup (after docker compose up)
1. `POST /api/v1/auth/bootstrap` — create first admin user
2. `POST /api/v1/users` — create `consumer-service` account (role: manager, password: consumer123)
   Without this account the consumer service cannot authenticate and no locations will be reported

## Location Report Minimum Fields
- device_id, event_id, latitude, longitude, timestamp, accuracy

## Development Rules (IMPORTANT)
- Never modify existing working endpoints without being asked
- Always use async functions (async/await) throughout
- All models must use Pydantic v2 syntax
- Environment variables only via config.py (never hardcode)
- Each new feature in its own file under routes/ or services/
- Always return consistent JSON responses with status field
- API contracts are frozen: never change existing endpoint paths, methods, or response shapes

## Project Status
- [x] Step 1: Project skeleton + Docker
- [x] Step 2: Data models
- [x] Step 3: Basic endpoints (events, devices, locations)
- [x] Step 4: Kafka wake-up flow
- [x] Step 5: WebSocket live streaming
- [x] Step 6: JWT authentication