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
hierarchy.attachChild('A', 'C')
hierarchy.attachChild('B', 'C')
hierarchy.attachChild('C', 'D')
hierarchy.attachChild('C', 'E')
hierarchy.add('F')
hierarchy.add('G')
hierarchy.attachChild('F', 'H')
hierarchy.attachChild('G', 'H')
hierarchy.attachChild('H', 'I')
hierarchy.attachChild('H', 'J')
```

## API

### Initialization

`const empty = new OverlappingHierarchy()`

`const cloned = new OverlappingHierarchy(source)`

### Mutation

#### `hierarchy.add(node)`
#### `hierarchy.attachChild(parent, child)`
#### `hierarchy.detachChild(parent, child)`
#### `hierarchy.remove(node)`

### Traversal

#### `hierarchy.nodes()`
#### `hierarchy.hierarchs()`
#### `hierarchy.children(parent)`
#### `hierarchy.parents(child)`
#### `hierarchy.descendants(ancestor)`
#### `hierarchy.ancestors(descendant)`

### Errors

### LoopError

```typescript
hierarchy.attachChild('A', 'A') // LoopError: Cannot add node to itself
```

### CycleError

```typescript
hierarchy.attachChild('D', 'A') // CycleError: Cannot add ancestor as a child
```

### ConflictingParentsError

```typescript
hierarchy.attachChild('A', 'D') // ConflictingParentsError: Cannot attach child to parent's ancestor
```
