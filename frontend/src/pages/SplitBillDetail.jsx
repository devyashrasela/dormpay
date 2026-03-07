import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import useAuthStore from '../store/useAuthStore';
import { useToast } from '../App';
import { formatAlgo, getInitials } from '../utils/formatters';

export default function SplitBillDetail() {
    const { id } = useParams();
    const { user } = useAuthStore();
    const showToast = useToast();
    const navigate = useNavigate();
    const [bill, setBill] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showAddMember, setShowAddMember] = useState(false);
    const [newUsername, setNewUsername] = useState('');
    const [newShare, setNewShare] = useState('');

    useEffect(() => { fetchDetail(); }, [id]);

    const fetchDetail = async () => {
        try {
            const res = await api.get(`/api/split-bills/${id}`);
            setBill(res.data.bill);
        } catch (err) {
            console.error('Failed to fetch bill:', err);
        } finally {
            setLoading(false);
        }
    };

    const addMember = async () => {
        if (!newUsername) return;
        try {
            await api.post(`/api/split-bills/${id}/members`, {
                members: [{ username: newUsername, share_amount: parseFloat(newShare) || 0 }],
            });
            setNewUsername('');
            setNewShare('');
            setShowAddMember(false);
            fetchDetail();
            showToast('Member added');
        } catch (err) {
            showToast(err.response?.data?.error || 'Failed to add member');
        }
    };

    const settleShare = async () => {
        try {
            const res = await api.post(`/api/split-bills/${id}/settle`, { txn_ids: [] });
            fetchDetail();
            showToast(`Settled ${formatAlgo(res.data.settled_amount)} ALGO`);
        } catch (err) {
            showToast(err.response?.data?.error || 'Failed to settle');
        }
    };

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="loading-spinner"></div></div>;
    if (!bill) return <div style={{ padding: 40, color: 'var(--color-muted)' }}>Bill not found.</div>;

    const myParticipant = bill.participants?.find((p) => p.user_id === user?.id);
    const outstanding = myParticipant ? parseFloat(myParticipant.share_amount) - parseFloat(myParticipant.paid_amount) : 0;

    return (
        <div>
            <button className="link-btn" onClick={() => navigate('/split-bills')} style={{ marginBottom: 20 }}>← Back to splits</button>
            <div className="section-label">— The Collective</div>

            {/* Bill Header */}
            <div className="hero-card" style={{ padding: '28px 32px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 300, marginBottom: 4 }}>
                            {bill.title}
                        </div>
                        {bill.description && <div style={{ fontSize: 13, color: 'var(--color-muted)', marginBottom: 8 }}>{bill.description}</div>}
                        <div style={{ fontSize: 11, color: 'var(--color-muted)' }}>
                            Created by @{bill.creator?.username}
                        </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 700 }}>
                            {formatAlgo(bill.total_amount)}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--color-muted)' }}>ALGO total</div>
                        <span className={`status-pill ${bill.status}`} style={{ marginTop: 8 }}>{bill.status}</span>
                    </div>
                </div>
            </div>

            <div className="split-cols" style={{ marginTop: 24 }}>
                {/* Participants */}
                <div>
                    <div className="split-col-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        Participants ({bill.participants?.length || 0})
                        {bill.status === 'active' && myParticipant?.is_admin && (
                            <button className="link-btn" onClick={() => setShowAddMember(!showAddMember)} style={{ fontSize: 9 }}>+ Add</button>
                        )}
                    </div>

                    {showAddMember && (
                        <div style={{ padding: '12px 0', borderBottom: '1px solid var(--color-border)' }}>
                            <input className="field-input sm" placeholder="@username" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} style={{ fontSize: 14, marginBottom: 8 }} />
                            <div style={{ display: 'flex', gap: 8 }}>
                                <input className="field-input sm" placeholder="share" type="number" value={newShare} onChange={(e) => setNewShare(e.target.value)} style={{ fontSize: 14 }} />
                                <button className="btn-lime" onClick={addMember}>Add</button>
                            </div>
                        </div>
                    )}

                    {bill.participants?.map((p) => (
                        <div key={p.id} className="participant-row" style={{ cursor: 'default' }}>
                            <div className="avatar xs">{getInitials(p.User?.display_name || p.User?.username)}</div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 13, fontWeight: 600 }}>
                                    {p.User?.display_name || p.User?.username}
                                    {p.is_admin && <span style={{ fontSize: 9, color: 'var(--color-lime)', background: 'var(--color-petrol)', padding: '1px 4px', marginLeft: 6 }}>ADMIN</span>}
                                </div>
                                <div style={{ fontSize: 10, color: 'var(--color-muted)', fontFamily: 'var(--font-mono)' }}>
                                    {formatAlgo(p.paid_amount)} / {formatAlgo(p.share_amount)} ALGO
                                </div>
                            </div>
                            <span className={`status-pill ${p.status}`}>{p.status}</span>
                        </div>
                    ))}
                </div>

                {/* Expenses & Actions */}
                <div>
                    <div className="split-col-label">Your Share</div>
                    <div className="split-result">
                        <div className="split-result-row">
                            <span>Your share</span>
                            <span className="split-mono">{formatAlgo(myParticipant?.share_amount || 0)} ALGO</span>
                        </div>
                        <div className="split-result-row">
                            <span>Paid</span>
                            <span className="split-mono">{formatAlgo(myParticipant?.paid_amount || 0)} ALGO</span>
                        </div>
                        <div className="split-result-row" style={{ fontWeight: 700 }}>
                            <span>Outstanding</span>
                            <span className="split-mono" style={{ color: outstanding > 0 ? 'var(--color-warning)' : 'var(--color-success)' }}>
                                {formatAlgo(outstanding)} ALGO
                            </span>
                        </div>
                    </div>

                    {bill.status === 'active' && outstanding > 0 && (
                        <button className="btn-primary" style={{ marginTop: 16 }} onClick={settleShare}>
                            Settle {formatAlgo(outstanding)} ALGO
                        </button>
                    )}

                    {/* Expenses */}
                    {bill.expenses?.length > 0 && (
                        <>
                            <div className="split-col-label" style={{ marginTop: 24 }}>Expenses</div>
                            {bill.expenses.map((exp) => (
                                <div key={exp.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--color-border)', fontSize: 13 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span>{exp.description}</span>
                                        <span className="split-mono">{formatAlgo(exp.amount)}</span>
                                    </div>
                                    <div style={{ fontSize: 10, color: 'var(--color-muted)', fontFamily: 'var(--font-mono)' }}>
                                        by @{exp.paidBy?.username}
                                    </div>
                                </div>
                            ))}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
