import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useToast } from '../App';
import { formatAlgo, timeAgo, getInitials } from '../utils/formatters';

export default function SplitBill() {
    const [bills, setBills] = useState([]);
    const [showCreate, setShowCreate] = useState(false);
    const [loading, setLoading] = useState(true);
    const showToast = useToast();
    const navigate = useNavigate();

    useEffect(() => { fetchBills(); }, []);

    const fetchBills = async () => {
        try {
            const res = await api.get('/api/split-bills');
            setBills(res.data.bills || []);
        } catch (err) {
            console.error('Failed to fetch bills:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <div className="section-label">— The Collective</div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 24, fontWeight: 300 }}>Split Bills</div>
                <button className="btn-primary" style={{ width: 'auto', height: 40, padding: '0 20px', fontSize: 10 }} onClick={() => setShowCreate(true)}>
                    + New Split
                </button>
            </div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="loading-spinner"></div></div>
            ) : bills.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', fontSize: 13, color: 'var(--color-muted)', fontStyle: 'italic', fontFamily: 'var(--font-serif)' }}>
                    No split bills yet. Create one to split expenses with friends.
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {bills.map((bill) => (
                        <Link
                            key={bill.id}
                            to={`/split-bills/${bill.id}`}
                            style={{ textDecoration: 'none', color: 'inherit' }}
                        >
                            <div className="settings-card" style={{ cursor: 'pointer', transition: 'background 0.12s' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400, marginBottom: 4 }}>
                                            {bill.title}
                                        </div>
                                        <div style={{ fontSize: 11, color: 'var(--color-muted)' }}>
                                            by @{bill.creator?.username} · {bill.participants?.length || 0} participants
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 700 }}>
                                            {formatAlgo(bill.total_amount)} <span style={{ fontSize: 11, opacity: 0.5 }}>ALGO</span>
                                        </div>
                                        <span className={`status-pill ${bill.status}`}>{bill.status}</span>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}

            {/* Create Modal */}
            {showCreate && <CreateSplitModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); fetchBills(); showToast('Split bill created'); }} />}
        </div>
    );
}

function CreateSplitModal({ onClose, onCreated }) {
    const [title, setTitle] = useState('');
    const [totalAmount, setTotalAmount] = useState('');
    const [loading, setLoading] = useState(false);

    const handleCreate = async () => {
        if (!title || !totalAmount) return;
        setLoading(true);
        try {
            await api.post('/api/split-bills', {
                title,
                total_amount: parseFloat(totalAmount),
                asset_type: 'ALGO',
            });
            onCreated();
        } catch (err) {
            console.error('Create split error:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal">
                <div className="modal-header">
                    <span className="modal-title">New Split Bill</span>
                    <button className="modal-close" onClick={onClose}>✕</button>
                </div>
                <div className="modal-body">
                    <div className="field-group">
                        <label className="field-label">Title</label>
                        <div className="field-input-wrap">
                            <input className="field-input" placeholder="Dinner at campus café" value={title} onChange={(e) => setTitle(e.target.value)} />
                        </div>
                    </div>
                    <div className="field-group">
                        <label className="field-label">Total Amount</label>
                        <input className="amount-input" style={{ fontSize: 40 }} placeholder="0.00" type="number" value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} />
                    </div>
                    <button className="btn-primary" onClick={handleCreate} disabled={loading || !title || !totalAmount} style={{ marginTop: 12 }}>
                        {loading ? 'Creating...' : 'Create Split Bill'}
                    </button>
                </div>
            </div>
        </div>
    );
}
