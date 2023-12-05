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
  #childrenMap: Map<Node, Array<Node>> = new Map();

  #intersection = (a: Set<Node>, b: Set<Node>): Set<Node> =>
    new Set([...a].filter((x) => b.has(x)));

  #filterNodes = (filter: (node: Node) => boolean): Set<Node> =>
    new Set(Array.from(this.nodes()).filter(filter));

  constructor(source: Node | OrderedOverlappingHierarchy<Node>) {
    this.hierarch = source instanceof OrderedOverlappingHierarchy ? source.hierarch : source;
    this.#childrenMap.set(this.hierarch, []);
    if (source instanceof OrderedOverlappingHierarchy) {
      source.nodes().forEach((node) => {
        this.#childrenMap.set(node, Array.from(source.children(node) as Node[]));
      });
    }
  }

  nodes = (): Set<Node> => new Set(this.#childrenMap.keys());

  #add = (node: Node): void => {
    this.#childrenMap.set(node, this.children(node) || []);
  };

  #position = (array: Array<Node>, node: Node, index?: number): void => {
    array.splice(index ?? array.length, 0, node);
  };

  #links = (): [Node, Node][] => {
    const links: [Node, Node][] = []
    this.#childrenMap.forEach((children, parent) => {
      children.forEach(child => links.push([parent, child]))
    })
    return links
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

  #validateNewChild = (
    parent: Node,
    child: Node
  ): OrderedOverlappingHierarchyError | void => {
    const validators: [Function, OrderedOverlappingHierarchyError][] = [
      [
        (n: Node, p: Node) => n === p,
        new LoopError("Cannot attach node to itself"),
      ],
      [
        (n: Node, p: Node) =>
          this.nodes().has(n) && this.descendants(child)?.has(p),
        new CycleError("Cannot attach ancestor as a child"),
      ],
      [
        (n: Node, p: Node) =>
          p && !this.children(p)?.includes(n) && this.descendants(p)?.has(n),
        new TransitiveReductionError(
          "Cannot attach non-child descendant as a child" // todo: add test case for reduction, remove validation
        ),
      ],
      [
        (n: Node, p: Node) =>
          this.#intersection(
            new Set(this.descendants(n)),
            new Set(this.children(p))
          ).size > 0,
        new TransitiveReductionError(
          "Cannot attach child whose descendant is a child of the parent" // todo: add test case for reduction, remove validation
        ),
      ]
    ];

    const failure = validators.find(([condition]) => condition(child, parent));
    return failure ? failure[1] : undefined;
  };

  // todo: attach(parent, child, index?)
  attach(
    child: Node,
    parent: Node,
    index?: number
  ): OrderedOverlappingHierarchyError | void {
    const error = this.#validateNewChild(parent, child);
    if (error) {
      return error;
    }

    this.#add(child);
    this.#add(parent);

    this.detach(child, parent);

    this.#position(this.#childrenMap.get(parent) as Node[], child, index);

    this.#reduce();
  }

  children(node: Node): Array<Node> | undefined {
    const children = this.#childrenMap.get(node);
    return children ? Array.from(children) : undefined;
  }

  descendants(node: Node): Set<Node> | undefined {
    if (!this.#childrenMap.has(node)) return undefined;

    const children = this.children(node) as Node[];
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
      // todo remove from childrenMap correctly
    }
  }

  delete(node: Node): void { // todo: replace with unlink from the last parent?
    this.#childrenMap.delete(node);
    this.nodes().forEach((parent) => this.detach(node, parent));
  }
}
