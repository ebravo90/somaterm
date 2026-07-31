const assert = require('assert');

let tree = {
  path: "/",
  children: [
    { path: "/src", children: null }
  ]
};

const handleUpdateNode = (path, updates) => {
  let nextTree = null;
  const setTree = (updater) => { nextTree = updater(tree); };
  
  setTree(prev => {
    if (!prev) return prev;
    
    const updateNodeInTree = (node) => {
      if (node.path === path) {
        return { ...node, ...updates };
      }
      if (node.children) {
        let changed = false;
        const updatedChildren = node.children.map(child => {
          const updatedChild = updateNodeInTree(child);
          if (updatedChild !== child) {
            changed = true;
          }
          return updatedChild;
        });
        if (changed) {
          return { ...node, children: updatedChildren };
        }
      }
      return node;
    };
    
    return updateNodeInTree(prev);
  });
  
  return nextTree;
};

const newTree = handleUpdateNode("/src", { children: [{path: "/src/main.tsx"}], isExpanded: true });
console.log(JSON.stringify(newTree, null, 2));
assert(newTree !== tree);
assert(newTree.children !== tree.children);
assert(newTree.children[0] !== tree.children[0]);
assert(newTree.children[0].isExpanded === true);
console.log("Success!");
