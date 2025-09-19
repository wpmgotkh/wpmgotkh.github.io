(function () {
  let names = [];

  fetch('/names.json')
    .then((resp) => resp.json())
    .then((data) => {
      names = data;
    });

  document.getElementById('form')?.addEventListener('submit', (e) => {
    e.preventDefault();

    const formData = new FormData(e.target);
    const searchTerm = formData.get('search');

    const matches = names.filter((name) =>
      name.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    console.log(matches);
    const resultsEl = document.getElementById('results');
    resultsEl.innerHTML = '';

    if (matches.length > 0) {
      const list = [
        '<ul>',
        ...matches.map(
          (m) => `<li><a href="${m.url}">${m.name}</a>${m.birth ? `, ${m.birth}` : ''}</li>`
        ),
        '</ul>',
      ];
      resultsEl.innerHTML = list.join('');
    } else {
      resultsEl.textContent = 'No results found';
    }
  });
})();
