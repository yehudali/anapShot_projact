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

## Project Status
- [x] Step 1: Project skeleton + Docker
- [x] Step 2: Data models
- [x] Step 3: Basic endpoints (events, devices, locations)
- [x] Step 4: Kafka wake-up flow
- [x] Step 5: WebSocket live streaming
- [x] Step 6: JWT authentication