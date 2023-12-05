class OrderedOverlappingHierarchyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class LoopError extends OrderedOverlappingHierarchyError {}
export class CycleError extends OrderedOverlappingHierarchyError {}

export default class OrderedOverlappingHierarchy<Node> {
  // TODO: consider using object type Link = { parent: Node, child: Node }
  readonly hierarch: Node;
  #childrenMap: Map<Node, Array<Node>> = new Map();

  #filter = (filter: (node: Node) => boolean): Set<Node> =>
    new Set([...this.nodes()].filter(filter));

  constructor(source: Node | OrderedOverlappingHierarchy<Node>) {
    this.hierarch =
      source instanceof OrderedOverlappingHierarchy ? source.hierarch : source;
    this.#childrenMap.set(this.hierarch, []);
    if (source instanceof OrderedOverlappingHierarchy) {
      source.nodes().forEach((node) => {
        this.#childrenMap.set(node, Array.from(source.children(node) || []));
      });
    }
  }

  #add = (node: Node): void => {
    this.#childrenMap.set(node, this.children(node) || []);
  };

  #position = (array: Array<Node>, node: Node, index?: number): void => {
    if (array.includes(node)) {
      array.splice(array.indexOf(node), 1);
    }
    array.splice(index ?? array.length, 0, node);
  };

  #links = (): { parent: Node; child: Node }[] => {
    // todo: make public and test, better to return link object with parent, child and index fields for complete representation
    const links: { parent: Node; child: Node }[] = [];
    this.#childrenMap.forEach((children, parent) => {
      children.forEach((child) => links.push({ parent, child }));
    });
    return links;
  };

  #hasDescendant = (parent: Node, child: Node): boolean =>
    !!this.descendants(parent)?.has(child);

  #isRedundantLink = ({
    parent,
    child,
  }: {
    parent: Node;
    child: Node;
  }): boolean => {
    const potentialReduction = new OrderedOverlappingHierarchy(this);
    potentialReduction.unlink(parent, child);
    return potentialReduction.#hasDescendant(parent, child);
  };

  #reduce = (): void => {
    this.#links()
      .filter(this.#isRedundantLink)
      .forEach(({ parent, child }) => this.unlink(parent, child));
  };

  nodes = (): Set<Node> => new Set(this.#childrenMap.keys());

  // todo: consider link(link: { parent, child, index? })
  link(
    parent: Node,
    child: Node,
    index?: number
  ): OrderedOverlappingHierarchyError | void {
    if (parent === child) return new LoopError("Cannot attach node to itself");
    if (this.nodes().has(child) && this.descendants(child)?.has(parent)) {
      return new CycleError("Cannot attach ancestor as a child");
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

    const children = this.children(node) as Node[];
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

  unlink(parent: Node, child: Node): void {
    this.#childrenMap.set(
      parent,
      this.children(parent)?.filter((item) => item !== child) || []
    );

    if (this.parents(child)?.size === 0) {
      this.#childrenMap.delete(child);
    }
  }
}
