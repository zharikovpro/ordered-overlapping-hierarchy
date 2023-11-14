class OrderedOverlappingHierarchyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class LoopError extends OrderedOverlappingHierarchyError {}
export class CycleError extends OrderedOverlappingHierarchyError {}
export class TransitiveReductionError extends OrderedOverlappingHierarchyError {} // https://en.wikipedia.org/wiki/Transitive_reduction#In_directed_acyclic_graphs

export default class OrderedOverlappingHierarchy<Node> {
  #childrenMap: Map<Node, Array<Node>> = new Map();

  #intersection = (a: Set<Node>, b: Set<Node>): Set<Node> =>
    new Set([...a].filter((x) => b.has(x)));

  #filterNodes = (filter: (node: Node) => boolean): Set<Node> =>
    new Set(Array.from(this.nodes()).filter(filter));

  constructor(source?: OrderedOverlappingHierarchy<Node>) {
    source?.nodes().forEach((node) => {
      this.#childrenMap.set(node, Array.from(source.children(node) || []));
    });
  }

  #hierarchs = (): Set<Node> => {
    const nodes = this.nodes();
    this.nodes().forEach((n) =>
      this.children(n)?.forEach((c) => nodes.delete(c))
    );
    return nodes;
  };

  #add(node: Node): void {
    // todo: make private, public API is attach(node)
    // todo: should be identical to attach(node)
    // todo: use ordered array for hierarchs sorting, add test case with ordered hierarchs
    this.#childrenMap.set(node, this.#childrenMap.get(node) || []);
  }

  nodes = (): Set<Node> => new Set(this.#childrenMap.keys());

  attach(
    node: Node,
    parent?: Node,
    index?: number
  ): OrderedOverlappingHierarchyError | void {
    if (node === parent) return new LoopError("Cannot attach node to itself");
    if (parent && this.nodes().has(node) && this.descendants(node)?.has(parent))
      return new CycleError("Cannot attach ancestor as a child");
    if (
      parent &&
      !this.children(parent)?.includes(node) &&
      this.descendants(parent)?.has(node)
    )
      return new TransitiveReductionError(
        "Cannot attach non-child descendant as a child"
      );
    if (
      parent &&
      this.#intersection(
        new Set(this.descendants(node)),
        new Set(this.children(parent))
      ).size > 0
    )
      return new TransitiveReductionError(
        "Cannot attach child whose descendant is a child of the parent"
      );

    this.#add(node);
    if (parent) {
      this.#add(parent);
      this.detach(parent, node);
      const children = this.#childrenMap.get(parent);
      if (children) {
        children.splice(index ?? children.length, 0, node);
      }
    }
  }

  children(): Array<Node>;
  children(parent: Node): Array<Node> | undefined;
  children(parent?: Node): Array<Node> | undefined {
    if (parent) {
      return this.#childrenMap.has(parent)
        ? Array.from(this.#childrenMap.get(parent) as Array<Node>)
        : undefined;
    } else {
      return Array.from(this.#hierarchs());
    }
  }

  descendants(): Set<Node>;
  descendants(ancestor: Node): Set<Node> | undefined;
  descendants(ancestor?: Node): Set<Node> | undefined {
    if (!ancestor) return this.nodes();
    if (!this.#childrenMap.has(ancestor)) return undefined;

    const children = new Set(this.children(ancestor));
    const childrenDescendants = Array.from(children).flatMap((child) =>
      Array.from(this.descendants(child) || [])
    );

    return new Set([...children, ...childrenDescendants]);
  }

  ancestors = (descendant: Node): Set<Node> | undefined =>
    this.#childrenMap.has(descendant)
      ? this.#filterNodes((n) => !!this.descendants(n)?.has(descendant))
      : undefined;

  parents = (child: Node): Set<Node> | undefined =>
    this.#childrenMap.has(child)
      ? this.#filterNodes((n) => !!this.children(n)?.includes(child))
      : undefined;

  detach = (parent: Node, child: Node): void =>
    this.#childrenMap.set(
      parent,
      (this.#childrenMap.get(parent) || []).filter((val) => val !== child)
    ) as unknown as void;

  delete(node: Node): void {
    this.#childrenMap.delete(node);
    this.nodes().forEach((parent) => this.detach(parent, node));
  }
}
