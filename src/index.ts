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
  #hierarchs: Array<Node> = []; // todo: model as childrenMap for root parent instead? simplifies the code with recursion, etc; consistent graph model similar to a tree with root node; no non-root vertices without edges
  #childrenMap: Map<Node, Array<Node>> = new Map();

  #intersection = (a: Set<Node>, b: Set<Node>): Set<Node> =>
    new Set([...a].filter((x) => b.has(x)));

  #filterNodes = (filter: (node: Node) => boolean): Set<Node> =>
    new Set(Array.from(this.#nodes()).filter(filter));

  constructor(source?: OrderedOverlappingHierarchy<Node>) {
    if (source) {
      this.#hierarchs = source.children();
      source.descendants().forEach((node) => {
        this.#childrenMap.set(node, Array.from(source.children(node) || []));
      });
    }
  }

  #nodes = (): Set<Node> => new Set(this.#childrenMap.keys()); // todo: convert to public

  #add = (node: Node): void => { // todo: covert to public
    this.#childrenMap.set(node, this.children(node) || []);
  };

  #positionArrayElement = (array: Array<Node>, element: Node, index: number): void => {
    array.splice(index, 0, element);
  };

  #removeHierarch = (node: Node): void => {
    this.#hierarchs = this.#hierarchs.filter((n) => n !== node);
  };

  #links = (): [Node, Node][] => {
    // todo: return set?
    const edges: [Node, Node][] = [];
    this.#childrenMap.forEach((children, parent) => {
      // todo: flatMap?
      children.forEach((child) => edges.push([parent, child]));
    });
    return edges;
  };

  #hasDescendant = (parent: Node, child: Node): boolean =>
    !!this.descendants(parent)?.has(child);

  #isRedundantLink = (child: Node, parent: Node): boolean => {
    const potentialReduction = new OrderedOverlappingHierarchy(this);
    potentialReduction.unlink(parent, child);
    return potentialReduction.#hasDescendant(parent, child);
  };

  #reduce = (): void => {
    this.#links()
      .filter(([parent, child]) => this.#isRedundantLink(child, parent))
      .forEach(([parent, child]) => this.unlink(parent, child));
  };

  #validateNewParent = (
    node: Node,
    parent: Node
  ): OrderedOverlappingHierarchyError | void => {
    const validators: [Function, OrderedOverlappingHierarchyError][] = [
      [
        (n: Node, p: Node) => n === p,
        new LoopError("Cannot attach node to itself"),
      ],
      [
        (n: Node, p: Node) =>
          this.#nodes().has(n) && this.descendants(node)?.has(p),
        new CycleError("Cannot attach ancestor as a child"),
      ],
      [
        (n: Node, p: Node) =>
          p && !this.children(p)?.includes(n) && this.descendants(p)?.has(n),
        new TransitiveReductionError(
          "Cannot attach non-child descendant as a child"
        ),
      ],
      [
        (n: Node, p: Node) =>
          this.#intersection(
            new Set(this.descendants(n)),
            new Set(this.children(p))
          ).size > 0,
        new TransitiveReductionError(
          "Cannot attach child whose descendant is a child of the parent"
        ),
      ],
      [
        (n: Node, p: Node) =>
          this.#intersection(
            new Set(this.parents(n)),
            new Set(this.ancestors(p))
          ).size > 0,
        new TransitiveReductionError("Cannot attach to parents descendants"),
      ],
    ];

    const failure = validators.find(([condition]) => condition(node, parent));
    return failure ? failure[1] : undefined;
  };

  // todo: link(parent, child, index?)
  link(
    node: Node,
    parent?: Node,
    index?: number
  ): OrderedOverlappingHierarchyError | void {
    if (parent) {
      const error = this.#validateNewParent(node, parent);
      if (error) {
        return error;
      }
    }

    this.#add(node);

    if (parent) {
      this.#add(parent);
      this.unlink(parent, node);
      this.#removeHierarch(node);
    } else {
      this.parents(node)?.forEach((parent) => this.unlink(parent, node));
    }

    const container = parent
      ? (this.#childrenMap.get(parent) as Node[])
      : this.#hierarchs;
    this.#positionArrayElement(container, node, index ?? container.length);

    this.#reduce();
  }

  children(): Array<Node>;
  children(node: Node): Array<Node> | undefined;
  children(node?: Node): Array<Node> | undefined {
    // todo: simplify with root node? there will be no conditional
    if (node) {
      const children = this.#childrenMap.get(node);
      return children ? Array.from(children) : undefined;
    } else {
      return Array.from(this.#hierarchs);
    }
  }

  descendants(): Set<Node>; // todo: deprecate in favor of nodes() and test this public method
  descendants(node: Node): Set<Node> | undefined;
  descendants(node?: Node): Set<Node> | undefined {
    if (!node) return this.#nodes();
    if (!this.#childrenMap.has(node)) return undefined;

    const children = this.children(node) || [];
    const childrenDescendants = children.flatMap((child) =>
      Array.from(this.descendants(child) as Set<Node>)
    );

    return new Set([...children, ...childrenDescendants]);
  }

  ancestors = (node: Node): Set<Node> | undefined =>
    this.#childrenMap.has(node)
      ? this.#filterNodes((n) => !!this.descendants(n)?.has(node))
      : undefined;

  parents = (node: Node): Set<Node> | undefined =>
    this.#childrenMap.has(node)
      ? this.#filterNodes((n) => !!this.children(n)?.includes(node))
      : undefined;

  unlink(parent: Node, child: Node): void {
    this.#childrenMap.set(
      parent,
      this.children(parent)?.filter((item) => item !== child) || []
    );

    if (this.parents(child)?.size === 0) {
      this.#hierarchs.push(child);
    }
  }

  remove(node: Node): void {
    this.#childrenMap.delete(node);
    this.#removeHierarch(node);
    this.#nodes().forEach((parent) => this.unlink(parent, node));
  }
}
