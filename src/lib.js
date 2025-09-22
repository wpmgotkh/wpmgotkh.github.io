import { findValue } from './lib/findValue.js';
import { normalizeDate } from './lib/normalizeDate.js';
import { shouldConsiderPersonLiving } from './lib/shouldConsiderPersonLiving.js';
import { upper } from './lib/upper.js';

export const sexIcon = (person) => {
  return person.sex === 'F' ? '🟣' : '🔵';
};

export const findRecord = (tree, tag, id) =>
  tree.children.find(({ type, data }) => type === tag && data.xref_id === id);

export const findRecords = (tree, tag) => tree.children.filter(({ type }) => type === tag);

export const personName = (person) => {
  if (!person) return person;

  const name = person.children.find(({ type }) => type === 'NAME');
  const given = name?.children.find(({ type }) => type === 'GIVN')?.data.value;
  const surname = name?.children.find(({ type }) => type === 'SURN')?.data.value;
  return { given, surname };
};

export const normalizeEvent = (tree, event, id) => {
  if (!event) return event;
  if (!id) throw new Error('Event ID is required');

  const date = event.children.find(({ type }) => type === 'DATE');
  const place = event.children.find(({ type }) => type === 'PLAC');

  const sources = event.children.filter(({ type }) => type === 'SOUR');

  return {
    id: id,
    type: event.type,
    date: date ? date.data.value : '',
    normalizedDate: date ? normalizeDate(date.data.value) : undefined,
    place: [event.data.value, place?.data.value].filter(Boolean).join(', '),
    sources: normalizeCitations(tree, sources),
  };
};

export const getCitationPage = (citation) =>
  citation.children.find(({ type }) => type === 'PAGE')?.data.value;

export const normalizeCitations = (tree, citations) => {
  return citations.map((citation) => {
    const source = findRecord(tree, 'SOUR', citation.data.pointer);
    const name =
      source.children.find(({ type }) => type === 'TITL') ??
      source.children.find(({ type }) => type === 'PERI');

    return {
      id: citation.data.pointer.replaceAll('@', ''),
      name: name ? name.data.value : '',
      page: getCitationPage(citation),
      notes: normalizeNotes(
        tree,
        citation.children.filter(({ type }) => type === 'NOTE')
      ),
    };
  });
};

export const normalizeNotes = (tree, notes) => {
  return notes
    .map(({ data }) => findRecord(tree, 'NOTE', data.pointer)?.data.value)
    .filter(Boolean);
};

export const findSpouse = (tree, family, personId) => {
  const spouseRef = family.children.find(
    ({ type, data }) => (type === 'WIFE' || type === 'HUSB') && data.pointer !== personId
  );

  if (!spouseRef) return undefined;

  return findRecord(tree, 'INDI', spouseRef.data.pointer);
};

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
