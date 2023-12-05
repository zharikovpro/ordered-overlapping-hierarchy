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
  readonly hierarch: Node;
  #hierarchs: Array<Node> = [];
  #childrenMap: Map<Node, Array<Node>> = new Map();

  #intersection = (a: Set<Node>, b: Set<Node>): Set<Node> =>
    new Set([...a].filter((x) => b.has(x)));

  #filterNodes = (filter: (node: Node) => boolean): Set<Node> =>
    new Set(Array.from(this.nodes()).filter(filter));

  constructor(source: Node | OrderedOverlappingHierarchy<Node>) {
    if (source instanceof OrderedOverlappingHierarchy) {
      this.#hierarchs = [source.hierarch];
      source.descendants().forEach((node) => {
        this.#childrenMap.set(node, Array.from(source.children(node) || []));
      });
    }
    this.hierarch = source instanceof OrderedOverlappingHierarchy ? source.hierarch : source;
    this.#add(this.hierarch);
  }

  nodes = (): Set<Node> => new Set(this.#childrenMap.keys());

  #add = (node: Node): void => {
    this.#childrenMap.set(node, this.children(node) || []);
  };

  #position = (array: Array<Node>, node: Node, index?: number): void => {
    array.splice(index ?? array.length, 0, node);
  };

  #removeHierarch = (node: Node): void => {
    this.#hierarchs = this.#hierarchs.filter((n) => n !== node);
  };

  #links = (): [Node, Node][] => {
    const edges: [Node, Node][] = []
    this.#childrenMap.forEach((children, parent) => {
      children.forEach(child => edges.push([parent, child]))
    })
    return edges
  }

  #hasDescendant = (parent: Node, child: Node): boolean => !!this.descendants(parent)?.has(child)

  #isRedundantLink = (parent: Node, child: Node): boolean => {
    const potentialReduction = new OrderedOverlappingHierarchy(this);
    potentialReduction.detach(child, parent);
    return potentialReduction.#hasDescendant(parent, child);
  }

  #reduce = (): void => {
    for (const [parent, child] of this.#links()) {
      if (this.#isRedundantLink(parent, child)) {
        this.detach(child, parent)
      }
    }
  }

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
          this.nodes().has(n) && this.descendants(node)?.has(p),
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

  // todo: attach(parent, child, index?)
  attach(
    node: Node,
    parent: Node,
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
      this.detach(node, parent);
      this.#removeHierarch(node);
    } else {
      this.parents(node)?.forEach((parent) => this.detach(node, parent));
    }

    const container = parent
      ? (this.#childrenMap.get(parent) as Node[])
      : this.#hierarchs;
    this.#position(container, node, index);

    this.#reduce();
  }

  children(node: Node): Array<Node> | undefined {
      const children = this.#childrenMap.get(node);
      return children ? Array.from(children) : undefined;
  }

  descendants(): Set<Node>;
  descendants(node: Node): Set<Node> | undefined;
  descendants(node?: Node): Set<Node> | undefined {
    if (!node) return this.nodes();
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

  detach(node: Node, parent: Node): void {
    this.#childrenMap.set(
      parent,
      this.children(parent)?.filter((item) => item !== node) || []
    );

    if (this.parents(node)?.size === 0) {
      this.#hierarchs.push(node);
    }
  }

  delete(node: Node): void {
    this.#childrenMap.delete(node);
    this.#removeHierarch(node);
    this.nodes().forEach((parent) => this.detach(node, parent));
  }
}
