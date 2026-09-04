import { useMemo, useState } from "react"

const marketData = {
  activity: "+17%",
  buyerDemand: "Strong",
  supplyOutlook: "Tightening",
  importExport: "+12%",
  rfqDemand: "+28%",
}

const news = [
  {
    tag: "Market Insight",
    title: "Drought risk increases for winter wheat in Western Europe",
    body:
      "Low rainfall and high temperatures may reduce seed yields in key multiplication areas.",
    date: "4 Sep 2026",
    region: "Western Europe",
  },
  {
    tag: "Seed Production",
    title: "Certified seed area expands for selected protein crops",
    body:
      "Higher multiplication area could improve availability for the next season.",
    date: "4 Sep 2026",
    region: "EU",
  },
  {
    tag: "Market Trend",
    title: "Flax seed demand strengthens ahead of the 2027 season",
    body:
      "Buyer interest is increasing across several European markets.",
    date: "3 Sep 2026",
    region: "Europe",
  },
  {
    tag: "Research",
    title: "Red clover seed supply faces tighter conditions",
    body:
      "Lower multiplication area and weather risk remain key factors.",
    date: "3 Sep 2026",
    region: "Europe",
  },
]

const productionRows = [
  { crop: "Wheat", area: "1,120,000 ha", yoy: "-4%" },
  { crop: "Barley", area: "420,300 ha", yoy: "+8%" },
  { crop: "Rapeseed", area: "312,500 ha", yoy: "-6%" },
  { crop: "Pea", area: "285,600 ha", yoy: "+12%" },
  { crop: "Flax", area: "98,400 ha", yoy: "-3%" },
]

const researchItems = [
  {
    type: "Research",
    title: "How flowering-stage drought affects seed yield potential",
    source: "Research & Partner Insights",
  },
  {
    type: "Analysis",
    title: "Seed multiplication planning under changing weather patterns",
    source: "SeedTrade.eu Analysis",
  },
  {
    type: "Partner",
    title: "Improving certified seed quality through better field monitoring",
    source: "Partner Insight",
  },
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

function Logo() {
  return (
    <div className="logo">
      <GlobeMark />
      <div className="logo-copy">
        <div className="wordmark">
          <span>SEED</span>
          <strong>TRADE</strong>
          <em>.EU</em>
        </div>
        <div className="tagline">
          EUROPEAN SEED TRADING & MARKET INTELLIGENCE
        </div>
      </div>
    </div>
  )
}

function Header() {
  const [language, setLanguage] = useState("EN")

  return (
    <header className="topbar">
      <a href="#top" aria-label="SeedTrade.eu home">
        <Logo />
      </a>

      <nav>
        <a href="#market">Market</a>
        <a href="#requests">Buying Requests</a>
        <a href="#intelligence">Intelligence</a>
        <a href="#research">Research</a>
        <a href="#about">About</a>
      </nav>

      <div className="header-actions">
        <select
          className="language-select"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          aria-label="Language"
        >
          <option value="EN">EN</option>
          <option value="DE">DE</option>
          <option value="FR">FR</option>
          <option value="ES">ES</option>
          <option value="IT">IT</option>
        </select>

        <a href="#join" className="nav-cta">
          Register interest
        </a>
      </div>
    </header>
  )
}

function HeroIntro() {
  return (
    <section className="hero-intro">
      <div className="hero-copy">
        <div className="eyebrow">
          REAL DATA. EXPERT INSIGHTS. A MORE CERTAIN SEED MARKET.
        </div>

        <h1>
          European seed market intelligence for{" "}
          <span>better decisions.</span>
        </h1>

        <p className="hero-lead">
          Trade seeds. Monitor supply. Anticipate opportunities.
        </p>

        <p className="hero-body">
          SeedTrade.eu connects professional seed buyers and suppliers with
          market intelligence, trade data and real B2B opportunities across
          Europe.
        </p>

        <div className="hero-actions">
          <a className="btn primary" href="#market">
            Explore the market
          </a>
          <a className="btn secondary" href="#requests">
            View buying requests
          </a>
        </div>

        <div className="hero-kpis">
          <div>
            <strong>12,450</strong>
            <span>Seed offers</span>
          </div>
          <div>
            <strong>3,280</strong>
            <span>Active buyers</span>
          </div>
          <div>
            <strong>48</strong>
            <span>Countries</span>
          </div>
          <div>
            <strong>+17%</strong>
            <span>Market activity</span>
          </div>
        </div>
      </div>

      <div className="hero-map">
        <div className="map-circle"></div>
        <div className="map-node node-a"></div>
        <div className="map-node node-b"></div>
        <div className="map-node node-c"></div>
        <div className="map-node node-d"></div>
        <div className="map-node node-e"></div>

        <div className="map-note">
          <span>Western EU</span>
          <strong>Drought risk +</strong>
          <small>Seed supply watch</small>
        </div>
      </div>
    </section>
  )
}

function TopNews() {
  return (
    <section className="top-news-card">
      <div className="card-section-head">
        <div>
          <span className="kicker">Daily intelligence</span>
          <h2>Top news</h2>
        </div>
        <a href="#research">View all →</a>
      </div>

      <div className="news-list">
        {news.map((item, index) => (
          <article className="news-item" key={item.title}>
            <div className={`news-thumb news-thumb-${index + 1}`}>
              <span>{item.tag}</span>
            </div>

            <div className="news-copy">
              <span className="news-tag">{item.tag}</span>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
              <div className="news-meta">
                {item.date} · {item.region}
              </div>
            </div>

            <div className="news-arrow">→</div>
          </article>
        ))}
      </div>
    </section>
  )
}

function MarketSignal() {
  const bars = useMemo(() => [34, 48, 41, 63, 56, 72, 68, 83], [])

  return (
    <section className="market-signal-card" id="market">
      <div className="signal-top">
        <div>
          <span className="panel-label">MARKET SIGNAL</span>
          <p>European Seed Market</p>
        </div>
        <span className="live-badge">DEMO DATA</span>
      </div>

      <div className="signal-summary">
        <div>
          <small>MARKET ACTIVITY</small>
          <strong>{marketData.activity}</strong>
          <span>vs. previous 30 days</span>
        </div>
        <div>
          <small>BUYER DEMAND</small>
          <strong>↑ {marketData.buyerDemand}</strong>
          <span>Across key species</span>
        </div>
        <div>
          <small>SUPPLY OUTLOOK</small>
          <strong className="sand-text">{marketData.supplyOutlook}</strong>
          <span>For next season</span>
        </div>
      </div>

      <div className="signal-chart-title">
        <span>SEED PRICE INDEX</span>
        <small>Illustrative</small>
      </div>

      <div className="signal-chart">
        {bars.map((height, i) => (
          <span key={i} style={{ height: `${height}%` }} />
        ))}
      </div>

      <div className="price-row">
        <div>
          <span>Rapeseed</span>
          <strong>€1,820/t</strong>
          <em>+4.2%</em>
        </div>
        <div>
          <span>Wheat</span>
          <strong>€420/t</strong>
          <em>+2.1%</em>
        </div>
        <div>
          <span>Pea</span>
          <strong>€980/t</strong>
          <em className="negative">-1.3%</em>
        </div>
        <div>
          <span>Flax</span>
          <strong>€1,240/t</strong>
          <em>+3.8%</em>
        </div>
      </div>

      <div className="signal-footer">
        <div>
          <small>Import / Export</small>
          <strong>{marketData.importExport}</strong>
          <span>Trade flow visibility</span>
        </div>
        <div>
          <small>RFQ Demand</small>
          <strong>{marketData.rfqDemand}</strong>
          <span>Buyer-driven signals</span>
        </div>
        <div>
          <small>Price Trends</small>
          <strong>Mixed</strong>
          <span>By crop and region</span>
        </div>
      </div>
    </section>
  )
}

function WeatherRisk() {
  return (
    <section className="info-card weather-card" id="intelligence">
      <div className="card-section-head">
        <div>
          <span className="kicker">Weather intelligence</span>
          <h2>Weather & Seed Risk</h2>
        </div>
        <a href="#market">View map →</a>
      </div>

      <div className="weather-content">
        <div className="risk-map">
          <div className="risk-zone high"></div>
          <div className="risk-zone medium"></div>
          <div className="risk-zone low"></div>
        </div>

        <div>
          <div className="risk-label">High risk</div>
          <h3>Drought conditions expanding in Western Europe</h3>
          <p>
            Potential impact on winter wheat, rapeseed and legume seed
            multiplication areas.
          </p>
          <small>Updated: 4 Sep 2026 · Demo analysis</small>
        </div>
      </div>
    </section>
  )
}

function SeedProductionMonitor() {
  return (
    <section className="info-card production-card">
      <div className="card-section-head">
        <div>
          <span className="kicker">Seed first</span>
          <h2>Seed Production Monitor</h2>
        </div>
        <a href="#market">View all →</a>
      </div>

      <div className="production-table">
        <div className="production-head">
          <span>Crop</span>
          <span>Certified area</span>
          <span>YoY</span>
        </div>

        {productionRows.map((row) => (
          <div className="production-row" key={row.crop}>
            <span>{row.crop}</span>
            <strong>{row.area}</strong>
            <em className={row.yoy.startsWith("-") ? "negative" : ""}>
              {row.yoy}
            </em>
          </div>
        ))}
      </div>

      <p className="disclaimer">
        Demo values for interface development. Real official and verified seed
        production data will replace them.
      </p>
    </section>
  )
}

function CropFocus() {
  return (
    <section className="info-card crop-focus">
      <div className="card-section-head">
        <div>
          <span className="kicker">Crop intelligence</span>
          <h2>Focus: Winter Wheat</h2>
        </div>
        <a href="#research">View analysis →</a>
      </div>

      <div className="crop-feature">
        <div className="crop-visual">
          <span>WINTER WHEAT</span>
        </div>

        <div>
          <span className="mini-tag">SEED SUPPLY OUTLOOK 2027</span>
          <h3>Multiplication area, weather risk and expected availability</h3>
          <p>
            Western Europe is currently showing elevated drought risk during
            critical crop development stages. SeedTrade will combine regional
            phenology, declared multiplication areas, weather conditions and
            certification data to estimate future certified seed availability.
          </p>
        </div>
      </div>
    </section>
  )
}

function BuyingRequests() {
  const requests = [
    {
      crop: "Winter wheat",
      qty: "500 t",
      origin: "Central Europe",
      destination: "Germany",
    },
    {
      crop: "Flax seed",
      qty: "300 t",
      origin: "EU",
      destination: "Benelux",
    },
    {
      crop: "Red clover",
      qty: "120 t",
      origin: "EU",
      destination: "Northern Europe",
    },
  ]

  return (
    <section className="section soft" id="requests">
      <div className="section-title-row">
        <div>
          <span className="kicker">B2B demand</span>
          <h2>Active buying requests</h2>
          <p>
            Buyer demand is one of the core signals used to understand where
            the seed market is tightening or expanding.
          </p>
        </div>
        <span className="demo-badge">DEMO DATA</span>
      </div>

      <div className="rfq-grid">
        {requests.map((request) => (
          <article className="rfq-card" key={request.crop}>
            <div className="rfq-head">
              <span className="status">ACTIVE</span>
              <span className="mini-tag">RFQ</span>
            </div>
            <h3>{request.crop}</h3>
            <div className="rfq-qty">{request.qty}</div>
            <dl>
              <div>
                <dt>Origin</dt>
                <dd>{request.origin}</dd>
              </div>
              <div>
                <dt>Destination</dt>
                <dd>{request.destination}</dd>
              </div>
            </dl>
            <a href="#join" className="text-link">
              View request →
            </a>
          </article>
        ))}
      </div>
    </section>
  )
}

function ResearchPartnerInsights() {
  return (
    <section className="section" id="research">
      <div className="section-title-row">
        <div>
          <span className="kicker">Expert content</span>
          <h2>Research & Partner Insights</h2>
          <p>
            Scientific, agronomic and market-oriented content focused on seed
            production, quality, supply and future availability.
          </p>
        </div>
      </div>

      <div className="research-grid">
        {researchItems.map((item) => (
          <article className="research-card" key={item.title}>
            <span className="research-type">{item.type}</span>
            <h3>{item.title}</h3>
            <p>{item.source}</p>
            <a href="#research" className="text-link">
              Read article →
            </a>
          </article>
        ))}
      </div>

      <div className="partner-note">
        Partner content must remain expert-led and evidence-based. Commercial
        promotion should never replace analytical or scientific value.
      </div>
    </section>
  )
}

function JoinForm() {
  const [submitted, setSubmitted] = useState(false)

  const onSubmit = (e) => {
    e.preventDefault()
    setSubmitted(true)
  }

  return (
    <section className="join-section" id="join">
      <div>
        <span className="kicker light">SeedTrade.eu</span>
        <h2>Join the European seed market network</h2>
        <p>
          Register your interest as a buyer, supplier, seed producer or market
          participant.
        </p>
      </div>

      <form className="join-form" onSubmit={onSubmit}>
        <input required placeholder="Company name" />
        <input required type="email" placeholder="Business email" />
        <select defaultValue="">
          <option value="" disabled>
            Select role
          </option>
          <option>Buyer</option>
          <option>Supplier</option>
          <option>Seed producer</option>
          <option>Research / Partner</option>
        </select>
        <input placeholder="Country" />
        <button className="btn primary full" type="submit">
          Register interest
        </button>

        {submitted && (
          <p className="form-msg">
            Demo form submitted. Backend registration will be connected later.
          </p>
        )}
      </form>
    </section>
  )
}

function Footer() {
  return (
    <footer id="about">
      <div>
        <Logo />
        <p>European Seed Trading & Market Intelligence</p>
        <small>Independent and neutral seed market platform.</small>
      </div>

      <div className="footer-links">
        <div>
          <b>Platform</b>
          <a href="#market">Market</a>
          <a href="#requests">Buying Requests</a>
          <a href="#intelligence">Intelligence</a>
        </div>
        <div>
          <b>Content</b>
          <a href="#research">Research</a>
          <a href="#research">Partner Insights</a>
        </div>
      </div>
    </footer>
  )
}

export default function App() {
  return (
    <>
      <Header />

      <main id="top">
        <section className="dashboard-hero">
          <HeroIntro />
          <TopNews />
          <MarketSignal />
        </section>

        <section className="dashboard-row">
          <WeatherRisk />
          <SeedProductionMonitor />
          <CropFocus />
        </section>

        <BuyingRequests />
        <ResearchPartnerInsights />
        <JoinForm />
      </main>

      <Footer />
    </>
  )
}