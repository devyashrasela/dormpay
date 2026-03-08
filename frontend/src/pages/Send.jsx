import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import usePeraWallet from '../hooks/usePeraWallet';
import useWalletStore from '../store/useWalletStore';
import { useToast } from '../App';
import api from '../api/axios';
import { buildPaymentTxn, submitTransaction, isValidAddress } from '../utils/algorand';
import { algoToINR, getInitials } from '../utils/formatters';

export default function Send() {
    const { connectedAddress, signTransactions, connect } = usePeraWallet();
    const { fetchBalance } = useWalletStore();
    const showToast = useToast();
    const navigate = useNavigate();

    const [recipient, setRecipient] = useState('');
    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [resolvedAddress, setResolvedAddress] = useState(null);
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [scanning, setScanning] = useState(false);
    const debounceRef = useRef(null);
    const scannerRef = useRef(null);

    // Cleanup scanner on unmount
    useEffect(() => {
        return () => {
            if (scannerRef.current) {
                scannerRef.current.stop().catch(() => { });
            }
        };
    }, []);

    // Search users as you type username (no @ needed)
    const resolveRecipient = useCallback((value) => {
        setRecipient(value);
        setResolvedAddress(null);
        setSuggestions([]);
        setShowSuggestions(false);

        if (debounceRef.current) clearTimeout(debounceRef.current);

        if (isValidAddress(value)) {
            setResolvedAddress(value);
        } else if (value.length >= 2) {
            // Treat as username search (strip @ if user types it)
            const query = value.startsWith('@') ? value.slice(1) : value;
            if (query.length >= 2) {
                debounceRef.current = setTimeout(async () => {
                    try {
                        const res = await api.get(`/api/users/search?q=${encodeURIComponent(query)}`);
                        const users = res.data.users || [];
                        setSuggestions(users);
                        setShowSuggestions(users.length > 0);

                        // Auto-resolve if exact match
                        const exact = users.find(u => u.username === query);
                        if (exact) {
                            setResolvedAddress(exact.wallet_address);
                        }
                    } catch { /* ignore */ }
                }, 400);
            }
        }
    }, []);

    // Select user from dropdown
    const selectUser = (user) => {
        setRecipient(`@${user.username}`);
        setResolvedAddress(user.wallet_address);
        setSuggestions([]);
        setShowSuggestions(false);
    };

    // QR Scanner
    const startScanner = async () => {
        setScanning(true);
        try {
            const html5QrCode = new Html5Qrcode('qr-reader');
            scannerRef.current = html5QrCode;
            await html5QrCode.start(
                { facingMode: 'environment' },
                { fps: 10, qrbox: { width: 250, height: 250 } },
                (text) => {
                    // Check if it's a valid Algorand address
                    const addr = text.replace('algorand://', '').split('?')[0];
                    if (isValidAddress(addr)) {
                        setRecipient(addr);
                        setResolvedAddress(addr);
                        showToast('Address scanned');
                    } else {
                        setRecipient(text);
                    }
                    stopScanner();
                },
                () => { } // ignore scan errors
            );
        } catch (err) {
            console.error('Scanner error:', err);
            showToast('Camera access denied');
            setScanning(false);
        }
    };

    const stopScanner = async () => {
        if (scannerRef.current) {
            try { await scannerRef.current.stop(); } catch { }
            scannerRef.current = null;
        }
        setScanning(false);
    };

    const executeSend = async () => {
        const toAddress = resolvedAddress;
        if (!toAddress) { showToast('Invalid recipient'); return; }
        if (!amount || parseFloat(amount) <= 0) { showToast('Enter a valid amount'); return; }
        if (!connectedAddress) {
            try { await connect(); } catch { showToast('Please connect wallet first'); return; }
        }

        setLoading(true);
        try {
            const txn = await buildPaymentTxn({
                from: connectedAddress,
                to: toAddress,
                amount: parseFloat(amount),
                note,
            });

            // Sign with Pera Wallet
            const signedTxn = await signTransactions([[{ txn, signers: [connectedAddress] }]]);

            // Submit to Algorand
            const txId = await submitTransaction(signedTxn[0]);

            // Save metadata to backend
            await api.post('/api/transactions', {
                txn_id: txId,
                receiver_address: toAddress,
                amount: parseFloat(amount),
                asset_type: 'ALGO',
                asset_id: 0,
                note,
            });

            setSuccess(true);
            setTimeout(() => {
                setSuccess(false);
                fetchBalance(connectedAddress);
                navigate('/');
            }, 2000);

        } catch (err) {
            console.error('Send error:', err);
            const msg = err.message || 'Transaction failed';
            if (msg.includes('below min') || msg.includes('balance')) {
                showToast('Insufficient balance — account needs ≥0.1 ALGO minimum');
            } else {
                showToast(msg);
            }
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="success-overlay" style={{ position: 'relative', height: 'calc(100vh - 80px)' }}>
                <div className="success-check">✓</div>
                <div className="success-text">Transfer Complete</div>
            </div>
        );
    }

    return (
        <div>
            <div className="section-label">— The Transfer</div>

            <div style={{ maxWidth: 500 }}>
                <div className="field-group" style={{ position: 'relative' }}>
                    <label className="field-label">Pay To</label>
                    <div className="field-input-wrap" style={{ display: 'flex', gap: 8 }}>
                        <input
                            className="field-input"
                            placeholder="username or address"
                            value={recipient}
                            onChange={(e) => resolveRecipient(e.target.value)}
                            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                        />
                        <button
                            type="button"
                            onClick={scanning ? stopScanner : startScanner}
                            style={{
                                background: 'none',
                                border: '1px solid var(--color-border-strong)',
                                width: 44,
                                height: 44,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                                transition: 'background 0.12s',
                            }}
                            title="Scan QR code"
                            onMouseEnter={(e) => e.target.style.background = 'var(--color-lime)'}
                            onMouseLeave={(e) => e.target.style.background = 'none'}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2" />
                                <rect x="7" y="7" width="4" height="4" />
                                <rect x="13" y="7" width="4" height="4" />
                                <rect x="7" y="13" width="4" height="4" />
                                <path d="M13 13h4v4h-4z" />
                            </svg>
                        </button>
                    </div>

                    {/* Username autocomplete dropdown */}
                    {showSuggestions && suggestions.length > 0 && (
                        <div style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            right: 0,
                            background: 'white',
                            border: '1px solid var(--color-border-strong)',
                            borderTop: 'none',
                            zIndex: 20,
                            maxHeight: 200,
                            overflowY: 'auto',
                        }}>
                            {suggestions.map((u) => (
                                <div
                                    key={u.id}
                                    onMouseDown={() => selectUser(u)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 10,
                                        padding: '10px 12px',
                                        cursor: 'pointer',
                                        borderBottom: '1px solid var(--color-border)',
                                        transition: 'background 0.1s',
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(230,255,43,0.15)'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                                >
                                    <div className="avatar xs">{getInitials(u.display_name || u.username)}</div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: 13, fontWeight: 600 }}>{u.display_name || u.username}</div>
                                        <div style={{ fontSize: 11, color: 'var(--color-muted)', fontFamily: 'var(--font-mono)' }}>@{u.username}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {resolvedAddress && !isValidAddress(recipient) && (
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-muted)', marginTop: 4 }}>
                            → {resolvedAddress.slice(0, 12)}...{resolvedAddress.slice(-6)}
                        </div>
                    )}
                </div>

                {/* QR Scanner */}
                {scanning && (
                    <div style={{ marginBottom: 20, border: '1px solid var(--color-petrol)', position: 'relative' }}>
                        <div id="qr-reader" style={{ width: '100%' }}></div>
                        <button
                            onClick={stopScanner}
                            style={{
                                position: 'absolute', top: 8, right: 8,
                                background: 'var(--color-petrol)', color: 'var(--color-lime)',
                                border: 'none', width: 28, height: 28, cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 16, zIndex: 5,
                            }}
                        >✕</button>
                    </div>
                )}

                <div className="field-group">
                    <label className="field-label">Amount</label>
                    <div>
                        <input
                            className="amount-input"
                            placeholder="0.00"
                            type="number"
                            step="0.01"
                            min="0"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                        />
                    </div>
                    <div className="amount-convert">≈ ₹{algoToINR(amount || 0)} INR</div>
                </div>

                <div className="field-group">
                    <label className="field-label">Note</label>
                    <div className="field-input-wrap">
                        <input
                            className="field-input sm"
                            placeholder="what's this for?"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                        />
                    </div>
                </div>

                <button
                    className="btn-primary"
                    onClick={executeSend}
                    disabled={loading || !resolvedAddress || !amount}
                    style={{ marginTop: 28 }}
                >
                    {loading ? (
                        <div className="loading-spinner" style={{ width: 16, height: 16, borderWidth: 2 }}></div>
                    ) : (
                        <>
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 8h12M10 4l4 4-4 4" /></svg>
                            Execute Transfer
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
