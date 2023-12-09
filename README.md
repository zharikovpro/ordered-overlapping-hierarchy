# OOH | Ordered Overlapping Hierarchy

Library for modeling [overlapping hierarchy](https://en.wikipedia.org/wiki/Hierarchy#Degree_of_branching), in which members can have multiple parents and children are ordered.

It is [transitively reduced](https://en.wikipedia.org/wiki/Transitive_reduction#In_directed_acyclic_graphs) multiply [connected](https://en.wikipedia.org/wiki/Graph_(discrete_mathematics)#Connected_graph) [weighted](https://en.wikipedia.org/wiki/Graph_(discrete_mathematics)#Weighted_graph) [directed acyclic graph](https://en.wikipedia.org/wiki/Directed_acyclic_graph) with a single [source](https://en.wikipedia.org/wiki/Glossary_of_graph_theory#S). Edges represent parenthood and their weights represent order.

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
hierarchy.relate([
    { parent: '0', child: 'A' },
    { parent: '0', child: 'B' },
    { parent: 'A', child: 'C' },
    { parent: 'B', child: 'C' },
    { parent: 'C', child: 'D' },
    { parent: 'C', child: 'E' },
    { parent: '0', child: 'F' },
    { parent: '0', child: 'G' },
    { parent: 'F', child: 'H' },
    { parent: 'G', child: 'H' },
    { parent: 'H', child: 'I' },
    { parent: 'H', child: 'J' }
])
```

## API

### Initialization

`const hierarchy = new OverlappingHierarchy(hierarch)`

`const cloned = new OverlappingHierarchy(hierarchy)`

### Mutation

#### Relate

ℹ️ Relating all members at once is orders of magnitude faster than adding them one by one, as expensive transitive reduction is performed once per call.

`hierarchy.relate([...])` relates batch of members and automatically removes transitive relationships.

`hierarchy.relate([{ parent, child }]) // as last child`

`hierarchy.relate([{ parent, child, index }]) // at specific index`

`hierarchy.relate([{ parent: 'A', child: 'A' }]) // LoopError: Cannot relate member to itself`

`hierarchy.relate([{ parent: 'D', child: 'A' }]) // CycleError: Cannot relate ancestor as a child`

#### Unrelate

`hierarchy.unrelate({ parent, child }) // removes child from parent`

`hierarchy.unrelate({ parent, child }) // deletes member without parents`

`hierarchy.unrelate({ parent: hierarchy.hierarch, child: hierarchy.hierarch }) // no-op`

### Traversal

`#hierarch`

`#members()`

`#relationships()`

`#children(member)`

`#descendants(member)`

`#parents(member)`

`#ancestors(member)`
