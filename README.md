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
hierarchy.attach('A', '0')
hierarchy.attach('B', '0')
hierarchy.attach('A', 'C')
hierarchy.attach('B', 'C')
hierarchy.attach('C', 'D')
hierarchy.attach('C', 'E')
hierarchy.attach('F', '0')
hierarchy.attach('G', '0')
hierarchy.attach('F', 'H')
hierarchy.attach('G', 'H')
hierarchy.attach('H', 'I')
hierarchy.attach('H', 'J')
```

## API

### Initialization

`const hierarch = new OverlappingHierarchy(hierarch)`

`const cloned = new OverlappingHierarchy(hierarchy)`

### Mutation

`hierarchy.attach(parent, child) // as last child`
`hierarchy.attach(parent, child, index) // at specific index`

`hierarchy.detach(parent, child) // deletes node without parents`

### Traversal

`hierarchy.children(node)`

`hierarchy.parents(node)`

`hierarchy.descendants(node)`

`hierarchy.ancestors(node)`

### Errors

### LoopError

```typescript
hierarchy.attach('A', 'A') // LoopError: Cannot add node to itself
```

### CycleError

```typescript
hierarchy.attach('D', 'A') // CycleError: Cannot add ancestor as a child
```
