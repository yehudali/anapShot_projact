# AnapShot — Frontend Work Plan

## Overview

The frontend is a real-time situational awareness dashboard.
It connects to the backend via REST API + WebSocket to display live device locations on a map.

**Recommended Stack:** React + TypeScript + Vite

---

## Screens

### 1. Login Screen
- Username + password form
- Calls `POST /api/v1/auth/login`
- Stores JWT token (localStorage or sessionStorage)
- Redirects to dashboard

### 2. Dashboard (Main Map)
- Full-screen map (Leaflet.js or Google Maps)
- Connects to WebSocket `/ws/events/{event_id}?token=<jwt>`
- Shows live device markers, updated every 2 seconds
- Sidebar: list of devices with last-seen time
- Status badge: event ACTIVE / CLOSED

### 3. Events Management
- List of all events (GET /events)
- Create new event button (ADMIN only)
- Close event button (ADMIN only)
- Click event → opens live map for that event

### 4. Devices Management (ADMIN only)
- List of all devices
- Create / edit / delete device
- View device state (active / inactive / unreachable)
- Copy API Key button

### 5. Users Management (ADMIN only)
- List of users
- Create new user with role selection

---

## Task Breakdown

### Phase 1 — Setup & Auth (3–4 tasks)
- [ ] Initialize React + TypeScript + Vite project
- [ ] Set up React Router (Login → Dashboard routes)
- [ ] Build Login screen + API call + token storage
- [ ] Auth guard (redirect to login if no token)

### Phase 2 — Events & Map (4–5 tasks)
- [ ] Events list page (GET /events)
- [ ] Create event form (POST /events)
- [ ] Integrate Leaflet.js map component
- [ ] WebSocket hook: connect, receive, disconnect
- [ ] Render device markers on map from WebSocket data

### Phase 3 — Devices Management (3 tasks)
- [ ] Devices list page with state badges
- [ ] Create device form + show API Key in response
- [ ] Edit device (name, state) + delete

### Phase 4 — UX & Polish (3–4 tasks)
- [ ] Loading states and error handling
- [ ] Role-based UI hiding (MANAGER sees no create/delete buttons)
- [ ] Responsive design (tablet / mobile)
- [ ] Connection status indicator (WebSocket connected / reconnecting)

---

## API Integration Notes

### Token usage
```typescript
// Store after login
localStorage.setItem('token', response.data.token);

// Use in every request
axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
```

### WebSocket connection
```typescript
const ws = new WebSocket(
  `ws://localhost:8000/ws/events/${eventId}?token=${token}`
);
ws.onmessage = (e) => {
  const { status, locations } = JSON.parse(e.data);
  // update map markers
};
```

### Location data shape
```typescript
interface Location {
  device_id: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  accuracy: number;
}
```

---

## Suggested Folder Structure

```
frontend/
├── src/
│   ├── api/            # axios calls per resource (auth, devices, events)
│   ├── components/     # reusable UI components
│   │   ├── Map/
│   │   ├── DeviceMarker/
│   │   └── Sidebar/
│   ├── hooks/
│   │   └── useWebSocket.ts
│   ├── pages/
│   │   ├── Login.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Events.tsx
│   │   ├── Devices.tsx
│   │   └── Users.tsx
│   ├── store/          # state management (Zustand or Redux)
│   └── App.tsx
├── package.json
└── vite.config.ts
```

---

## Backend Endpoints Summary (for frontend devs)

| What | Method + Path | Auth Header |
|---|---|---|
| Login | POST `/api/v1/auth/login` | None |
| List events | GET `/api/v1/events` | Bearer token |
| Create event | POST `/api/v1/events` | Bearer token (ADMIN) |
| Close event | PUT `/api/v1/events/{id}/close` | Bearer token (ADMIN) |
| List devices | GET `/api/v1/devices` | Bearer token |
| Create device | POST `/api/v1/devices` | Bearer token (ADMIN) |
| Live locations | WebSocket `/ws/events/{id}?token=` | JWT in query |
