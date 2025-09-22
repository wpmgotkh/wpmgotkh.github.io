export function defunkifyPlace(place) {
  return place.split(', ').filter(Boolean).join(', ');
}
