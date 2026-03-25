import { useState, useEffect } from 'react';
import { getUsers, createUser } from '../api/users';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('manager');
  const [creating, setCreating] = useState(false);

  const fetchUsers = async () => {
    try {
      const data = await getUsers();
      setUsers(data.data || []);
    } catch {
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (username.length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setCreating(true);
    setError('');
    try {
      await createUser(username, password, role);
      setUsername('');
      setPassword('');
      setRole('manager');
      setShowCreate(false);
      await fetchUsers();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create user');
    } finally {
      setCreating(false);
    }
  };

  const roleBadgeColor = {
    admin: 'blue',
    manager: 'green',
    device: 'gray',
  };

  const formatDate = (dateStr) => new Date(dateStr).toLocaleString('he-IL');

  if (loading) {
    return <div className="page-loading">Loading users...</div>;
  }

  return (
    <div className="page">
      <div className="page-header">
        <h2>Users</h2>
        <button className="btn btn-primary" onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? 'Cancel' : '+ Create User'}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {showCreate && (
        <div className="card create-form">
          <h3>New User</h3>
          <form onSubmit={handleCreate}>
            <div className="form-group">
              <label htmlFor="new-username">Username * (min 3 chars)</label>
              <input
                id="new-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                required
                minLength={3}
                autoFocus
              />
            </div>
            <div className="form-group">
              <label htmlFor="new-password">Password * (min 6 chars)</label>
              <input
                id="new-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required
                minLength={6}
              />
            </div>
            <div className="form-group">
              <label htmlFor="new-role">Role</label>
              <select
                id="new-role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
                <option value="device">Device</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary" disabled={creating}>
              {creating ? 'Creating...' : 'Create User'}
            </button>
          </form>
        </div>
      )}

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Username</th>
              <th>Role</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={3} className="empty-row">No users found</td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id}>
                  <td>{user.username}</td>
                  <td>
                    <span className={`badge badge-${roleBadgeColor[user.role] || 'gray'}`}>
                      {user.role.toUpperCase()}
                    </span>
                  </td>
                  <td>{formatDate(user.created_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
