import { useEffect, useState, useRef } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import usePeraWallet from '../hooks/usePeraWallet';
import useWalletStore from '../store/useWalletStore';
import useAuthStore from '../store/useAuthStore';
import api from '../api/axios';
import { useToast } from '../App';
import { shortenAddress } from '../utils/algorand';

export default function Settings() {
    const { logout } = useAuth0();
    const { connect, disconnect, connectedAddress } = usePeraWallet();
    const { user } = useAuthStore();
    const showToast = useToast();

    const [voiceProfile, setVoiceProfile] = useState(null);
    const [voiceLoading, setVoiceLoading] = useState(true);
    const fileInputRef = useRef(null);
    const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);

    useEffect(() => { fetchVoiceProfile(); }, []);

    const fetchVoiceProfile = async () => {
        try {
            const res = await api.get('/api/voice/profile');
            setVoiceProfile(res.data.profile);
        } catch (err) { console.error(err); }
        finally { setVoiceLoading(false); }
    };

    const handleVoiceUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('voice_sample', file);

        try {
            showToast('Cloning voice...');
            const res = await api.post('/api/voice/clone', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setVoiceProfile(res.data.profile);
            showToast('Voice cloned successfully');
        } catch (err) {
            showToast(err.response?.data?.error || 'Voice clone failed');
        }
    };

    const deleteVoice = async () => {
        try {
            await api.delete('/api/voice/profile');
            setVoiceProfile(null);
            showToast('Voice profile deleted');
        } catch (err) {
            showToast('Failed to delete voice profile');
        }
    };

    const toggleVoiceSetting = async (key) => {
        if (!voiceProfile) return;
        try {
            const res = await api.put('/api/voice/toggle', {
                [key]: !voiceProfile[key],
            });
            setVoiceProfile(res.data.profile);
        } catch (err) {
            console.error(err);
        }
    };

    const testTTS = async () => {
        try {
            showToast('Generating voice...');
            const res = await api.post('/api/voice/generate', { text: 'Sent 10 ALGO to your friend!' }, { responseType: 'blob' });
            const url = URL.createObjectURL(res.data);
            const audio = new Audio(url);
            audio.play();
        } catch (err) {
            showToast('TTS failed');
        }
    };

    return (
        <div>
            <div className="section-label">— Settings</div>

            {/* Profile */}
            <div className="settings-card">
                <div className="settings-card-title">Profile</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                    <div className="avatar" style={{ width: 48, height: 48, fontSize: 18 }}>
                        {user?.display_name?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <div>
                        <div style={{ fontSize: 16, fontWeight: 600 }}>{user?.display_name || 'User'}</div>
                        <div style={{ fontSize: 12, color: 'var(--color-muted)', fontFamily: 'var(--font-mono)' }}>@{user?.username}</div>
                        <div style={{ fontSize: 11, color: 'var(--color-muted)' }}>{user?.email}</div>
                    </div>
                </div>
            </div>

            {/* Wallet */}
            <div className="settings-card">
                <div className="settings-card-title">Pera Wallet</div>
                {connectedAddress ? (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontSize: 13, fontWeight: 500 }}>Connected</div>
                                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-muted)', marginTop: 2 }}>
                                    {shortenAddress(connectedAddress, 8)}
                                </div>
                            </div>
                            <button className="link-btn" onClick={() => setShowDisconnectConfirm(true)}>Disconnect</button>
                        </div>
                    </div>
                ) : (
                    <button className="btn-primary" style={{ height: 44 }} onClick={connect}>
                        Connect Pera Wallet
                    </button>
                )}
            </div>

            {/* Voice */}
            <div className="settings-card">
                <div className="settings-card-title">Voice Clone — ElevenLabs</div>

                {voiceLoading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}><div className="loading-spinner"></div></div>
                ) : voiceProfile ? (
                    <>
                        <div style={{ fontSize: 13, marginBottom: 16 }}>
                            <span className="status-pill confirmed">Voice Active</span>
                            <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--color-muted)', fontFamily: 'var(--font-mono)' }}>
                                ID: {voiceProfile.elevenlabs_voice_id?.slice(0, 12)}...
                            </span>
                        </div>

                        <div className="toggle-row">
                            <div>
                                <div className="toggle-label">Voice on Send</div>
                                <div className="toggle-desc">Play voice after sending payments</div>
                            </div>
                            <button
                                className={`toggle-switch ${voiceProfile.voice_on_send ? 'on' : ''}`}
                                onClick={() => toggleVoiceSetting('voice_on_send')}
                            />
                        </div>

                        <div className="toggle-row">
                            <div>
                                <div className="toggle-label">Voice on Pay</div>
                                <div className="toggle-desc">Play voice when settling splits</div>
                            </div>
                            <button
                                className={`toggle-switch ${voiceProfile.voice_on_pay ? 'on' : ''}`}
                                onClick={() => toggleVoiceSetting('voice_on_pay')}
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 16 }}>
                            <button className="btn-lime" onClick={testTTS}>Test Voice</button>
                            <button className="btn-secondary" style={{ color: 'var(--color-petrol)', borderColor: 'var(--color-border-strong)' }} onClick={deleteVoice}>Delete Clone</button>
                        </div>
                    </>
                ) : (
                    <div>
                        <div style={{ fontSize: 12, color: 'var(--color-muted)', marginBottom: 16, lineHeight: 1.6 }}>
                            Record a 30-second voice sample to create your AI voice clone. Your cloned voice will be used for payment confirmations.
                        </div>
                        <input ref={fileInputRef} type="file" accept="audio/*" style={{ display: 'none' }} onChange={handleVoiceUpload} />
                        <button className="btn-primary" style={{ height: 44 }} onClick={() => fileInputRef.current?.click()}>
                            Upload Voice Sample
                        </button>
                    </div>
                )}
            </div>

            {/* Notification Sounds */}
            <div className="settings-card">
                <div className="settings-card-title">Notification Sounds</div>

                <div className="toggle-row">
                    <div>
                        <div className="toggle-label">Incoming Payment Sound</div>
                        <div className="toggle-desc">Play a chime when you receive funds</div>
                    </div>
                    <button
                        className={`toggle-switch ${localStorage.getItem('sound_incoming') !== 'false' ? 'on' : ''}`}
                        onClick={() => {
                            const current = localStorage.getItem('sound_incoming') !== 'false';
                            localStorage.setItem('sound_incoming', !current);
                            showToast(!current ? 'Incoming sound on' : 'Incoming sound off');
                            // Force re-render
                            setVoiceLoading(v => !v);
                            setTimeout(() => setVoiceLoading(v => !v), 0);
                        }}
                    />
                </div>

                <div className="toggle-row">
                    <div>
                        <div className="toggle-label">Outgoing Payment Sound</div>
                        <div className="toggle-desc">Play confirmation when you send payments</div>
                    </div>
                    <button
                        className={`toggle-switch ${localStorage.getItem('sound_outgoing') !== 'false' ? 'on' : ''}`}
                        onClick={() => {
                            const current = localStorage.getItem('sound_outgoing') !== 'false';
                            localStorage.setItem('sound_outgoing', !current);
                            showToast(!current ? 'Outgoing sound on' : 'Outgoing sound off');
                            setVoiceLoading(v => !v);
                            setTimeout(() => setVoiceLoading(v => !v), 0);
                        }}
                    />
                </div>
            </div>

            {/* Sign Out */}
            <div className="settings-card" style={{ background: 'var(--color-petrol)', color: 'var(--color-cream)' }}>
                <button
                    className="btn-secondary"
                    style={{ width: '100%' }}
                    onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
                >
                    Sign Out
                </button>
            </div>

            {/* Disconnect Confirmation Modal */}
            {showDisconnectConfirm && (
                <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowDisconnectConfirm(false)}>
                    <div className="modal" style={{ width: 400 }}>
                        <div className="modal-header">
                            <span className="modal-title">Disconnect Wallet</span>
                            <button className="modal-close" onClick={() => setShowDisconnectConfirm(false)}>✕</button>
                        </div>
                        <div className="modal-body">
                            <div style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 8 }}>
                                Are you sure you want to disconnect your Pera Wallet?
                            </div>
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-muted)', marginBottom: 20 }}>
                                {shortenAddress(connectedAddress, 8)}
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--color-warning)', marginBottom: 20 }}>
                                You will need to reconnect to send payments or settle split bills.
                            </div>
                            <div className="confirm-actions">
                                <button className="btn-lime" style={{ height: 48 }} onClick={() => setShowDisconnectConfirm(false)}>
                                    Cancel
                                </button>
                                <button
                                    className="btn-primary"
                                    style={{ height: 48 }}
                                    onClick={() => {
                                        disconnect();
                                        setShowDisconnectConfirm(false);
                                        showToast('Wallet disconnected');
                                    }}
                                >
                                    Disconnect
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
