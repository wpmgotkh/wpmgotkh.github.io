function padTwo(number) {
  return String(number).padStart(2, '0');
}

export function shouldConsiderPersonLiving(tree, person) {
  const now = new Date().getFullYear();

  // we already know they've died
  if (person.events.death?.[0]?.date) return false;

  // if they were born >= 120 years ago
  if (person.events.birth?.[0]?.normalizedDate) {
    const birthDate = Number(person.events.birth[0].normalizedDate.substring(0, 4));
    if (!Number.isNaN(birthDate) && now - birthDate >= 120) return false;
  }

  // if either of their parents were born >= 160 years ago

  // if any of their siblings were burn >= 140 years ago

  // otherwise we assume they are living
  return true;
}
