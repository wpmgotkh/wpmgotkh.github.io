export function privatizeName(person) {
  if (!person) return person;

  return person.consideredLiving && !person.noteworthy ? 'Living Person' : person.name.full;
}
