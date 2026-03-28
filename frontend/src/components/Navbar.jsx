import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { role, logout, isLoggedIn, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  if (!isLoggedIn) return null;

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <NavLink to="/events">SnapShot</NavLink>
      </div>
      <div className="navbar-links">
        <NavLink to="/events" className={({ isActive }) => isActive ? 'active' : ''}>
          Events
        </NavLink>
        <NavLink to="/devices" className={({ isActive }) => isActive ? 'active' : ''}>
          Devices
        </NavLink>
        {isAdmin && (
          <NavLink to="/users" className={({ isActive }) => isActive ? 'active' : ''}>
            Users
          </NavLink>
        )}
      </div>
      <div className="navbar-user">
        <span className="navbar-role">{role?.toUpperCase()}</span>
        <button className="btn btn-sm btn-secondary" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </nav>
  );
}
