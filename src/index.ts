class OverlappingHierarchyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class LoopError extends OverlappingHierarchyError {}
export class CycleError extends OverlappingHierarchyError {}
export class TransitiveReductionError extends OverlappingHierarchyError {} // https://en.wikipedia.org/wiki/Transitive_reduction#In_directed_acyclic_graphs

export default class OverlappingHierarchy<Node> {
  #childrenMap: Map<Node, Set<Node>> = new Map();

  #intersection(a: Set<Node>, b: Set<Node>): Set<Node> {
    return new Set([...a].filter((x) => b.has(x)));
  }

  #filterNodes = (filter: (node: Node) => boolean): Set<Node> =>
    new Set(Array.from(this.nodes()).filter(filter));

  constructor(source?: OverlappingHierarchy<Node>) {
    source?.nodes().forEach((node) => {
      this.#childrenMap.set(node, source.children(node) || new Set());
    });
  }

  add(node: Node): void {
    this.#childrenMap.set(node, this.#childrenMap.get(node) || new Set());
  }

  attach(parent: Node, child: Node): OverlappingHierarchyError | void {
    if (child === parent) return new LoopError("Cannot attach node to itself");
    if (this.nodes().has(child) && this.descendants(child)?.has(parent))
      return new CycleError("Cannot attach ancestor as a child");
    if (
      !this.children(parent)?.has(child) &&
      this.descendants(parent)?.has(child)
    )
      return new TransitiveReductionError(
        "Cannot attach non-child descendant as a child"
      );
    if (
      this.#intersection(
        this.descendants(child) || new Set(),
        this.children(parent) || new Set()
      ).size > 0
    )
      return new TransitiveReductionError(
        "Cannot attach child whose descendant is a child of the parent"
      );

    if (this.#childrenMap.get(parent) === undefined) this.add(parent);

    this.#childrenMap.get(parent)?.add(child);
    this.add(child);
  }

  children = (parent: Node): Set<Node> | undefined =>
    this.#childrenMap.get(parent)
      ? new Set(this.#childrenMap.get(parent))
      : undefined;

  nodes = (): Set<Node> => new Set(this.#childrenMap.keys());

  hierarchs = (): Set<Node> => {
    const nodes = this.nodes();
    this.nodes().forEach((n) =>
      this.children(n)?.forEach((c) => nodes.delete(c))
    );
    return nodes;
  };

  descendants(ancestor: Node): Set<Node> | undefined {
    if (!this.children(ancestor)) return undefined;

    const children = new Set(this.children(ancestor));
    const childrenDescendants = Array.from(children).flatMap((child) =>
      Array.from(this.descendants(child) || [])
    );

    return new Set([...children, ...childrenDescendants]);
  }

  ancestors(descendant: Node): Set<Node> | undefined {
    if (!this.children(descendant)) return undefined;

    return this.#filterNodes((n) => !!this.descendants(n)?.has(descendant));
  }

  parents(child: Node): Set<Node> | undefined {
    if (!this.children(child)) return undefined;

    return this.#filterNodes((n) => !!this.children(n)?.has(child));
  }

  detach = (parent: Node, child: Node): void =>
    this.#childrenMap.get(parent)?.delete(child) as unknown as void;

  delete(node: Node): void {
    this.#childrenMap.delete(node);
    this.nodes().forEach((parent) => this.detach(parent, node));
  }
}
