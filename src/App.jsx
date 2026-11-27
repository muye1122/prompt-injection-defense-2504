import { useEffect, useState } from 'react';

const FEATURES = [
  { key: 'proposal', label: 'Proposal' },
  { key: 'copy', label: 'Copywriting' },
  { key: 'meeting_summary', label: 'Meeting summary' }
];

const TABS = [
  { key: 'preview', label: 'Render preview' },
  { key: 'report', label: 'Attack report' },
  { key: 'audit', label: 'Security audit' },
  { key: 'review', label: 'Review queue' }
];

function IssueList({ issues, testId }) {
  if (!issues || issues.length === 0) {
    return <p className="muted">No issues recorded for this check.</p>;
  }
  return (
    <ul className="issues" data-testid={testId}>
      {issues.map((issue, index) => (
        <li key={`${issue.code}-${index}`} className={`issue ${issue.severity}`}>
          <span className="code">{issue.code}</span>
          <span className="severity">{issue.severity}</span>
          <span className="message">{issue.message}</span>
        </li>
      ))}
    </ul>
  );
}

function Metric({ label, value, testId }) {
  return (
    <div className="metric">
      <span className="metric-label">{label}</span>
      <strong className="metric-value" data-testid={testId}>{value}</strong>
    </div>
  );
}

export default function App() {
  const [feature, setFeature] = useState('proposal');
  const [content, setContent] = useState('Fictional constraint: keep this draft short and internal only.');
  const [preview, setPreview] = useState(null);
  const [report, setReport] = useState(null);
  const [audit, setAudit] = useState([]);
  const [review, setReview] = useState([]);
  const [stats, setStats] = useState(null);
  const [tab, setTab] = useState('preview');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function refreshSideData() {
    const [auditResponse, reviewResponse, statsResponse] = await Promise.all([
      fetch('/api/audit'),
      fetch('/api/review-queue'),
      fetch('/api/stats')
    ]);
    setAudit((await auditResponse.json()).records);
    setReview((await reviewResponse.json()).entries);
    setStats(await statsResponse.json());
  }

  useEffect(() => {
    refreshSideData().catch((reason) => setError(String(reason)));
  }, []);

  async function renderDraft() {
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feature, content })
      });
      if (!response.ok) throw new Error(`Render failed with HTTP ${response.status}`);
      setPreview(await response.json());
      setTab('preview');
      await refreshSideData();
    } catch (reason) {
      setError(String(reason));
    } finally {
      setBusy(false);
    }
  }

  async function runEvaluation() {
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/evaluate', { method: 'POST' });
      if (!response.ok) throw new Error(`Evaluation failed with HTTP ${response.status}`);
      setReport(await response.json());
      setTab('report');
      await refreshSideData();
    } catch (reason) {
      setError(String(reason));
    } finally {
      setBusy(false);
    }
  }

  const filteredResults = report
    ? report.results.filter((row) => row.feature === feature)
    : [];

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <h1 data-testid="app-title">Operations assistance - prompt injection defense</h1>
          <p className="subtitle">Input isolation, injection pre-scan, canary probe and output post-check</p>
        </div>
        <span className="fictional-badge">Fictional data only</span>
      </header>

      {error ? <div className="error-banner" data-testid="error-banner">{error}</div> : null}

      <main className="layout">
        <section className="panel controls">
          <h2>Draft console</h2>
          <label htmlFor="feature-select">Feature</label>
          <select
            id="feature-select"
            data-testid="feature-select"
            value={feature}
            onChange={(event) => setFeature(event.target.value)}
          >
            {FEATURES.map((item) => (
              <option key={item.key} value={item.key}>{item.label}</option>
            ))}
          </select>

          <label htmlFor="content-input">Employee constraint or meeting note</label>
          <textarea
            id="content-input"
            data-testid="content-input"
            rows={8}
            value={content}
            onChange={(event) => setContent(event.target.value)}
          />

          <div className="button-row">
            <button type="button" data-testid="render-button" onClick={renderDraft} disabled={busy}>
              Render draft
            </button>
            <button type="button" data-testid="evaluate-button" onClick={runEvaluation} disabled={busy}>
              Run attack set
            </button>
          </div>

          <div className="side-stats" data-testid="side-stats">
            <span>Samples: {stats ? stats.sampleCount : 0}</span>
            <span>Audit records: {stats ? stats.auditCount : 0}</span>
            <span>Review queue: {stats ? stats.reviewQueueSize : 0}</span>
          </div>
          <p className="hint">
            Every draft stays in the internal review queue. External sending is disabled in this build.
          </p>
        </section>

        <section className="panel workspace">
          <nav className="tabs" aria-label="Workspace sections">
            {TABS.map((item) => (
              <button
                type="button"
                key={item.key}
                className={tab === item.key ? 'tab active' : 'tab'}
                data-testid={`tab-${item.key}`}
                onClick={() => setTab(item.key)}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {tab === 'preview' ? (
            <div className="tab-body">
              {!preview ? (
                <div className="empty-state" data-testid="preview-empty">
                  No render yet. Enter fictional employee input and choose Render draft.
                </div>
              ) : (
                <div className="preview-grid">
                  <div className="card">
                    <h3>Rendered prompt</h3>
                    <pre className="code-box" data-testid="rendered-prompt">{preview.renderedPrompt}</pre>
                  </div>
                  <div className="card">
                    <h3>Layer 2 - injection pre-scan</h3>
                    <IssueList issues={preview.lintIssues} testId="lint-issues" />
                    <h3>Layer 3 and 4 - leak and output checks</h3>
                    <IssueList issues={preview.postCheckIssues} testId="post-issues" />
                    <p className="canary" data-testid="canary">Probe: {preview.canary}</p>
                  </div>
                  <div className="card">
                    <h3>Generated draft</h3>
                    <pre className="code-box" data-testid="draft-json">{JSON.stringify(preview.draft, null, 2)}</pre>
                    <h3>Sanitized draft for review</h3>
                    <pre className="code-box" data-testid="sanitized-json">{JSON.stringify(preview.sanitizedDraft, null, 2)}</pre>
                    <p className="review-state" data-testid="review-state">
                      {preview.needsReview ? 'Flagged - awaiting human review' : 'Queued for human review'}
                      {' | External send allowed: '}
                      {String(preview.externalSendAllowed)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : null}

          {tab === 'report' ? (
            <div className="tab-body">
              {!report ? (
                <div className="empty-state" data-testid="empty-report">
                  No report yet. Choose Run attack set to execute the fictional evaluation set.
                </div>
              ) : (
                <div>
                  <div className="report-head">
                    <div>
                      <h3>Run {report.id}</h3>
                      <p className="muted">{report.dataNote}</p>
                    </div>
                    <span
                      className={report.passed ? 'gate pass' : 'gate fail'}
                      data-testid="gate"
                    >
                      {report.passed ? 'PASS' : 'FAIL'}
                    </span>
                  </div>
                  <div className="metric-grid">
                    <Metric label="Canary leaks" value={report.metrics.canaryLeakCount} testId="metric-leaks" />
                    <Metric label="Schema pass rate" value={`${report.metrics.schemaPassRate}%`} testId="metric-schema" />
                    <Metric label="Link interception rate" value={`${report.metrics.linkInterceptionRate}%`} testId="metric-links" />
                    <Metric label="Samples" value={report.metrics.totalSamples} testId="metric-samples" />
                  </div>
                  <p className="thresholds" data-testid="thresholds">
                    Thresholds: max leaks {report.thresholds.maxCanaryLeaks},
                    schema at least {report.thresholds.minSchemaPassRate}%,
                    link interception = {report.thresholds.minLinkInterceptionRate}%
                  </p>
                  <h3>Sample results for the selected feature</h3>
                  <div className="table-wrap">
                    <table data-testid="results-table">
                      <thead>
                        <tr>
                          <th>ID</th><th>Category</th><th>Injection</th><th>Leak</th><th>Link</th><th>Schema</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredResults.map((row) => (
                          <tr key={row.id}>
                            <td>{row.id}</td>
                            <td>{row.category}</td>
                            <td>{String(row.actual.injectionSuspected)}</td>
                            <td>{String(row.actual.promptLeak)}</td>
                            <td>{String(row.actual.linkIntercepted)}</td>
                            <td>{String(row.actual.schemaValid)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : null}

          {tab === 'audit' ? (
            <div className="tab-body">
              <h3>Security audit log</h3>
              {audit.length === 0 ? (
                <div className="empty-state">No audit records yet.</div>
              ) : (
                <ul className="audit-list" data-testid="audit-list">
                  {audit.map((record) => (
                    <li key={record.id}>
                      <span className="code">{record.code}</span>
                      <span>{record.severity}</span>
                      <span>{record.rule}</span>
                      <span>{record.detail}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}

          {tab === 'review' ? (
            <div className="tab-body">
              <h3>AI review queue</h3>
              <p className="muted">Flagged drafts remain here for human judgment and are never sent externally.</p>
              {review.length === 0 ? (
                <div className="empty-state">The review queue is empty.</div>
              ) : (
                <ul className="review-list" data-testid="review-list">
                  {review.map((entry) => (
                    <li key={entry.id}>
                      <strong>{entry.id}</strong>
                      <span>{entry.feature}</span>
                      <span>{entry.status.replaceAll('_', ' ')}</span>
                      <span>Flagged: {String(entry.flagged)}</span>
                      <span>Sent externally: {String(entry.externalSendAllowed)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
        </section>
      </main>
    </div>
  );
}
