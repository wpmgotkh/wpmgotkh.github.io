import { findRecord } from './findRecord.js';
import { findValue } from './findValue.js';
import { normalizeEvent } from './normalizeEvent.js';
import { shouldConsiderPersonLiving } from './shouldConsiderPersonLiving.js';
import { upper } from './upper.js';

export function normalizePerson(tree, person) {
  if (!person) return person;

  const normalizedPerson = {
    events: {},
    notes: [],
    sources: [],
  };

  const name = person.children.find(({ type }) => type === 'NAME');
  const given = name?.children.find(({ type }) => type === 'GIVN')?.data.value;
  const surname = name?.children.find(({ type }) => type === 'SURN')?.data.value;
  const full = name?.data.value.replaceAll(/\//g, '');

  normalizedPerson.id = person.data.xref_id;

  const prettyId = normalizedPerson.id.replaceAll('@', '');

  normalizedPerson.prettyId = prettyId;
  normalizedPerson.url = `/people/${prettyId.substr(0, 1)}/${prettyId}`;

  normalizedPerson.sex = upper(findValue(person, 'SEX'));
  normalizedPerson.name = {
    given,
    surname,
    full,
  };

  normalizedPerson.noteworthy = person.children
    .filter(({ type }) => type === 'LABL')
    .map(({ data }) => findRecord(tree, 'LABL', data.pointer))
    .find(
      ({ children }) => children.find(({ type }) => type === 'TITL')?.data.value === 'Noteworthy'
    );

  // TODO: FIXME: handle multiple
  const birthIndex = person.children.findIndex(({ type }) => type === 'BIRT');
  const deathIndex = person.children.findIndex(({ type }) => type === 'DEAT');
  const burialIndex = person.children.findIndex(({ type }) => type === 'BURI');

  const birth = normalizeEvent(tree, person.children[birthIndex], `event-${birthIndex}`);
  const death = normalizeEvent(tree, person.children[deathIndex], `event-${deathIndex}`);
  const burial = normalizeEvent(tree, person.children[burialIndex], `event-${burialIndex}`);

  normalizedPerson.events.birth = birth ? [birth] : [];
  normalizedPerson.events.death = death ? [death] : [];
  normalizedPerson.events.burial = burial ? [burial] : [];

  normalizedPerson.consideredLiving = shouldConsiderPersonLiving(tree, normalizedPerson);

  // FIXME: deprecate this
  normalizedPerson.children = person.children;

  return normalizedPerson;
}
