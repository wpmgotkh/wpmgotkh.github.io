import { familyEventTypes } from '../const.js';
import { findRecord } from './findRecord.js';
import { findSpouse } from './findSpouse.js';
import { normalizeEvent } from './normalizeEvent.js';
import { normalizePerson } from './normalizePerson.js';

export function findRelationships(person, tree) {
  return person.children
    .filter(({ type }) => type === 'FAMS')
    .map((record, index) => {
      const family = findRecord(tree, 'FAM', record.data.pointer);

      const sp = findSpouse(tree, family, person.id);
      const spouse = normalizePerson(tree, sp);

      return { ...family, spouse, events: findFamilyEvents(family, tree, `family-${index}`) };
    })
    .filter(Boolean);
}

function findFamilyEvents(family, tree, idPrefix) {
  return family.children
    .filter(({ type }) => familyEventTypes.includes(type))
    .map((event, index) => normalizeEvent(tree, event, `${idPrefix}-event-${index}`));
}
