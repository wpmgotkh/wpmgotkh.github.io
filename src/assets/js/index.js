(function () {
  let names = [];
  const PAGE_SIZE = 25;

  let currentMatches = [];
  let currentPage = 0;

  const input = document.getElementById('default-search');
  const hintEl = document.getElementById('search-hint');
  const resultsEl = document.getElementById('results');
  const homepageContentEl = document.getElementById('homepage-content');
  const clearBtn = document.getElementById('search-clear');

  fetch('/names.json')
    .then((resp) => resp.json())
    .then((data) => {
      names = data;
      if (hintEl) {
        hintEl.textContent = `Search ${names.length.toLocaleString()} people in the tree.`;
      }
    });

  function renderPage() {
    const totalPages = Math.ceil(currentMatches.length / PAGE_SIZE);
    const start = currentPage * PAGE_SIZE;
    const shown = currentMatches.slice(start, start + PAGE_SIZE);

    const list = [
      '<ul class="divide-y divide-gray-200 dark:divide-gray-700">',
      ...shown.map(
        (m) =>
          `<li class="py-2"><a href="${m.url}">${m.name}</a>${m.birth ? `<span class="text-gray-500 dark:text-gray-400">, ${m.birth}</span>` : ''}</li>`
      ),
      '</ul>',
    ];

    if (totalPages > 1) {
      list.push(
        '<div class="pager not-prose flex items-center justify-between mt-4">',
        currentPage > 0
          ? '<a href="#" id="search-prev">← Previous</a>'
          : '<span>← Previous</span>',
        `<span class="text-xs text-gray-500 dark:text-gray-400">Page ${currentPage + 1} of ${totalPages} (${currentMatches.length} matches)</span>`,
        currentPage < totalPages - 1
          ? '<a href="#" id="search-next">Next →</a>'
          : '<span>Next →</span>',
        '</div>'
      );
    }

    resultsEl.innerHTML = list.join('');

    document.getElementById('search-prev')?.addEventListener('click', (e) => {
      e.preventDefault();
      currentPage -= 1;
      renderPage();
    });
    document.getElementById('search-next')?.addEventListener('click', (e) => {
      e.preventDefault();
      currentPage += 1;
      renderPage();
    });
  }

  function render(searchTerm) {
    if (homepageContentEl) {
      homepageContentEl.classList.toggle('hidden', Boolean(searchTerm));
    }
    clearBtn?.classList.toggle('hidden', !searchTerm);

    if (!searchTerm) {
      currentMatches = [];
      currentPage = 0;
      resultsEl.innerHTML = '';
      return;
    }

    currentMatches = names
      .filter((name) => name.name.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name));
    currentPage = 0;

    if (currentMatches.length > 0) {
      renderPage();
    } else {
      resultsEl.innerHTML =
        '<p class="text-gray-500 dark:text-gray-400">No results found.</p>';
    }
  }

  let debounceTimer;
  input?.addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    const value = e.target.value.trim();
    debounceTimer = setTimeout(() => render(value), 300);
  });

  document.getElementById('form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    clearTimeout(debounceTimer);
    render(input.value.trim());
  });

  clearBtn?.addEventListener('click', () => {
    clearTimeout(debounceTimer);
    input.value = '';
    render('');
    input.focus();
  });
})();
