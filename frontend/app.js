const seededProspects = window.TRENTON_FLAMES_SEEDED_PROSPECTS || [];
const apiBaseUrl = (window.TRENTON_FLAMES_CONFIG?.apiBaseUrl || '').replace(/\/$/, '');

const state = {
  prospects: [...seededProspects],
  source: 'seeded local demo data',
  search: '',
  position: '',
  sort: 'desc',
  demoMode: true,
  loading: true,
  error: '',
  researchSources: [
    {
      id: 'trenton-flames-facebook',
      type: 'facebook',
      name: 'Trenton Flames Facebook Page',
      url: 'https://www.facebook.com/p/Trenton-Flames-61579453380039/',
      configured: true,
      requiredForPlayerResearch: true,
      description:
        'Use the official team Facebook page for roster updates, prospect mentions, tryout context, and public team signals.',
      note: 'Review recent team posts alongside league-approved sources before decisions.'
    }
  ],
  researchChecklist: [
    'Check the Trenton Flames Facebook page for recent public player mentions, tryout notes, and roster context.',
    'Validate all Facebook-derived signals against trusted league-approved sources before making decisions.',
    'Do not treat demo prospects or social posts alone as verified scouting records.'
  ]
};

const searchInput = document.querySelector('#search');
const positionSelect = document.querySelector('#position');
const sortSelect = document.querySelector('#sort');
const list = document.querySelector('#prospect-list');
const dataMode = document.querySelector('#data-mode');
const sourceNote = document.querySelector('#source-note');
const researchSources = document.querySelector('#research-sources');

function renderPositionOptions(items) {
  const positions = [...new Set(items.map((item) => item.position))].sort();
  positions.forEach((position) => {
    const option = document.createElement('option');
    option.value = position;
    option.textContent = position;
    positionSelect.append(option);
  });
}

function resetPositionOptions(items) {
  positionSelect.textContent = '';
  const allOption = document.createElement('option');
  allOption.value = '';
  allOption.textContent = 'All positions';
  positionSelect.append(allOption);
  renderPositionOptions(items);
  positionSelect.value = state.position;
}

function appendLabeledText(container, label, value) {
  const strong = document.createElement('strong');
  strong.textContent = `${label}:`;
  container.append(strong, document.createTextNode(` ${value}`));
}

function toSafeExternalUrl(url) {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol) ? parsed.href : null;
  } catch {
    return null;
  }
}

function getFilteredData() {
  let items = [...state.prospects];

  if (state.position) {
    items = items.filter((item) => item.position === state.position);
  }

  if (state.search) {
    const needle = state.search.toLowerCase();
    items = items.filter((item) =>
      [item.name, item.currentLeagueTeam, item.location, item.position]
        .join(' ')
        .toLowerCase()
        .includes(needle)
    );
  }

  return items.sort((a, b) => (state.sort === 'asc' ? a.fitScore - b.fitScore : b.fitScore - a.fitScore));
}

function renderResearchSources() {
  researchSources.textContent = '';

  state.researchSources.forEach((item) => {
    const article = document.createElement('article');
    article.className = 'panel source-card';

    const heading = document.createElement('h3');
    heading.textContent = item.name;
    article.append(heading);

    const meta = document.createElement('p');
    meta.className = 'meta';
    meta.textContent = `${item.type} · ${item.configured ? 'configured' : 'needs configuration'}`;
    article.append(meta);

    const description = document.createElement('p');
    description.textContent = item.description || 'No description provided.';
    article.append(description);

    const note = document.createElement('p');
    note.className = 'subtle';
    note.textContent = item.note || '';
    article.append(note);

    const safeSourceUrl = item.url ? toSafeExternalUrl(item.url) : null;
    if (safeSourceUrl) {
      const link = document.createElement('a');
      link.href = safeSourceUrl;
      link.target = '_blank';
      link.rel = 'noreferrer';
      link.textContent = 'Open source';
      article.append(link);
    }

    if (Array.isArray(state.researchChecklist) && state.researchChecklist.length > 0) {
      const list = document.createElement('ul');
      state.researchChecklist.forEach((step) => {
        const bullet = document.createElement('li');
        bullet.textContent = step;
        list.append(bullet);
      });
      article.append(list);
    }

    researchSources.append(article);
  });
}

function renderProspects() {
  const items = getFilteredData();
  if (state.loading) {
    dataMode.textContent = 'Loading prospects…';
    sourceNote.textContent = 'Checking the configured API and preparing safe demo fallback data.';
  } else {
    dataMode.textContent = `Viewing ${items.length} prospects (${state.source}).`;
    sourceNote.textContent = state.error
      ? `${state.error} Showing clearly labelled demo data instead.`
      : state.demoMode
        ? 'Demo mode: no verified live API source is configured.'
        : 'API data loaded. Validate source confidence before decisions.';
  }

  if (items.length === 0) {
    list.textContent = '';
    const emptyState = document.createElement('article');
    emptyState.className = 'panel';
    emptyState.textContent = 'No prospects match this filter.';
    list.append(emptyState);
    return;
  }

  list.textContent = '';

  items.forEach((item) => {
    const article = document.createElement('article');
    article.className = 'card';

    const heading = document.createElement('h3');
    heading.textContent = `${item.name} (${item.position})`;
    article.append(heading);

    const team = document.createElement('p');
    team.className = 'meta';
    team.textContent = item.currentLeagueTeam;
    article.append(team);

    const location = document.createElement('p');
    location.className = 'meta';
    location.textContent = `${item.location} · Age ${item.age}`;
    article.append(location);

    const measurements = document.createElement('p');
    measurements.className = 'meta';
    measurements.textContent = `${item.height || 'Height unknown'} · Shoots ${item.shoots || 'Unknown'}`;
    article.append(measurements);

    const fitPill = document.createElement('span');
    fitPill.className = 'fit-pill';
    fitPill.textContent = `Trenton Fit Score: ${item.fitScore}`;
    article.append(fitPill);

    const scoreGrid = document.createElement('div');
    scoreGrid.className = 'score-grid';

    const confidence = document.createElement('div');
    const confidenceLabel = document.createTextNode('Confidence: ');
    const confidenceValue = document.createElement('strong');
    confidenceValue.textContent = `${Math.round((item.confidence || 0) * 100)}%`;
    confidence.append(confidenceLabel, confidenceValue);

    const league = document.createElement('div');
    const leagueLabel = document.createTextNode('League: ');
    const leagueValue = document.createElement('strong');
    leagueValue.textContent = item.league || 'Unknown';
    league.append(leagueLabel, leagueValue);

    scoreGrid.append(confidence, league);
    article.append(scoreGrid);

    const tag = document.createElement('span');
    tag.className = 'tag';
    tag.textContent = item.isDemo ? 'Demo profile' : 'Research profile';
    article.append(tag);

    const details = document.createElement('details');
    const summary = document.createElement('summary');
    summary.textContent = 'Scouting details';
    details.append(summary);

    const strengths = document.createElement('p');
    appendLabeledText(strengths, 'Strengths', (item.strengths || []).join(', '));
    details.append(strengths);

    const priorities = document.createElement('p');
    appendLabeledText(
      priorities,
      'Development priorities',
      (item.developmentPriorities || []).join(', ')
    );
    details.append(priorities);

    const source = document.createElement('p');
    appendLabeledText(source, 'Source', item.source || 'Unspecified');
    details.append(source);

    const notes = document.createElement('p');
    appendLabeledText(notes, 'Notes', item.notes || 'None');
    details.append(notes);

    const referencesLabel = document.createElement('strong');
    referencesLabel.textContent = 'References:';
    details.append(referencesLabel);

    const referencesList = document.createElement('ul');
    if ((item.sourceUrls || []).length === 0) {
      const reference = document.createElement('li');
      reference.textContent = 'No external references in demo mode.';
      referencesList.append(reference);
    } else {
      (item.sourceUrls || []).forEach((url) => {
        const reference = document.createElement('li');
        const safeUrl = toSafeExternalUrl(url);
        if (safeUrl) {
          const link = document.createElement('a');
          link.href = safeUrl;
          link.target = '_blank';
          link.rel = 'noreferrer';
          link.textContent = safeUrl;
          reference.append(link);
        } else {
          reference.textContent = `Invalid reference omitted: ${url}`;
        }
        referencesList.append(reference);
      });
    }

    details.append(referencesList);
    article.append(details);
    list.append(article);
  });

  renderResearchSources();
}

async function tryLoadApiData() {
  const endpoint = apiBaseUrl ? `${apiBaseUrl}/api/prospects` : '/api/prospects';

  try {
    const response = await fetch(endpoint);
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const body = await response.json();
    if (!Array.isArray(body.data)) {
      throw new Error('Unexpected API response shape.');
    }

    state.prospects = body.data;
    state.source = body.source || `Render/API data (${endpoint})`;
    state.demoMode = Boolean(body.demoMode);
    state.researchSources = Array.isArray(body.researchSources) ? body.researchSources : state.researchSources;
    state.researchChecklist = Array.isArray(body.researchChecklist)
      ? body.researchChecklist
      : state.researchChecklist;
    resetPositionOptions(state.prospects);
    state.error = '';
  } catch (error) {
    state.source = 'seeded local demo data (API unavailable)';
    state.demoMode = true;
    state.error = `API unavailable at ${endpoint}: ${error.message}`;
    resetPositionOptions(state.prospects);
  } finally {
    state.loading = false;
  }

  renderProspects();
}

searchInput.addEventListener('input', (event) => {
  state.search = event.target.value.trim();
  renderProspects();
});

positionSelect.addEventListener('change', (event) => {
  state.position = event.target.value;
  renderProspects();
});

sortSelect.addEventListener('change', (event) => {
  state.sort = event.target.value;
  renderProspects();
});

resetPositionOptions(state.prospects);
renderProspects();
void tryLoadApiData();
