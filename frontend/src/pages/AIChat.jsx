import { useEffect, useState, useRef } from 'react';
import api from '../api/axios';

export default function AIChat() {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        fetchHistory();
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const fetchHistory = async () => {
        try {
            const res = await api.get('/api/chat/history?limit=50');
            setMessages(res.data.history || []);
        } catch (err) {
            console.error('Failed to fetch chat history:', err);
        }
    };

    const sendMessage = async () => {
        if (!input.trim() || loading) return;
        const userMsg = input.trim();
        setInput('');
        setMessages((prev) => [...prev, { role: 'user', message: userMsg, id: Date.now() }]);

        setLoading(true);
        try {
            const res = await api.post('/api/chat', { message: userMsg });
            setMessages((prev) => [...prev, { role: 'assistant', message: res.data.response, id: Date.now() + 1 }]);
        } catch (err) {
            setMessages((prev) => [...prev, { role: 'assistant', message: 'Sorry, I couldn\'t process that. Please try again.', id: Date.now() + 1 }]);
        } finally {
            setLoading(false);
        }
    };

    const clearHistory = async () => {
        try {
            await api.delete('/api/chat/history');
            setMessages([]);
        } catch (err) {
            console.error('Failed to clear history:', err);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    return (
        <div className="chat-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div className="section-label" style={{ margin: 0 }}>— AI Assistant</div>
                {messages.length > 0 && (
                    <button className="link-btn" onClick={clearHistory}>Clear History</button>
                )}
            </div>

            {/* Messages */}
            <div className="chat-messages">
                {messages.length === 0 && (
                    <div style={{ padding: '40px 0', textAlign: 'center' }}>
                        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 24, fontWeight: 300, marginBottom: 8, color: 'var(--color-petrol)' }}>
                            DormPay AI
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--color-muted)', maxWidth: 300, margin: '0 auto', lineHeight: 1.6 }}>
                            Ask about your spending patterns, transaction history, or get help with split bills. I have context on all your data.
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 20 }}>
                            {['How much did I spend this month?', 'Show my top recipients', 'Any pending splits?'].map((q) => (
                                <button
                                    key={q}
                                    style={{
                                        padding: '8px 14px',
                                        fontSize: 11,
                                        border: '1px solid var(--color-border-strong)',
                                        background: 'white',
                                        cursor: 'pointer',
                                        fontFamily: 'var(--font-sans)',
                                        color: 'var(--color-petrol)',
                                        transition: 'background 0.12s',
                                    }}
                                    onClick={() => { setInput(q); }}
                                    onMouseEnter={(e) => e.target.style.background = 'var(--color-lime)'}
                                    onMouseLeave={(e) => e.target.style.background = 'white'}
                                >
                                    {q}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`chat-bubble ${msg.role}`}
                    >
                        {msg.message}
                    </div>
                ))}

                {loading && (
                    <div className="chat-bubble assistant" style={{ display: 'flex', gap: 4, padding: '18px 22px' }}>
                        <span style={{ animation: 'pulse 1s infinite', animationDelay: '0s' }}>●</span>
                        <span style={{ animation: 'pulse 1s infinite', animationDelay: '0.2s' }}>●</span>
                        <span style={{ animation: 'pulse 1s infinite', animationDelay: '0.4s' }}>●</span>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="chat-input-bar">
                <input
                    className="chat-input"
                    placeholder="Ask about your transactions..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={loading}
                />
                <button className="chat-send-btn" onClick={sendMessage} disabled={loading || !input.trim()}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 8h12M10 4l4 4-4 4" /></svg>
                </button>
            </div>
        </div>
    );
}
