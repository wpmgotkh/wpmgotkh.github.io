// A utility for creating basic trees for use in tests
export function createTree() {
  return {
    data: { children: [] },
    addIndividual(id, data = {}) {
      const individual = {
        type: 'INDI',
        data: { xref_id: id },
        children: [
          ...(data.events ?? []).map((event) => ({
            type: event.type,
            children: [event.date && { type: 'DATE', data: { value: event.date } }].filter(Boolean),
          })),
          ...(data.fams ?? []).map((fam) => ({
            type: 'FAMS',
            data: { pointer: fam },
            children: [],
          })),
        ],
      };
      this.data.children.push(individual);
      return this;
    },
    addFamily(id, data = {}) {
      const family = {
        type: 'FAM',
        data: { xref_id: id },
        children: (data.children ?? []).map((pointer) => ({
          type: 'CHIL',
          data: { pointer },
          children: [],
        })),
      };
      this.data.children.push(family);
      return this;
    },
    get() {
      return this.data;
    },
  };
}
