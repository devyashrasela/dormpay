import { useEffect, useState, useRef } from 'react';
import api from '../api/axios';
import ReactMarkdown from 'react-markdown';

export default function AIChat() {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [sessionId, setSessionId] = useState(null);
    const [newMsgIds, setNewMsgIds] = useState(new Set());
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Generate a fresh session on mount (new chat every time)
    useEffect(() => {
        inputRef.current?.focus();
        startNewSession();
    }, []);

    // Listen for loadSession events from sidebar
    useEffect(() => {
        const handler = (e) => {
            loadSession(e.detail);
        };
        window.addEventListener('loadChatSession', handler);
        return () => window.removeEventListener('loadChatSession', handler);
    }, []);

    const startNewSession = () => {
        const newId = crypto.randomUUID();
        setSessionId(newId);
        setMessages([]);
        setNewMsgIds(new Set());
        inputRef.current?.focus();
    };

    const loadSession = async (sid) => {
        try {
            setSessionId(sid);
            setNewMsgIds(new Set());
            const res = await api.get(`/api/chat/history?session_id=${sid}`);
            setMessages(res.data.history || []);
        } catch (err) {
            console.error('Failed to load session:', err);
        }
    };

    const sendMessage = async (overrideMsg) => {
        const msgToSend = overrideMsg || input.trim();
        if (!msgToSend || loading) return;
        if (!overrideMsg) setInput('');
        setMessages((prev) => [...prev, { role: 'user', message: msgToSend, id: Date.now() }]);

        setLoading(true);
        try {
            const res = await api.post('/api/chat', { message: msgToSend, session_id: sessionId });
            // If this is the first message, we might get a new session_id back
            if (res.data.session_id && res.data.session_id !== sessionId) {
                setSessionId(res.data.session_id);
            }
            const newId = Date.now() + 1;
            setNewMsgIds((prev) => new Set(prev).add(newId));
            setMessages((prev) => [...prev, { role: 'assistant', message: res.data.response, id: newId }]);
            // Trigger sidebar refresh
            window.dispatchEvent(new Event('chatSessionUpdated'));
        } catch (err) {
            setMessages((prev) => [...prev, { role: 'assistant', message: 'Sorry, I couldn\'t process that. Please try again.', id: Date.now() + 1 }]);
        } finally {
            setLoading(false);
        }
    };

    const clearHistory = async () => {
        try {
            await api.delete('/api/chat/history');
            startNewSession();
            window.dispatchEvent(new Event('chatSessionUpdated'));
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
                <div style={{ display: 'flex', gap: 8 }}>
                    <button className="link-btn" onClick={() => { startNewSession(); window.dispatchEvent(new Event('chatSessionUpdated')); }}>New Chat</button>
                    {messages.length > 0 && (
                        <button className="link-btn" onClick={clearHistory}>Clear All</button>
                    )}
                </div>
            </div>

            {/* Messages */}
            <div className="chat-messages">
                {messages.length === 0 && !loading && (
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
                                    onClick={() => sendMessage(q)}
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
                        {msg.role === 'assistant' ? (
                            <div className="markdown-body">
                                {newMsgIds.has(msg.id) ? (
                                    <TypewriterMarkdown text={msg.message} scrollRef={messagesEndRef} />
                                ) : (
                                    <ReactMarkdown>{msg.message}</ReactMarkdown>
                                )}
                            </div>
                        ) : (
                            msg.message
                        )}
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
                    ref={inputRef}
                    className="chat-input"
                    placeholder="Ask about your transactions..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={loading}
                />
                <button className="chat-send-btn" onClick={() => sendMessage()} disabled={loading || !input.trim()}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 8h12M10 4l4 4-4 4" /></svg>
                </button>
            </div>
        </div>
    );
}

function TypewriterMarkdown({ text, speed = 10, scrollRef }) {
    const [displayedText, setDisplayedText] = useState('');
    const [idx, setIdx] = useState(0);

    useEffect(() => {
        if (idx < text.length) {
            const timer = setTimeout(() => {
                setDisplayedText((prev) => prev + text.charAt(idx));
                setIdx(idx + 1);
                if (scrollRef?.current) {
                    scrollRef.current.scrollIntoView({ behavior: 'auto' });
                }
            }, speed);
            return () => clearTimeout(timer);
        }
    }, [idx, text, speed, scrollRef]);

    return <ReactMarkdown>{displayedText}</ReactMarkdown>;
}
