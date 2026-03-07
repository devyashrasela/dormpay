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
    const [balances, setBalances] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showAddExpense, setShowAddExpense] = useState(false);
    const [showAddMember, setShowAddMember] = useState(false);

    useEffect(() => { fetchAll(); }, [id]);

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [billRes, balRes] = await Promise.all([
                api.get(`/api/split-bills/${id}`),
                api.get(`/api/split-bills/${id}/balances`),
            ]);
            setBill(billRes.data.bill);
            setBalances(balRes.data);
        } catch (err) {
            console.error('Failed to fetch bill:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="loading-spinner"></div></div>;
    if (!bill) return <div style={{ padding: 40, color: 'var(--color-muted)' }}>Bill not found.</div>;

    const mySettlements = balances?.settlements?.filter((s) => s.from_user_id === user?.id) || [];
    const owedToMe = balances?.settlements?.filter((s) => s.to_user_id === user?.id) || [];

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
                            Created by @{bill.creator?.username} · {bill.participants?.length} people
                        </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 700 }}>
                            {formatAlgo(bill.total_amount)}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--color-muted)' }}>ALGO total</div>
                        <span className={`status-pill ${bill.status}`} style={{ marginTop: 8, display: 'inline-block' }}>{bill.status}</span>
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            {bill.status === 'active' && (
                <div style={{ display: 'flex', gap: 8, margin: '16px 0 24px' }}>
                    <button className="btn-primary" style={{ height: 40, fontSize: 10 }} onClick={() => setShowAddExpense(true)}>
                        + Add Expense
                    </button>
                    <button className="btn-lime" style={{ height: 40, padding: '0 16px' }} onClick={() => setShowAddMember(true)}>
                        + Add Person
                    </button>
                </div>
            )}

            <div className="split-cols" style={{ marginTop: 16 }}>
                {/* Left: Balances & Settlements */}
                <div>
                    {/* Who owes whom */}
                    <div className="split-col-label">Settlements Needed</div>
                    {balances?.settlements?.length > 0 ? (
                        <div className="split-result">
                            {balances.settlements.map((s, i) => (
                                <div key={i} className="split-result-row" style={{ alignItems: 'center' }}>
                                    <div>
                                        <span style={{ fontWeight: 600 }}>{s.from_display_name || s.from_username}</span>
                                        <span style={{ color: 'var(--color-muted)', margin: '0 6px' }}>→</span>
                                        <span style={{ fontWeight: 600 }}>{s.to_display_name || s.to_username}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span className="split-mono" style={{ color: 'var(--color-warning)' }}>{formatAlgo(s.amount)} ALGO</span>
                                        {s.from_user_id === user?.id && bill.status === 'active' && (
                                            <button
                                                className="btn-lime"
                                                style={{ padding: '4px 8px', fontSize: 9 }}
                                                onClick={() => handleSettle(s)}
                                            >
                                                Settle
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{ padding: 16, fontSize: 12, color: 'var(--color-success)', fontStyle: 'italic', fontFamily: 'var(--font-serif)' }}>
                            ✓ All settled! No outstanding debts.
                        </div>
                    )}

                    {/* Your summary */}
                    {user && (
                        <div style={{ marginTop: 20 }}>
                            <div className="split-col-label">Your Summary</div>
                            {mySettlements.length > 0 && (
                                <div style={{ marginBottom: 8 }}>
                                    {mySettlements.map((s, i) => (
                                        <div key={i} style={{ fontSize: 13, padding: '6px 0', color: 'var(--color-warning)' }}>
                                            You owe <strong>@{s.to_username}</strong> {formatAlgo(s.amount)} ALGO
                                        </div>
                                    ))}
                                </div>
                            )}
                            {owedToMe.length > 0 && (
                                <div>
                                    {owedToMe.map((s, i) => (
                                        <div key={i} style={{ fontSize: 13, padding: '6px 0', color: 'var(--color-success)' }}>
                                            <strong>@{s.from_username}</strong> owes you {formatAlgo(s.amount)} ALGO
                                        </div>
                                    ))}
                                </div>
                            )}
                            {mySettlements.length === 0 && owedToMe.length === 0 && (
                                <div style={{ fontSize: 12, color: 'var(--color-muted)', fontStyle: 'italic', fontFamily: 'var(--font-serif)' }}>
                                    You're all even!
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Right: Expenses & Participants */}
                <div>
                    <div className="split-col-label">Participants</div>
                    {bill.participants?.map((p) => (
                        <div key={p.id} className="participant-row" style={{ cursor: 'default' }}>
                            <div className="avatar xs">{getInitials(p.User?.display_name || p.User?.username)}</div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 13, fontWeight: 600 }}>
                                    {p.User?.display_name || p.User?.username}
                                    {p.is_admin && <span style={{ fontSize: 9, color: 'var(--color-lime)', background: 'var(--color-petrol)', padding: '1px 4px', marginLeft: 6 }}>ADMIN</span>}
                                </div>
                                <div style={{ fontSize: 10, color: 'var(--color-muted)', fontFamily: 'var(--font-mono)' }}>
                                    paid {formatAlgo(p.paid_amount)} · share {formatAlgo(p.share_amount)}
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Expenses */}
                    <div className="split-col-label" style={{ marginTop: 20 }}>
                        Expenses ({bill.expenses?.length || 0})
                    </div>
                    {bill.expenses?.length > 0 ? (
                        bill.expenses.map((exp) => {
                            const splitCount = exp.split_among?.length || bill.participants?.length || 1;
                            return (
                                <div key={exp.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--color-border)', fontSize: 13 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                                        <span style={{ fontWeight: 500 }}>{exp.description}</span>
                                        <span className="split-mono">{formatAlgo(exp.amount)} ALGO</span>
                                    </div>
                                    <div style={{ fontSize: 10, color: 'var(--color-muted)', fontFamily: 'var(--font-mono)' }}>
                                        paid by @{exp.paidBy?.username} · split {splitCount} ways ({formatAlgo(exp.amount / splitCount)} each)
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div style={{ fontSize: 12, color: 'var(--color-muted)', fontStyle: 'italic', fontFamily: 'var(--font-serif)', padding: '12px 0' }}>
                            No expenses yet. Add one to start splitting.
                        </div>
                    )}
                </div>
            </div>

            {/* Add Expense Modal */}
            {showAddExpense && (
                <AddExpenseModal
                    bill={bill}
                    userId={user?.id}
                    onClose={() => setShowAddExpense(false)}
                    onAdded={() => { setShowAddExpense(false); fetchAll(); showToast('Expense added'); }}
                />
            )}

            {/* Add Member Modal */}
            {showAddMember && (
                <AddMemberModal
                    billId={bill.id}
                    onClose={() => setShowAddMember(false)}
                    onAdded={() => { setShowAddMember(false); fetchAll(); showToast('Member added'); }}
                />
            )}
        </div>
    );

    async function handleSettle(settlement) {
        try {
            await api.post(`/api/split-bills/${id}/settle`, {
                to_user_id: settlement.to_user_id,
                amount: settlement.amount,
            });
            fetchAll();
            showToast(`Settled ${formatAlgo(settlement.amount)} ALGO to @${settlement.to_username}`);
        } catch (err) {
            showToast(err.response?.data?.error || 'Settlement failed');
        }
    }
}

// Add Expense Modal — Google-style with payer selection & split-among checkboxes
function AddExpenseModal({ bill, userId, onClose, onAdded }) {
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [paidByUserId, setPaidByUserId] = useState(userId);
    const [splitAmong, setSplitAmong] = useState(bill.participants?.map((p) => p.user_id) || []);
    const [loading, setLoading] = useState(false);

    const toggleSplit = (uid) => {
        setSplitAmong((prev) =>
            prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
        );
    };

    const perPerson = splitAmong.length > 0 && amount ? (parseFloat(amount) / splitAmong.length).toFixed(2) : '0.00';

    const handleSubmit = async () => {
        if (!description || !amount || splitAmong.length === 0) return;
        setLoading(true);
        try {
            await api.post(`/api/split-bills/${bill.id}/expenses`, {
                description,
                amount: parseFloat(amount),
                paid_by_user_id: paidByUserId,
                split_among: splitAmong,
            });
            onAdded();
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal" style={{ width: 580 }}>
                <div className="modal-header">
                    <span className="modal-title">Add Expense</span>
                    <button className="modal-close" onClick={onClose}>✕</button>
                </div>
                <div className="modal-body">
                    <div className="field-group">
                        <label className="field-label">What's this for?</label>
                        <div className="field-input-wrap">
                            <input className="field-input" placeholder="Pizza, Cab fare, Groceries..." value={description} onChange={(e) => setDescription(e.target.value)} />
                        </div>
                    </div>

                    <div className="field-group">
                        <label className="field-label">Amount</label>
                        <input className="amount-input" style={{ fontSize: 40 }} placeholder="0.00" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
                    </div>

                    <div className="field-group">
                        <label className="field-label">Paid By</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {bill.participants?.map((p) => (
                                <button
                                    key={p.user_id}
                                    className={`filter-tag ${paidByUserId === p.user_id ? 'active' : ''}`}
                                    onClick={() => setPaidByUserId(p.user_id)}
                                    style={{ fontSize: 10, padding: '5px 12px' }}
                                >
                                    {p.user_id === userId ? 'You' : `@${p.User?.username}`}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="field-group">
                        <label className="field-label">Split Among</label>
                        {bill.participants?.map((p) => (
                            <div key={p.user_id} className="participant-row" onClick={() => toggleSplit(p.user_id)}>
                                <div className="avatar xs">{getInitials(p.User?.display_name || p.User?.username)}</div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 13, fontWeight: 600 }}>
                                        {p.user_id === userId ? 'You' : (p.User?.display_name || p.User?.username)}
                                    </div>
                                </div>
                                <div className={`checkbox ${splitAmong.includes(p.user_id) ? 'checked' : ''}`}></div>
                            </div>
                        ))}
                        {splitAmong.length > 0 && amount && (
                            <div style={{ marginTop: 8, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-muted)' }}>
                                {perPerson} ALGO per person ({splitAmong.length} people)
                            </div>
                        )}
                    </div>

                    <button className="btn-primary" onClick={handleSubmit} disabled={loading || !description || !amount || splitAmong.length === 0}>
                        {loading ? 'Adding...' : 'Add Expense'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// Add Member Modal
function AddMemberModal({ billId, onClose, onAdded }) {
    const [username, setUsername] = useState('');
    const [loading, setLoading] = useState(false);

    const handleAdd = async () => {
        if (!username) return;
        setLoading(true);
        try {
            await api.post(`/api/split-bills/${billId}/members`, {
                members: [{ username: username.replace('@', '') }],
            });
            onAdded();
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal" style={{ width: 400 }}>
                <div className="modal-header">
                    <span className="modal-title">Add Person</span>
                    <button className="modal-close" onClick={onClose}>✕</button>
                </div>
                <div className="modal-body">
                    <div className="field-group">
                        <label className="field-label">Username</label>
                        <div className="field-input-wrap">
                            <input className="field-input sm" placeholder="@username" value={username} onChange={(e) => setUsername(e.target.value)} />
                        </div>
                    </div>
                    <button className="btn-primary" onClick={handleAdd} disabled={loading || !username}>
                        {loading ? 'Adding...' : 'Add to Group'}
                    </button>
                </div>
            </div>
        </div>
    );
}
