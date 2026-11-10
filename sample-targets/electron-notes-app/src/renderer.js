/**
 * Renderer Process: UI and Search Controller
 */
const searchInput = document.getElementById('search-input');
const resultsContainer = document.getElementById('results-list');

let debounceTimer = null;

searchInput.addEventListener('input', (e) => {
  clearTimeout(debounceTimer);
  const query = e.target.value;

  // 150ms Debounce to prevent flooding IPC
  debounceTimer = setTimeout(async () => {
    if (!query) {
      resultsContainer.innerHTML = '';
      return;
    }
    const results = await window.notesApi.searchNotes(query);
    renderSearchResults(results, query);
  }, 150);
});

// Shortcut hotkey listener: Cmd+K / Ctrl+K
window.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault();
    searchInput.focus();
    searchInput.select();
  }
});

function renderSearchResults(items, query) {
  resultsContainer.innerHTML = items.map(item => `
    <div class="result-row" data-id="${item.id}">
      <div class="title">${item.title}</div>
      <div class="snippet">${item.snippet}</div>
      <div class="score">Score: ${item.score}</div>
    </div>
  `).join('');
}
