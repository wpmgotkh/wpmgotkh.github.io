import { expect, test, vi } from 'vitest';
import { eventTypes, personalEventTypes } from '../const.js';
import { normalizeEvent } from './normalizeEvent.js';
import { normalizePerson } from './normalizePerson.js';
import * as mod from './shouldConsiderPersonLiving.js';

test('should proxy to expensive calls', () => {
  const tree = {
    children: [],
  };
  const person = {
    data: {
      xref_id: '@I1',
    },
    children: [],
  };

  const spy = vi.spyOn(mod, 'shouldConsiderPersonLiving');

  const normalized = normalizePerson(tree, person);

  expect(spy).not.toHaveBeenCalled();
  expect(normalized.consideredLiving).toBe(true);
  expect(spy).toHaveBeenCalledOnce();
});

test('birth and other-event IDs share one counter and never collide', () => {
  const tree = { children: [] };
  const birtChild = { type: 'BIRT', data: {}, children: [] };
  const occuChild = { type: 'OCCU', data: {}, children: [] };
  const person = {
    data: { xref_id: '@I1' },
    // BIRT is the first raw child, so the old birthIndex (raw children.findIndex) was 0 —
    // the same id generate.js's old eventTypes-only-filtered index would assign to OCCU.
    children: [birtChild, occuChild],
  };

  const normalized = normalizePerson(tree, person);

  expect(normalized.events.birth[0].id).toBe('event-0');

  // Mirrors generate.js's otherEvents indexing.
  const otherEvents = normalized.children
    .filter(({ type }) => personalEventTypes.includes(type))
    .map((event, index) => ({ event, index }))
    .filter(({ event }) => eventTypes.includes(event.type))
    .map(({ event, index }) => normalizeEvent(tree, event, `event-${index}`));

  expect(otherEvents[0].id).toBe('event-1');
  expect(otherEvents[0].id).not.toBe(normalized.events.birth[0].id);
});
