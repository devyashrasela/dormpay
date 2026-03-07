import { useEffect, useState } from 'react';
import useAuthStore from '../store/useAuthStore';
import api from '../api/axios';
import { formatAlgo, formatDate, shortenTxId } from '../utils/formatters';
import { useToast } from '../App';

export default function History() {
    const { user } = useAuthStore();
    const showToast = useToast();
    const [transactions, setTransactions] = useState([]);
    const [filter, setFilter] = useState('all');
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchHistory();
    }, [filter, page]);

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/api/transactions/history?filter=${filter}&page=${page}&limit=15`);
            setTransactions(res.data.transactions || []);
            setPagination(res.data.pagination || {});
        } catch (err) {
            console.error('Failed to fetch history:', err);
        } finally {
            setLoading(false);
        }
    };

    const copyTxId = (txId) => {
        navigator.clipboard.writeText(txId);
        showToast('Hash copied: ' + shortenTxId(txId));
    };

    return (
        <div>
            <div className="section-label">— The Archive</div>

            <div className="filter-bar">
                {['all', 'sent', 'received'].map((f) => (
                    <button
                        key={f}
                        className={`filter-tag ${filter === f ? 'active' : ''}`}
                        onClick={() => { setFilter(f); setPage(1); }}
                    >
                        {f}
                    </button>
                ))}
            </div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                    <div className="loading-spinner"></div>
                </div>
            ) : transactions.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', fontSize: 13, color: 'var(--color-muted)', fontStyle: 'italic', fontFamily: 'var(--font-serif)' }}>
                    No transactions found.
                </div>
            ) : (
                <>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Entity</th>
                                <th>Hash</th>
                                <th>Amount</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {transactions.map((tx) => {
                                const isSent = tx.sender_user_id === user?.id;
                                const otherName = isSent
                                    ? tx.receiver?.display_name || tx.receiver?.username || tx.receiver_address?.slice(0, 8)
                                    : tx.sender?.display_name || tx.sender?.username || tx.sender_address?.slice(0, 8);

                                return (
                                    <tr key={tx.id}>
                                        <td className="td-date">{formatDate(tx.created_at)}</td>
                                        <td className="td-entity">{otherName}</td>
                                        <td className="td-hash" onClick={() => copyTxId(tx.txn_id)} title="Click to copy">
                                            {shortenTxId(tx.txn_id)}
                                        </td>
                                        <td className={`td-amount ${isSent ? 'neg' : 'pos'}`}>
                                            {isSent ? '−' : '+'}{formatAlgo(tx.amount)} ALGO
                                        </td>
                                        <td>
                                            <span className={`status-pill ${tx.status}`}>{tx.status}</span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>

                    {/* Pagination */}
                    {pagination.pages > 1 && (
                        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 24 }}>
                            {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((p) => (
                                <button
                                    key={p}
                                    className={`filter-tag ${page === p ? 'active' : ''}`}
                                    onClick={() => setPage(p)}
                                    style={{ minWidth: 32, textAlign: 'center', padding: '6px 10px' }}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
