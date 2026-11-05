export function searchText(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('ro').replace(/\s+/g, ' ').trim();
}
export function matchesSearch(value: string, query: string): boolean {
  const text = searchText(value);
  return searchText(query).split(' ').every(term => text.includes(term));
}
