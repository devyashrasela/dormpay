import { NavLink } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import useWalletStore from '../../store/useWalletStore';
import { truncateAddress } from '../../utils/formatters';

const navItems = [
    { path: '/', label: 'Dashboard', icon: '🏠' },
    { path: '/send', label: 'Send', icon: '📤' },
    { path: '/receive', label: 'Receive', icon: '📥' },
    { path: '/history', label: 'History', icon: '📜' },
    { path: '/split-bills', label: 'Split Bill', icon: '✂️' },
    { path: '/analytics', label: 'Analytics', icon: '📊' },
    { path: '/chat', label: 'AI Chat', icon: '🤖' },
    { path: '/settings', label: 'Settings', icon: '⚙️' },
];

function Layout({ children }) {
    const { user, logout } = useAuth0();
    const { address, isConnected } = useWalletStore();

    return (
        <div className="min-h-screen flex bg-[var(--color-surface-900)]">
            {/* Sidebar */}
            <aside className="w-64 bg-[var(--color-surface-800)] border-r border-[var(--color-glass-border)] flex flex-col fixed h-full">
                {/* Logo */}
                <div className="p-6 border-b border-[var(--color-glass-border)]">
                    <h1 className="text-xl font-bold gradient-text">CampusWallet</h1>
                    <p className="text-xs text-[var(--color-text-muted)] mt-1">Algorand TestNet</p>
                </div>

                {/* Navigation */}
                <nav className="flex-1 py-4 overflow-y-auto">
                    {navItems.map(({ path, label, icon }) => (
                        <NavLink
                            key={path}
                            to={path}
                            end={path === '/'}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-6 py-3 text-sm transition-all duration-200 ${isActive
                                    ? 'text-[var(--color-primary-light)] bg-[var(--color-primary)]/10 border-r-2 border-[var(--color-primary)]'
                                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-700)]'
                                }`
                            }
                        >
                            <span className="text-lg">{icon}</span>
                            <span>{label}</span>
                        </NavLink>
                    ))}
                </nav>

                {/* User info */}
                <div className="p-4 border-t border-[var(--color-glass-border)]">
                    <div className="flex items-center gap-3 mb-3">
                        {user?.picture && (
                            <img
                                src={user.picture}
                                alt={user.name}
                                className="w-8 h-8 rounded-full"
                            />
                        )}
                        <div className="min-w-0">
                            <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                                {user?.name || user?.email}
                            </p>
                            {isConnected && (
                                <p className="text-xs text-[var(--color-text-muted)] truncate">
                                    {truncateAddress(address)}
                                </p>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
                        className="w-full text-sm text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 py-2 rounded-lg transition-colors"
                    >
                        Logout
                    </button>
                </div>
            </aside>

            {/* Main content */}
            <main className="flex-1 ml-64 p-8">
                <div className="max-w-6xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}

export default Layout;
