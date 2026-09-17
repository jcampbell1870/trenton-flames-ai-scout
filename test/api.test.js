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
  assert.ok(Array.isArray(response.body.researchSources));
  assert.equal(response.body.researchSources[0].type, 'facebook');
  assert.equal(
    response.body.researchSources[0].url,
    'https://www.facebook.com/p/Trenton-Flames-61579453380039/'
  );
  assert.equal(response.body.researchSources[0].configured, true);
});

test('GET /api/status allows configured cross-origin browser requests', async () => {
  const response = await request(app)
    .get('/api/status')
    .set('Origin', 'http://localhost:3000')
    .expect(200);

  assert.equal(response.body.status, 'ok');
});

test('GET /api/status rejects untrusted origins', async () => {
  const response = await request(app)
    .get('/api/status')
    .set('Origin', 'https://untrusted.example')
    .expect(403);

  assert.match(response.body.error, /(CORS origin denied|Trusted Origin header required)/);
});

test('GET / serves the dashboard HTML', async () => {
  const response = await request(app).get('/').expect(200);

  assert.match(response.headers['content-type'], /text\/html/);
  assert.match(response.text, /<title>Trenton Flames AI Scout<\/title>/);
});

test('GET /dashboard serves the dashboard HTML fallback', async () => {
  const response = await request(app).get('/dashboard').expect(200);

  assert.match(response.headers['content-type'], /text\/html/);
  assert.match(response.text, /Trenton Flames AI Scout/);
});

test('GET /missing.js does not get the HTML fallback', async () => {
  const response = await request(app).get('/missing.js').expect(404);

  assert.equal(response.body.error, 'Not found');
});

test('GET /api/prospects returns sorted prospect list in demo mode', async () => {
  const response = await request(app).get('/api/prospects').expect(200);

  assert.equal(response.body.demoMode, true);
  assert.ok(Array.isArray(response.body.data));
  assert.ok(Array.isArray(response.body.researchSources));
  assert.ok(Array.isArray(response.body.researchChecklist));
  assert.ok(response.body.data.length >= 1);
  assert.equal(response.body.data[0].fitScore >= response.body.data.at(-1).fitScore, true);
});

test('GET /api/prospects normalizes lowercase position filters', async () => {
  const response = await request(app).get('/api/prospects?position=ld').expect(200);

  assert.equal(response.body.filters.position, 'LD');
  assert.ok(response.body.data.every((prospect) => prospect.position === 'LD'));
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
  assert.ok(Array.isArray(response.body.teamResearchSources));
  assert.ok(Array.isArray(response.body.researchChecklist));
  assert.match(response.body.source, /Demo fallback/);
  assert.equal(
    response.body.teamResearchSources[0].url,
    'https://www.facebook.com/p/Trenton-Flames-61579453380039/'
  );
});

test('POST /api/query includes configured Facebook page source metadata', async () => {
  process.env.TEAM_FACEBOOK_PAGE_URL = 'https://www.facebook.com/trentonflames';

  try {
    const response = await request(app).post('/api/query').send({ query: 'Trenton' }).expect(200);

    assert.equal(response.body.teamResearchSources[0].configured, true);
    assert.equal(response.body.teamResearchSources[0].url, 'https://www.facebook.com/trentonflames');
  } finally {
    delete process.env.TEAM_FACEBOOK_PAGE_URL;
  }
});

test('POST /api/query ignores invalid Facebook page URLs', async () => {
  process.env.TEAM_FACEBOOK_PAGE_URL = 'www.facebook.com/trentonflames';

  try {
    const response = await request(app).post('/api/query').send({ query: 'Trenton' }).expect(200);

    assert.equal(response.body.teamResearchSources[0].configured, false);
    assert.equal(response.body.teamResearchSources[0].url, null);
    assert.match(response.body.teamResearchSources[0].note, /full http\(s\).*Facebook URL/);
  } finally {
    delete process.env.TEAM_FACEBOOK_PAGE_URL;
  }
});

test('POST /api/query ignores non-Facebook external URLs', async () => {
  process.env.TEAM_FACEBOOK_PAGE_URL = 'https://evil.example/phish';

  try {
    const response = await request(app).post('/api/query').send({ query: 'Trenton' }).expect(200);

    assert.equal(response.body.teamResearchSources[0].configured, false);
    assert.equal(response.body.teamResearchSources[0].url, null);
    assert.match(response.body.teamResearchSources[0].note, /Facebook URL/);
  } finally {
    delete process.env.TEAM_FACEBOOK_PAGE_URL;
  }
});

test('POST /api/query ignores Facebook redirector URLs', async () => {
  process.env.TEAM_FACEBOOK_PAGE_URL = 'https://l.facebook.com/l.php?u=https://evil.example';

  try {
    const response = await request(app).post('/api/query').send({ query: 'Trenton' }).expect(200);

    assert.equal(response.body.teamResearchSources[0].configured, false);
    assert.equal(response.body.teamResearchSources[0].url, null);
    assert.match(response.body.teamResearchSources[0].note, /Facebook URL/);
  } finally {
    delete process.env.TEAM_FACEBOOK_PAGE_URL;
  }
});
