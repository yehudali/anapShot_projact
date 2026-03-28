# SnapShot Project — Backend

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
2. Each device consumes Kafka → wakes up → POST /devices/{id}/location
3. Location saved to Redis (live) + MongoDB (history)
4. WebSocket /ws/events/{event_id} → streams live locations to frontend
5. On event close → stop streaming, mark final snapshot

## Device States
- ACTIVE — participates in events, receives wake-up
- INACTIVE — excluded from events (user decision)
- UNREACHABLE — ACTIVE but did not report within timeout (30s default)

## Auth Roles
- ADMIN — full access, creates events, manages devices
- MANAGER — read access to map and events
- DEVICE — only reports location (no UI access)

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

## Development Workflow (Local)
```bash
# First time setup — also auto-creates consumer-service user
docker compose --profile dev up --build
curl -X POST http://localhost:8000/api/v1/auth/bootstrap \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"admin123"}'
# Then create devices via UI at http://localhost:5173
```
- Frontend: http://localhost:5173
- API docs: http://localhost:8000/docs
- Kafka UI: http://localhost:8080

## Redis Key Patterns
- `event:{event_id}` — Redis hash: device_id → JSON (lat/lng/state/name/accuracy/timestamp)
- `device:alive:{device_id}` — TTL key (45s): exists while device is actively reporting

## Known Gotchas
- **consumer-service user**: created automatically by bootstrap. If DB already seeded without it, create manually via `POST /api/v1/users` with role=manager.
- **VAPID keys**: required for PWA push notifications. Generate with `vapid --gen` and set `VAPID_PRIVATE_KEY`, `VAPID_PUBLIC_KEY`, `VAPID_CLAIMS_EMAIL` env vars.
- **UNREACHABLE auto-recovery**: when a device reports location while UNREACHABLE, it auto-transitions back to ACTIVE.
- **Consumer credentials**: controlled by `CONSUMER_USERNAME` / `CONSUMER_PASSWORD` env vars (default: `consumer-service` / `consumer123`). Must match config.

## Project Status
- [x] Step 1: Project skeleton + Docker
- [x] Step 2: Data models
- [x] Step 3: Basic endpoints (events, devices, locations)
- [x] Step 4: Kafka wake-up flow
- [x] Step 5: WebSocket live streaming
- [x] Step 6: JWT authentication
- [x] Step 7: Real device support (PWA + Web Push)
- [x] Step 8: Core bug fixes (UNREACHABLE recovery, WS stale closure, device name on map, multi-device activation)