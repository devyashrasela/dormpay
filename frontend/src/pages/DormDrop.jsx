import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useToast } from '../App';
import { getInitials } from '../utils/formatters';

export default function DormDrop() {
    const navigate = useNavigate();
    const showToast = useToast();

    const canvasRef = useRef(null);
    const animFrameRef = useRef(null);
    const [nearbyUsers, setNearbyUsers] = useState([]);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [myCoords, setMyCoords] = useState(null);
    const [locError, setLocError] = useState(null);
    const [scanning, setScanning] = useState(false);
    const [showSplitDialog, setShowSplitDialog] = useState(false);
    const [splitTitle, setSplitTitle] = useState('');
    const [splitDesc, setSplitDesc] = useState('');
    const [creating, setCreating] = useState(false);

    // Radar visual state
    const radarAngle = useRef(0);
    const pulsePhase = useRef(0);
    const userPositions = useRef([]); // [{id, x, y, username, display_name, distance, angle}]

    // ── Geolocation ──
    const updateLocation = useCallback(async (lat, lng) => {
        try {
            await api.put('/api/users/location', { latitude: lat, longitude: lng });
        } catch { /* silent */ }
    }, []);

    useEffect(() => {
        if (!navigator.geolocation) {
            setLocError('Geolocation not supported by your browser');
            return;
        }

        setScanning(true);

        const watchId = navigator.geolocation.watchPosition(
            (pos) => {
                const { latitude, longitude } = pos.coords;
                setMyCoords({ lat: latitude, lng: longitude });
                setLocError(null);
                setScanning(true);
                updateLocation(latitude, longitude);
            },
            (err) => {
                console.error('Geolocation error:', err);
                if (err.code === 1) setLocError('Location permission denied — enable it in browser settings');
                else if (err.code === 2) setLocError('Location unavailable');
                else setLocError('Location request timed out');
                setScanning(false);
            },
            { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
        );

        return () => navigator.geolocation.clearWatch(watchId);
    }, [updateLocation]);

    // ── Poll nearby users ──
    useEffect(() => {
        if (!myCoords) return;
        let active = true;

        const poll = async () => {
            try {
                const res = await api.get(`/api/users/nearby?lat=${myCoords.lat}&lng=${myCoords.lng}&radius=100`);
                if (active) {
                    const users = res.data.users || [];
                    setNearbyUsers(users);

                    // Assign stable canvas positions
                    const canvas = canvasRef.current;
                    if (canvas) {
                        const cx = canvas.width / 2;
                        const cy = canvas.height / 2;
                        const maxR = Math.min(cx, cy) - 40;

                        userPositions.current = users.map((u, i) => {
                            // Use existing position for this user if available
                            const existing = userPositions.current.find(p => p.id === u.id);
                            const angle = existing ? existing.angle : (Math.PI * 2 * i / Math.max(users.length, 1)) + (Math.random() * 0.5 - 0.25);
                            const distRatio = Math.min(u.distance / 100, 1);
                            const r = 30 + distRatio * (maxR - 30);
                            return {
                                id: u.id,
                                x: cx + Math.cos(angle) * r,
                                y: cy + Math.sin(angle) * r,
                                username: u.username,
                                display_name: u.display_name || u.username,
                                distance: u.distance,
                                wallet_address: u.wallet_address,
                                angle,
                            };
                        });
                    }
                }
            } catch { /* silent */ }
        };

        poll();
        const interval = setInterval(poll, 5000);
        return () => { active = false; clearInterval(interval); };
    }, [myCoords]);

    // ── Canvas rendering ──
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        const resize = () => {
            const parent = canvas.parentElement;
            canvas.width = parent.clientWidth;
            canvas.height = parent.clientHeight;
        };
        resize();
        window.addEventListener('resize', resize);

        const draw = () => {
            const w = canvas.width;
            const h = canvas.height;
            const cx = w / 2;
            const cy = h / 2;
            const maxR = Math.min(cx, cy) - 20;

            ctx.clearRect(0, 0, w, h);

            // Background
            ctx.fillStyle = '#0B4650';
            ctx.fillRect(0, 0, w, h);

            // Concentric circles
            const rings = 4;
            for (let i = 1; i <= rings; i++) {
                const r = (maxR / rings) * i;
                ctx.beginPath();
                ctx.arc(cx, cy, r, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(230, 255, 43, ${0.08 + i * 0.04})`;
                ctx.lineWidth = 1;
                ctx.stroke();
            }

            // Cross-hairs
            ctx.strokeStyle = 'rgba(230, 255, 43, 0.1)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(cx, cy - maxR); ctx.lineTo(cx, cy + maxR);
            ctx.moveTo(cx - maxR, cy); ctx.lineTo(cx + maxR, cy);
            ctx.stroke();

            // Radar sweep
            radarAngle.current += 0.015;
            const sweepAngle = radarAngle.current;
            const gradient = ctx.createConicGradient(sweepAngle, cx, cy);
            gradient.addColorStop(0, 'rgba(230, 255, 43, 0.15)');
            gradient.addColorStop(0.15, 'rgba(230, 255, 43, 0)');
            gradient.addColorStop(1, 'rgba(230, 255, 43, 0)');
            ctx.beginPath();
            ctx.arc(cx, cy, maxR, 0, Math.PI * 2);
            ctx.fillStyle = gradient;
            ctx.fill();

            // Center point (you)
            pulsePhase.current += 0.03;
            const pulse = 1 + Math.sin(pulsePhase.current) * 0.3;
            ctx.beginPath();
            ctx.arc(cx, cy, 6 * pulse, 0, Math.PI * 2);
            ctx.fillStyle = '#E6FF2B';
            ctx.fill();

            ctx.beginPath();
            ctx.arc(cx, cy, 12, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(230, 255, 43, 0.4)';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Draw nearby users
            userPositions.current.forEach(u => {
                const isSelected = selectedIds.has(u.id);
                const nodeR = 22;

                // Glow for selected
                if (isSelected) {
                    ctx.beginPath();
                    ctx.arc(u.x, u.y, nodeR + 6, 0, Math.PI * 2);
                    ctx.strokeStyle = '#E6FF2B';
                    ctx.lineWidth = 3;
                    ctx.stroke();

                    ctx.beginPath();
                    ctx.arc(u.x, u.y, nodeR + 10, 0, Math.PI * 2);
                    ctx.strokeStyle = 'rgba(230, 255, 43, 0.2)';
                    ctx.lineWidth = 2;
                    ctx.stroke();
                }

                // Avatar circle
                ctx.beginPath();
                ctx.arc(u.x, u.y, nodeR, 0, Math.PI * 2);
                ctx.fillStyle = isSelected ? '#E6FF2B' : '#F5F2EA';
                ctx.fill();
                ctx.strokeStyle = '#0B4650';
                ctx.lineWidth = 2;
                ctx.stroke();

                // Initials
                const initials = getInitials(u.display_name);
                ctx.fillStyle = '#0B4650';
                ctx.font = 'bold 12px "Space Grotesk", sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(initials, u.x, u.y);

                // Username label
                ctx.fillStyle = '#F5F2EA';
                ctx.font = '10px "Space Grotesk", sans-serif';
                ctx.fillText(`@${u.username}`, u.x, u.y + nodeR + 14);

                // Distance
                ctx.fillStyle = 'rgba(245, 242, 234, 0.5)';
                ctx.font = '9px "Space Grotesk", sans-serif';
                ctx.fillText(`${u.distance}m`, u.x, u.y + nodeR + 26);
            });

            // "Scanning" indicator
            if (scanning && nearbyUsers.length === 0) {
                ctx.fillStyle = 'rgba(230, 255, 43, 0.7)';
                ctx.font = '11px "Space Grotesk", sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('Scanning for nearby DormPay users...', cx, cy + maxR + 12);
            }

            animFrameRef.current = requestAnimationFrame(draw);
        };

        animFrameRef.current = requestAnimationFrame(draw);

        return () => {
            cancelAnimationFrame(animFrameRef.current);
            window.removeEventListener('resize', resize);
        };
    }, [nearbyUsers, selectedIds, scanning]);

    // ── Click handling ──
    const handleCanvasClick = (e) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
        const my = (e.clientY - rect.top) * (canvas.height / rect.height);

        for (const u of userPositions.current) {
            const dx = mx - u.x;
            const dy = my - u.y;
            if (dx * dx + dy * dy <= 30 * 30) {
                setSelectedIds(prev => {
                    const next = new Set(prev);
                    if (next.has(u.id)) next.delete(u.id);
                    else next.add(u.id);
                    return next;
                });
                return;
            }
        }
    };

    // ── Actions ──
    const selectedUsers = nearbyUsers.filter(u => selectedIds.has(u.id));

    const handleSendMoney = () => {
        if (selectedUsers.length !== 1) return;
        navigate(`/send?to=${selectedUsers[0].username}`);
    };

    const handleSplitBill = () => {
        setShowSplitDialog(true);
        setSplitTitle('');
        setSplitDesc('');
    };

    const handleCreateSplit = async () => {
        if (!splitTitle.trim()) { showToast('Enter a title'); return; }
        setCreating(true);
        try {
            const res = await api.post('/api/split-bills', {
                title: splitTitle,
                description: splitDesc,
                participants: selectedUsers.map(u => ({ username: u.username })),
            });
            showToast('Split group created!');
            setShowSplitDialog(false);
            setSelectedIds(new Set());
            // Navigate to the new split detail
            const bills = await api.get('/api/split-bills');
            const latest = (bills.data.bills || [])[0];
            if (latest) navigate(`/split-bills/${latest.id}`);
            else navigate('/split-bills');
        } catch (err) {
            console.error('Create split error:', err);
            showToast('Failed to create split group');
        } finally {
            setCreating(false);
        }
    };

    // ── Error state ──
    if (locError) {
        return (
            <div>
                <div className="section-label">— DormDrop</div>
                <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    padding: '60px 24px', textAlign: 'center',
                }}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-petrol)" strokeWidth="1.5" style={{ opacity: 0.4, marginBottom: 16 }}>
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                        <circle cx="12" cy="9" r="2.5" />
                    </svg>
                    <div style={{ fontFamily: 'var(--font-serif)', fontSize: 20, marginBottom: 8 }}>Location Required</div>
                    <div style={{ fontSize: 13, color: 'var(--color-muted)', maxWidth: 300, lineHeight: 1.6 }}>
                        {locError}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
            <div className="section-label" style={{ flexShrink: 0 }}>— DormDrop</div>

            {/* Radar canvas */}
            <div style={{
                flex: 1,
                minHeight: 300,
                position: 'relative',
                border: '1px solid var(--color-border)',
                borderRadius: 0,
                overflow: 'hidden',
                background: '#0B4650',
            }}>
                <canvas
                    ref={canvasRef}
                    onClick={handleCanvasClick}
                    style={{ width: '100%', height: '100%', cursor: 'crosshair', display: 'block' }}
                />

                {/* User count badge */}
                <div style={{
                    position: 'absolute', top: 12, left: 12,
                    background: 'rgba(11, 70, 80, 0.85)', border: '1px solid rgba(230, 255, 43, 0.3)',
                    padding: '6px 12px', fontSize: 11, fontWeight: 700,
                    color: '#E6FF2B', textTransform: 'uppercase', letterSpacing: '0.08em',
                }}>
                    {nearbyUsers.length} user{nearbyUsers.length !== 1 ? 's' : ''} nearby
                </div>

                {/* Selection count */}
                {selectedIds.size > 0 && (
                    <div style={{
                        position: 'absolute', top: 12, right: 12,
                        background: '#E6FF2B', color: '#0B4650',
                        padding: '6px 12px', fontSize: 11, fontWeight: 700,
                        textTransform: 'uppercase', letterSpacing: '0.08em',
                    }}>
                        {selectedIds.size} selected
                    </div>
                )}
            </div>

            {/* Action bar */}
            {selectedIds.size > 0 && (
                <div style={{
                    flexShrink: 0,
                    display: 'flex', gap: 12, padding: '16px 0',
                    justifyContent: 'center',
                }}>
                    {selectedIds.size === 1 && (
                        <button
                            className="btn-primary"
                            style={{ height: 44, padding: '0 24px', fontSize: 13 }}
                            onClick={handleSendMoney}
                        >
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 8h12M10 4l4 4-4 4" /></svg>
                            Send Money
                        </button>
                    )}
                    <button
                        className="btn-lime"
                        style={{ height: 44, padding: '0 24px', fontSize: 13, border: '2px solid var(--color-petrol)' }}
                        onClick={handleSplitBill}
                    >
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 2v12M2 8h12" /></svg>
                        Split Bill
                    </button>
                    <button
                        style={{
                            height: 44, padding: '0 16px', fontSize: 11,
                            background: 'none', border: '1px solid var(--color-border-strong)',
                            cursor: 'pointer', fontFamily: 'var(--font-sans)', fontWeight: 600,
                            textTransform: 'uppercase', letterSpacing: '0.08em',
                        }}
                        onClick={() => setSelectedIds(new Set())}
                    >
                        Clear
                    </button>
                </div>
            )}

            {/* Split Bill Dialog */}
            {showSplitDialog && (
                <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowSplitDialog(false)}>
                    <div className="modal" style={{ width: 440 }}>
                        <div className="modal-header">
                            <span className="modal-title">Create Split Group</span>
                            <button className="modal-close" onClick={() => setShowSplitDialog(false)}>✕</button>
                        </div>
                        <div className="modal-body">
                            <div style={{ marginBottom: 16 }}>
                                <div style={{
                                    display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16,
                                }}>
                                    {selectedUsers.map(u => (
                                        <div key={u.id} style={{
                                            display: 'flex', alignItems: 'center', gap: 6,
                                            padding: '4px 10px', background: 'var(--color-lime)',
                                            border: '1px solid var(--color-petrol)', fontSize: 12, fontWeight: 600,
                                        }}>
                                            <div className="avatar xs">{getInitials(u.display_name || u.username)}</div>
                                            @{u.username}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="field-group">
                                <label className="field-label">Title</label>
                                <div className="field-input-wrap">
                                    <input
                                        className="field-input"
                                        placeholder="e.g. Cafe Metro"
                                        value={splitTitle}
                                        onChange={e => setSplitTitle(e.target.value)}
                                        autoFocus
                                    />
                                </div>
                            </div>

                            <div className="field-group">
                                <label className="field-label">Description (optional)</label>
                                <div className="field-input-wrap">
                                    <input
                                        className="field-input sm"
                                        placeholder="what's this split for?"
                                        value={splitDesc}
                                        onChange={e => setSplitDesc(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="confirm-actions" style={{ marginTop: 20 }}>
                                <button className="btn-lime" style={{ height: 44 }} onClick={() => setShowSplitDialog(false)}>
                                    Cancel
                                </button>
                                <button className="btn-primary" style={{ height: 44 }} onClick={handleCreateSplit} disabled={creating}>
                                    {creating ? 'Creating...' : 'Create Group'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
