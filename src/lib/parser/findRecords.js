export const findRecords = (tree, tag) => tree.children.filter(({ type }) => type === tag);
