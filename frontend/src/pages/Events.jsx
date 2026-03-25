import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getEvents, createEvent, closeEvent } from '../api/events';
import { useAuth } from '../context/AuthContext';

export default function Events() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  const fetchEvents = async () => {
    try {
      const data = await getEvents();
      setEvents(data.data || []);
    } catch (err) {
      setError('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    setError('');
    try {
      await createEvent(name, description || undefined);
      setName('');
      setDescription('');
      setShowCreate(false);
      await fetchEvents();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create event');
    } finally {
      setCreating(false);
    }
  };

  const handleClose = async (eventId) => {
    if (!window.confirm('Are you sure you want to close this event?')) return;
    try {
      await closeEvent(eventId);
      await fetchEvents();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to close event');
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleString('he-IL');
  };

  if (loading) {
    return <div className="page-loading">Loading events...</div>;
  }

  return (
    <div className="page">
      <div className="page-header">
        <h2>Events</h2>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => setShowCreate(!showCreate)}>
            {showCreate ? 'Cancel' : '+ Create Event'}
          </button>
        )}
      </div>

      {error && <div className="error-message">{error}</div>}

      {showCreate && (
        <div className="card create-form">
          <h3>New Event</h3>
          <form onSubmit={handleCreate}>
            <div className="form-group">
              <label htmlFor="event-name">Event Name *</label>
              <input
                id="event-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter event name"
                required
                autoFocus
              />
            </div>
            <div className="form-group">
              <label htmlFor="event-desc">Description</label>
              <input
                id="event-desc"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={creating}>
              {creating ? 'Creating...' : 'Create Event'}
            </button>
          </form>
        </div>
      )}

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Status</th>
              <th>Created</th>
              <th>Closed</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {events.length === 0 ? (
              <tr>
                <td colSpan={5} className="empty-row">No events found</td>
              </tr>
            ) : (
              events.map((event) => (
                <tr key={event.id}>
                  <td>{event.name}</td>
                  <td>
                    <span className={`badge badge-${event.status === 'active' ? 'green' : 'gray'}`}>
                      {event.status.toUpperCase()}
                    </span>
                  </td>
                  <td>{formatDate(event.created_at)}</td>
                  <td>{event.closed_at ? formatDate(event.closed_at) : '—'}</td>
                  <td className="actions">
                    {event.status === 'active' && (
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => navigate(`/dashboard/${event.id}`)}
                      >
                        Live Map
                      </button>
                    )}
                    {isAdmin && event.status === 'active' && (
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleClose(event.id)}
                      >
                        Close
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
