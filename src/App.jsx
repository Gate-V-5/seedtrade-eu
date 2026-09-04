import React, { useState } from 'react'

const marketCards = [
  { name: 'Flax / Linseed', code: 'FL' },
  { name: 'Hairy Vetch', code: 'HV' },
  { name: 'Red Clover', code: 'RC' },
  { name: 'Phacelia', code: 'PH' },
  { name: 'Buckwheat', code: 'BW' },
  { name: 'Mustard', code: 'MU' },
]

const rfqs = [
  { crop: 'Hairy Vetch', qty: '100 MT', spec: 'EU Certified', destination: 'Lithuania', delivery: 'October 2026' },
  { crop: 'Flax / Linseed', qty: '500 MT', spec: 'Food Grade', destination: 'Germany', delivery: 'Open' },
  { crop: 'Red Clover', qty: '50 MT', spec: 'EU Certified', destination: 'Poland', delivery: 'Open' },
]

const benefits = [
  'European Market Coverage',
  'Professional B2B Network',
  'Verified Companies',
  'Seed Market Intelligence',
  'Import & Export Insights',
  'Price Monitoring',
  'RFQ Marketplace',
  'Supplier Discovery',
  'Buyer Discovery',
  'Trade Opportunities',
]

function GlobeMark() {
  return (
    <svg
      className="logo-mark"
      viewBox="0 0 100 100"
      role="img"
      aria-label="SeedTrade globe"
    >
      <circle className="globe-line" cx="50" cy="50" r="43" />
      <ellipse className="globe-line" cx="50" cy="50" rx="22" ry="43" />
      <path className="globe-line" d="M8 35H92" />
      <path className="globe-line" d="M8 65H92" />

      <path
        className="globe-seed"
        d="M50 84C32 67 31 47 50 29C69 47 68 67 50 84Z"
      />
    </svg>
  )
}

function Logo({ footer = false }) {
  return (
    <div className={`logo ${footer ? 'footer-logo' : ''}`}>
      <GlobeMark />

      <div className="logo-copy">
        <div className="wordmark">
          <span>SEED</span>
          <strong>TRADE</strong>
          <em>.EU</em>
        </div>

        <div className="tagline">
          EUROPEAN SEED TRADING &amp; MARKET INTELLIGENCE
        </div>
      </div>
    </div>
  )
}

function Header() {
  return (
    <header className="topbar">
      <a href="#top" aria-label="SeedTrade.eu home">
        <Logo />
      </a>

      <nav>
        <a href="#market">Market</a>
        <a href="#rfq">Buying Requests</a>
        <a href="#intelligence">Intelligence</a>
        <a href="#join">Join</a>
      </nav>

      <a className="nav-cta" href="#join">
        Register interest
      </a>
    </header>
  )
}

function Hero() {
  return (
    <section className="hero" id="top">
      <div className="hero-grid-overlay" />

      <div className="hero-copy">
        <div className="eyebrow">
          EUROPEAN B2B SEED TRADING &amp; MARKET INTELLIGENCE
        </div>

        <h1>
          THE EUROPEAN
          <br />
          <span>SEED MARKETPLACE</span>
        </h1>

        <p className="hero-lead">
          Trade seeds. Discover demand. Understand the market.
        </p>

        <p className="hero-body">
          SeedTrade.eu connects professional seed buyers and suppliers
          with market intelligence, trade data and real B2B opportunities
          across Europe.
        </p>

        <div className="hero-actions">
          <a className="btn primary" href="#market">
            Explore the market
          </a>

          <a className="hero-text-link" href="#rfq">
            View buying requests →
          </a>
        </div>
      </div>

      <div className="hero-panel">
        <div className="panel-head">
          <div>
            <span className="panel-label">MARKET SIGNAL</span>
            <small>European Seed Market</small>
          </div>

          <span className="live-dot">DEMO DATA</span>
        </div>

        <div className="signal-summary">
          <div>
            <small>MARKET ACTIVITY</small>
            <strong>ACTIVE</strong>
          </div>

          <div>
            <small>BUYER DEMAND</small>
            <strong>↑ SIGNAL</strong>
          </div>
        </div>

        <div className="signal-chart" aria-label="Demo market signal chart">
          <span style={{ height: '36%' }} />
          <span style={{ height: '52%' }} />
          <span style={{ height: '44%' }} />
          <span style={{ height: '68%' }} />
          <span style={{ height: '61%' }} />
          <span style={{ height: '77%' }} />
          <span style={{ height: '72%' }} />
          <span style={{ height: '92%' }} />
        </div>

        <div className="panel-stat">
          <div>
            <b>Import / Export</b>
            <small>Trade flow visibility</small>
          </div>

          <div>
            <b>RFQ Demand</b>
            <small>Buyer-driven signals</small>
          </div>

          <div>
            <b>Price Trends</b>
            <small>Historical context</small>
          </div>
        </div>
      </div>
    </section>
  )
}

function MarketOverview() {
  return (
    <section className="section" id="market">
      <div className="section-title-row">
        <div>
          <div className="kicker">SEED MARKET OVERVIEW</div>
          <h2>One market. Multiple signals.</h2>
          <p>
            Structured views of indicative pricing, demand, trading activity
            and market movement.
          </p>
        </div>

        <div className="demo-badge">
          ALL VALUES SHOWN AS DEMO DATA
        </div>
      </div>

      <div className="market-grid">
        {marketCards.map((item) => (
          <article className="market-card" key={item.name}>
            <div className="card-top">
              <span className="seed-icon">{item.code}</span>
              <span className="mini-tag">DEMO</span>
            </div>

            <h3>{item.name}</h3>

            <div className="price">DEMO DATA</div>

            <div className="metric-row">
              <span>30-day trend</span>
              <b>—</b>
            </div>

            <div className="metric-row">
              <span>Buyer demand</span>
              <b>—</b>
            </div>

            <div className="metric-row">
              <span>Market activity</span>
              <b>—</b>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

function RFQSection() {
  return (
    <section className="section soft" id="rfq">
      <div className="section-title-row">
        <div>
          <div className="kicker">ACTIVE BUYING REQUESTS</div>
          <h2>What buyers are looking for</h2>
          <p>
            Demand-first trading: professional buyers publish requirements
            and suppliers respond with relevant offers.
          </p>
        </div>

        <a href="#join" className="text-link">
          Post a buying request →
        </a>
      </div>

      <div className="rfq-grid">
        {rfqs.map((rfq) => (
          <article className="rfq-card" key={rfq.crop}>
            <div className="rfq-head">
              <span className="demo-badge small">DEMO RFQ</span>
              <span className="status">OPEN</span>
            </div>

            <h3>{rfq.crop}</h3>
            <div className="rfq-qty">{rfq.qty}</div>

            <dl>
              <div>
                <dt>Specification</dt>
                <dd>{rfq.spec}</dd>
              </div>
              <div>
                <dt>Destination</dt>
                <dd>{rfq.destination}</dd>
              </div>
              <div>
                <dt>Delivery</dt>
                <dd>{rfq.delivery}</dd>
              </div>
            </dl>

            <a href="#join" className="btn dark full">
              Submit offer
            </a>
          </article>
        ))}
      </div>
    </section>
  )
}

function Intelligence() {
  const items = [
    ['Import / Export', 'Trade flows across markets'],
    ['Trade Volumes', 'Track activity by product'],
    ['Price Trends', 'See movement over time'],
    ['Active Buyers', 'Identify market demand'],
    ['Active Suppliers', 'Map potential supply'],
    ['Market Signals', 'Spot emerging opportunities'],
  ]

  return (
    <section className="section dark-section" id="intelligence">
      <div className="intelligence-grid">
        <div>
          <div className="kicker light">TRADE INTELLIGENCE</div>

          <h2>Understand the seed market</h2>

          <p>
            Turn fragmented seed market information into actionable
            intelligence. The platform is being designed to combine trade
            activity, market pricing, RFQs and company-level signals.
          </p>

          <div className="intelligence-list">
            {items.map(([title, description]) => (
              <div key={title}>
                <b>{title}</b>
                <span>{description}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="data-board">
          <div className="board-head">
            <span>EUROPEAN TRADE NETWORK</span>
            <span>DEMO DATA</span>
          </div>

          <div className="map-shape">
            <span className="node n1" />
            <span className="node n2" />
            <span className="node n3" />
            <span className="node n4" />
            <span className="node n5" />

            <div className="route r1" />
            <div className="route r2" />
            <div className="route r3" />
          </div>

          <div className="board-footer">
            <div>
              <b>BUYERS</b>
              <span>Company discovery</span>
            </div>
            <div>
              <b>SUPPLIERS</b>
              <span>Supply mapping</span>
            </div>
            <div>
              <b>TRADE</b>
              <span>Import / export</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function HowItWorks() {
  const steps = [
    ['01', 'DISCOVER', 'Explore seed markets, prices, demand and trade activity.'],
    ['02', 'CONNECT', 'Find professional buyers and suppliers.'],
    ['03', 'TRADE', 'Request quotations, submit offers and develop new trading relationships.'],
  ]

  return (
    <section className="section">
      <div className="center-title">
        <div className="kicker">HOW IT WORKS</div>
        <h2>From market signal to trading opportunity</h2>
      </div>

      <div className="steps">
        {steps.map(([number, title, description]) => (
          <div className="step" key={number}>
            <span>{number}</span>
            <h3>{title}</h3>
            <p>{description}</p>
          </div>
        ))}
      </div>

      <div className="audience-grid">
        <div className="audience-card buyer">
          <span>FOR BUYERS</span>
          <h3>Find the seeds you need</h3>
          <p>
            Publish your buying requirement and receive offers from
            relevant suppliers.
          </p>
          <a className="btn primary" href="#join">
            Post buying request
          </a>
        </div>

        <div className="audience-card supplier">
          <span>FOR SUPPLIERS</span>
          <h3>Find real market demand</h3>
          <p>
            Discover what professional buyers are looking for and submit
            your offer directly to relevant opportunities.
          </p>
          <a className="btn dark" href="#rfq">
            View buying requests
          </a>
        </div>
      </div>
    </section>
  )
}

function Benefits() {
  return (
    <section className="section soft">
      <div className="center-title">
        <div className="kicker">PLATFORM BENEFITS</div>
        <h2>Built for professional seed trade</h2>
      </div>

      <div className="benefit-grid">
        {benefits.map((benefit, index) => (
          <div className="benefit" key={benefit}>
            <span>{String(index + 1).padStart(2, '0')}</span>
            {benefit}
          </div>
        ))}
      </div>
    </section>
  )
}

function JoinForm() {
  const [submitted, setSubmitted] = useState(false)

  function submit(event) {
    event.preventDefault()
    setSubmitted(true)
  }

  return (
    <section className="join-section" id="join">
      <div>
        <div className="kicker light">COMING SOON</div>
        <h2>Join SeedTrade.eu</h2>

        <p>
          SeedTrade.eu is currently under development. Professional seed
          companies, buyers, suppliers and producers can register their
          interest.
        </p>

        <div className="note">
          This MVP form is visual only. No information is currently stored.
        </div>
      </div>

      <form className="join-form" onSubmit={submit}>
        <input required placeholder="Company name" />
        <input required type="email" placeholder="Business email" />

        <select required defaultValue="">
          <option value="" disabled>Country</option>
          <option>Lithuania</option>
          <option>Latvia</option>
          <option>Estonia</option>
          <option>Poland</option>
          <option>Germany</option>
          <option>France</option>
          <option>Netherlands</option>
          <option>Belgium</option>
          <option>Italy</option>
          <option>Other</option>
        </select>

        <select required defaultValue="">
          <option value="" disabled>Company type</option>
          <option>Buyer</option>
          <option>Supplier</option>
          <option>Producer</option>
          <option>Distributor</option>
          <option>Trader</option>
          <option>Processor</option>
          <option>Other</option>
        </select>

        <button className="btn light full" type="submit">
          {submitted ? 'Interest registered (demo)' : 'Join SeedTrade.eu'}
        </button>

        {submitted && (
          <p className="form-msg">
            Demo only — no data was sent or stored.
          </p>
        )}
      </form>
    </section>
  )
}

function Footer() {
  return (
    <footer>
      <div>
        <Logo footer />

        <p>European Seed Market Intelligence &amp; Trading Platform</p>
        <small>SeedTrade.eu is a project developed by LAGRENAS.</small>
      </div>

      <div className="footer-links">
        <div>
          <b>Platform</b>
          <a href="#market">Market Intelligence</a>
          <a href="#rfq">Buying Requests</a>
          <a href="#join">Sell Seeds</a>
        </div>

        <div>
          <b>Company</b>
          <a href="#top">About</a>
          <a href="#join">Contact</a>
          <a href="#top">Privacy Policy</a>
        </div>
      </div>
    </footer>
  )
}

export default function App() {
  return (
    <>
      <Header />

      <main>
        <Hero />
        <MarketOverview />
        <RFQSection />
        <Intelligence />
        <HowItWorks />
        <Benefits />
        <JoinForm />
      </main>

      <Footer />
    </>
  )
}