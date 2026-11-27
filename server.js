import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStore, mockGenerate } from './mock-server/index.js';
import { generateCanary, processDraft } from './mock-server/defense.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(here, 'dist');
const indexFile = path.join(distDir, 'index.html');
const port = Number(process.env.PORT || 3001);
const store = createStore();

const app = express();
app.use(express.json({ limit: '256kb' }));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'operations-assistance-defense' });
});

app.get('/api/samples', (_req, res) => {
  res.json({ total: store.samples.length, samples: store.samples });
});

app.get('/api/features', (_req, res) => {
  res.json([
    { key: 'proposal', label: 'Proposal' },
    { key: 'copy', label: 'Copywriting' },
    { key: 'meeting_summary', label: 'Meeting summary' }
  ]);
});

app.post('/api/render', (req, res) => {
  const feature = req.body?.feature || 'proposal';
  const content = String(req.body?.content ?? '');
  if (!['proposal', 'copy', 'meeting_summary'].includes(feature)) {
    return res.status(400).json({ error: 'Unsupported feature' });
  }
  const canary = generateCanary();
  const sample = { feature, category: 'manual', outputHint: content.slice(0, 140) };
  const draft = mockGenerate(sample, { canary });
  const result = processDraft({ feature, userInput: content, draft, canary, store });
  store.lintIssues.push(...result.lintIssues);
  res.json(result);
});

app.post('/api/evaluate', (_req, res) => {
  res.json(store.evaluate());
});

app.get('/api/reports', (_req, res) => {
  res.json({
    total: store.reports.length,
    reports: store.reports.map((report) => ({
      id: report.id,
      createdAt: report.createdAt,
      metrics: report.metrics,
      passed: report.passed
    }))
  });
});

app.get('/api/reports/:id', (req, res) => {
  const report = store.reports.find((item) => item.id === req.params.id);
  if (!report) return res.status(404).json({ error: 'Report not found' });
  res.json(report);
});

app.get('/api/audit', (_req, res) => {
  res.json({ total: store.auditLog.length, records: store.auditLog });
});

app.get('/api/review-queue', (_req, res) => {
  res.json({ total: store.reviewQueue.length, entries: store.reviewQueue });
});

app.get('/api/stats', (_req, res) => {
  const latest = store.reports.at(-1);
  res.json({
    sampleCount: store.samples.length,
    auditCount: store.auditLog.length,
    reviewQueueSize: store.reviewQueue.length,
    reportCount: store.reports.length,
    latestMetrics: latest ? latest.metrics : null,
    latestPassed: latest ? latest.passed : null
  });
});

if (fs.existsSync(distDir)) app.use(express.static(distDir));

app.get('*', (_req, res) => {
  if (fs.existsSync(indexFile)) return res.sendFile(indexFile);
  res.status(200).type('html').send('<!doctype html><title>Defense console</title><p>Run npm run build to generate the demo bundle.</p>');
});

app.listen(port, '127.0.0.1', () => {
  console.log(`Defense console listening on http://127.0.0.1:${port}`);
});
