import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getEvents, createEvent, closeEvent } from '../api/events';
import { useAuth } from '../context/AuthContext';
import { formatDate } from '../utils/time';

export default function Events() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all'); // 'all' | 'active' | 'closed'
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  const fetchEvents = useCallback(async () => {
    try {
      const data = await getEvents();
      setEvents(data.data || []);
      setError('');
    } catch {
      setError('שגיאה בטעינת האירועים');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchEvents, 30_000);
    return () => clearInterval(interval);
  }, [fetchEvents]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    setError('');
    try {
      const res = await createEvent(name.trim(), description.trim() || undefined);
      const newEventId = res?.data?.event_id;
      setName('');
      setDescription('');
      setShowCreate(false);
      await fetchEvents();
      // Navigate directly to dashboard after creating
      if (newEventId) navigate(`/dashboard/${newEventId}`);
    } catch (err) {
      setError(err.response?.data?.detail || 'שגיאה ביצירת האירוע');
    } finally {
      setCreating(false);
    }
  };

  const handleClose = async (eventId, eventName) => {
    if (!window.confirm(`לסגור את האירוע "${eventName}"?`)) return;
    try {
      await closeEvent(eventId);
      await fetchEvents();
    } catch (err) {
      setError(err.response?.data?.detail || 'שגיאה בסגירת האירוע');
    }
  };

  const filtered = events.filter((e) => {
    if (filter === 'active') return e.status === 'active';
    if (filter === 'closed') return e.status === 'closed';
    return true;
  });

  const activeCount = events.filter((e) => e.status === 'active').length;

  if (loading) {
    return <div className="page-loading"><span className="spinner" /> טוען אירועים...</div>;
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>אירועים</h2>
          {activeCount > 0 && (
            <span className="active-count-label">{activeCount} פעיל{activeCount > 1 ? 'ים' : ''} כעת</span>
          )}
        </div>
        <div className="page-header-actions">
          <div className="filter-tabs">
            {['all', 'active', 'closed'].map((f) => (
              <button
                key={f}
                className={`filter-tab${filter === f ? ' active' : ''}`}
                onClick={() => setFilter(f)}
              >
                {f === 'all' ? 'הכל' : f === 'active' ? 'פעיל' : 'סגור'}
              </button>
            ))}
          </div>
          {isAdmin && (
            <button className="btn btn-primary" onClick={() => setShowCreate(!showCreate)}>
              {showCreate ? 'ביטול' : '+ אירוע חדש'}
            </button>
          )}
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {showCreate && (
        <div className="card create-form">
          <h3>אירוע חדש</h3>
          <form onSubmit={handleCreate}>
            <div className="form-group">
              <label htmlFor="event-name">שם האירוע *</label>
              <input
                id="event-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="שם האירוע"
                required
                autoFocus
              />
            </div>
            <div className="form-group">
              <label htmlFor="event-desc">תיאור</label>
              <input
                id="event-desc"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="תיאור קצר (אופציונלי)"
              />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" className="btn btn-primary" disabled={creating || !name.trim()}>
                {creating ? <><span className="spinner spinner-sm" /> יוצר...</> : 'צור ועבור למפה'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>
                ביטול
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>שם</th>
              <th>תיאור</th>
              <th>סטטוס</th>
              <th>נוצר</th>
              <th>נסגר</th>
              <th>פעולות</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="empty-row">
                  {events.length === 0
                    ? 'אין אירועים — לחץ "+ אירוע חדש" כדי להתחיל'
                    : 'אין אירועים התואמים לסינון'}
                </td>
              </tr>
            ) : (
              filtered.map((event) => (
                <tr key={event.id} className={event.status === 'active' ? 'row-active' : ''}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {event.status === 'active' && <span className="live-dot" title="פעיל" />}
                      <strong>{event.name}</strong>
                    </div>
                  </td>
                  <td className="text-muted">{event.description || '—'}</td>
                  <td>
                    <span className={`badge badge-${event.status === 'active' ? 'green' : 'gray'}`}>
                      {event.status === 'active' ? 'פעיל' : 'סגור'}
                    </span>
                  </td>
                  <td className="text-muted">{formatDate(event.created_at)}</td>
                  <td className="text-muted">{event.closed_at ? formatDate(event.closed_at) : '—'}</td>
                  <td className="actions">
                    {event.status === 'active' && (
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => navigate(`/dashboard/${event.id}`)}
                      >
                        מפה חיה
                      </button>
                    )}
                    {isAdmin && event.status === 'active' && (
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleClose(event.id, event.name)}
                      >
                        סגור
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
