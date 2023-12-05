class OrderedOverlappingHierarchyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class LoopError extends OrderedOverlappingHierarchyError {}
export class CycleError extends OrderedOverlappingHierarchyError {}

export default class OrderedOverlappingHierarchy<Node> {
  readonly hierarch: Node;
  #childrenMap: Map<Node, Array<Node>> = new Map();

  #filter = (filter: (node: Node) => boolean): Set<Node> =>
    new Set([...this.nodes()].filter(filter));

  constructor(source: Node | OrderedOverlappingHierarchy<Node>) {
    this.hierarch = source instanceof OrderedOverlappingHierarchy ? source.hierarch : source;
    this.#childrenMap.set(this.hierarch, []);
    if (source instanceof OrderedOverlappingHierarchy) {
      source.nodes().forEach((node) => {
        this.#childrenMap.set(node, Array.from(source.children(node) || []));
      });
    }
  }

  nodes = (): Set<Node> => new Set(this.#childrenMap.keys());

  #add = (node: Node): void => {
    this.#childrenMap.set(node, this.children(node) || []);
  };

  #position = (array: Array<Node>, node: Node, index?: number): void => {
    if (array.includes(node)) {
      array.splice(array.indexOf(node), 1);
    }
    array.splice(index ?? array.length, 0, node);
  };

  #links = (): [Node, Node][] => { // todo: make public and test
    // todo: consider flatMap
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

  // todo: attach(parent, child, index?)
  attach(
    child: Node,
    parent: Node,
    index?: number
  ): OrderedOverlappingHierarchyError | void {
    if (parent === child) {
      return new LoopError("Cannot attach node to itself")
    }
    if (this.nodes().has(child) && this.descendants(child)?.has(parent)) {
      return new CycleError("Cannot attach ancestor as a child")
    }

    this.#add(parent);
    this.#add(child);

    this.#position(this.#childrenMap.get(parent) as Node[], child, index);

    this.#reduce();
  }

  children(node: Node): Array<Node> | undefined {
    const children = this.#childrenMap.get(node);
    return children ? [...children] : undefined;
  }

  descendants(node: Node): Set<Node> | undefined {
    if (!this.#childrenMap.has(node)) return undefined;

    const children = this.children(node) || [];
    const childrenDescendants = children.flatMap((child) =>
      Array.from(this.descendants(child) as Set<Node>)
    );

    return new Set([...children, ...childrenDescendants]);
  }

  ancestors = (node: Node): Set<Node> | undefined =>
    this.#childrenMap.has(node)
      ? this.#filter((n) => !!this.descendants(n)?.has(node))
      : undefined;

  parents = (node: Node): Set<Node> | undefined =>
    this.#childrenMap.has(node)
      ? this.#filter((n) => !!this.children(n)?.includes(node))
      : undefined;

  detach(node: Node, parent: Node): void {
    this.#childrenMap.set(
      parent,
      this.children(parent)?.filter((item) => item !== node) || []
    );

    if (this.parents(node)?.size === 0) {
      this.#childrenMap.delete(node);
    }
  }

  delete(node: Node): void { // todo: replace with unlink from the last parent?
    this.#childrenMap.delete(node);
    this.nodes().forEach((parent) => this.detach(node, parent));
  }
}
