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
  #hierarchs: Array<Node> = [];
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

  #nodes = (): Set<Node> => new Set(this.#childrenMap.keys());

  #add = (node: Node): void => {
    this.#childrenMap.set(node, this.children(node) || []);
  };

  #position = (array: Array<Node>, node: Node, index?: number): void => {
    array.splice(index ?? array.length, 0, node);
  };

  #removeHierarch = (node: Node): void => {
    this.#hierarchs = this.#hierarchs.filter((n) => n !== node);
  };

  // todo: attach(node, { parent })
  // todo: attach(node, { index })
  // todo: attach(node, { parent, index })
  attach(
    node: Node,
    parent?: Node,
    index?: number
  ): OrderedOverlappingHierarchyError | void {
    if (node === parent) return new LoopError("Cannot attach node to itself");
    if (parent) {
      if (this.#nodes().has(node) && this.descendants(node)?.has(parent))
        return new CycleError("Cannot attach ancestor as a child");
      if (
        !this.children(parent)?.includes(node) &&
        this.descendants(parent)?.has(node)
      )
        return new TransitiveReductionError(
          "Cannot attach non-child descendant as a child"
        );
      if (
        this.#intersection(
          new Set(this.descendants(node)),
          new Set(this.children(parent))
        ).size > 0
      )
        return new TransitiveReductionError(
          "Cannot attach child whose descendant is a child of the parent"
        );
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
  }

  children(): Array<Node>;
  children(node: Node): Array<Node> | undefined;
  children(node?: Node): Array<Node> | undefined {
    if (node) {
      const children = this.#childrenMap.get(node);
      return children ? Array.from(children) : undefined;
    } else {
      return Array.from(this.#hierarchs);
    }
  }

  descendants(): Set<Node>;
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
    this.#nodes().forEach((parent) => this.detach(node, parent));
  }
}
