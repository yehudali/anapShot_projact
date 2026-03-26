import { useState, useEffect } from 'react';
import { getDevices, createDevice, updateDevice, deleteDevice } from '../api/devices';
import { useAuth } from '../context/AuthContext';

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

  const fetchDevices = async () => {
    try {
      const data = await getDevices();
      setDevices(data.data || []);
    } catch {
      setError('Failed to load devices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    setError('');
    try {
      await createDevice(name, '');
      setName('');
      setShowCreate(false);
      await fetchDevices();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create device');
    } finally {
      setCreating(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const updates = {};
      if (editName) updates.name = editName;
      if (editState) updates.state = editState;
      await updateDevice(editDevice.id, updates);
      setEditDevice(null);
      await fetchDevices();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update device');
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
      setError(err.response?.data?.detail || 'Failed to activate devices');
    }
  };

  const handleDelete = async (deviceId) => {
    if (!window.confirm('Are you sure you want to delete this device?')) return;
    try {
      await deleteDevice(deviceId);
      await fetchDevices();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to delete device');
    }
  };

  const handleCopy = (apiKey) => {
    navigator.clipboard.writeText(apiKey);
    setCopied(apiKey);
    setTimeout(() => setCopied(null), 2000);
  };

  const openEdit = (device) => {
    setEditDevice(device);
    setEditName(device.name);
    setEditState(device.state);
  };

  const stateColors = {
    active: 'green',
    inactive: 'yellow',
    unreachable: 'red',
  };

  const formatDate = (dateStr) => new Date(dateStr).toLocaleString('he-IL');

  if (loading) {
    return <div className="page-loading">Loading devices...</div>;
  }

  return (
    <div className="page">
      <div className="page-header">
        <h2>Devices</h2>
        {isAdmin && (
          <div className="page-header-actions">
            <button className="btn btn-secondary" onClick={handleActivateAll}>
              Activate All
            </button>
            <button className="btn btn-primary" onClick={() => setShowCreate(!showCreate)}>
              {showCreate ? 'Cancel' : '+ Create Device'}
            </button>
          </div>
        )}
      </div>

      {error && <div className="error-message">{error}</div>}

      {showCreate && (
        <div className="card create-form">
          <h3>New Device</h3>
          <form onSubmit={handleCreate}>
            <div className="form-group">
              <label htmlFor="device-name">Device Name *</label>
              <input
                id="device-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter device name"
                required
                autoFocus
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={creating}>
              {creating ? 'Creating...' : 'Create Device'}
            </button>
          </form>
        </div>
      )}

      {editDevice && (
        <div className="modal-overlay" onClick={() => setEditDevice(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Edit Device</h3>
            <form onSubmit={handleUpdate}>
              <div className="form-group">
                <label htmlFor="edit-name">Name</label>
                <input
                  id="edit-name"
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label htmlFor="edit-state">State</label>
                <select
                  id="edit-state"
                  value={editState}
                  onChange={(e) => setEditState(e.target.value)}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setEditDevice(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>State</th>
              <th>API Key</th>
              <th>Created</th>
              <th>Last Seen</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {devices.length === 0 ? (
              <tr>
                <td colSpan={6} className="empty-row">No devices found</td>
              </tr>
            ) : (
              devices.map((device) => (
                <tr key={device.id}>
                  <td>{device.name}</td>
                  <td>
                    <span className={`badge badge-${stateColors[device.state] || 'gray'}`}>
                      {device.state.toUpperCase()}
                    </span>
                  </td>
                  <td>
                    <span className="api-key">
                      {device.api_key ? `${device.api_key.substring(0, 8)}...` : '—'}
                    </span>
                    {device.api_key && (
                      <button
                        className="btn btn-sm btn-secondary copy-btn"
                        onClick={() => handleCopy(device.api_key)}
                      >
                        {copied === device.api_key ? '✓ Copied' : 'Copy'}
                      </button>
                    )}
                  </td>
                  <td>{formatDate(device.created_at)}</td>
                  <td>{device.last_seen ? formatDate(device.last_seen) : '—'}</td>
                  <td className="actions">
                    {isAdmin && (
                      <>
                        <button className="btn btn-sm btn-secondary" onClick={() => openEdit(device)}>
                          Edit
                        </button>
                        <button className="btn btn-sm btn-danger" onClick={() => handleDelete(device.id)}>
                          Delete
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
