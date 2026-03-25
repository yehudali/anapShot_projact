# AnapShot — תוכנית עבודה לפרונטאנד

## מה המערכת עושה?

מערכת מודעות מצבית בזמן אמת. כשנוצר אירוע, כל המכשירים הפעילים מתעוררים ומשדרים
את מיקומם ה-GPS. המפקד רואה את כולם חיים על המפה — ומתעדכן כל 2 שניות.

**Stack מומלץ:** React + TypeScript + Vite

---

## מסכים במערכת

| מסך | מי רואה | תיאור |
|---|---|---|
| Login | כולם | כניסה עם שם משתמש וסיסמה |
| Dashboard (מפה) | ADMIN, MANAGER | מפה מלאה עם מיקומים חיים |
| ניהול אירועים | ADMIN, MANAGER | יצירה, סגירה, מעבר לאירוע |
| ניהול מכשירים | ADMIN בלבד | CRUD מכשירים + API Key |
| ניהול משתמשים | ADMIN בלבד | יצירת משתמשים + הגדרת תפקיד |

---

## חלוקה למשימות

---

### שלב 1 — הקמה ואימות (Auth)

#### משימה 1.1 — אתחול הפרויקט
- [ ] יצירת פרויקט עם `npm create vite@latest frontend -- --template react-ts`
- [ ] התקנת תלויות: `axios`, `react-router-dom`, `leaflet`, `react-leaflet`, `zustand`
- [ ] הגדרת `vite.config.ts` עם proxy ל-`http://localhost:8000`
- [ ] מבנה תיקיות ראשוני (ראה מבנה בסוף המסמך)
- [ ] קובץ `.env` עם `VITE_API_URL=http://localhost:8000`

#### משימה 1.2 — שכבת API (auth)
- [ ] יצירת `src/api/client.ts` — axios instance עם base URL מה-env
- [ ] הוספת interceptor שמצרף `Authorization: Bearer <token>` לכל בקשה אוטומטית
- [ ] יצירת `src/api/auth.ts` עם פונקציה `login(username, password)` שקוראת ל-`POST /api/v1/auth/login`
- [ ] שמירת ה-token ב-`localStorage` לאחר login מוצלח

#### משימה 1.3 — מסך Login
- [ ] דף `src/pages/Login.tsx` עם form: שדה username, שדה password, כפתור כניסה
- [ ] הצגת שגיאה ברורה אם הסיסמה שגויה (401 מהשרת)
- [ ] אחרי login מוצלח — redirect ל-`/events`
- [ ] אם כבר מחובר (token קיים) — redirect אוטומטי ישר ל-`/events`

#### משימה 1.4 — הגנה על routes (Auth Guard)
- [ ] יצירת component `src/components/PrivateRoute.tsx`
- [ ] אם אין token → redirect ל-`/login`
- [ ] אם יש token → מציג את ה-component הפנימי
- [ ] הגדרת כל ה-routes ב-`src/App.tsx` עם ה-guard

---

### שלב 2 — ניהול אירועים

#### משימה 2.1 — שכבת API (אירועים)
- [ ] יצירת `src/api/events.ts` עם:
  - `getEvents()` — GET `/api/v1/events`
  - `createEvent(name, description)` — POST `/api/v1/events`
  - `closeEvent(eventId)` — PUT `/api/v1/events/{id}/close`

#### משימה 2.2 — דף רשימת אירועים
- [ ] דף `src/pages/Events.tsx`
- [ ] טעינת כל האירועים בטעינת הדף
- [ ] טבלה עם עמודות: שם, סטטוס (ACTIVE/CLOSED), תאריך יצירה, כפתורים
- [ ] badge צבעוני: ירוק ל-ACTIVE, אפור ל-CLOSED
- [ ] לחיצה על שורה → מעבר ל-`/dashboard/{event_id}`
- [ ] כפתור "סגור אירוע" — גלוי רק ל-ADMIN, רק על אירועים ACTIVE

#### משימה 2.3 — יצירת אירוע חדש
- [ ] כפתור "צור אירוע" — גלוי רק ל-ADMIN
- [ ] Modal/form עם שדות: שם אירוע (חובה), תיאור (אופציונלי)
- [ ] שליחה → POST לשרת → רענון הרשימה
- [ ] הצגת הודעת הצלחה/שגיאה

---

### שלב 3 — Dashboard — מפה חיה

#### משימה 3.1 — חיבור WebSocket
- [ ] יצירת hook `src/hooks/useEventStream.ts`
- [ ] פתיחת חיבור: `ws://localhost:8000/ws/events/{eventId}?token={jwt}`
- [ ] קבלת הודעות כל 2 שניות בפורמט: `{ status, locations: [...] }`
- [ ] סגירת החיבור בצורה נקייה כשה-component יוצא מה-DOM (`cleanup`)
- [ ] ניהול סטטוס החיבור: `connecting | connected | disconnected`

#### משימה 3.2 — הגדרת המפה
- [ ] דף `src/pages/Dashboard.tsx`
- [ ] טעינת `react-leaflet` עם `MapContainer`, `TileLayer` (OpenStreetMap)
- [ ] מפה בגובה מלא: `height: 100vh`
- [ ] מיקום ברירת מחדל: מרכז ישראל (lat: 31.5, lng: 34.75, zoom: 8)

#### משימה 3.3 — סמנים (Markers) על המפה
- [ ] יצירת component `src/components/DeviceMarker.tsx`
- [ ] סמן לכל מכשיר לפי latitude/longitude
- [ ] Popup בלחיצה על סמן: שם מכשיר, זמן עדכון אחרון, דיוק
- [ ] עדכון מיקום הסמן בכל הודעת WebSocket (ללא reload המפה)
- [ ] סמן בצבע שונה אם המכשיר UNREACHABLE

#### משימה 3.4 — Sidebar
- [ ] Sidebar בצד שמאל ברוחב 280px
- [ ] רשימת כל המכשירים באירוע הנוכחי
- [ ] לכל מכשיר: שם, סטטוס, "עודכן לפני X שניות"
- [ ] לחיצה על מכשיר → המפה ממוקדת עליו (pan)
- [ ] אינדיקטור WebSocket: "מחובר 🟢" / "מתחבר..." / "נותק 🔴"
- [ ] כפתור "סגור אירוע" — גלוי רק ל-ADMIN

---

### שלב 4 — ניהול מכשירים

#### משימה 4.1 — שכבת API (מכשירים)
- [ ] יצירת `src/api/devices.ts` עם:
  - `getDevices(state?)` — GET `/api/v1/devices`
  - `createDevice(name, userId)` — POST `/api/v1/devices`
  - `updateDevice(id, data)` — PUT `/api/v1/devices/{id}`
  - `deleteDevice(id)` — DELETE `/api/v1/devices/{id}`

#### משימה 4.2 — דף ניהול מכשירים (ADMIN בלבד)
- [ ] דף `src/pages/Devices.tsx`
- [ ] טבלה עם עמודות: שם, סטטוס, תאריך יצירה, API Key, פעולות
- [ ] badge לסטטוס: ירוק (active), צהוב (inactive), אדום (unreachable)
- [ ] כפתור "העתק API Key" עם אנימציית copied ✓
- [ ] כפתור "ערוך" — פותח modal לשינוי שם וסטטוס
- [ ] כפתור "מחק" — עם dialog אישור לפני מחיקה
- [ ] כפתור "צור מכשיר" — form עם שם בלבד (user_id מהtoken)

---

### שלב 5 — ניהול משתמשים

#### משימה 5.1 — שכבת API (משתמשים)
- [ ] יצירת `src/api/users.ts` עם:
  - `getUsers()` — GET `/api/v1/users`
  - `createUser(username, password, role)` — POST `/api/v1/users`

#### משימה 5.2 — דף ניהול משתמשים (ADMIN בלבד)
- [ ] דף `src/pages/Users.tsx`
- [ ] טבלה עם עמודות: שם משתמש, תפקיד, תאריך יצירה
- [ ] badge לתפקיד: כחול (admin), ירוק (manager), אפור (device)
- [ ] כפתור "צור משתמש" — form עם: שם משתמש, סיסמה, בחירת תפקיד (dropdown)
- [ ] ולידציה: שם משתמש ≥ 3 תווים, סיסמה ≥ 6 תווים

---

### שלב 6 — UX ועיצוב

#### משימה 6.1 — ניווט ו-Layout
- [ ] Navbar עליון עם: לוגו AnapShot, לינקים לדפים לפי תפקיד, שם המשתמש, כפתור Logout
- [ ] Logout — מחיקת token מ-localStorage + redirect ל-login
- [ ] 404 page לנתיבים לא קיימים

#### משימה 6.2 — Loading & שגיאות
- [ ] Spinner/skeleton בזמן טעינת נתונים
- [ ] הודעות שגיאה ברורות (toast או alert) לכל פעולה שנכשלה
- [ ] הודעת הצלחה (toast) אחרי יצירה/עדכון/מחיקה

#### משימה 6.3 — הרשאות לפי תפקיד
- [ ] חילוץ תפקיד המשתמש מה-JWT token (decode בלי library — base64)
- [ ] הסתרת כפתורי יצירה/מחיקה ל-MANAGER
- [ ] הפניה ל-403 אם MANAGER מנסה להיכנס לדף ADMIN

#### משימה 6.4 — עיצוב
- [ ] ספריית UI: [shadcn/ui](https://ui.shadcn.com/) או Tailwind CSS
- [ ] תמיכה ב-Dark mode (אופציונלי)
- [ ] רספונסיב לטאבלט (לא חייב מובייל)

---

## חיבור לשרת — דוגמאות קוד

### Login
```typescript
// src/api/auth.ts
export const login = async (username: string, password: string) => {
  const { data } = await client.post('/api/v1/auth/login', { username, password });
  localStorage.setItem('token', data.data.token);
  return data;
};
```

### WebSocket
```typescript
// src/hooks/useEventStream.ts
const ws = new WebSocket(
  `ws://localhost:8000/ws/events/${eventId}?token=${localStorage.getItem('token')}`
);
ws.onmessage = (e) => {
  const { status, locations } = JSON.parse(e.data);
  // עדכון ה-state עם המיקומים
};
```

### מבנה Location מהשרת
```typescript
interface Location {
  device_id: string;
  latitude: number;
  longitude: number;
  timestamp: string;   // ISO string
  accuracy: number;    // בטמרים
}
```

---

## כל ה-Endpoints לפרונטאנד

| פעולה | Method + Path | הרשאה |
|---|---|---|
| כניסה | POST `/api/v1/auth/login` | ללא |
| רשימת אירועים | GET `/api/v1/events` | Bearer token |
| יצירת אירוע | POST `/api/v1/events` | ADMIN |
| סגירת אירוע | PUT `/api/v1/events/{id}/close` | ADMIN |
| רשימת מכשירים | GET `/api/v1/devices` | Bearer token |
| יצירת מכשיר | POST `/api/v1/devices` | ADMIN |
| עדכון מכשיר | PUT `/api/v1/devices/{id}` | ADMIN |
| מחיקת מכשיר | DELETE `/api/v1/devices/{id}` | ADMIN |
| רשימת משתמשים | GET `/api/v1/users` | ADMIN |
| יצירת משתמש | POST `/api/v1/users` | ADMIN |
| מיקומים חיים | WebSocket `/ws/events/{id}?token=` | JWT בquery |

---

## מבנה תיקיות מומלץ

```
frontend/
├── src/
│   ├── api/
│   │   ├── client.ts        # axios instance + interceptor
│   │   ├── auth.ts
│   │   ├── events.ts
│   │   ├── devices.ts
│   │   └── users.ts
│   ├── components/
│   │   ├── Map/
│   │   │   ├── MapView.tsx
│   │   │   └── DeviceMarker.tsx
│   │   ├── Sidebar.tsx
│   │   ├── Navbar.tsx
│   │   └── PrivateRoute.tsx
│   ├── hooks/
│   │   └── useEventStream.ts
│   ├── pages/
│   │   ├── Login.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Events.tsx
│   │   ├── Devices.tsx
│   │   └── Users.tsx
│   ├── store/
│   │   └── authStore.ts     # Zustand: token + user role
│   └── App.tsx              # Router + routes
├── .env
├── package.json
└── vite.config.ts
```

---

## סדר עבודה מומלץ

1. **שלב 1** — הקמה + Login → האפליקציה עולה ואפשר להתחבר
2. **שלב 2** — אירועים → רואים רשימה ואפשר לצור
3. **שלב 3** — מפה חיה → הפיצ'ר המרכזי עובד
4. **שלב 4** — מכשירים → ניהול מלא
5. **שלב 5** — משתמשים → ניהול מלא
6. **שלב 6** — עיצוב + הרשאות → מוכן לייצור
