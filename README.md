# AnapShot — Real-Time Situational Awareness

מערכת מעקב GPS בזמן אמת. כשנפתח אירוע — כל המכשירים הפעילים מקבלים Push notification, מתחילים לדווח מיקום, והמפה מתעדכנת חי.

---

## סביבות

| סביבה | פרטים |
|---|---|
| **Production** | OpenShift Developer Sandbox (Red Hat) — HTTPS אוטומטי |
| **Development** | Docker Compose — מקומי עם Kafka + GPS simulator |

---

## שימוש מהיר — Production

### URLs (אחרי `oc get routes`)
| שירות | URL |
|---|---|
| Frontend (מפה + ניהול) | `https://frontend-route-<namespace>.apps.sandbox...` |
| Backend API + Swagger | `https://fastapi-route-<namespace>.apps.sandbox.../docs` |
| Device PWA (מובייל) | `https://fastapi-route-.../device-app/` |

### הגדרה ראשונית (פעם אחת)
```bash
# 1. צור admin
curl -X POST https://<fastapi-url>/api/v1/auth/bootstrap \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "yourpassword"}'
# → {"token": "eyJ..."}

# 2. צור device
curl -X POST https://<fastapi-url>/api/v1/devices \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "Unit-1", "state": "active"}'
# → {"id": "...", "api_key": "..."}  ← שמור את ה-api_key!
```

### חיבור מכשיר (מובייל)
1. פתח `https://<fastapi-url>/device-app/` בטלפון
2. הכנס `device_id` + `api_key`
3. לחץ **Subscribe to Push** → אשר הרשאה
4. המכשיר ידווח מיקום אוטומטית כשנפתח אירוע

### פתיחת אירוע
```bash
curl -X POST https://<fastapi-url>/api/v1/events \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "Event Alpha"}'
```
→ כל המכשירים הפעילים מקבלים Push → מתחילים לדווח → המפה מתעדכנת חי.

---

## פריסה ל-OpenShift

```bash
# Login (מ-sandbox console → Copy Login Command)
oc login --token=<token> --server=<server>

# פריסה
oc apply -f k8s/secret.yaml
oc apply -f k8s/redis/
oc apply -f k8s/fastapi/
oc apply -f k8s/frontend/

# בדיקה
oc get pods        # כל ה-pods Running
oc get routes      # URLs הציבוריים
```

### `k8s/secret.yaml` — ערכים נדרשים
| שדה | מקור |
|---|---|
| `MONGO_URL` | MongoDB Atlas → Connect → connection string |
| `SECRET_KEY` | `python -c "import secrets; print(secrets.token_hex(32))"` |
| `VAPID_PRIVATE_KEY` / `VAPID_PUBLIC_KEY` | `pip install py-vapid && vapid --gen` |
| `REDIS_URL` | השאר `redis://redis-service:6379` |
| `KAFKA_BOOTSTRAP_SERVERS` | השאר ריק (Kafka לא נדרש ב-production) |

---

## פיתוח מקומי

```bash
# הרצה בסיסית (ללא simulator)
docker compose up --build

# עם GPS simulator (Kafka-based)
docker compose --profile dev up --build
```

| שירות | URL |
|---|---|
| FastAPI Swagger | http://localhost:8000/docs |
| Frontend | http://localhost:5173 |
| Kafka UI | http://localhost:8080 |

---

## ארכיטקטורה

```
[Mobile Device PWA]
       │  Push notification (VAPID)
       ▼
[FastAPI :8000] ──── MongoDB Atlas (events, devices, history)
       │         ──── Redis (live snapshot per event)
       │
[WebSocket /ws/events/{id}]
       │
[Frontend :5173 — Leaflet map]
```

**זרימת אירוע:**
1. `POST /events` → שמירה ב-MongoDB → Push לכל המכשירים הפעילים
2. כל מכשיר → `POST /devices/{id}/location` כל 5 שניות
3. מיקום → Redis (live) + MongoDB (היסטוריה)
4. WebSocket → קורא Redis כל 2 שניות → שולח לפרונט
5. `PUT /events/{id}/close` → Redis מנוקה → WebSocket נסגר

---

## API Reference

### Auth
| Method | Path | Auth |
|---|---|---|
| POST | `/api/v1/auth/login` | ללא |
| POST | `/api/v1/auth/bootstrap` | ללא (נעול אחרי יוזר ראשון) |

### Devices
| Method | Path | Auth |
|---|---|---|
| POST | `/api/v1/devices` | ADMIN |
| GET | `/api/v1/devices` | ADMIN, MANAGER |
| PUT | `/api/v1/devices/{id}` | ADMIN |
| DELETE | `/api/v1/devices/{id}` | ADMIN |
| POST | `/api/v1/devices/{id}/location` | `X-Api-Key` header |
| GET | `/api/v1/devices/vapid-public-key` | ללא |
| PUT | `/api/v1/devices/{id}/push-subscription` | `X-Api-Key` header |

### Events
| Method | Path | Auth |
|---|---|---|
| POST | `/api/v1/events` | ADMIN |
| GET | `/api/v1/events` | ADMIN, MANAGER |
| PUT | `/api/v1/events/{id}/close` | ADMIN |

### WebSocket
```
wss://<host>/ws/events/{event_id}?token=<jwt>
```
פלט כל 2 שניות:
```json
{
  "status": "active",
  "locations": [
    {"device_id": "...", "latitude": 31.5, "longitude": 34.8, "timestamp": "...", "accuracy": 5.0}
  ]
}
```

---

## מה חסר / שלבים הבאים

- [ ] עמוד ניהול מכשירים בפרונט (כרגע רק דרך API)
- [ ] הצגת שם מכשיר על המפה (כרגע רק נקודה)
- [ ] התראה כשמכשיר עובר למצב UNREACHABLE
- [ ] תמיכה ב-iOS (Safari דורש PWA מותקן מה-homescreen לפני Push)
- [ ] Horizontal scaling (multiple FastAPI pods + shared Redis)
