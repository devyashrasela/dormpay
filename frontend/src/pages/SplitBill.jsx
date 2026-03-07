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
                    + New Group
                </button>
            </div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="loading-spinner"></div></div>
            ) : bills.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', fontSize: 13, color: 'var(--color-muted)', fontStyle: 'italic', fontFamily: 'var(--font-serif)' }}>
                    No split bills yet. Create a group to split expenses with friends.
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {bills.map((bill) => (
                        <Link key={bill.id} to={`/split-bills/${bill.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                            <div className="settings-card" style={{ cursor: 'pointer', transition: 'background 0.12s' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400, marginBottom: 4 }}>
                                            {bill.title}
                                        </div>
                                        <div style={{ fontSize: 11, color: 'var(--color-muted)' }}>
                                            by @{bill.creator?.username} · {bill.participants?.length || 0} people
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

            {showCreate && (
                <CreateGroupModal
                    onClose={() => setShowCreate(false)}
                    onCreated={() => { setShowCreate(false); fetchBills(); showToast('Group created'); }}
                />
            )}
        </div>
    );
}

function CreateGroupModal({ onClose, onCreated }) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [participantInput, setParticipantInput] = useState('');
    const [participants, setParticipants] = useState([]);
    const [loading, setLoading] = useState(false);

    const addParticipant = () => {
        const username = participantInput.replace('@', '').trim();
        if (username && !participants.includes(username)) {
            setParticipants([...participants, username]);
            setParticipantInput('');
        }
    };

    const removeParticipant = (username) => {
        setParticipants(participants.filter((p) => p !== username));
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') { e.preventDefault(); addParticipant(); }
    };

    const handleCreate = async () => {
        if (!title) return;
        setLoading(true);
        try {
            await api.post('/api/split-bills', {
                title,
                description,
                participants: participants.map((u) => ({ username: u })),
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
                    <span className="modal-title">Create Split Group</span>
                    <button className="modal-close" onClick={onClose}>✕</button>
                </div>
                <div className="modal-body">
                    <div className="field-group">
                        <label className="field-label">Group Name</label>
                        <div className="field-input-wrap">
                            <input className="field-input" placeholder="Weekend trip, Dinner, Rent..." value={title} onChange={(e) => setTitle(e.target.value)} />
                        </div>
                    </div>

                    <div className="field-group">
                        <label className="field-label">Description (optional)</label>
                        <div className="field-input-wrap">
                            <input className="field-input sm" placeholder="What's this group for?" value={description} onChange={(e) => setDescription(e.target.value)} />
                        </div>
                    </div>

                    <div className="field-group">
                        <label className="field-label">Add Participants</label>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <div className="field-input-wrap" style={{ flex: 1 }}>
                                <input
                                    className="field-input sm"
                                    placeholder="@username"
                                    value={participantInput}
                                    onChange={(e) => setParticipantInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                />
                            </div>
                            <button className="btn-lime" onClick={addParticipant} style={{ height: 40 }}>Add</button>
                        </div>
                        {participants.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
                                {participants.map((u) => (
                                    <div key={u} style={{
                                        display: 'flex', alignItems: 'center', gap: 6,
                                        padding: '4px 10px', border: '1px solid var(--color-petrol)',
                                        fontSize: 11, fontFamily: 'var(--font-mono)',
                                    }}>
                                        @{u}
                                        <span style={{ cursor: 'pointer', opacity: 0.5 }} onClick={() => removeParticipant(u)}>✕</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <button className="btn-primary" onClick={handleCreate} disabled={loading || !title} style={{ marginTop: 12 }}>
                        {loading ? 'Creating...' : 'Create Group'}
                    </button>
                </div>
            </div>
        </div>
    );
}
