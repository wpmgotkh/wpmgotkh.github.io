export function privatizeName(person) {
  if (!person) return person;

  return person.consideredLiving ? 'Living Person' : person.name.full;
}
