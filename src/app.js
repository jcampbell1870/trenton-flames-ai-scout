const path = require('path');
const express = require('express');
const cors = require('cors');
const { prospects } = require('./data/prospects');

const app = express();
const frontendRoot = path.resolve(__dirname, '..', 'frontend');
const positions = [...new Set(prospects.map((prospect) => prospect.position))].sort();

const parseCorsOrigins = (originsRaw) => {
  const defaults = ['http://localhost:3000', 'http://127.0.0.1:3000'];
  const configured = (originsRaw || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
    .filter((origin) => origin !== '*');

  return [...new Set([...defaults, ...configured])];
};

const allowedOrigins = parseCorsOrigins(process.env.CORS_ORIGIN);

const rateLimitState = new Map();

const isLoopbackAddress = (value) =>
  ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes((value || '').trim());

const hasTrustedSameOriginReferer = (req) => {
  const referer = req.get('referer');
  const host = req.get('host');

  if (!referer || !host) {
    return false;
  }

  try {
    return new URL(referer).host === host;
  } catch {
    return false;
  }
};

const requireTrustedApiOrigin = (req, res, next) => {
  if (!req.path.startsWith('/api/') || req.path === '/api/health') {
    return next();
  }

  const origin = req.get('origin');
  if (origin && allowedOrigins.includes(origin)) {
    return next();
  }

  if (
    (!origin && isLoopbackAddress(req.ip)) ||
    isLoopbackAddress(req.socket?.remoteAddress) ||
    hasTrustedSameOriginReferer(req)
  ) {
    return next();
  }

  return res.status(403).json({
    error: 'Trusted Origin header required for this API endpoint.'
  });
};

const createRateLimiter = ({ windowMs, maxRequests }) => (req, res, next) => {
  const key = req.ip || req.socket?.remoteAddress || 'unknown';
  const now = Date.now();
  const recentHits = (rateLimitState.get(key) || []).filter((timestamp) => now - timestamp < windowMs);

  if (recentHits.length >= maxRequests) {
    return res.status(429).json({
      error: 'Too many requests. Please retry shortly.'
    });
  }

  recentHits.push(now);
  rateLimitState.set(key, recentHits);
  return next();
};

const frontendFallbackRateLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 120 });

const getHealthPayload = () => ({
  status: 'ok',
  service: 'trenton-flames-ai-scout-backend',
  franchise: 'Trenton Flames',
  location: 'Trenton, Nova Scotia, Canada',
  league: 'Nova Scotia Hockey League',
  timestamp: new Date().toISOString()
});

const getStatusPayload = () => ({
  status: 'ok',
  demoMode: !process.env.AI_RESEARCH_API_KEY,
  provider: process.env.AI_RESEARCH_PROVIDER || 'not-configured'
});

const handleProspectResearch = (req, res) => {
  const { query, position } = req.body ?? {};

  if (typeof query !== 'string' || !query.trim()) {
    return res.status(400).json({
      error: 'query is required and must be a non-empty string.'
    });
  }

  const normalizedQuery = query.trim();
  const normalizedPosition = typeof position === 'string' ? position.trim().toUpperCase() : null;
  const provider = process.env.AI_RESEARCH_PROVIDER || 'not-configured';
  const hasApiKeyConfigured = Boolean(process.env.AI_RESEARCH_API_KEY);

  const matched = prospects
    .filter((prospect) => {
      if (normalizedPosition && prospect.position !== normalizedPosition) {
        return false;
      }

      const haystack = [prospect.name, prospect.position, prospect.location, prospect.currentLeagueTeam]
        .join(' ')
        .toLowerCase();

      return haystack.includes(normalizedQuery.toLowerCase());
    })
    .slice(0, 5);

  return res.json({
    query: normalizedQuery,
    position: normalizedPosition,
    provider,
    hasApiKeyConfigured,
    demoMode: !hasApiKeyConfigured,
    source: hasApiKeyConfigured
      ? 'Live provider integration not enabled in this template; returning transparent demo-format response.'
      : 'Demo fallback: no AI research API key configured.',
    disclaimer:
      'Results are sample scouting outputs and must be validated against trusted league-approved sources before decisions.',
    results: matched.map((prospect) => ({
      id: prospect.id,
      name: prospect.name,
      position: prospect.position,
      age: prospect.age,
      location: prospect.location,
      team: prospect.currentLeagueTeam,
      fitScore: prospect.fitScore,
      confidence: prospect.confidence,
      strengths: prospect.strengths,
      developmentPriorities: prospect.developmentPriorities,
      source: prospect.source,
      notes: prospect.notes,
      isDemo: prospect.isDemo
    }))
  });
};

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error('CORS origin denied'));
    },
    methods: ['GET', 'POST', 'OPTIONS']
  })
);
app.use(express.json({ limit: '100kb' }));
app.use(requireTrustedApiOrigin);
app.use(express.static(frontendRoot));

app.get('/health', (_req, res) => {
  res.json(getHealthPayload());
});

app.get('/api/health', (_req, res) => {
  res.json(getHealthPayload());
});

app.get('/status', (_req, res) => {
  res.json(getStatusPayload());
});

app.get('/api/status', (_req, res) => {
  res.json(getStatusPayload());
});

app.get('/api/prospects', (req, res) => {
  const { search, position, sort = 'desc' } = req.query;

  if (position && !positions.includes(position)) {
    return res.status(400).json({
      error: 'Invalid position filter',
      allowedPositions: positions
    });
  }

  if (!['asc', 'desc'].includes(sort)) {
    return res.status(400).json({
      error: 'Invalid sort query value. Use asc or desc.'
    });
  }

  let filtered = prospects;

  if (position) {
    filtered = filtered.filter((prospect) => prospect.position === position);
  }

  if (typeof search === 'string' && search.trim()) {
    const needle = search.trim().toLowerCase();
    filtered = filtered.filter((prospect) => {
      const haystack = [
        prospect.name,
        prospect.location,
        prospect.currentLeagueTeam,
        prospect.position,
        prospect.league
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(needle);
    });
  }

  const sorted = [...filtered].sort((a, b) => {
    const delta = a.fitScore - b.fitScore;
    return sort === 'asc' ? delta : -delta;
  });

  return res.json({
    count: sorted.length,
    filters: {
      search: search || '',
      position: position || null,
      sort
    },
    demoMode: true,
    source: 'Seeded Trenton Flames demo prospects (fictional sample data)',
    data: sorted
  });
});

app.post('/api/query', handleProspectResearch);
app.post('/api/research/prospect', handleProspectResearch);

app.get(/^\/(?!api(?:\/|$)).*/, frontendFallbackRateLimiter, (_req, res, next) => {
  res.sendFile(path.join(frontendRoot, 'index.html'), (error) => {
    if (error) {
      next(error);
    }
  });
});

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((err, _req, res, _next) => {
  const statusCode =
    Number.isInteger(err.status) ? err.status : err.message === 'CORS origin denied' ? 403 : 500;

  res.status(statusCode).json({
    error: err.message || 'Internal server error'
  });
});

module.exports = {
  app,
  positions
};
