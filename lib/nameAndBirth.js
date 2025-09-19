import { privatizeName } from './privatizeName.js';

export function nameAndBirth(person) {
  const name = privatizeName(person);
  const showBirth = person.events.birth.length && (!person.consideredLiving || person.noteworthy);
  const birth = showBirth ? `, b. ${person.events.birth?.[0]?.date ?? ''}` : '';

  return `[${name}](${person.url})${birth}`;
}
