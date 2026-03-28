import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import PrivateRoute from './components/PrivateRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Events from './pages/Events';
import Dashboard from './pages/Dashboard';
import Devices from './pages/Devices';
import Users from './pages/Users';

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<PrivateRoute><Layout /></PrivateRoute>}>
              <Route path="/events" element={<Events />} />
              <Route path="/dashboard/:eventId" element={<Dashboard />} />
              <Route path="/devices" element={<Devices />} />
              <Route
                path="/users"
                element={
                  <PrivateRoute roles={['admin']}>
                    <Users />
                  </PrivateRoute>
                }
              />
            </Route>
            <Route path="*" element={<Navigate to="/events" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
