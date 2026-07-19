import { findParents } from '../parser/findParents.js';
import { privatizeName } from './privatizeName.js';

export function buildPedigreeData(tree, person) {
  const { mother, father } = findParents(tree, person);

  const branches = [
    mother && {
      parent: personData(mother),
      grandparents: Object.values(findParents(tree, mother)).filter(Boolean).map(personData),
    },
    father && {
      parent: personData(father),
      grandparents: Object.values(findParents(tree, father)).filter(Boolean).map(personData),
    },
  ].filter(Boolean);

  if (!branches.length) return null;

  return { self: personData(person), branches };
}

function personData(person) {
  const name = privatizeName(person);
  const birth = person.consideredLiving && !person.noteworthy ? undefined : person.events.birth?.[0]?.date;

  return { name, url: person.url, birth };
}
