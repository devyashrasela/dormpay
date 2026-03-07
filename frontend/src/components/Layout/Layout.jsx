import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import useAuthStore from '../../store/useAuthStore';
import useWalletStore from '../../store/useWalletStore';
import api from '../../api/axios';
import { getInitials } from '../../utils/formatters';

const navItems = [
    { path: '/', label: 'Dashboard', icon: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1" y="1" width="6" height="6" /><rect x="9" y="1" width="6" height="6" /><rect x="1" y="9" width="6" height="6" /><rect x="9" y="9" width="6" height="6" /></svg> },
    { path: '/history', label: 'The Archive', icon: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="2" y1="4" x2="14" y2="4" /><line x1="2" y1="8" x2="14" y2="8" /><line x1="2" y1="12" x2="14" y2="12" /></svg> },
    { path: '/send', label: 'Send', icon: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 8h12M10 4l4 4-4 4" /></svg> },
    { path: '/split-bills', label: 'Split Bill', icon: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 2v12M2 8h12" /></svg> },
    { path: '/receive', label: 'Receive', icon: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M16 9H2M7 4L2 9l5 5" /></svg> },
    { path: '/analytics', label: 'Analytics', icon: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="8" width="3" height="6" /><rect x="6.5" y="4" width="3" height="10" /><rect x="11" y="2" width="3" height="12" /></svg> },
    { path: '/chat', label: 'AI Chat', icon: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 2h12v9H6l-4 3V2z" /></svg> },
    { path: '/settings', label: 'Settings', icon: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="3" /><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.5 1.5M11.5 11.5L13 13M13 3l-1.5 1.5M4.5 11.5L3 13" /></svg> },
];

export default function Layout({ children }) {
    const { user: auth0User, logout } = useAuth0();
    const { user } = useAuthStore();
    const location = useLocation();

    const displayName = user?.display_name || auth0User?.name || 'User';
    const username = user?.username || auth0User?.nickname || 'user';
    const initials = getInitials(displayName);

    return (
        <div className="shell">
            {/* LEFT RAIL */}
            <div className="left-rail">
                <div className="logo">
                    <span className="logo-dot"></span>
                    DormPay
                </div>

                <nav className="nav">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                            end={item.path === '/'}
                        >
                            {item.icon}
                            {item.label}
                        </NavLink>
                    ))}
                </nav>

                <div className="profile-zone">
                    <div className="profile-chip">
                        <div className="avatar">{initials}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</div>
                            <div style={{ fontSize: 11, color: 'var(--color-muted)', fontFamily: 'var(--font-mono)' }}>@{username}</div>
                        </div>
                        <button
                            onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
                            style={{ background: 'none', border: '1px solid var(--color-border)', width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                            title="Sign out"
                        >
                            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 2H3v12h3M11 4l4 4-4 4M7 8h8" /></svg>
                        </button>
                    </div>
                </div>
            </div>

            {/* CENTER STAGE */}
            <div className="center-stage">
                {children}
            </div>

            {/* RIGHT RAIL */}
            <RightRail />
        </div>
    );
}

// Right rail with dynamic quick actions
function RightRail() {
    const { connectedAddress } = useWalletStore();
    const [hasTxns, setHasTxns] = useState(false);
    const [notifications, setNotifications] = useState([]);

    useEffect(() => {
        checkTransactions();
        fetchNotifications();
    }, []);

    const checkTransactions = async () => {
        try {
            const res = await api.get('/api/transactions/history?limit=1');
            setHasTxns((res.data.transactions || []).length > 0);
        } catch { /* ignore */ }
    };

    const fetchNotifications = async () => {
        try {
            const res = await api.get('/api/notifications?limit=5');
            setNotifications(res.data.notifications || []);
        } catch { /* ignore */ }
    };

    const walletConnected = !!connectedAddress;
    const firstPaymentDone = hasTxns;
    const allDone = walletConnected && firstPaymentDone;

    return (
        <div className="right-rail">
            {/* Notifications */}
            <div className="section-label">
                <span className="pulse-dot"></span>Notifications
            </div>

            {notifications.length > 0 ? (
                notifications.map((n) => (
                    <div key={n.id} className="feed-item">
                        <div className="feed-text">{n.message}</div>
                        <div className="feed-meta">{n.title}</div>
                    </div>
                ))
            ) : (
                <div className="feed-item">
                    <div className="feed-text" style={{ color: 'var(--color-muted)', fontStyle: 'italic', fontFamily: 'var(--font-serif)' }}>
                        No notifications yet
                    </div>
                </div>
            )}

            {/* Quick Actions */}
            <div className="pending-card">
                <div className="pending-label">
                    {allDone ? 'All Set!' : 'Quick Actions'}
                </div>

                {allDone ? (
                    <div style={{ fontSize: 12, color: 'var(--color-cream)', opacity: 0.8 }}>
                        You're all set! 🎉 Start splitting bills and sending payments.
                    </div>
                ) : (
                    <>
                        {!walletConnected && (
                            <div className="pending-item">
                                <span>Connect Pera Wallet</span>
                                <NavLink to="/settings" style={{ color: 'var(--color-lime)', fontSize: 12, textDecoration: 'none' }}>→</NavLink>
                            </div>
                        )}
                        {!firstPaymentDone && (
                            <div className="pending-item">
                                <span>Send your first payment</span>
                                <NavLink to="/send" style={{ color: 'var(--color-lime)', fontSize: 12, textDecoration: 'none' }}>→</NavLink>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
