import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import useWalletStore from '../store/useWalletStore';
import useAuthStore from '../store/useAuthStore';
import usePeraWallet from '../hooks/usePeraWallet';
import api from '../api/axios';
import { formatAlgo, algoToINR, timeAgo, getInitials } from '../utils/formatters';

export default function Dashboard() {
    const { balance, loading: walletLoading } = useWalletStore();
    const { user } = useAuthStore();
    const { connect, connectedAddress } = usePeraWallet();
    const [transactions, setTransactions] = useState([]);
    const [summary, setSummary] = useState(null);

    useEffect(() => {
        fetchRecentTransactions();
        fetchSummary();
    }, []);

    const fetchRecentTransactions = async () => {
        try {
            const res = await api.get('/api/transactions/history?limit=5');
            setTransactions(res.data.transactions || []);
        } catch (err) {
            console.error('Failed to fetch transactions:', err);
        }
    };

    const fetchSummary = async () => {
        try {
            const res = await api.get('/api/analytics/summary');
            setSummary(res.data);
        } catch (err) {
            console.error('Failed to fetch summary:', err);
        }
    };

    const algoBalance = balance?.algo ?? 0;

    return (
        <div>
            <div className="section-label">— The Ledger</div>

            {/* Hero Balance */}
            <div className="hero-card">
                {connectedAddress ? (
                    <>
                        <div className="balance-amount">
                            <span className="balance-unit">Ξ</span>
                            {walletLoading ? '...' : formatAlgo(algoBalance)}
                            <span style={{ fontSize: 28, opacity: 0.3 }}> ALGO</span>
                        </div>
                        <div className="balance-convert">
                            ≈ ₹{algoToINR(algoBalance)} INR
                        </div>
                    </>
                ) : (
                    <>
                        <div className="balance-amount" style={{ fontSize: 36 }}>
                            Connect Wallet
                        </div>
                        <button
                            className="btn-primary"
                            style={{ marginTop: 16, width: 'auto', height: 44, padding: '0 28px' }}
                            onClick={connect}
                        >
                            Connect Pera Wallet
                        </button>
                    </>
                )}
            </div>

            {/* Stats Strip */}
            <div className="stat-strip">
                <div className="stat-cell">
                    <div className="stat-cell-label">Sent This Month</div>
                    <div className="stat-cell-value">
                        {formatAlgo(summary?.sent?.total || 0)} <span style={{ fontSize: 13, opacity: 0.5 }}>ALGO</span>
                    </div>
                </div>
                <div className="stat-cell">
                    <div className="stat-cell-label">Received</div>
                    <div className="stat-cell-value">
                        {formatAlgo(summary?.received?.total || 0)} <span style={{ fontSize: 13, opacity: 0.5 }}>ALGO</span>
                    </div>
                </div>
                <div className="stat-cell">
                    <div className="stat-cell-label">Transactions</div>
                    <div className="stat-cell-value">
                        {(summary?.sent?.count || 0) + (summary?.received?.count || 0)} <span style={{ fontSize: 13, opacity: 0.5 }}>total</span>
                    </div>
                </div>
            </div>

            {/* Action Grid */}
            <div className="action-grid">
                <Link to="/send" className="action-btn">
                    <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 9h14M11 4l5 5-5 5" /></svg>
                    <span>Send</span>
                </Link>
                <Link to="/receive" className="action-btn">
                    <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M16 9H2M7 4L2 9l5 5" /></svg>
                    <span>Receive</span>
                </Link>
                <Link to="/split-bills" className="action-btn">
                    <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 2v14M2 9h14" /></svg>
                    <span>Split</span>
                </Link>
                <Link to="/chat" className="action-btn">
                    <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 2h14v10H7l-5 4V2z" /></svg>
                    <span>AI Chat</span>
                </Link>
            </div>

            {/* Recent Transactions */}
            <div className="tx-section">
                <div className="tx-header">
                    <div className="section-label" style={{ margin: 0 }}>Recent Transactions</div>
                    <Link to="/history">View all →</Link>
                </div>
                <div className="tx-list">
                    {transactions.length === 0 ? (
                        <div style={{ padding: '24px 0', fontSize: 13, color: 'var(--color-muted)', fontStyle: 'italic', fontFamily: 'var(--font-serif)' }}>
                            No transactions yet. Send or receive ALGO to see activity here.
                        </div>
                    ) : (
                        transactions.map((tx) => {
                            const isSent = tx.sender_user_id === user?.id;
                            const otherName = isSent
                                ? tx.receiver?.display_name || tx.receiver?.username || tx.receiver_address?.slice(0, 8) + '...'
                                : tx.sender?.display_name || tx.sender?.username || tx.sender_address?.slice(0, 8) + '...';

                            return (
                                <div className="tx-row" key={tx.id}>
                                    <div className="avatar sm">{getInitials(otherName)}</div>
                                    <div className="tx-info">
                                        <div className="tx-name">{otherName}</div>
                                        {tx.note && <div className="tx-note">{tx.note}</div>}
                                    </div>
                                    <div>
                                        <div className={`tx-amount ${isSent ? 'neg' : 'pos'}`}>
                                            {isSent ? '−' : '+'}{formatAlgo(tx.amount)} ALGO
                                        </div>
                                        <div className="tx-time" style={{ textAlign: 'right' }}>{timeAgo(tx.created_at)}</div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}
