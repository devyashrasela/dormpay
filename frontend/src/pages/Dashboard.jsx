import usePeraWallet from '../hooks/usePeraWallet';
import useWalletStore from '../store/useWalletStore';

function Dashboard() {
    const { connect, disconnect, isConnected } = usePeraWallet();
    const { address, balance } = useWalletStore();

    return (
        <div className="animate-fade-in">
            <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

            {/* Wallet Connection */}
            <div className="glass-card p-6 mb-6">
                <h2 className="text-lg font-semibold mb-4 text-[var(--color-text-secondary)]">Wallet</h2>
                {isConnected ? (
                    <div>
                        <p className="text-sm text-[var(--color-text-muted)] mb-1">Connected Address</p>
                        <p className="font-mono text-sm text-[var(--color-text-primary)] mb-4 break-all">{address}</p>
                        <div className="flex items-baseline gap-2 mb-4">
                            <span className="text-4xl font-bold gradient-text">{balance ?? '—'}</span>
                            <span className="text-[var(--color-text-muted)]">ALGO</span>
                        </div>
                        <button onClick={disconnect} className="btn-secondary text-sm">
                            Disconnect Wallet
                        </button>
                    </div>
                ) : (
                    <button onClick={connect} className="btn-primary">
                        🔗 Connect Pera Wallet
                    </button>
                )}
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <a href="/send" className="glass-card p-5 hover:border-[var(--color-primary)] transition-colors cursor-pointer block">
                    <span className="text-2xl mb-2 block">📤</span>
                    <h3 className="font-semibold">Send</h3>
                    <p className="text-sm text-[var(--color-text-muted)]">Send ALGO to anyone</p>
                </a>
                <a href="/receive" className="glass-card p-5 hover:border-[var(--color-primary)] transition-colors cursor-pointer block">
                    <span className="text-2xl mb-2 block">📥</span>
                    <h3 className="font-semibold">Receive</h3>
                    <p className="text-sm text-[var(--color-text-muted)]">Show your QR code</p>
                </a>
                <a href="/chat" className="glass-card p-5 hover:border-[var(--color-primary)] transition-colors cursor-pointer block">
                    <span className="text-2xl mb-2 block">🤖</span>
                    <h3 className="font-semibold">AI Chat</h3>
                    <p className="text-sm text-[var(--color-text-muted)]">Ask about your wallet</p>
                </a>
            </div>
        </div>
    );
}

export default Dashboard;
