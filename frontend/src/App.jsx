import { useEffect, useState, createContext, useContext, useCallback } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { setTokenGetter } from './api/axios';
import useAuthStore from './store/useAuthStore';
import useWalletStore from './store/useWalletStore';
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
import LandingPage from './pages/LandingPage';
import DormDrop from './pages/DormDrop';
import logo from './assets/logo.svg';

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

// LoginPage is now replaced by LandingPage component

// Loading screen
function LoadingScreen() {
  return (
    <div className="loading-screen">
      <div className="login-logo" style={{ marginBottom: 0 }}>
        <div className="logo-icon-wrap">
          <img src={logo} alt="DormPay" />
        </div>
        <span className="logo-text">DormPay</span>
      </div>
      <div className="loading-spinner"></div>
    </div>
  );
}

export default function App() {
  const { isAuthenticated, isLoading, user, getAccessTokenSilently } = useAuth0();
  const { syncUser, isProfileSynced } = useAuthStore();
  const { connectedAddress, setConnectedAddress } = useWalletStore();

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

  // Restore wallet address from backend profile if not already connected
  // but NOT if user explicitly disconnected
  useEffect(() => {
    const { manuallyDisconnected } = useWalletStore.getState();
    if (isProfileSynced && !connectedAddress && !manuallyDisconnected) {
      const backendUser = useAuthStore.getState().user;
      if (backendUser?.wallet_address) {
        setConnectedAddress(backendUser.wallet_address);
      }
    }
  }, [isProfileSynced, connectedAddress]);

  if (isLoading) return <LoadingScreen />;
  if (!isAuthenticated) return <LandingPage />;

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
          <Route path="/dormdrop" element={<DormDrop />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </ToastProvider>
  );
}
