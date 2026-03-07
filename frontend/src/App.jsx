import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { setTokenGetter } from './api/axios';
import useAuthStore from './store/useAuthStore';
import Layout from './components/Layout/Layout';

// Pages
import Dashboard from './pages/Dashboard';
import Send from './pages/Send';
import Receive from './pages/Receive';
import History from './pages/History';
import SplitBill from './pages/SplitBill';
import SplitBillDetail from './pages/SplitBillDetail';
import Analytics from './pages/Analytics';
import AIChat from './pages/AIChat';
import Settings from './pages/Settings';

function App() {
  const { isAuthenticated, isLoading, user, getAccessTokenSilently, loginWithRedirect } = useAuth0();
  const { setUser, clearUser, setLoading } = useAuthStore();

  // Set up token getter for Axios
  useEffect(() => {
    if (isAuthenticated) {
      setTokenGetter(() =>
        getAccessTokenSilently({
          authorizationParams: {
            audience: import.meta.env.VITE_AUTH0_AUDIENCE,
          },
        })
      );
    }
  }, [isAuthenticated, getAccessTokenSilently]);

  // Sync Auth0 state with Zustand
  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated && user) {
        setUser(user);
      } else {
        clearUser();
      }
    }
    setLoading(isLoading);
  }, [isAuthenticated, isLoading, user, setUser, clearUser, setLoading]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-surface-900)]">
        <div className="text-center animate-fade-in">
          <div className="w-12 h-12 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[var(--color-text-secondary)]">Loading CampusWallet...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-surface-900)]">
        <div className="glass-card p-10 text-center max-w-md mx-4 animate-slide-up">
          <h1 className="text-4xl font-bold gradient-text mb-3">CampusWallet</h1>
          <p className="text-[var(--color-text-secondary)] mb-8">
            Send & receive ALGO within your campus community
          </p>
          <button
            onClick={() => loginWithRedirect()}
            className="btn-primary w-full text-lg py-4"
          >
            🔐 Login with Auth0
          </button>
          <p className="text-[var(--color-text-muted)] text-sm mt-4">
            Powered by Algorand TestNet
          </p>
        </div>
      </div>
    );
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/send" element={<Send />} />
        <Route path="/receive" element={<Receive />} />
        <Route path="/history" element={<History />} />
        <Route path="/split-bills" element={<SplitBill />} />
        <Route path="/split-bills/:id" element={<SplitBillDetail />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/chat" element={<AIChat />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

export default App;
