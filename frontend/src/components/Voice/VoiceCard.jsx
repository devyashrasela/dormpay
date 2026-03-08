import { useState } from 'react';
import api from '../../api/axios';

export default function VoiceCard({ voice, onUpdate, onDelete, showToast }) {
    const [testing, setTesting] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [outMsg, setOutMsg] = useState(voice.outgoing_message || 'Payment sent successfully!');
    const [inMsg, setInMsg] = useState(voice.incoming_message || 'You received a payment!');
    const [savingMsg, setSavingMsg] = useState(false);

    const handleToggle = async (field) => {
        try {
            const res = await api.put(`/api/voice/toggle/${voice.id}`, {
                [field]: !voice[field],
            });
            onUpdate(res.data.profiles);
        } catch (err) {
            showToast('Failed to update setting');
        }
    };

    const handleSaveMessages = async () => {
        try {
            setSavingMsg(true);
            const res = await api.put(`/api/voice/toggle/${voice.id}`, {
                outgoing_message: outMsg,
                incoming_message: inMsg,
            });
            onUpdate(res.data.profiles);
            showToast('Messages saved');
        } catch (err) {
            showToast('Failed to save messages');
        } finally {
            setSavingMsg(false);
        }
    };

    const handleTest = async () => {
        try {
            setTesting(true);
            showToast('Generating voice...');
            const res = await api.post(
                '/api/voice/generate',
                { text: outMsg || 'Payment sent successfully!', voice_id: voice.id },
                { responseType: 'blob' }
            );
            const url = URL.createObjectURL(res.data);
            const audio = new Audio(url);
            audio.play();
        } catch (err) {
            showToast('TTS test failed');
        } finally {
            setTesting(false);
        }
    };

    const handleDelete = async () => {
        try {
            setDeleting(true);
            await api.delete(`/api/voice/profile/${voice.id}`);
            onDelete(voice.id);
            showToast('Voice deleted');
        } catch (err) {
            showToast('Failed to delete voice');
        } finally {
            setDeleting(false);
        }
    };

    const inputStyle = {
        width: '100%', padding: '8px 10px', borderRadius: 6,
        border: '1px solid var(--color-border)', background: 'white',
        color: 'var(--color-petrol)', fontSize: 12, marginTop: 6,
        fontFamily: 'var(--font-body)', boxSizing: 'border-box',
    };

    return (
        <div className={`voice-card ${!voice.is_active ? 'voice-card--inactive' : ''}`}>
            <div className="voice-card-header">
                <div className="voice-card-info">
                    <div className="voice-card-name">{voice.voice_name}</div>
                    <div className="voice-card-id">
                        {voice.elevenlabs_voice_id?.slice(0, 10)}...
                    </div>
                </div>
                <div className="voice-card-actions">
                    <button
                        className="voice-card-test-btn"
                        onClick={handleTest}
                        disabled={testing}
                        title="Test this voice"
                    >
                        {testing ? '⏳' : '▶'}
                    </button>
                    <button
                        className="voice-card-delete-btn"
                        onClick={handleDelete}
                        disabled={deleting}
                        title="Delete this voice"
                    >
                        ✕
                    </button>
                </div>
            </div>

            <div className="voice-card-controls">
                {/* Master toggle */}
                <div className="toggle-row">
                    <div>
                        <div className="toggle-label">Active</div>
                        <div className="toggle-desc">Enable this voice</div>
                    </div>
                    <button
                        className={`toggle-switch ${voice.is_active ? 'on' : ''}`}
                        onClick={() => handleToggle('is_active')}
                    />
                </div>

                {/* Outgoing toggle + message */}
                <div className="toggle-row" style={{ flexWrap: 'wrap' }}>
                    <div>
                        <div className="toggle-label">
                            Outgoing
                            {voice.use_for_outgoing && <span className="voice-badge outgoing">SENDING</span>}
                        </div>
                        <div className="toggle-desc">Play when you send payments</div>
                    </div>
                    <button
                        className={`toggle-switch ${voice.use_for_outgoing ? 'on' : ''}`}
                        onClick={() => handleToggle('use_for_outgoing')}
                        disabled={!voice.is_active}
                    />
                    {voice.use_for_outgoing && (
                        <div style={{ width: '100%', marginTop: 8 }}>
                            <label style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-muted)' }}>
                                Outgoing Message
                            </label>
                            <input
                                type="text"
                                value={outMsg}
                                onChange={(e) => setOutMsg(e.target.value)}
                                placeholder="e.g. Payment sent successfully!"
                                style={inputStyle}
                            />
                        </div>
                    )}
                </div>

                {/* Incoming toggle + message */}
                <div className="toggle-row" style={{ flexWrap: 'wrap' }}>
                    <div>
                        <div className="toggle-label">
                            Incoming
                            {voice.use_for_incoming && <span className="voice-badge incoming">RECEIVING</span>}
                        </div>
                        <div className="toggle-desc">Play when you receive payments</div>
                    </div>
                    <button
                        className={`toggle-switch ${voice.use_for_incoming ? 'on' : ''}`}
                        onClick={() => handleToggle('use_for_incoming')}
                        disabled={!voice.is_active}
                    />
                    {voice.use_for_incoming && (
                        <div style={{ width: '100%', marginTop: 8 }}>
                            <label style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-muted)' }}>
                                Incoming Message
                            </label>
                            <input
                                type="text"
                                value={inMsg}
                                onChange={(e) => setInMsg(e.target.value)}
                                placeholder="e.g. You received a payment!"
                                style={inputStyle}
                            />
                        </div>
                    )}
                </div>

                {/* Save messages button — show if either message field is visible */}
                {(voice.use_for_outgoing || voice.use_for_incoming) && (
                    <button
                        className="btn-lime"
                        style={{ width: '100%', marginTop: 12, fontSize: 11, padding: '8px 0' }}
                        onClick={handleSaveMessages}
                        disabled={savingMsg}
                    >
                        {savingMsg ? 'Saving...' : 'Save Messages'}
                    </button>
                )}
            </div>
        </div>
    );
}
