import { useEffect, useState, useRef } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import usePeraWallet from '../hooks/usePeraWallet';
import useWalletStore from '../store/useWalletStore';
import useAuthStore from '../store/useAuthStore';
import api from '../api/axios';
import { useToast } from '../App';
import { shortenAddress } from '../utils/algorand';
import VoiceCard from '../components/Voice/VoiceCard';

export default function Settings() {
    const { logout } = useAuth0();
    const { connect, disconnect, connectedAddress } = usePeraWallet();
    const { user } = useAuthStore();
    const showToast = useToast();

    const [voiceProfiles, setVoiceProfiles] = useState([]);
    const [voiceLoading, setVoiceLoading] = useState(true);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [uploadName, setUploadName] = useState('');
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);
    const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);

    useEffect(() => { fetchVoiceProfiles(); }, []);

    const fetchVoiceProfiles = async () => {
        try {
            const res = await api.get('/api/voice/profiles');
            setVoiceProfiles(res.data.profiles || []);
        } catch (err) { console.error(err); }
        finally { setVoiceLoading(false); }
    };

    const handleVoiceUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const name = uploadName.trim() || `Voice ${voiceProfiles.length + 1}`;

        const formData = new FormData();
        formData.append('voice_sample', file);
        formData.append('voice_name', name);

        try {
            setUploading(true);
            showToast('Cloning voice...');
            const res = await api.post('/api/voice/clone', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setVoiceProfiles(prev => [res.data.profile, ...prev]);
            setShowUploadModal(false);
            setUploadName('');
            showToast('Voice cloned successfully');
        } catch (err) {
            showToast(err.response?.data?.error || 'Voice clone failed');
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleProfilesUpdate = (updatedProfiles) => {
        setVoiceProfiles(updatedProfiles);
    };

    const handleVoiceDelete = (deletedId) => {
        setVoiceProfiles(prev => prev.filter(v => v.id !== deletedId));
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

            {/* Voice Library */}
            <div className="settings-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div className="settings-card-title" style={{ marginBottom: 0 }}>Voice Library</div>
                    <button className="btn-lime" style={{ fontSize: 12, padding: '6px 14px' }} onClick={() => setShowUploadModal(true)}>
                        + Add Voice
                    </button>
                </div>

                {voiceLoading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}><div className="loading-spinner"></div></div>
                ) : voiceProfiles.length > 0 ? (
                    <div className="voice-library">
                        {voiceProfiles.map(v => (
                            <VoiceCard
                                key={v.id}
                                voice={v}
                                onUpdate={handleProfilesUpdate}
                                onDelete={handleVoiceDelete}
                                showToast={showToast}
                            />
                        ))}
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', padding: '24px 16px' }}>
                        <div style={{ fontSize: 32, marginBottom: 8 }}>🎙️</div>
                        <div style={{ fontSize: 13, color: 'var(--color-muted)', marginBottom: 16, lineHeight: 1.6 }}>
                            No voices yet. Upload a 30-second voice sample to create your first AI voice clone.
                        </div>
                        <button className="btn-primary" style={{ height: 44 }} onClick={() => setShowUploadModal(true)}>
                            Upload Your First Voice
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

            {/* Voice Upload Modal */}
            {showUploadModal && (
                <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowUploadModal(false)}>
                    <div className="modal" style={{ width: 420 }}>
                        <div className="modal-header">
                            <span className="modal-title">Add New Voice</span>
                            <button className="modal-close" onClick={() => { setShowUploadModal(false); setUploadName(''); }}>✕</button>
                        </div>
                        <div className="modal-body">
                            <div style={{ fontSize: 13, color: 'var(--color-muted)', marginBottom: 16, lineHeight: 1.6 }}>
                                Upload a 30-second voice sample to clone your voice with ElevenLabs AI.
                            </div>

                            <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>Voice Name</label>
                            <input
                                type="text"
                                className="voice-upload-input"
                                placeholder="e.g. My Deep Voice"
                                value={uploadName}
                                onChange={(e) => setUploadName(e.target.value)}
                                style={{
                                    width: '100%', padding: '10px 12px', borderRadius: 8,
                                    border: '1px solid var(--color-border)', background: 'var(--color-surface)',
                                    color: 'var(--color-text)', fontSize: 14, marginBottom: 16,
                                    fontFamily: 'var(--font-body)', boxSizing: 'border-box',
                                }}
                            />

                            <input ref={fileInputRef} type="file" accept="audio/*" style={{ display: 'none' }} onChange={handleVoiceUpload} />
                            <button
                                className="btn-primary"
                                style={{ width: '100%', height: 48 }}
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploading}
                            >
                                {uploading ? 'Cloning...' : '🎙️ Select Audio File'}
                            </button>

                            <div style={{ fontSize: 11, color: 'var(--color-muted)', marginTop: 8, textAlign: 'center' }}>
                                Supports WAV, MP3, WebM, OGG • Max 10MB
                            </div>
                        </div>
                    </div>
                </div>
            )}

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
