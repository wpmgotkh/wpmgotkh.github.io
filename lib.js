import { normalizeDate } from './lib/normalizeDate.js';
import { shouldConsiderPersonLiving } from './lib/shouldConsiderPersonLiving.js';

export const findFamily = (tree, id) => {
  if (!id) return id;

  const families = tree.children.filter(({ type }) => type === 'FAM');

  return tree.children.find(({ type, data }) => type === 'FAM' && data.xref_id === id);
};

export const getSex = (person) =>
  person.children.find(({ type }) => type === 'SEX').data.value.toUpperCase();

export const sexIcon = (person) =>
  // TODO: remove getSex() call when all normalized
  (person.sex ?? getSex(person)) === 'F' ? '🟣' : '🔵';

export const findPerson = (tree, id) =>
  tree.children.find(({ type, data }) => type === 'INDI' && data.xref_id === id);

export const findNotes = (tree) => tree.children.filter(({ type }) => type === 'NOTE');

export const findNote = (tree, id) =>
  tree.children.find(({ type, data }) => type === 'NOTE' && data.xref_id === id);

export const findSource = (tree, id) =>
  tree.children.find(({ type, data }) => type === 'SOUR' && data.xref_id === id);

export const personName = (person) => {
  if (!person) return person;

  const name = person.children.find(({ type }) => type === 'NAME');
  const given = name?.children.find(({ type }) => type === 'GIVN')?.data.value;
  const surname = name?.children.find(({ type }) => type === 'SURN')?.data.value;
  return { given, surname };
};

export const normalizeEvent = (tree, event) => {
  if (!event) return event;

  const date = event.children.find(({ type }) => type === 'DATE');
  const place = event.children.find(({ type }) => type === 'PLAC');

  const sources = event.children.filter(({ type }) => type === 'SOUR');

  return {
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
    const source = findSource(tree, citation.data.pointer);
    const name = source.children.find(({ type }) => type === 'TITL');

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
  return notes.map(({ data }) => findNote(tree, data.pointer)?.data.value).filter(Boolean);
};

export const findSpouse = (tree, family, personId) => {
  const spouseRef = family.children.find(
    ({ type, data }) => (type === 'WIFE' || type === 'HUSB') && data.pointer !== personId
  );

  if (!spouseRef) return undefined;

  return findPerson(tree, spouseRef.data.pointer);
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

  normalizedPerson.id = person.data.xref_id;
  normalizedPerson.prettyId = normalizedPerson.id.replaceAll('@', '');
  normalizedPerson.sex = getSex(person);
  normalizedPerson.name = {
    given,
    surname,
    full: [given, surname].filter(Boolean).join(' '),
  };

  // TODO: FIXME: handle multiple

  const birth = normalizeEvent(
    tree,
    person.children.find(({ type }) => type === 'BIRT')
  );
  const death = normalizeEvent(
    tree,
    person.children.find(({ type }) => type === 'DEAT')
  );
  const burial = normalizeEvent(
    tree,
    person.children.find(({ type }) => type === 'BURI')
  );

  normalizedPerson.events.birth = birth ? [birth] : [];
  normalizedPerson.events.death = death ? [death] : [];
  normalizedPerson.events.burial = burial ? [burial] : [];

  normalizedPerson.consideredLiving = shouldConsiderPersonLiving(tree, normalizedPerson);

  // FIXME: deprecate this
  normalizedPerson.children = person.children;

  return normalizedPerson;
}
