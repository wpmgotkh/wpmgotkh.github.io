export const findValue = (tree, tag) => tree.children.find(({ type }) => type === tag)?.data.value;
