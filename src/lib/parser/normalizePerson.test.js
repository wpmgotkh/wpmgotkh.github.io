import { expect, test, vi } from 'vitest';
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
