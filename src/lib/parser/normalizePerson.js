import { personalEventTypes } from '../const.js';
import { upper } from '../upper.js';
import { findRecord } from './findRecord.js';
import { findValue } from './findValue.js';
import { normalizeEvent } from './normalizeEvent.js';
import { shouldConsiderPersonLiving } from './shouldConsiderPersonLiving.js';

export function normalizePerson(tree, person) {
  if (!person) return person;

  const normalizedPerson = {};

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

  normalizedPerson.children = person.children;

  return new Proxy(normalizedPerson, {
    get(target, prop, receiver) {
      switch (prop) {
        case 'events':
          if (!('events' in target)) {
            target.events = {};
            // TODO: FIXME: handle multiple
            // IDs are indexed against the full set of personal event children (shared with
            // generate.js's otherEvents) so `event-N` anchors never collide across event types.
            const eventChildren = target.children.filter(({ type }) =>
              personalEventTypes.includes(type)
            );
            const birthIndex = eventChildren.findIndex(({ type }) => type === 'BIRT');
            const deathIndex = eventChildren.findIndex(({ type }) => type === 'DEAT');
            const burialIndex = eventChildren.findIndex(({ type }) => type === 'BURI');

            const birth = normalizeEvent(tree, eventChildren[birthIndex], `event-${birthIndex}`);
            const death = normalizeEvent(tree, eventChildren[deathIndex], `event-${deathIndex}`);
            const burial = normalizeEvent(
              tree,
              eventChildren[burialIndex],
              `event-${burialIndex}`
            );

            target.events.birth = birth ? [birth] : [];
            target.events.death = death ? [death] : [];
            target.events.burial = burial ? [burial] : [];
          }
          return target.events;

        case 'noteworthy':
          if (!('noteworthy' in target)) {
            target.noteworthy = target.children
              .filter(({ type }) => type === 'LABL')
              .map(({ data }) => findRecord(tree, 'LABL', data.pointer))
              .find(
                ({ children }) =>
                  children.find(({ type }) => type === 'TITL')?.data.value === 'Noteworthy'
              );
          }
          return target.noteworthy;

        case 'consideredLiving':
          if (!('consideredLiving' in target)) {
            target.consideredLiving = shouldConsiderPersonLiving(tree, receiver);
          }
          return target.consideredLiving;
      }

      return Reflect.get(...arguments);
    },
  });
}
