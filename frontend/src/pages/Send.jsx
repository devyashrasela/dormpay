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
    const [resolvedAddress, setResolvedAddress] = useState(null);
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [scanning, setScanning] = useState(false);
    const debounceRef = useRef(null);
    const scannerRef = useRef(null);

    // Confirmation & transaction status state
    const [showConfirm, setShowConfirm] = useState(false);
    const [txnStatus, setTxnStatus] = useState(null); // null | 'signing' | 'submitting' | 'saving' | 'success' | 'error'
    const [txnError, setTxnError] = useState('');

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
            const query = value.startsWith('@') ? value.slice(1) : value;
            if (query.length >= 2) {
                debounceRef.current = setTimeout(async () => {
                    try {
                        const res = await api.get(`/api/users/search?q=${encodeURIComponent(query)}`);
                        const users = res.data.users || [];
                        setSuggestions(users);
                        setShowSuggestions(users.length > 0);
                        const exact = users.find(u => u.username === query);
                        if (exact) setResolvedAddress(exact.wallet_address);
                    } catch { /* ignore */ }
                }, 400);
            }
        }
    }, []);

    const selectUser = (user) => {
        setRecipient(`@${user.username}`);
        setResolvedAddress(user.wallet_address);
        setSuggestions([]);
        setShowSuggestions(false);
    };

    // Integer-only amount handler
    const handleAmountChange = (e) => {
        const val = e.target.value;
        // Only allow digits (integer values)
        if (val === '' || /^\d+$/.test(val)) {
            setAmount(val);
        }
    };

    // QR Scanner
    const startScanner = async () => {
        setScanning(true);

        // 1. Explicitly request camera permission first
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            // Stop the stream immediately — we just needed the permission grant
            stream.getTracks().forEach(t => t.stop());
        } catch (permErr) {
            console.error('Camera permission error:', permErr);
            if (permErr.name === 'NotAllowedError' || permErr.name === 'PermissionDeniedError') {
                showToast('Camera permission denied — please allow camera access in your browser settings');
            } else if (permErr.name === 'NotFoundError') {
                showToast('No camera found on this device');
            } else {
                showToast('Unable to access camera: ' + (permErr.message || 'Unknown error'));
            }
            setScanning(false);
            return;
        }

        // 2. Wait for the #qr-reader div to render in the DOM
        await new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 100)));

        try {
            const html5QrCode = new Html5Qrcode('qr-reader');
            scannerRef.current = html5QrCode;
            await html5QrCode.start(
                { facingMode: 'environment' },
                { fps: 10, qrbox: { width: 250, height: 250 } },
                (text) => {
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
                () => { }
            );
        } catch (err) {
            console.error('Scanner error:', err);
            showToast('Failed to start scanner — try again');
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

    // Show confirmation before executing
    const handleSendClick = () => {
        const toAddress = resolvedAddress;
        if (!toAddress) { showToast('Invalid recipient'); return; }
        if (!amount || parseInt(amount) <= 0) { showToast('Enter a valid amount (whole numbers only)'); return; }
        setShowConfirm(true);
    };

    // Execute the actual transaction
    const executeSend = async () => {
        setShowConfirm(false);
        const toAddress = resolvedAddress;
        const intAmount = parseInt(amount);

        if (!connectedAddress) {
            try { await connect(); } catch { showToast('Please connect wallet first'); return; }
        }

        setTxnStatus('signing');
        setTxnError('');

        try {
            // Step 1: Build & Sign
            const txn = await buildPaymentTxn({
                from: connectedAddress,
                to: toAddress,
                amount: intAmount,
                note,
            });
            const signedTxn = await signTransactions([[{ txn, signers: [connectedAddress] }]]);

            // Step 2: Submit to Algorand
            setTxnStatus('submitting');
            const txId = await submitTransaction(signedTxn[0]);

            // Step 3: Save to backend
            setTxnStatus('saving');
            await api.post('/api/transactions', {
                txn_id: txId,
                receiver_address: toAddress,
                amount: intAmount,
                asset_type: 'ALGO',
                asset_id: 0,
                note,
            });

            // Success
            setTxnStatus('success');
            setTimeout(() => {
                setTxnStatus(null);
                fetchBalance(connectedAddress);
                navigate('/');
            }, 2500);

        } catch (err) {
            console.error('Send error:', err);
            const msg = err.message || 'Transaction failed';
            if (msg.includes('below min') || msg.includes('balance')) {
                setTxnError('Insufficient balance — account needs ≥0.1 ALGO minimum');
            } else {
                setTxnError(msg);
            }
            setTxnStatus('error');
        }
    };

    const dismissError = () => {
        setTxnStatus(null);
        setTxnError('');
    };

    const displayRecipient = recipient.startsWith('@')
        ? recipient
        : resolvedAddress
            ? `${resolvedAddress.slice(0, 8)}...${resolvedAddress.slice(-6)}`
            : recipient;

    // Transaction Status Overlay
    if (txnStatus) {
        const steps = [
            { key: 'signing', label: 'Signing transaction' },
            { key: 'submitting', label: 'Submitting to Algorand' },
            { key: 'saving', label: 'Recording transaction' },
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
                    {isSuccess ? 'Transfer Complete' : isError ? 'Transaction Failed' : 'Processing Transfer'}
                </div>
                <div className="txn-status-subtitle">
                    {isSuccess
                        ? `${amount} ALGO sent successfully`
                        : isError
                            ? 'Something went wrong during the transaction'
                            : 'Please wait while your transaction is being processed...'}
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
                        <button
                            className="btn-primary"
                            style={{ width: 'auto', height: 44, padding: '0 32px', marginTop: 24 }}
                            onClick={dismissError}
                        >
                            Close
                        </button>
                    </>
                )}
            </div>
        );
    }

    // Confirmation Modal
    if (showConfirm) {
        return (
            <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowConfirm(false)}>
                <div className="modal" style={{ width: 440 }}>
                    <div className="modal-header">
                        <span className="modal-title">Confirm Transfer</span>
                        <button className="modal-close" onClick={() => setShowConfirm(false)}>✕</button>
                    </div>
                    <div className="modal-body">
                        <div className="confirm-amount">
                            {amount} <span style={{ fontSize: 20, opacity: 0.4 }}>ALGO</span>
                        </div>
                        <div className="confirm-detail">
                            <span className="confirm-detail-label">To</span>
                            <span className="confirm-detail-value">{displayRecipient}</span>
                        </div>
                        <div className="confirm-detail">
                            <span className="confirm-detail-label">From</span>
                            <span className="confirm-detail-value" style={{ fontSize: 11 }}>
                                {connectedAddress ? `${connectedAddress.slice(0, 8)}...${connectedAddress.slice(-6)}` : 'Not connected'}
                            </span>
                        </div>
                        {note && (
                            <div className="confirm-detail">
                                <span className="confirm-detail-label">Note</span>
                                <span style={{ fontSize: 13, fontStyle: 'italic', color: 'var(--color-muted)' }}>{note}</span>
                            </div>
                        )}
                        <div className="confirm-detail">
                            <span className="confirm-detail-label">≈ INR</span>
                            <span className="confirm-detail-value">₹{algoToINR(amount || 0)}</span>
                        </div>

                        <div className="confirm-actions">
                            <button
                                className="btn-lime"
                                style={{ height: 48 }}
                                onClick={() => setShowConfirm(false)}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn-primary"
                                style={{ height: 48 }}
                                onClick={executeSend}
                            >
                                Confirm & Send
                            </button>
                        </div>
                    </div>
                </div>
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
                    <label className="field-label">Amount (ALGO)</label>
                    <div>
                        <input
                            className="amount-input"
                            placeholder="0"
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={amount}
                            onChange={handleAmountChange}
                        />
                    </div>
                    <div className="amount-convert">≈ ₹{algoToINR(amount || 0)} INR</div>
                    <div className="integer-hint">Only whole number amounts allowed</div>
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
                    onClick={handleSendClick}
                    disabled={!resolvedAddress || !amount}
                    style={{ marginTop: 28 }}
                >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 8h12M10 4l4 4-4 4" /></svg>
                    Review Transfer
                </button>
            </div>
        </div>
    );
}
