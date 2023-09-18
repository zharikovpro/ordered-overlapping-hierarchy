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

  #intersection = (a: Set<Node>, b: Set<Node>): Set<Node> =>
    new Set([...a].filter((x) => b.has(x)));

  #filterNodes = (filter: (node: Node) => boolean): Set<Node> =>
    new Set(Array.from(this.nodes()).filter(filter));

  constructor(source?: OverlappingHierarchy<Node>) {
    source?.nodes().forEach((node) => {
      this.#childrenMap.set(node, new Set(source.children(node)) || new Set());
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
      !this.children(parent)?.includes(child) &&
      this.descendants(parent)?.has(child)
    )
      return new TransitiveReductionError(
        "Cannot attach non-child descendant as a child"
      );
    if (
      this.#intersection(
        new Set(this.descendants(child)),
        new Set(this.children(parent))
      ).size > 0
    )
      return new TransitiveReductionError(
        "Cannot attach child whose descendant is a child of the parent"
      );

    this.add(parent);
    this.add(child);
    this.#childrenMap.get(parent)?.add(child);
  }

  children = (parent: Node): Array<Node> | undefined =>
    this.#childrenMap.has(parent)
      ? Array.from(this.#childrenMap.get(parent) as Set<Node>)
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
    this.#childrenMap.get(parent)?.delete(child) as unknown as void;

  delete(node: Node): void {
    this.#childrenMap.delete(node);
    this.nodes().forEach((parent) => this.detach(parent, node));
  }
}
