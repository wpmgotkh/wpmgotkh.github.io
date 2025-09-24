import { findParents } from '../parser/findParents.js';

export function generateTreeDiagram(tree, person) {
  const { mother, father } = findParents(tree, person);

  const parents = [
    mother && {
      parent: mother,
      grandparents: Object.values(findParents(tree, mother)).filter(Boolean),
    },
    father && {
      parent: father,
      grandparents: Object.values(findParents(tree, father)).filter(Boolean),
    },
  ].filter(Boolean);

  if (!parents.length) return [];

  return [
    '{% block "hidden md:block" %}',
    '```mermaid',
    'graph',
    'classDef grands fill:#193cb8,stroke:#2b7fff,stroke-width:1px,color:#fff;',
    'classDef parents fill:#372aac,stroke:#615fff,stroke-width:1px,color:#fff;',
    'classDef primary fill:#007595,stroke:#00a6f4,stroke-width:1px,color:#fff;',
    `${person.prettyId}(${nodeText(person, false)}):::primary`,
    ...parents
      .map(({ parent, grandparents }) => [
        `${parent.prettyId}(${nodeText(parent)}):::parents-->${person.prettyId}`,
        ...grandparents.map(
          (gp) => `${gp.prettyId}(${nodeText(gp)}):::grands-->${parent.prettyId}`
        ),
      ])
      .flat(),
    'linkStyle default stroke:#a1a1a1',
    '```',
    '{% endblock %}',
  ];
}

function nodeText(person, link = true) {
  const name = person.consideredLiving ? 'Living Person' : person.name.full;
  const birth = person.consideredLiving ? undefined : person.events.birth?.[0]?.date;

  if (!link) return `${name}${birth ? `<br /><small>b: ${birth}</small>` : ''}`;

  return `<a class="text-white" href="${person.url}">${name}</a>${
    birth ? `<br /><small>b: ${birth}</small>` : ''
  }`;
}
