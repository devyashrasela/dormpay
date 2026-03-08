import { useAuth0 } from '@auth0/auth0-react';
import logo from '../assets/logo.svg';
import mayankImg from '../assets/mayank.avif';
import devyashImg from '../assets/devyash.avif';
import basilImg from '../assets/basil.avif';
import './LandingPage.css';

/* ── SVG Icon Components ── */
const GithubIcon = () => (
    <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
);

const LinkedInIcon = () => (
    <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
        <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
    </svg>
);

export default function LandingPage() {
    const { loginWithRedirect } = useAuth0();

    return (
        <div className="lp-root">
            {/* ═══ Navigation ═══ */}
            <nav className="lp-nav">
                <div className="lp-nav-brand">
                    <div className="lp-nav-brand-icon">
                        <img src={logo} alt="DormPay" />
                    </div>
                    <span className="lp-nav-brand-name">DORMPAY</span>
                </div>
                <div className="lp-nav-links">
                </div>
                <button className="lp-nav-cta" onClick={() => loginWithRedirect()}>
                    Login
                </button>
            </nav>

            {/* ═══ Hero Section ═══ */}
            <header className="lp-hero">
                <div className="lp-hero-grid">
                    {/* Text Side */}
                    <div className="lp-hero-copy">
                        <div className="lp-badge">
                            Build for the 1% of campus builders
                        </div>

                        <h1 className="lp-headline">
                            STOP<br />
                            <span className="lp-text-outline">WAITING.</span><br />
                            <span className="highlight">START</span><br />
                            SPENDING.
                        </h1>

                        <p className="lp-hero-desc">
                            Instant student payments, dorm settlements, and campus infrastructure built on{' '}
                            <span className="algo-link">Algorand.</span> Total control, zero friction.
                        </p>

                        <div className="lp-hero-actions">
                            <button className="lp-cta-btn" onClick={() => loginWithRedirect()}>
                                Join the Waitlist <span className="arrow">→</span>
                            </button>
                            <div className="lp-security">
                                <div className="bar"></div>
                                Secured by Algorand Pure POS
                            </div>
                        </div>
                    </div>

                    {/* Visual Card Side */}
                    <div className="lp-hero-visuals">
                        <div className="lp-deco-square"></div>

                        <div className="lp-wallet-card">
                            <div className="lp-card-header">
                                <div className="lp-card-dp-logo"><img src={logo} alt="DormPay" style={{ width: 24, height: 24 }} /></div>
                                <div className="lp-card-labels">
                                    <p className="sub">DormPay Platinum</p>
                                    <p className="main">Verified Node</p>
                                </div>
                            </div>

                            <p className="lp-card-assets-label">Total Campus Assets</p>
                            <h3 className="lp-card-assets-amount">4,822.00 ALGO</h3>

                            <div className="lp-card-sub">
                                <div className="number">**** 0422</div>
                                <div className="tier">Premium Student</div>
                            </div>

                            <div className="lp-card-progress">
                                <div className="lp-card-progress-fill"></div>
                            </div>

                            <div className="lp-card-stats">
                                <span>NETWORK LOAD</span>
                                <span>88.4ms</span>
                            </div>
                        </div>

                        {/* Receipt Overlay */}
                        <div className="lp-receipt">
                            <div className="lp-receipt-header">
                                *** DORMPAY RECEIPT ***<br />
                                TRANS_ID: #8829-QX-ALGO
                            </div>
                            <div className="lp-receipt-items">
                                <div className="lp-receipt-row">
                                    <span>Pizza Split</span>
                                    <span>32.00 ALGO</span>
                                </div>
                                <div className="lp-receipt-row">
                                    <span>Dorm Fees</span>
                                    <span>150.50 ALGO</span>
                                </div>
                                <div className="lp-receipt-row rebate">
                                    <span>Fee Rebate</span>
                                    <span>-1.20 ALGO</span>
                                </div>
                            </div>
                            <div className="lp-receipt-total">
                                <span>TOTAL:</span>
                                <span>181.30</span>
                            </div>
                            <div className="lp-receipt-barcode"></div>
                        </div>
                    </div>
                </div>
            </header>

            {/* ═══ Ticker Marquee ═══ */}
            <section className="lp-ticker">
                <div className="lp-ticker-inner">
                    <span>$ALGO Native</span><span className="dot">•</span>
                    <span>0% Fees for Students</span><span className="dot">•</span>
                    <span>Peer-to-Peer Settlements</span><span className="dot">•</span>
                    <span>Next-Gen Campus Rails</span><span className="dot">•</span>
                    <span>$ALGO Native</span><span className="dot">•</span>
                    <span>0% Fees for Students</span><span className="dot">•</span>
                    <span>Peer-to-Peer Settlements</span><span className="dot">•</span>
                    <span>Next-Gen Campus Rails</span>
                </div>
            </section>

            {/* ═══ Features Section ═══ */}
            <section className="lp-features" id="features">
                <h2 className="lp-features-title">High-Octane Features</h2>

                <div className="lp-features-grid">
                    {/* Wallet Expenditure Track */}
                    <div className="lp-feature-card bg-cream">
                        <div className="lp-feature-icon">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                            </svg>
                        </div>
                        <h3 className="lp-feature-title">Wallet Expenditure Track</h3>
                        <p className="lp-feature-desc">
                            Real-time ledger transparency. Every coffee, every textbook, every pizza split recorded with cryptographic certainty.
                        </p>
                        <div className="lp-ledger-widget">
                            <div className="lp-ledger-row red"><span>-15.00 ALGO</span><span>CAFE_METRO</span></div>
                            <div className="lp-ledger-row green"><span>+50.00 ALGO</span><span>STAKE_REWARD</span></div>
                            <div className="lp-ledger-row red"><span>-2.50 ALGO</span><span>TRANS_FEE_BURN</span></div>
                        </div>
                    </div>

                    {/* Voice Alerts */}
                    <div className="lp-feature-card bg-lime">
                        <div className="lp-feature-icon">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                            </svg>
                        </div>
                        <h3 className="lp-feature-title">Voice Alerts by ElevenLabs</h3>
                        <p className="lp-feature-desc">
                            Hyper-personalized AI audio feedback. Your wallet speaks back to you with custom ElevenLabs integration for every transaction.
                        </p>
                        <div className="lp-audio-widget">
                            <button className="lp-audio-play">
                                <svg fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" /></svg>
                            </button>
                            <div className="lp-audio-bars">
                                <div className="lp-audio-bar" style={{ height: 12 }}></div>
                                <div className="lp-audio-bar" style={{ height: 24, animationDelay: '0.1s' }}></div>
                                <div className="lp-audio-bar" style={{ height: 16, animationDelay: '0.2s' }}></div>
                                <div className="lp-audio-bar" style={{ height: 32, animationDelay: '0.3s' }}></div>
                                <div className="lp-audio-bar" style={{ height: 8, animationDelay: '0.4s' }}></div>
                                <div className="lp-audio-bar" style={{ height: 20, animationDelay: '0.5s' }}></div>
                            </div>
                        </div>
                    </div>

                    {/* NFC Fund Transfer */}
                    <div className="lp-feature-card bg-cream">
                        <div className="lp-feature-icon">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                            </svg>
                        </div>
                        <h3 className="lp-feature-title">DormDrop</h3>
                        <p className="lp-feature-desc">
                            The app detects nearby active users using geolocation, queries the backend for users within 50 meters, and displays them as avatars on a radar interface.
                        </p>
                        <div className="lp-nfc-widget">
                            <span>Searching for peers...</span>
                            <div className="lp-nfc-ping"></div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══ Functionality Grid ═══ */}
            <section className="lp-func-section" id="protocol">
                <div className="lp-func-grid">
                    {/* QR Card */}
                    <div className="lp-func-card lime-card lp-func-wide">
                        <h4>Scan QR for instant campus checkout</h4>
                        <div className="lp-func-qr">
                            <svg fill="currentColor" viewBox="0 0 24 24">
                                <path d="M3 3h4v4H3V3zm0 7h4v4H3v-4zm0 7h4v4H3v-4zm7-14h4v4h-4V3zm0 7h4v4h-4v-4zm0 7h4v4h-4v-4zm7-14h4v4h-4V3zm0 7h4v4h-4v-4zM17 17h4v4h-4v-4z" />
                            </svg>
                        </div>
                    </div>

                    {/* Settlement Latency */}
                    <div className="lp-func-card cream-card">
                        <div className="lp-func-big-num">0<span style={{ fontSize: 24 }}>ms</span></div>
                        <div className="lp-func-label">Settlement Latency</div>
                    </div>

                    {/* Split Hostel Bills */}
                    <div className="lp-func-card dark-card">
                        <h4 style={{ marginBottom: 16 }}>Split Hostel Bills</h4>
                        <p style={{ fontSize: 14, fontWeight: 700, opacity: 0.8, textTransform: 'uppercase' }}>
                            Automated distribution across roomies.
                        </p>
                    </div>

                    {/* Active Campus Nodes */}
                    <div className="lp-func-card white-card lp-func-full">
                        <div className="lp-func-stat-row">
                            <span className="desc" style={{ fontSize: 22, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2 }}>a new way to transfer money.</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══ Team Section ═══ */}
            <section className="lp-team" id="team">
                <div className="lp-team-header">
                    <h2 className="lp-team-title">
                        The Minds Behind <br /><span className="lp-text-outline">DormPay</span>
                    </h2>
                </div>

                <div className="lp-team-grid">
                    {/* Mayank Padhi */}
                    <div className="lp-team-card">
                        <div className="lp-team-photo">
                            <img src={mayankImg} alt="Mayank Padhi" />
                        </div>
                        <h3 className="lp-team-name">Mayank Padhi</h3>
                        <div className="lp-team-socials">
                            <a href="https://www.linkedin.com/in/mayank-padhi-zia/" target="_blank" rel="noopener noreferrer"><LinkedInIcon /></a>
                            <a href="https://github.com/Diclo-fenac" target="_blank" rel="noopener noreferrer"><GithubIcon /></a>
                        </div>
                    </div>

                    {/* Devyash Rasela */}
                    <div className="lp-team-card">
                        <div className="lp-team-photo">
                            <img src={devyashImg} alt="Devyash Rasela" />
                        </div>
                        <h3 className="lp-team-name">Devyash Rasela</h3>
                        <div className="lp-team-socials">
                            <a href="https://www.linkedin.com/in/devyash-rasela/" target="_blank" rel="noopener noreferrer"><LinkedInIcon /></a>
                            <a href="https://github.com/devyashrasela" target="_blank" rel="noopener noreferrer"><GithubIcon /></a>
                        </div>
                    </div>

                    {/* Basil Zafar */}
                    <div className="lp-team-card">
                        <div className="lp-team-photo">
                            <img src={basilImg} alt="Basil Zafar" />
                        </div>
                        <h3 className="lp-team-name">Basil Zafar</h3>
                        <div className="lp-team-socials">
                            <a href="https://www.linkedin.com/in/basil-zafar-490b08302/" target="_blank" rel="noopener noreferrer"><LinkedInIcon /></a>
                            <a href="https://github.com/BasilZafar11" target="_blank" rel="noopener noreferrer"><GithubIcon /></a>
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══ CTA Section ═══ */}
            <section className="lp-cta-section">
                <div style={{ maxWidth: 640, margin: '0 auto' }}>
                    <h2>Ready for DormPay?</h2>
                    <p>The future of campus economy is waiting for you.</p>
                    <div className="lp-cta-form">
                        <input className="lp-cta-input" type="email" placeholder="Enter .edu email" />
                        <button className="lp-cta-submit" onClick={() => loginWithRedirect()}>Claim Access</button>
                    </div>
                </div>
            </section>

            {/* ═══ Footer ═══ */}
            <footer className="lp-footer">
                <div className="lp-footer-inner">
                    <div>
                        <div className="lp-footer-brand">
                            <div className="lp-footer-logo"><img src={logo} alt="DormPay" style={{ width: 24, height: 24 }} /></div>
                            <span>DormPay</span>
                        </div>
                        <p className="lp-footer-copy">© 2026 DormPay. Built at AceHack 5.0</p>
                    </div>
                    <div className="lp-footer-links">
                        <div className="lp-footer-col">
                            <span className="col-title">Product</span>
                            <a href="#features">Features</a>
                            <a href="#protocol">How It Works</a>
                            <a href="#team">Team</a>
                            <a href="https://dormpay.gitbook.io/dormpay-docs/" target="_blank" rel="noopener noreferrer">Documentation</a>
                        </div>
                        <div className="lp-footer-col">
                            <span className="col-title">Connect</span>
                            <a href="https://github.com/devyashrasela/dormpay.git" target="_blank" rel="noopener noreferrer">GitHub Repo</a>
                            <a href="mailto:devyashrasela@gmail.com">Email Us</a>
                        </div>
                        <div className="lp-footer-col">
                            <span className="col-title">Team</span>
                            <a href="https://www.linkedin.com/in/mayank-padhi-zia/" target="_blank" rel="noopener noreferrer">Mayank Padhi</a>
                            <a href="https://www.linkedin.com/in/devyash-rasela/" target="_blank" rel="noopener noreferrer">Devyash Rasela</a>
                            <a href="https://www.linkedin.com/in/basil-zafar-490b08302/" target="_blank" rel="noopener noreferrer">Basil Zafar</a>
                        </div>
                    </div>
                </div>
                <div className="lp-footer-bottom">
                    made with <span className="lp-heart">❤️</span> by ZeroLag
                </div>
            </footer>
        </div>
    );
}
