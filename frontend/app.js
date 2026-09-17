const seededProspects = window.TRENTON_FLAMES_SEEDED_PROSPECTS || [];
const apiBaseUrl = (window.TRENTON_FLAMES_CONFIG?.apiBaseUrl || '').replace(/\/$/, '');

const state = {
  prospects: [...seededProspects],
  source: 'seeded local demo data',
  search: '',
  position: '',
  sort: 'desc',
  demoMode: true
};

const searchInput = document.querySelector('#search');
const positionSelect = document.querySelector('#position');
const sortSelect = document.querySelector('#sort');
const list = document.querySelector('#prospect-list');
const dataMode = document.querySelector('#data-mode');
const sourceNote = document.querySelector('#source-note');

function renderPositionOptions(items) {
  const positions = [...new Set(items.map((item) => item.position))].sort();
  positions.forEach((position) => {
    const option = document.createElement('option');
    option.value = position;
    option.textContent = position;
    positionSelect.append(option);
  });
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

function renderProspects() {
  const items = getFilteredData();
  dataMode.textContent = `Viewing ${items.length} prospects (${state.source}).`;
  sourceNote.textContent = state.demoMode
    ? 'Demo mode: no verified live API source is configured.'
    : 'API data loaded. Validate source confidence before decisions.';

  if (items.length === 0) {
    list.innerHTML = '<article class="panel">No prospects match this filter.</article>';
    return;
  }

  list.innerHTML = items
    .map((item) => {
      const sources = (item.sourceUrls || [])
        .map((url) => `<li><a href="${url}" target="_blank" rel="noreferrer">${url}</a></li>`)
        .join('');

      return `
        <article class="card">
          <h3>${item.name} (${item.position})</h3>
          <p class="meta">${item.currentLeagueTeam}</p>
          <p class="meta">${item.location} · Age ${item.age}</p>
          <p class="meta">${item.height || 'Height unknown'} · Shoots ${item.shoots || 'Unknown'}</p>
          <span class="fit-pill">Trenton Fit Score: ${item.fitScore}</span>
          <div class="score-grid">
            <div>Confidence: <strong>${Math.round((item.confidence || 0) * 100)}%</strong></div>
            <div>League: <strong>${item.league || 'Unknown'}</strong></div>
          </div>
          <span class="tag">${item.isDemo ? 'Demo profile' : 'Research profile'}</span>
          <details>
            <summary>Scouting details</summary>
            <p><strong>Strengths:</strong> ${(item.strengths || []).join(', ')}</p>
            <p><strong>Development priorities:</strong> ${(item.developmentPriorities || []).join(', ')}</p>
            <p><strong>Source:</strong> ${item.source || 'Unspecified'}</p>
            <p><strong>Notes:</strong> ${item.notes || 'None'}</p>
            <strong>References:</strong>
            <ul>${sources || '<li>No external references in demo mode.</li>'}</ul>
          </details>
        </article>
      `;
    })
    .join('');
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
  } catch (_error) {
    state.source = 'seeded local demo data (API unavailable)';
    state.demoMode = true;
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

renderPositionOptions(state.prospects);
renderProspects();
void tryLoadApiData();
