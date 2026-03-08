import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import useAuthStore from '../store/useAuthStore';
import usePeraWallet from '../hooks/usePeraWallet';
import { useToast } from '../App';
import { formatAlgo, getInitials } from '../utils/formatters';
import { buildPaymentTxn, submitTransaction } from '../utils/algorand';

export default function SplitBillDetail() {
    const { id } = useParams();
    const { user } = useAuthStore();
    const { connectedAddress, signTransactions, connect } = usePeraWallet();
    const showToast = useToast();
    const navigate = useNavigate();
    const [bill, setBill] = useState(null);
    const [balances, setBalances] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showAddExpense, setShowAddExpense] = useState(false);
    const [showAddMember, setShowAddMember] = useState(false);

    // Settlement confirmation & status
    const [pendingSettle, setPendingSettle] = useState(null);
    const [txnStatus, setTxnStatus] = useState(null); // null | 'signing' | 'submitting' | 'saving' | 'success' | 'error'
    const [txnError, setTxnError] = useState('');

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

    const userId = Number(user?.id);
    const mySettlements = balances?.settlements?.filter((s) => Number(s.from_user_id) === userId) || [];
    const owedToMe = balances?.settlements?.filter((s) => Number(s.to_user_id) === userId) || [];

    // Calculate net amounts per person (auto-netting within group)
    const netByPerson = {};
    for (const s of (balances?.settlements || [])) {
        const fromId = Number(s.from_user_id);
        const toId = Number(s.to_user_id);
        if (fromId === userId) {
            const key = toId;
            netByPerson[key] = netByPerson[key] || { userId: toId, username: s.to_username, displayName: s.to_display_name, amount: 0 };
            netByPerson[key].amount -= Number(s.amount);
        }
        if (toId === userId) {
            const key = fromId;
            netByPerson[key] = netByPerson[key] || { userId: fromId, username: s.from_username, displayName: s.from_display_name, amount: 0 };
            netByPerson[key].amount += Number(s.amount);
        }
    }
    const netSummary = Object.values(netByPerson).filter(n => Math.abs(n.amount) > 0.0001);
    const totalIOwe = netSummary.filter(n => n.amount < 0).reduce((sum, n) => sum + Math.abs(n.amount), 0);
    const totalOwedToMe = netSummary.filter(n => n.amount > 0).reduce((sum, n) => sum + n.amount, 0);

    // Show settlement confirmation
    const confirmSettle = (settlement) => {
        setPendingSettle(settlement);
    };

    // Execute settlement after confirmation
    async function executeSettle() {
        const settlement = pendingSettle;
        setPendingSettle(null);

        if (!connectedAddress) {
            try { await connect(); } catch { showToast('Please connect wallet first'); return; }
        }

        // Need the recipient's wallet address
        if (!settlement.to_wallet_address) {
            try {
                const res = await api.get(`/api/users/lookup/${settlement.to_username}`);
                settlement.to_wallet_address = res.data.user.wallet_address;
            } catch {
                showToast('Could not find recipient wallet');
                return;
            }
        }

        setTxnStatus('signing');
        setTxnError('');

        try {
            // Step 1: Build & Sign
            const txn = await buildPaymentTxn({
                from: connectedAddress,
                to: settlement.to_wallet_address,
                amount: settlement.amount,
                note: `Split bill settlement`,
            });
            const signedTxn = await signTransactions([[{ txn, signers: [connectedAddress] }]]);

            // Step 2: Submit to Algorand
            setTxnStatus('submitting');
            const txId = await submitTransaction(signedTxn[0]);

            // Step 3: Record on backend
            setTxnStatus('saving');
            await api.post(`/api/split-bills/${id}/settle`, {
                to_user_id: settlement.to_user_id,
                amount: settlement.amount,
                txn_id: txId,
            });

            // Also save as a regular transaction
            await api.post('/api/transactions', {
                txn_id: txId,
                receiver_address: settlement.to_wallet_address,
                amount: settlement.amount,
                asset_type: 'ALGO',
                note: `Split bill settlement`,
            });

            // Success
            setTxnStatus('success');
            setTimeout(() => {
                setTxnStatus(null);
                fetchAll();
            }, 2500);

        } catch (err) {
            console.error('Settlement error:', err);
            const msg = err.message || 'Settlement failed';
            if (msg.includes('below min') || msg.includes('balance')) {
                setTxnError('Insufficient balance — account needs ≥0.1 ALGO minimum');
            } else {
                setTxnError(err.response?.data?.error || msg);
            }
            setTxnStatus('error');
        }
    }

    const dismissError = () => {
        setTxnStatus(null);
        setTxnError('');
    };

    // Transaction Status Overlay
    if (txnStatus) {
        const steps = [
            { key: 'signing', label: 'Signing transaction' },
            { key: 'submitting', label: 'Submitting to Algorand' },
            { key: 'saving', label: 'Recording settlement' },
        ];
        const stepOrder = ['signing', 'submitting', 'saving'];
        const currentIdx = stepOrder.indexOf(txnStatus);
        const isSuccess = txnStatus === 'success';
        const isError = txnStatus === 'error';

        return (
            <div className={`txn-status-overlay ${isSuccess ? 'success' : isError ? 'error' : 'processing'}`}>
                <div className="txn-status-icon">
                    {isSuccess ? '✓' : isError ? '✕' : '⟳'}
                </div>
                <div className="txn-status-title">
                    {isSuccess ? 'Settlement Complete' : isError ? 'Settlement Failed' : 'Processing Settlement'}
                </div>
                <div className="txn-status-subtitle">
                    {isSuccess
                        ? 'Your debt has been settled on-chain'
                        : isError
                            ? 'Something went wrong during the settlement'
                            : 'Please wait while your settlement is being processed...'}
                </div>
                {!isSuccess && (
                    <div className="txn-steps">
                        {steps.map((step, i) => {
                            let cls = '';
                            if (isError && i === currentIdx) cls = 'failed';
                            else if (isError && i < currentIdx) cls = 'done';
                            else if (i < currentIdx) cls = 'done';
                            else if (i === currentIdx) cls = 'active';
                            return (
                                <div key={step.key} className={`txn-step ${cls}`}>
                                    <div className="txn-step-dot">
                                        {cls === 'done' ? '✓' : cls === 'failed' ? '✕' : cls === 'active' ? '›' : (i + 1)}
                                    </div>
                                    <span>{step.label}</span>
                                </div>
                            );
                        })}
                    </div>
                )}
                {isError && (
                    <>
                        <div className="txn-error-msg">{txnError}</div>
                        <button className="btn-primary" style={{ width: 'auto', height: 44, padding: '0 32px', marginTop: 24 }} onClick={dismissError}>
                            Close
                        </button>
                    </>
                )}
            </div>
        );
    }

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

            {/* Net Balance Summary */}
            {user && bill.status === 'active' && netSummary.length > 0 && (
                <div style={{ background: 'white', border: '1px solid var(--color-border-strong)', padding: '16px 20px', marginTop: 16, marginBottom: 8 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--color-muted)', marginBottom: 10 }}>Your Net Balance (Auto-Settled)</div>
                    {netSummary.map((n, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: i < netSummary.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                            <span style={{ fontSize: 13 }}>
                                {n.amount < 0 ? (
                                    <>You owe <strong>@{n.username}</strong></>
                                ) : (
                                    <><strong>@{n.username}</strong> owes you</>
                                )}
                            </span>
                            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13, color: n.amount < 0 ? 'var(--color-warning)' : 'var(--color-success)' }}>
                                {formatAlgo(Math.abs(n.amount))} ALGO
                            </span>
                        </div>
                    ))}
                    {totalIOwe > 0 && (
                        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--color-border-strong)', paddingTop: 10 }}>
                            <span style={{ fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Total you owe</span>
                            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--color-warning)' }}>{formatAlgo(totalIOwe)} ALGO</span>
                        </div>
                    )}
                    {totalOwedToMe > 0 && (
                        <div style={{ marginTop: totalIOwe > 0 ? 4 : 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', ...(totalIOwe === 0 ? { borderTop: '1px solid var(--color-border-strong)', paddingTop: 10 } : {}) }}>
                            <span style={{ fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Total owed to you</span>
                            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--color-success)' }}>{formatAlgo(totalOwedToMe)} ALGO</span>
                        </div>
                    )}
                </div>
            )}

            <div className="split-cols" style={{ marginTop: 16 }}>
                {/* Left: Balances & Settlements */}
                <div>
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
                                        {Number(s.from_user_id) === userId && bill.status === 'active' && (
                                            <button
                                                className="btn-lime"
                                                style={{ padding: '4px 8px', fontSize: 9 }}
                                                onClick={() => confirmSettle(s)}
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

            {/* Settlement Confirmation Modal */}
            {pendingSettle && (
                <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setPendingSettle(null)}>
                    <div className="modal" style={{ width: 420 }}>
                        <div className="modal-header">
                            <span className="modal-title">Confirm Settlement</span>
                            <button className="modal-close" onClick={() => setPendingSettle(null)}>✕</button>
                        </div>
                        <div className="modal-body">
                            <div className="confirm-amount">
                                {formatAlgo(pendingSettle.amount)} <span style={{ fontSize: 20, opacity: 0.4 }}>ALGO</span>
                            </div>
                            <div className="confirm-detail">
                                <span className="confirm-detail-label">To</span>
                                <span className="confirm-detail-value">@{pendingSettle.to_username}</span>
                            </div>
                            <div className="confirm-detail">
                                <span className="confirm-detail-label">From</span>
                                <span className="confirm-detail-value" style={{ fontSize: 11 }}>
                                    {connectedAddress ? `${connectedAddress.slice(0, 8)}...${connectedAddress.slice(-6)}` : 'Not connected'}
                                </span>
                            </div>
                            <div className="confirm-detail">
                                <span className="confirm-detail-label">Purpose</span>
                                <span style={{ fontSize: 13, fontStyle: 'italic', color: 'var(--color-muted)' }}>Split bill settlement</span>
                            </div>

                            <div className="confirm-actions">
                                <button className="btn-lime" style={{ height: 48 }} onClick={() => setPendingSettle(null)}>
                                    Cancel
                                </button>
                                <button className="btn-primary" style={{ height: 48 }} onClick={executeSettle}>
                                    Confirm & Settle
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

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
}

// Add Expense Modal — with integer-only amount
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

    // Integer-only amount handler
    const handleAmountChange = (e) => {
        const val = e.target.value;
        if (val === '' || /^\d+$/.test(val)) {
            setAmount(val);
        }
    };

    const perPerson = splitAmong.length > 0 && amount ? Math.floor(parseInt(amount) / splitAmong.length) : 0;
    const remainder = splitAmong.length > 0 && amount ? parseInt(amount) % splitAmong.length : 0;

    const handleSubmit = async () => {
        if (!description || !amount || splitAmong.length === 0) return;
        const intAmount = parseInt(amount);
        if (intAmount <= 0) return;
        setLoading(true);
        try {
            await api.post(`/api/split-bills/${bill.id}/expenses`, {
                description,
                amount: intAmount,
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
                        <label className="field-label">Amount (ALGO)</label>
                        <input
                            className="amount-input"
                            style={{ fontSize: 40 }}
                            placeholder="0"
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={amount}
                            onChange={handleAmountChange}
                        />
                        <div className="integer-hint">Only whole number amounts allowed</div>
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
                                {remainder > 0 && (
                                    <span style={{ color: 'var(--color-warning)', marginLeft: 8 }}>
                                        +{remainder} ALGO remainder
                                    </span>
                                )}
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
