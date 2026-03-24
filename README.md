# AnapShot — Backend

Real-time situational awareness system. When an event is created, the system wakes all active devices via Kafka, collects their live GPS locations, and streams them in real-time to connected clients via WebSocket until the event closes.

---

## Table of Contents

- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [API Reference](#api-reference)
- [Authentication](#authentication)
- [Data Models](#data-models)
- [Event Lifecycle](#event-lifecycle)

---

## Architecture

```
┌─────────────┐   POST /events   ┌─────────────┐   Kafka: device.wakeup   ┌──────────────┐
│   Client    │ ───────────────► │   FastAPI   │ ───────────────────────► │   Consumer   │
│ (frontend)  │                  │  :8000      │                          │  (simulator) │
│             │ ◄─────────────── │             │ ◄───────────────────────  └──────────────┘
│  WebSocket  │  live locations  │             │   POST /devices/{id}/location
└─────────────┘                  └──────┬──────┘
                                        │
                          ┌─────────────┼─────────────┐
                          ▼             ▼             ▼
                       MongoDB        Redis       Kafka
                    (persistent)   (live snap)  (wakeup)
```

**Flow:**
1. `POST /events` → creates event → publishes to Kafka topic `device.wakeup`
2. Consumer service listens to Kafka → fetches all ACTIVE devices → simulates GPS reporting
3. Each device calls `POST /devices/{id}/location` every 5 seconds
4. Location saved to MongoDB (history) + Redis (live snapshot per event)
5. `WebSocket /ws/events/{id}` reads Redis every 2 seconds → streams to frontend
6. `PUT /events/{id}/close` → stops streaming, clears Redis

---

## Tech Stack

| Component | Technology |
|---|---|
| API Framework | FastAPI (Python 3.11) |
| Database | MongoDB 6 (Motor async driver) |
| Cache / Live State | Redis 7 |
| Message Broker | Apache Kafka (Confluent 7.4) |
| WebSocket | FastAPI built-in |
| Auth | JWT (python-jose) + bcrypt (passlib) |
| Data Models | Pydantic v2 |
| Container | Docker Compose |

---

## Project Structure

```
anapShot_projact/
├── app/
│   ├── main.py               # FastAPI app + router registration
│   ├── config.py             # Settings (env vars via pydantic-settings)
│   ├── core/
│   │   └── auth.py           # JWT utilities + role dependencies
│   ├── models/
│   │   ├── user.py           # User model + Role enum
│   │   ├── device.py         # Device model + DeviceState enum
│   │   ├── event.py          # Event model + EventStatus enum
│   │   └── location.py       # Location model
│   ├── routes/
│   │   ├── auth.py           # POST /auth/login
│   │   ├── users.py          # User management
│   │   ├── devices.py        # Device CRUD + location reporting
│   │   ├── events.py         # Event CRUD + close
│   │   ├── locations.py      # GET live locations from Redis
│   │   └── websocket.py      # WebSocket /ws/events/{id}
│   └── services/
│       ├── database.py       # MongoDB + Redis clients
│       └── kafka_service.py  # Kafka producer (wakeup messages)
├── consumer/
│   ├── main.py               # Kafka consumer + device simulator
│   ├── requirements.txt
│   └── Dockerfile
├── docker-compose.yml
├── requirements.txt
└── Dockerfile
```

---

## Getting Started

### Prerequisites
- Docker + Docker Compose

### Run

```bash
docker compose up --build
```

Services started:
| Service | URL |
|---|---|
| FastAPI (Swagger) | http://localhost:8000/docs |
| Kafka UI | http://localhost:8080 |
| MongoDB | localhost:27017 |
| Redis | localhost:6379 |

### First-Time Setup

**1. Create the first admin user** (only works when no users exist):
```bash
curl -X POST http://localhost:8000/api/v1/users/bootstrap \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "yourpassword", "role": "admin"}'
```

**2. Login to get a token:**
```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "yourpassword"}'
# → {"token": "eyJ..."}
```

**3. Use the token in all subsequent requests:**
```bash
curl http://localhost:8000/api/v1/devices \
  -H "Authorization: Bearer eyJ..."
```

---

## API Reference

### Auth
| Method | Path | Description | Auth |
|---|---|---|---|
| POST | `/api/v1/auth/login` | Login → JWT token | None |
| POST | `/api/v1/users/bootstrap` | Create first admin | None (locked after first user) |

### Users
| Method | Path | Description | Auth |
|---|---|---|---|
| POST | `/api/v1/users` | Create user | ADMIN |
| GET | `/api/v1/users` | List users | ADMIN |
| GET | `/api/v1/users/{id}` | Get user | ADMIN |

### Devices
| Method | Path | Description | Auth |
|---|---|---|---|
| POST | `/api/v1/devices` | Create device (returns api_key) | ADMIN |
| GET | `/api/v1/devices` | List devices | ADMIN, MANAGER |
| GET | `/api/v1/devices/{id}` | Get device | ADMIN, MANAGER |
| PUT | `/api/v1/devices/{id}` | Update device | ADMIN |
| DELETE | `/api/v1/devices/{id}` | Delete device | ADMIN |
| POST | `/api/v1/devices/{id}/location` | Report location | API Key (`X-Api-Key`) |

### Events
| Method | Path | Description | Auth |
|---|---|---|---|
| POST | `/api/v1/events` | Create event (triggers Kafka) | ADMIN |
| GET | `/api/v1/events` | List events | ADMIN, MANAGER |
| GET | `/api/v1/events/{id}` | Get event | ADMIN, MANAGER |
| PUT | `/api/v1/events/{id}/close` | Close event | ADMIN |

### Locations
| Method | Path | Description | Auth |
|---|---|---|---|
| GET | `/api/v1/events/{id}/locations` | Live locations (Redis) | None |

### WebSocket
| Path | Description | Auth |
|---|---|---|
| `ws://host/ws/events/{id}?token=<jwt>` | Stream live locations | ADMIN, MANAGER (JWT query param) |

**WebSocket message format** (every 2 seconds):
```json
{
  "status": "active",
  "locations": [
    {
      "device_id": "...",
      "latitude": 31.502,
      "longitude": 34.803,
      "timestamp": "2026-03-24T21:35:00",
      "accuracy": 7.5
    }
  ]
}
```

---

## Authentication

### JWT (ADMIN / MANAGER)
1. Login via `POST /auth/login` → receive `token`
2. Add header: `Authorization: Bearer <token>`
3. Token expires after 60 minutes

### API Key (DEVICE)
- Each device gets a unique `api_key` on creation
- Add header: `X-Api-Key: <api_key>`
- Used only for `POST /devices/{id}/location`

### Roles
| Role | Access |
|---|---|
| ADMIN | Full access — create/manage everything |
| MANAGER | Read-only — view devices, events, locations |
| DEVICE | Location reporting only (via API Key) |

---

## Data Models

### Device States
- `active` — participates in events, receives wake-up
- `inactive` — excluded from events (manual decision)
- `unreachable` — active but did not report within timeout

### Event Statuses
- `active` — ongoing, devices are reporting
- `closed` — finished, streaming stopped, Redis cleared

---

## Event Lifecycle

```
1. POST /events
   └─► Kafka: device.wakeup {event_id}
       └─► Consumer: finds all ACTIVE devices
           └─► Each device: POST /devices/{id}/location every 5s
               └─► Redis: live snapshot updated
                   └─► WebSocket: clients receive update every 2s

2. PUT /events/{id}/close
   └─► MongoDB: status = "closed"
   └─► Redis: key deleted
   └─► WebSocket: sends final snapshot → connection closed
   └─► Consumer tasks: detect "closed" → stop reporting
```
