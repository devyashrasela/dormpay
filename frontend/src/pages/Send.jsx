import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import usePeraWallet from '../hooks/usePeraWallet';
import useWalletStore from '../store/useWalletStore';
import { useToast } from '../App';
import api from '../api/axios';
import { buildPaymentTxn, submitTransaction, isValidAddress } from '../utils/algorand';
import { algoToINR } from '../utils/formatters';

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
    const debounceRef = useRef(null);

    // Resolve @username to wallet address (debounced)
    const resolveRecipient = useCallback((value) => {
        setRecipient(value);
        setResolvedAddress(null);

        // Clear any pending debounce
        if (debounceRef.current) clearTimeout(debounceRef.current);

        if (value.startsWith('@')) {
            const username = value.slice(1);
            if (username.length >= 3) {
                debounceRef.current = setTimeout(async () => {
                    try {
                        const res = await api.get(`/api/users/lookup/${username}`);
                        if (res.data.user?.wallet_address) {
                            setResolvedAddress(res.data.user.wallet_address);
                        }
                    } catch { /* not found */ }
                }, 400);
            }
        } else if (isValidAddress(value)) {
            setResolvedAddress(value);
        }
    }, []);

    const executeSend = async () => {
        const toAddress = resolvedAddress;
        if (!toAddress) { showToast('Invalid recipient'); return; }
        if (!amount || parseFloat(amount) <= 0) { showToast('Enter a valid amount'); return; }
        if (!connectedAddress) {
            try { await connect(); } catch { showToast('Please connect wallet first'); return; }
        }

        setLoading(true);
        try {
            // Build transaction
            const txn = await buildPaymentTxn({
                from: connectedAddress,
                to: toAddress,
                amount: parseFloat(amount),
                note,
            });

            // Sign with Pera Wallet — pass raw txn in 2D array [[{txn}]]
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

            // Show success
            setSuccess(true);
            setTimeout(() => {
                setSuccess(false);
                fetchBalance(connectedAddress);
                navigate('/');
            }, 2000);

        } catch (err) {
            console.error('Send error:', err);
            showToast(err.message || 'Transaction failed');
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
                <div className="field-group">
                    <label className="field-label">Pay To</label>
                    <div className="field-input-wrap">
                        <input
                            className="field-input"
                            placeholder="@username or address"
                            value={recipient}
                            onChange={(e) => resolveRecipient(e.target.value)}
                        />
                    </div>
                    {resolvedAddress && recipient.startsWith('@') && (
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-muted)', marginTop: 4 }}>
                            → {resolvedAddress.slice(0, 12)}...{resolvedAddress.slice(-6)}
                        </div>
                    )}
                </div>

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
