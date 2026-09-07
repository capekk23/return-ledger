import { useMemo, useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import {
  sampleClaimMapping,
  sampleClaims,
  sampleCreditMapping,
  sampleCredits,
} from './data/sampleData'
import { parseCsv, suggestMapping, toCsv } from './lib/csv'
import { reconcile } from './lib/reconcile'
import type { ColumnMapping, CsvDataset, ReconciliationLine, ReconciliationStatus } from './types'

const EURO = new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' })

const statusLabels: Record<ReconciliationStatus, string> = {
  matched: 'Matched',
  missing: 'Missing credit',
  'under-credited': 'Under-credited',
  'over-credited': 'Over-credited',
  unmatched: 'Unmatched credit',
}

function Icon({ name, size = 20 }: { name: 'check' | 'lock' | 'upload' | 'download' | 'arrow' | 'spark' | 'file' | 'menu'; size?: number }) {
  const paths: Record<string, ReactNode> = {
    check: <path d="m5 12 4 4L19 6" />,
    lock: <><rect width="14" height="10" x="5" y="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
    upload: <><path d="M12 16V4" /><path d="m7 9 5-5 5 5" /><path d="M5 20h14" /></>,
    download: <><path d="M12 4v12" /><path d="m7 11 5 5 5-5" /><path d="M5 20h14" /></>,
    arrow: <><path d="M5 12h14" /><path d="m14 7 5 5-5 5" /></>,
    spark: <path d="m12 3-1.2 4.1a5.5 5.5 0 0 1-3.7 3.7L3 12l4.1 1.2a5.5 5.5 0 0 1 3.7 3.7L12 21l1.2-4.1a5.5 5.5 0 0 1 3.7-3.7L21 12l-4.1-1.2a5.5 5.5 0 0 1-3.7-3.7L12 3Z" />,
    file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6" /><path d="M8 13h8M8 17h5" /></>,
    menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>,
  }
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>
}

function Logo() {
  return (
    <a className="logo" href="#top" aria-label="ReturnLedger home">
      <span className="logo-mark" aria-hidden="true"><span>R</span></span>
      <span>Return<span>Ledger</span></span>
    </a>
  )
}

function scrollToDemo() {
  document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

interface ImportCardProps {
  index: number
  eyebrow: string
  title: string
  description: string
  dataset: CsvDataset
  mapping: ColumnMapping
  onDataset: (dataset: CsvDataset) => void
  onMapping: (mapping: ColumnMapping) => void
  onSample: () => void
}

function ImportCard({ index, eyebrow, title, description, dataset, mapping, onDataset, onMapping, onSample }: ImportCardProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  async function loadFile(file?: File) {
    if (!file) return
    const parsed = parseCsv(await file.text(), file.name)
    onDataset(parsed)
    onMapping(suggestMapping(parsed.headers))
  }

  function update(field: keyof ColumnMapping, value: string) {
    onMapping({ ...mapping, [field]: value })
  }

  return (
    <section className="import-card" aria-labelledby={`source-${index}`}>
      <div className="source-heading">
        <span className="step-number">{index}</span>
        <div>
          <span className="eyebrow">{eyebrow}</span>
          <h3 id={`source-${index}`}>{title}</h3>
          <p>{description}</p>
        </div>
      </div>

      <div
        className={`dropzone ${dragging ? 'is-dragging' : ''}`}
        onDragEnter={(event) => { event.preventDefault(); setDragging(true) }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault()
          setDragging(false)
          void loadFile(event.dataTransfer.files[0])
        }}
      >
        <input
          ref={inputRef}
          className="visually-hidden"
          type="file"
          accept=".csv,text/csv"
          onChange={(event: ChangeEvent<HTMLInputElement>) => void loadFile(event.target.files?.[0])}
          aria-label={`Upload ${title}`}
        />
        <span className="file-icon"><Icon name="file" size={22} /></span>
        <div className="file-copy">
          <strong>{dataset.name}</strong>
          <span>{dataset.rows.length} rows ready · processed locally</span>
        </div>
        <button className="button secondary compact" type="button" onClick={() => inputRef.current?.click()}>
          <Icon name="upload" size={17} /> Replace CSV
        </button>
      </div>
      <button className="sample-link" type="button" onClick={onSample}>Restore example data</button>

      <div className="mapping-title">
        <span>Column mapping</span>
        <span className="auto-badge"><Icon name="spark" size={13} /> Auto-detected</span>
      </div>
      <div className="mapping-grid">
        {([
          ['identifier', 'SKU or ISBN', true],
          ['quantity', 'Quantity', true],
          ['amount', index === 1 ? 'Claimed amount' : 'Credit amount', true],
          ['title', 'Description', false],
        ] as [keyof ColumnMapping, string, boolean][]).map(([field, label, required]) => (
          <label key={field}>
            <span>{label}{required && <b aria-label="required"> *</b>}</span>
            <select required={required} value={mapping[field]} onChange={(event) => update(field, event.target.value)}>
              <option value="">{required ? 'Select a column' : 'Not mapped'}</option>
              {dataset.headers.map((header) => <option key={header} value={header}>{header}</option>)}
            </select>
          </label>
        ))}
      </div>
    </section>
  )
}

function formatAmount(value: number) {
  return EURO.format(value)
}

function ResultsTable({ lines, filter }: { lines: ReconciliationLine[]; filter: 'all' | 'exceptions' }) {
  const visible = filter === 'all' ? lines : lines.filter((line) => line.status !== 'matched')
  return (
    <div className="table-scroll">
      <table>
        <caption className="visually-hidden">Reconciliation results</caption>
        <thead>
          <tr>
            <th scope="col">Item</th>
            <th scope="col" className="number">Returned</th>
            <th scope="col" className="number">Credited</th>
            <th scope="col" className="number">Claimed</th>
            <th scope="col" className="number">Credit</th>
            <th scope="col" className="number">Difference</th>
            <th scope="col">Status</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((line) => (
            <tr key={line.identifier}>
              <td><strong>{line.displayIdentifier}</strong><span>{line.title}</span></td>
              <td className="number">{line.claimQuantity}</td>
              <td className="number">{line.creditQuantity}</td>
              <td className="number">{formatAmount(line.claimAmount)}</td>
              <td className="number">{formatAmount(line.creditAmount)}</td>
              <td className={`number delta ${line.amountDelta === 0 ? '' : line.amountDelta < 0 ? 'negative' : 'positive'}`}>
                {line.amountDelta > 0 ? '+' : ''}{formatAmount(line.amountDelta)}
              </td>
              <td><span className={`status status-${line.status}`}><i />{statusLabels[line.status]}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
      {visible.length === 0 && <p className="empty-state">No lines match this filter.</p>}
    </div>
  )
}

function App() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [claims, setClaims] = useState(sampleClaims)
  const [credits, setCredits] = useState(sampleCredits)
  const [claimMapping, setClaimMapping] = useState(sampleClaimMapping)
  const [creditMapping, setCreditMapping] = useState(sampleCreditMapping)
  const [filter, setFilter] = useState<'all' | 'exceptions'>('exceptions')

  const ready = Boolean(
    claimMapping.identifier && claimMapping.quantity && claimMapping.amount
    && creditMapping.identifier && creditMapping.quantity && creditMapping.amount,
  )
  const results = useMemo(
    () => ready ? reconcile(claims, claimMapping, credits, creditMapping) : [],
    [claims, claimMapping, credits, creditMapping, ready],
  )
  const counts = useMemo(() => Object.fromEntries(
    (Object.keys(statusLabels) as ReconciliationStatus[]).map((status) => [status, results.filter((line) => line.status === status).length]),
  ) as Record<ReconciliationStatus, number>, [results])
  const exceptions = results.filter((line) => line.status !== 'matched')
  const exposure = exceptions.reduce((sum, line) => sum + Math.abs(line.amountDelta), 0)

  function restoreSamples() {
    setClaims(sampleClaims)
    setCredits(sampleCredits)
    setClaimMapping(sampleClaimMapping)
    setCreditMapping(sampleCreditMapping)
  }

  function exportExceptions() {
    const csv = toCsv(exceptions.map((line) => ({
      identifier: line.displayIdentifier,
      description: line.title,
      status: statusLabels[line.status],
      returned_quantity: line.claimQuantity,
      credited_quantity: line.creditQuantity,
      claimed_amount: line.claimAmount.toFixed(2),
      credited_amount: line.creditAmount.toFixed(2),
      difference: line.amountDelta.toFixed(2),
    })))
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'return-ledger-exceptions.csv'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <header className="site-header" id="top">
        <div className="nav-wrap">
          <Logo />
          <nav className={menuOpen ? 'is-open' : ''} aria-label="Main navigation">
            <a href="#how" onClick={() => setMenuOpen(false)}>How it works</a>
            <a href="#demo" onClick={() => setMenuOpen(false)}>Live demo</a>
            <a href="#pricing" onClick={() => setMenuOpen(false)}>Pricing</a>
          </nav>
          <button className="button primary nav-cta" type="button" onClick={scrollToDemo}>Try it now <Icon name="arrow" size={16} /></button>
          <button className="menu-button" type="button" aria-label="Toggle navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}><Icon name="menu" /></button>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="hero-glow glow-one" /><div className="hero-glow glow-two" />
          <div className="hero-inner">
            <div className="hero-copy">
              <div className="pill"><span /> Built for small wholesale teams</div>
              <h1>Every return credit,<br /><em>accounted for.</em></h1>
              <p className="hero-lead">Match return claims to supplier credit memos in seconds. Catch missing, short, over, and mystery lines before they quietly eat your margin.</p>
              <div className="hero-actions">
                <button className="button primary large" type="button" onClick={scrollToDemo}>Run a free reconciliation <Icon name="arrow" /></button>
                <span>No signup · Sample data ready</span>
              </div>
              <div className="trust-line">
                <span><Icon name="lock" size={16} /> Files stay in your browser</span>
                <span><Icon name="check" size={16} /> SKU & ISBN support</span>
              </div>
            </div>
            <div className="hero-visual" aria-label="Example reconciliation summary">
              <div className="visual-window">
                <div className="window-bar"><span /><span /><span /><b>September returns</b></div>
                <div className="visual-body">
                  <div className="mini-heading"><div><small>RECONCILIATION</small><strong>5 exceptions found</strong></div><span>Just now</span></div>
                  <div className="mini-total"><span>Value to review</span><strong>€202.00</strong></div>
                  {[
                    ['SKU-204', 'Short by 2 units', '−€24.00', 'under'],
                    ['SKU-415', '1 extra unit credited', '+€18.00', 'over'],
                    ['SKU-518', 'No credit line found', '−€45.00', 'missing'],
                    ['SKU-621', 'No credit line found', '−€84.00', 'missing'],
                    ['SKU-999', 'Not on return claim', '+€31.00', 'unmatched'],
                  ].map(([sku, note, value, status]) => (
                    <div className="mini-row" key={sku}><span className={`mini-dot ${status}`} /><div><strong>{sku}</strong><small>{note}</small></div><b>{value}</b></div>
                  ))}
                  <div className="mini-footer"><span><Icon name="check" size={15} /> 2 lines matched perfectly</span><span>Export report →</span></div>
                </div>
              </div>
              <div className="float-card float-left"><span><Icon name="lock" size={18} /></span><div><strong>Private by default</strong><small>Nothing uploaded</small></div></div>
              <div className="float-card float-right"><span><Icon name="spark" size={18} /></span><div><strong>€202 flagged</strong><small>Ready to investigate</small></div></div>
            </div>
          </div>
        </section>

        <section className="proof-strip" aria-label="Product benefits">
          <div><strong>CSV in</strong><span>Any column names</span></div>
          <i />
          <div><strong>Exceptions out</strong><span>Clear, line by line</span></div>
          <i />
          <div><strong>Zero setup</strong><span>Works in your browser</span></div>
          <i />
          <div><strong>€20 / month</strong><span>Simple, predictable</span></div>
        </section>

        <section className="how section" id="how">
          <div className="section-heading centered">
            <span className="eyebrow">No spreadsheet archaeology</span>
            <h2>From two messy exports to<br /><em>one clear answer.</em></h2>
            <p>ReturnLedger does the repetitive matching. You decide what to chase.</p>
          </div>
          <div className="feature-grid">
            <article><span className="feature-number">01</span><div className="feature-icon"><Icon name="upload" /></div><h3>Drop in both files</h3><p>Export the return claim and the later supplier credit memo as CSV. Column names do not need to match.</p></article>
            <article><span className="feature-number">02</span><div className="feature-icon"><Icon name="spark" /></div><h3>Map once, check instantly</h3><p>Confirm the suggested SKU, quantity, and amount columns. Duplicate lines are safely grouped.</p></article>
            <article><span className="feature-number">03</span><div className="feature-icon"><Icon name="download" /></div><h3>Act on exceptions</h3><p>Filter missing, short, over, and unmatched credits. Export a clean follow-up list for your supplier.</p></article>
          </div>
        </section>

        <section className="demo-section" id="demo">
          <div className="section-heading centered">
            <span className="eyebrow">Working demo</span>
            <h2>Try it with <em>real CSVs.</em></h2>
            <p>The example is already loaded. Replace either file to reconcile your own data — nothing leaves this device.</p>
          </div>
          <div className="app-shell">
            <div className="privacy-banner"><Icon name="lock" size={18} /><span><strong>Local processing is on.</strong> Your files are read in this browser tab and never sent to a server.</span><span className="privacy-tag">PRIVATE</span></div>
            <div className="imports-grid">
              <ImportCard index={1} eyebrow="What you expected" title="Return claim" description="Your shipment or claim record" dataset={claims} mapping={claimMapping} onDataset={setClaims} onMapping={setClaimMapping} onSample={restoreSamples} />
              <ImportCard index={2} eyebrow="What you received" title="Supplier credit memo" description="The credit note sent back later" dataset={credits} mapping={creditMapping} onDataset={setCredits} onMapping={setCreditMapping} onSample={restoreSamples} />
            </div>

            {!ready ? (
              <div className="mapping-warning" role="status">Map the required SKU/ISBN, quantity, and amount columns in both files to see results.</div>
            ) : (
              <section className="results" aria-labelledby="results-title" aria-live="polite">
                <div className="results-header">
                  <div><span className="eyebrow">Reconciliation complete</span><h3 id="results-title">{exceptions.length} exceptions need attention</h3><p>{results.length} unique SKUs compared across both files.</p></div>
                  <button className="button primary" type="button" onClick={exportExceptions} disabled={exceptions.length === 0}><Icon name="download" size={17} /> Export exceptions</button>
                </div>
                <div className="summary-grid">
                  <div className="summary-card exposure"><span>Value to review</span><strong>{formatAmount(exposure)}</strong><small>Absolute exception value</small></div>
                  <div className="summary-card matched"><span>Matched</span><strong>{counts.matched}</strong><small>Lines fully reconciled</small></div>
                  <div className="summary-card under"><span>Missing / under</span><strong>{counts.missing + counts['under-credited']}</strong><small>Potential money owed</small></div>
                  <div className="summary-card over"><span>Over / unmatched</span><strong>{counts['over-credited'] + counts.unmatched}</strong><small>Credits to verify</small></div>
                </div>
                <div className="table-header">
                  <div className="filter-tabs" role="group" aria-label="Filter results">
                    <button className={filter === 'exceptions' ? 'active' : ''} type="button" onClick={() => setFilter('exceptions')}>Exceptions <span>{exceptions.length}</span></button>
                    <button className={filter === 'all' ? 'active' : ''} type="button" onClick={() => setFilter('all')}>All lines <span>{results.length}</span></button>
                  </div>
                  <button className="text-button" type="button" onClick={restoreSamples}>Reset demo</button>
                </div>
                <ResultsTable lines={results} filter={filter} />
                <div className="results-note"><Icon name="spark" size={16} /><span><strong>Deterministic matching:</strong> identifiers ignore spaces, hyphens, and letter case. Amount differences take priority, then quantity. A €0.01 rounding tolerance is included.</span></div>
              </section>
            )}
          </div>
        </section>

        <section className="pricing section" id="pricing">
          <div className="price-copy">
            <span className="eyebrow">Simple on purpose</span>
            <h2>Cheaper than one<br /><em>missed credit.</em></h2>
            <p>One focused tool for teams that handle returns but do not need another inventory suite.</p>
            <ul>
              <li><Icon name="check" size={18} /> Unlimited reconciliations</li>
              <li><Icon name="check" size={18} /> CSV column mapping</li>
              <li><Icon name="check" size={18} /> Exception CSV exports</li>
              <li><Icon name="check" size={18} /> Local, privacy-first processing</li>
            </ul>
          </div>
          <div className="price-card">
            <span className="price-label">ONE PLAN. EVERYTHING INCLUDED.</span>
            <div className="price"><sup>€</sup><strong>20</strong><span>/ month</span></div>
            <p>For one business, with every feature.</p>
            <button className="button primary large" type="button" onClick={scrollToDemo}>Try the working demo <Icon name="arrow" /></button>
            <small>No payment flow in this early MVP</small>
          </div>
        </section>

        <section className="faq section">
          <div className="section-heading centered"><span className="eyebrow">The practical bits</span><h2>Questions, <em>answered.</em></h2></div>
          <div className="faq-grid">
            <article><h3>Do my files leave my computer?</h3><p>No. The current MVP parses and compares CSV files entirely in your browser. There is no upload endpoint, database, tracking pixel, or paid API.</p></article>
            <article><h3>Does it only work for books?</h3><p>No. Match any consistent product identifier, including SKU, ISBN, EAN, UPC, or your own item code.</p></article>
            <article><h3>What counts as a match?</h3><p>The normalized identifier, total quantity, and total amount must agree. Duplicate rows for the same item are grouped before comparison.</p></article>
            <article><h3>Where is the AI?</h3><p>The reliable core is deterministic and needs no AI. A future opt-in assistant could explain messy exceptions, without making matching decisions.</p></article>
          </div>
        </section>

        <section className="final-cta">
          <div><span className="eyebrow">See it for yourself</span><h2>Your next credit memo<br />takes <em>two minutes.</em></h2><p>Load the included example or bring two CSV exports of your own.</p><button className="button light large" type="button" onClick={scrollToDemo}>Open the reconciler <Icon name="arrow" /></button></div>
        </section>
      </main>

      <footer><div><Logo /><p>Returns in. Credits checked. Margin protected.</p></div><div><span>Privacy-first · No file uploads</span><span>© 2026 ReturnLedger</span></div></footer>
    </>
  )
}

export default App
