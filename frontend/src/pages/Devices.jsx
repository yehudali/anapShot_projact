import { useState, useEffect, useCallback } from 'react';
import { getDevices, createDevice, updateDevice, deleteDevice } from '../api/devices';
import { useAuth } from '../context/AuthContext';
import { formatDate } from '../utils/time';

const STATE_LABELS = { active: 'פעיל', inactive: 'לא פעיל', unreachable: 'לא זמין' };
const STATE_COLORS = { active: 'green', inactive: 'yellow', unreachable: 'red' };

export default function Devices() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editDevice, setEditDevice] = useState(null);
  const [name, setName] = useState('');
  const [editName, setEditName] = useState('');
  const [editState, setEditState] = useState('');
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(null);
  const { isAdmin } = useAuth();

  const fetchDevices = useCallback(async () => {
    try {
      const data = await getDevices();
      setDevices(data.data || []);
      setError('');
    } catch {
      setError('שגיאה בטעינת המכשירים');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDevices(); }, [fetchDevices]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    setError('');
    try {
      await createDevice(name.trim());
      setName('');
      setShowCreate(false);
      await fetchDevices();
    } catch (err) {
      setError(err.response?.data?.detail || 'שגיאה ביצירת המכשיר');
    } finally {
      setCreating(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const updates = {};
      if (editName.trim()) updates.name = editName.trim();
      if (editState) updates.state = editState;
      await updateDevice(editDevice.id, updates);
      setEditDevice(null);
      await fetchDevices();
    } catch (err) {
      setError(err.response?.data?.detail || 'שגיאה בעדכון המכשיר');
    }
  };

  const handleActivateAll = async () => {
    const inactive = devices.filter((d) => d.state !== 'active');
    if (inactive.length === 0) return;
    setError('');
    try {
      await Promise.all(inactive.map((d) => updateDevice(d.id, { state: 'active' })));
      await fetchDevices();
    } catch (err) {
      setError(err.response?.data?.detail || 'שגיאה בהפעלת המכשירים');
    }
  };

  const handleDelete = async (deviceId, deviceName) => {
    if (!window.confirm(`למחוק את "${deviceName}"?`)) return;
    try {
      await deleteDevice(deviceId);
      await fetchDevices();
    } catch (err) {
      setError(err.response?.data?.detail || 'שגיאה במחיקת המכשיר');
    }
  };

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleCopySetupLink = (device) => {
    const url = `${window.location.origin}/device-app/?device_id=${device.id}&api_key=${device.api_key}`;
    navigator.clipboard.writeText(url);
    setCopied(`link-${device.id}`);
    setTimeout(() => setCopied(null), 3000);
  };

  const openEdit = (device) => {
    setEditDevice(device);
    setEditName(device.name);
    setEditState(device.state === 'unreachable' ? 'active' : device.state);
  };

  const activeCount = devices.filter((d) => d.state === 'active').length;
  const hasInactive = devices.some((d) => d.state !== 'active');

  if (loading) {
    return <div className="page-loading"><span className="spinner" /> טוען מכשירים...</div>;
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>מכשירים</h2>
          {devices.length > 0 && (
            <span className="active-count-label">
              {activeCount} מתוך {devices.length} פעיל{activeCount !== 1 ? 'ים' : ''}
            </span>
          )}
        </div>
        {isAdmin && (
          <div className="page-header-actions">
            {hasInactive && (
              <button className="btn btn-secondary" onClick={handleActivateAll} title="הפעל את כל המכשירים הלא-פעילים">
                הפעל הכל
              </button>
            )}
            <button className="btn btn-primary" onClick={() => setShowCreate(!showCreate)}>
              {showCreate ? 'ביטול' : '+ מכשיר חדש'}
            </button>
          </div>
        )}
      </div>

      {error && <div className="error-message">{error}</div>}

      {showCreate && (
        <div className="card create-form">
          <h3>מכשיר חדש</h3>
          <form onSubmit={handleCreate}>
            <div className="form-group">
              <label htmlFor="device-name">שם המכשיר *</label>
              <input
                id="device-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="לדוגמה: יחידה 1"
                required
                autoFocus
              />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" className="btn btn-primary" disabled={creating || !name.trim()}>
                {creating ? <><span className="spinner spinner-sm" /> יוצר...</> : 'צור מכשיר'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>
                ביטול
              </button>
            </div>
          </form>
        </div>
      )}

      {editDevice && (
        <div className="modal-overlay" onClick={() => setEditDevice(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>עריכת מכשיר</h3>
            <form onSubmit={handleUpdate}>
              <div className="form-group">
                <label htmlFor="edit-name">שם</label>
                <input
                  id="edit-name"
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label htmlFor="edit-state">מצב</label>
                <select
                  id="edit-state"
                  value={editState}
                  onChange={(e) => setEditState(e.target.value)}
                >
                  <option value="active">פעיל</option>
                  <option value="inactive">לא פעיל</option>
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setEditDevice(null)}>
                  ביטול
                </button>
                <button type="submit" className="btn btn-primary">שמור</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>שם</th>
              <th>מצב</th>
              <th>Device ID</th>
              <th>API Key</th>
              <th>נוצר</th>
              <th>נראה לאחרונה</th>
              <th>פעולות</th>
            </tr>
          </thead>
          <tbody>
            {devices.length === 0 ? (
              <tr>
                <td colSpan={7} className="empty-row">
                  אין מכשירים — לחץ "+ מכשיר חדש" כדי להוסיף
                </td>
              </tr>
            ) : (
              devices.map((device) => (
                <tr key={device.id}>
                  <td><strong>{device.name}</strong></td>
                  <td>
                    <span className={`badge badge-${STATE_COLORS[device.state] || 'gray'}`}>
                      {STATE_LABELS[device.state] || device.state}
                    </span>
                  </td>
                  <td>
                    <span className="api-key">{device.id ? `...${device.id.slice(-8)}` : '—'}</span>
                    {device.id && (
                      <button
                        className="btn btn-sm btn-secondary copy-btn"
                        onClick={() => handleCopy(device.id, `id-${device.id}`)}
                      >
                        {copied === `id-${device.id}` ? '✓' : 'העתק'}
                      </button>
                    )}
                  </td>
                  <td>
                    <span className="api-key">
                      {device.api_key ? `${device.api_key.substring(0, 8)}...` : '—'}
                    </span>
                    {device.api_key && (
                      <button
                        className="btn btn-sm btn-secondary copy-btn"
                        onClick={() => handleCopy(device.api_key, `key-${device.id}`)}
                      >
                        {copied === `key-${device.id}` ? '✓' : 'העתק'}
                      </button>
                    )}
                  </td>
                  <td className="text-muted">{formatDate(device.created_at)}</td>
                  <td className="text-muted">{device.last_seen ? formatDate(device.last_seen) : '—'}</td>
                  <td className="actions">
                    {isAdmin && (
                      <>
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => handleCopySetupLink(device)}
                          title="העתק קישור הגדרה למכשיר"
                        >
                          {copied === `link-${device.id}` ? '✓ הועתק' : 'קישור הגדרה'}
                        </button>
                        <button className="btn btn-sm btn-secondary" onClick={() => openEdit(device)}>
                          ערוך
                        </button>
                        <button className="btn btn-sm btn-danger" onClick={() => handleDelete(device.id, device.name)}>
                          מחק
                        </button>
                      </>
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
