import { useEffect, useState, createContext, useContext, useCallback } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { setTokenGetter } from './api/axios';
import useAuthStore from './store/useAuthStore';
import Layout from './components/Layout/Layout';
import Dashboard from './pages/Dashboard';
import Send from './pages/Send';
import Receive from './pages/Receive';
import History from './pages/History';
import SplitBill from './pages/SplitBill';
import SplitBillDetail from './pages/SplitBillDetail';
import Analytics from './pages/Analytics';
import AIChat from './pages/AIChat';
import Settings from './pages/Settings';

// Toast context
const ToastContext = createContext();

export function useToast() {
  return useContext(ToastContext);
}

function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  }, []);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      {toast && (
        <div className="toast">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 6l3 3 7-7" /></svg>
          <span>{toast}</span>
        </div>
      )}
    </ToastContext.Provider>
  );
}

// Login page
function LoginPage() {
  const { loginWithRedirect } = useAuth0();

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <span className="logo-dot" style={{ width: 10, height: 10 }}></span>
          DormPay
        </div>
        <p className="login-subtitle">The Ledger — Student Payments on Algorand</p>
        <button className="btn-primary" onClick={() => loginWithRedirect()}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 8h12M10 4l4 4-4 4" /></svg>
          Sign In
        </button>
      </div>
    </div>
  );
}

// Loading screen
function LoadingScreen() {
  return (
    <div className="loading-screen">
      <div className="login-logo" style={{ marginBottom: 0 }}>
        <span className="logo-dot" style={{ width: 10, height: 10 }}></span>
        DormPay
      </div>
      <div className="loading-spinner"></div>
    </div>
  );
}

export default function App() {
  const { isAuthenticated, isLoading, user, getAccessTokenSilently } = useAuth0();
  const { syncUser, isProfileSynced } = useAuthStore();

  // Set token getter for axios interceptor
  useEffect(() => {
    if (isAuthenticated) {
      setTokenGetter(getAccessTokenSilently);
    }
  }, [isAuthenticated, getAccessTokenSilently]);

  // Sync user profile with backend after login
  useEffect(() => {
    if (isAuthenticated && user && !isProfileSynced) {
      syncUser(user);
    }
  }, [isAuthenticated, user, isProfileSynced]);

  if (isLoading) return <LoadingScreen />;
  if (!isAuthenticated) return <LoginPage />;

  return (
    <ToastProvider>
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
    </ToastProvider>
  );
}
