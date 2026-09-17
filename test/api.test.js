const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { app } = require('../src/app');

test('GET /health returns service status', async () => {
  const response = await request(app).get('/health').expect(200);

  assert.equal(response.body.status, 'ok');
  assert.equal(response.body.service, 'trenton-flames-ai-scout-backend');
  assert.equal(response.body.location, 'Trenton, Nova Scotia, Canada');
  assert.ok(response.body.timestamp);
});

test('GET /api/health returns the health payload alias', async () => {
  const response = await request(app).get('/api/health').expect(200);

  assert.equal(response.body.status, 'ok');
  assert.equal(response.body.franchise, 'Trenton Flames');
});

test('GET /status returns backend status', async () => {
  const response = await request(app).get('/status').expect(200);

  assert.equal(response.body.status, 'ok');
  assert.equal(response.body.demoMode, true);
  assert.equal(response.body.provider, 'not-configured');
});

test('GET /api/status returns backend status alias', async () => {
  const response = await request(app).get('/api/status').expect(200);

  assert.equal(response.body.status, 'ok');
  assert.equal(response.body.demoMode, true);
  assert.equal(response.body.provider, 'not-configured');
});

test('GET / serves the dashboard HTML', async () => {
  const response = await request(app).get('/').expect(200);

  assert.match(response.headers['content-type'], /text\/html/);
  assert.match(response.text, /<title>Trenton Flames AI Scout<\/title>/);
});

test('GET /api/prospects returns sorted prospect list in demo mode', async () => {
  const response = await request(app).get('/api/prospects').expect(200);

  assert.equal(response.body.demoMode, true);
  assert.ok(Array.isArray(response.body.data));
  assert.ok(response.body.data.length >= 1);
  assert.equal(response.body.data[0].fitScore >= response.body.data.at(-1).fitScore, true);
});

test('GET /api/prospects rejects invalid position filter', async () => {
  const response = await request(app).get('/api/prospects?position=INVALID').expect(400);

  assert.equal(response.body.error, 'Invalid position filter');
  assert.ok(Array.isArray(response.body.allowedPositions));
});

test('POST /api/research/prospect validates query', async () => {
  const response = await request(app).post('/api/research/prospect').send({ query: '' }).expect(400);

  assert.equal(response.body.error, 'query is required and must be a non-empty string.');
});

test('POST /api/research/prospect returns graceful demo response when no API key configured', async () => {
  const response = await request(app)
    .post('/api/research/prospect')
    .send({ query: 'Trenton', position: 'LD' })
    .expect(200);

  assert.equal(response.body.demoMode, true);
  assert.equal(response.body.hasApiKeyConfigured, false);
  assert.ok(Array.isArray(response.body.results));
  assert.equal(response.body.results[0].isDemo, true);
});

test('POST /api/query mirrors the safe research response contract', async () => {
  const response = await request(app).post('/api/query').send({ query: 'Trenton' }).expect(200);

  assert.equal(response.body.demoMode, true);
  assert.equal(response.body.hasApiKeyConfigured, false);
  assert.ok(Array.isArray(response.body.results));
  assert.match(response.body.source, /Demo fallback/);
});
