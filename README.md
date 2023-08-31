# Overlapping hierarchy

Library for modeling [overlapping hierarchy](https://en.wikipedia.org/wiki/Hierarchy#Degree_of_branching), in which nodes can have multiple parents.

Equivalent of [transitively reduced](https://en.wikipedia.org/wiki/Transitive_reduction) [directed acyclic graph](https://en.wikipedia.org/wiki/Directed_acyclic_graph), in which edges represent parenthood.

## Example

```text
A  B F  G
 \ | | /
   C H
 / | | \
D  E I  J
```

```typescript
const hierarchy = new OverlappingHierarchy()
hierarchy.add('A')
hierarchy.add('B')
hierarchy.attach('A', 'C')
hierarchy.attach('B', 'C')
hierarchy.attach('C', 'D')
hierarchy.attach('C', 'E')
hierarchy.add('F')
hierarchy.add('G')
hierarchy.attach('F', 'H')
hierarchy.attach('G', 'H')
hierarchy.attach('H', 'I')
hierarchy.attach('H', 'J')
```

## API

### Initialization

`const empty = new OverlappingHierarchy()`

`const cloned = new OverlappingHierarchy(source)`

### Mutation

`hierarchy.add(node)`

`hierarchy.attach(parent, child)`

`hierarchy.detach(parent, child)`

`hierarchy.delete(node)`

### Traversal

`hierarchy.nodes()`

`hierarchy.hierarchs()`

`hierarchy.children(parent)`

`hierarchy.parents(child)`

`hierarchy.descendants(ancestor)`

`hierarchy.ancestors(descendant)`

### Errors

### LoopError

```typescript
hierarchy.attach('A', 'A') // LoopError: Cannot add node to itself
```

### CycleError

```typescript
hierarchy.attach('D', 'A') // CycleError: Cannot add ancestor as a child
```

### TransitiveReductionError

```typescript
hierarchy.attach('A', 'D') // TransitiveReductionError: Cannot attach non-child descendant as a child
hierarchy.attach('A', 'B') // TransitiveReductionError: Cannot attach child whose descendant is a child of the parent
```
