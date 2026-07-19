export function renderPedigree({ self, branches }) {
  return (
    '<div class="pedigree not-prose text-sm">' +
    personNode(self, { link: false, bold: true }) +
    '<div class="pedigree-branches">' +
    branches
      .map(
        ({ parent, grandparents }) =>
          '<div class="pedigree-branch">' +
          personNode(parent) +
          (grandparents.length
            ? '<div class="pedigree-branches">' +
              grandparents.map((gp) => `<div class="pedigree-branch">${personNode(gp)}</div>`).join('') +
              '</div>'
            : '') +
          '</div>'
      )
      .join('') +
    '</div>' +
    '</div>'
  );
}

function personNode(person, { link = true, bold = false } = {}) {
  const nameHtml = link ? `<a href="${person.url}">${person.name}</a>` : person.name;

  return (
    `<div class="pedigree-person${bold ? ' font-semibold' : ''}">` +
    nameHtml +
    (person.birth ? ` <span class="pedigree-birth">b: ${person.birth}</span>` : '') +
    '</div>'
  );
}
