# Ordered overlapping hierarchy

Library for modeling [overlapping hierarchy](https://en.wikipedia.org/wiki/Hierarchy#Degree_of_branching), in which nodes can have multiple parents and children are ordered.

Equivalent of [transitively reduced](https://en.wikipedia.org/wiki/Transitive_reduction#In_directed_acyclic_graphs) [weighted](https://en.wikipedia.org/wiki/Graph_(discrete_mathematics)#Weighted_graph) [directed acyclic graph](https://en.wikipedia.org/wiki/Directed_acyclic_graph), in which edges represent parenthood and their weights represent order.

## Example

```text
    0
 / | | \
A  B F  G
 \ | | /
   C H
 / | | \
D  E I  J
```

```typescript
const hierarchy = new OverlappingHierarchy('0')
hierarchy.link('A', '0')
hierarchy.link('B', '0')
hierarchy.link('A', 'C')
hierarchy.link('B', 'C')
hierarchy.link('C', 'D')
hierarchy.link('C', 'E')
hierarchy.link('F', '0')
hierarchy.link('G', '0')
hierarchy.link('F', 'H')
hierarchy.link('G', 'H')
hierarchy.link('H', 'I')
hierarchy.link('H', 'J')
```

## API

### Initialization

`const hierarch = new OverlappingHierarchy(hierarch)`

`const cloned = new OverlappingHierarchy(hierarchy)`

### Mutation

#### Link

`hierarchy.link(...)` automatically removes transitive links.

`hierarchy.link(parent, child) // as last child`

`hierarchy.link(parent, child, index) // at specific index`

`hierarchy.link('A', 'A') // LoopError: Cannot add node to itself`

`hierarchy.link('D', 'A') // CycleError: Cannot add ancestor as a child`

#### Unlink

`hierarchy.unlink(parent, child) // unlinks child from parent`

`hierarchy.unlink(parent, child) // deletes node without parents`

`hierarchy.unlink(hierarch, hierarch) // unlinking hierarch from itself does nothing`

### Traversal

`hierarchy.nodes()`

`hierarchy.hierarch`

`hierarchy.children(node)`

`hierarchy.descendants(node)`

`hierarchy.parents(node)`

`hierarchy.ancestors(node)`
