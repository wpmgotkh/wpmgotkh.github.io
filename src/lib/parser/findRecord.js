export const findRecord = (tree, tag, id) =>
  tree.children.find(({ type, data }) => type === tag && data.xref_id === id);
