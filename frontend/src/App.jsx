import { Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Book from './pages/Book';
import MyBookings from './pages/MyBookings';
import Admin from './pages/Admin';
import Login from './pages/Login';
import Callback from './pages/Callback';

function ProtectedRoute({ children }) {
  const { user, ready } = useAuth();
  const location = useLocation();
  if (!ready) return <p style={{ color: 'var(--text-muted)', padding: '2rem' }}>Loading...</p>;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}

export default function App() {
  const { user, logout, ready } = useAuth();

  return (
    <div className="app-shell">
      {user && (
        <nav className="nav">
          <NavLink to="/" end>Book Shuttle</NavLink>
          <NavLink to="/my-bookings">My Bookings</NavLink>
          <NavLink to="/admin">Admin</NavLink>
          <div className="nav-user">
            <span>{user.name}</span>
            <button type="button" className="btn-secondary" onClick={logout}>Log out</button>
          </div>
        </nav>
      )}

      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/callback" element={<Callback />} />
        <Route path="/logout-callback" element={<Navigate to="/login" replace />} />
        <Route path="/" element={<ProtectedRoute><Book /></ProtectedRoute>} />
        <Route path="/my-bookings" element={<ProtectedRoute><MyBookings /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
        <Route path="*" element={ready && !user ? <Navigate to="/login" replace /> : <Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
