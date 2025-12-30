import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { ScanSignalPage } from './pages/ScanSignalPage';
import { LoginPage } from './pages/LoginPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { useAuth } from './contexts/AuthContext';
import { setAuthToken } from './services/api';

function Navigation() {
  const location = useLocation();
  const { logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    setAuthToken(null);
    navigate('/login');
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <nav className="bg-binance-gray border-b border-binance-gray-border sticky top-0 z-50 backdrop-blur-sm bg-opacity-95">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo Section */}
          <Link
            to="/"
            className="flex items-center group transition-all duration-200 hover:scale-105"
          >
            <div className="relative flex items-center justify-center h-12 w-12 rounded-lg bg-gradient-to-br from-binance-yellow/20 to-binance-yellow/5 border border-binance-yellow/30 group-hover:border-binance-yellow/50 group-hover:bg-gradient-to-br group-hover:from-binance-yellow/30 group-hover:to-binance-yellow/10 transition-all duration-200">
              <img
                src="/logo.png"
                alt="Logo"
                className="h-full w-full object-contain filter brightness-110"
              />
            </div>
            <div className="ml-3 hidden sm:block">
              <div className="text-sm font-semibold text-binance-text">Binance Scan Signal</div>
              <div className="text-xs text-binance-text-secondary">Real-time Trading Signals</div>
            </div>
          </Link>

          {/* Navigation Menu */}
          <div className="flex items-center space-x-1">
            <button
              onClick={handleLogout}
              className="ml-4 px-4 py-2 rounded-md font-medium text-sm text-binance-text-secondary hover:text-binance-red hover:bg-binance-red/10 transition-all duration-200 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-binance-dark">
        <Navigation />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <ScanSignalPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;

