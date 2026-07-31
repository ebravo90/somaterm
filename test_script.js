const prev = {
  path: "/",
  children: [
    { path: "/src", is_dir: true }
  ]
};

const handleUpdateNode = (path, newChildren) => {
  const updateNode = (node) => {
    if (node.path === path) {
      return { ...node, children: newChildren };
    }
    if (node.children) {
      return { ...node, children: node.children.map(updateNode) };
    }
    return node;
  };
  return updateNode(prev);
};

const next = handleUpdateNode("/src", [{ path: "/src/main.ts", is_dir: false }]);
console.log(JSON.stringify(next, null, 2));
