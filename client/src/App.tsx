import FeedbackWidget from './components/FeedbackWidget';
import './App.css';

const features = [
  {
    icon: '⚡',
    title: 'Lightning Fast',
    desc: 'Built on a distributed edge network with sub-10ms response times globally.',
  },
  {
    icon: '🔒',
    title: 'Zero-Trust Security',
    desc: 'End-to-end encryption and SOC 2 Type II compliance baked into every layer.',
  },
  {
    icon: '📊',
    title: 'Real-time Analytics',
    desc: 'Live dashboards and custom reports that update as your data flows in.',
  },
  {
    icon: '🔌',
    title: 'Integrations',
    desc: 'Connect with 200+ tools including Slack, Jira, Salesforce and more.',
  },
  {
    icon: '🤖',
    title: 'AI-Powered',
    desc: 'Intelligent automation and anomaly detection trained on your data.',
  },
  {
    icon: '🌐',
    title: 'Multi-Region',
    desc: 'Deploy to any of 30+ global regions with one-click failover.',
  },
];

const stats = [
  { value: '99.99%', label: 'Uptime SLA' },
  { value: '10ms', label: 'Avg. Latency' },
  { value: '50K+', label: 'Companies' },
  { value: '4.9★', label: 'G2 Rating' },
];

function App() {
  return (
    <div className="app">
      {/* ── Nav ── */}
      <nav className="nav">
        <div className="nav-inner">
          <span className="nav-logo">
            <span className="logo-mark" />
            Acme
          </span>
          <ul className="nav-links">
            <li><a href="#">Product</a></li>
            <li><a href="#">Pricing</a></li>
            <li><a href="#">Docs</a></li>
            <li><a href="#">Blog</a></li>
          </ul>
          <div className="nav-actions">
            <button className="btn-ghost">Sign in</button>
            <button className="btn-primary">Get started free</button>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="hero">
        <div className="hero-badge">Now in public beta &rarr;</div>
        <h1 className="hero-title">
          The platform that<br />
          <span className="gradient-text">scales with you</span>
        </h1>
        <p className="hero-subtitle">
          Acme gives modern teams the infrastructure, analytics, and automation
          tools to ship faster and grow confidently.
        </p>
        <div className="hero-cta">
          <button className="btn-primary btn-lg">Start for free</button>
          <button className="btn-outline btn-lg">View demo</button>
        </div>
        <div className="hero-stats">
          {stats.map(s => (
            <div key={s.label} className="stat">
              <span className="stat-value">{s.value}</span>
              <span className="stat-label">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section className="features">
        <div className="section-inner">
          <p className="section-eyebrow">Everything you need</p>
          <h2 className="section-title">Built for production from day one</h2>
          <p className="section-subtitle">
            A complete platform that handles the hard parts so your team can focus
            on building great products.
          </p>
          <div className="feature-grid">
            {features.map(f => (
              <div key={f.title} className="feature-card">
                <div className="feature-icon">{f.icon}</div>
                <h3 className="feature-title">{f.title}</h3>
                <p className="feature-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="cta-section">
        <div className="cta-inner">
          <h2>Ready to get started?</h2>
          <p>Join thousands of teams already building with Acme.</p>
          <button className="btn-primary btn-lg">Create free account</button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="footer">
        <div className="footer-inner">
          <span className="nav-logo">
            <span className="logo-mark" />
            Acme
          </span>
          <p className="footer-copy">© 2026 Acme, Inc. All rights reserved.</p>
        </div>
      </footer>

      {/* ── Feedback Widget ── */}
      <FeedbackWidget />
    </div>
  );
}

export default App;
