import { QRCodeSVG } from 'qrcode.react';
import usePeraWallet from '../hooks/usePeraWallet';
import useAuthStore from '../store/useAuthStore';
import { useToast } from '../App';
import { shortenAddress } from '../utils/algorand';

export default function Receive() {
    const { connectedAddress, connect } = usePeraWallet();
    const { user } = useAuthStore();
    const showToast = useToast();

    const copyAddress = () => {
        if (connectedAddress) {
            navigator.clipboard.writeText(connectedAddress);
            showToast('Address copied');
        }
    };

    return (
        <div>
            <div className="section-label">— Receive Payment</div>

            {connectedAddress ? (
                <div className="qr-card">
                    <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--color-muted)' }}>
                        Scan to Pay @{user?.username || 'you'}
                    </div>

                    <div style={{ border: '1px solid var(--color-petrol)', padding: 16, background: 'white' }}>
                        <QRCodeSVG
                            value={connectedAddress}
                            size={200}
                            bgColor="#FFFFFF"
                            fgColor="#0B4650"
                            level="M"
                        />
                    </div>

                    <div style={{ textAlign: 'center' }}>
                        <div
                            style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-muted)', cursor: 'pointer', wordBreak: 'break-all', lineHeight: 1.6 }}
                            onClick={copyAddress}
                            title="Click to copy"
                        >
                            {connectedAddress}
                        </div>
                        <button
                            className="link-btn"
                            style={{ marginTop: 8 }}
                            onClick={copyAddress}
                        >
                            Copy Address
                        </button>
                    </div>
                </div>
            ) : (
                <div style={{ maxWidth: 400 }}>
                    <div className="hero-card" style={{ textAlign: 'center' }}>
                        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 24, fontWeight: 300, marginBottom: 16 }}>
                            Connect your wallet to receive payments
                        </div>
                        <button className="btn-primary" style={{ width: 'auto', height: 44, padding: '0 28px' }} onClick={connect}>
                            Connect Pera Wallet
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
