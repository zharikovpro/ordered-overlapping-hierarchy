class OverlappingHierarchyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class LoopError extends OverlappingHierarchyError {}
export class CycleError extends OverlappingHierarchyError {}
export class ConflictingParentsError extends OverlappingHierarchyError {}

export default class OverlappingHierarchy<Node> {
  #childrenMap: Map<Node, Set<Node>> = new Map();

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
    if (this.descendants(parent)?.has(child))
      return new ConflictingParentsError(
        "Cannot attach child to parent's ancestor"
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

  // TODO: backport x100 performance improvement from Rrrighter
  hierarchs = (): Set<Node> =>
    new Set(
      Array.from(this.nodes()).filter((node) => !this.parents(node)?.size)
    );

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

    const parents = new Set(this.parents(descendant));
    const parentsAncestors = Array.from(parents).flatMap((parent) =>
      Array.from(this.ancestors(parent) || [])
    );

    return new Set([...parents, ...parentsAncestors]);
  }

  parents(child: Node): Set<Node> | undefined {
    if (!this.children(child)) return undefined;

    return new Set(
      Array.from(this.nodes()).filter((node) => this.children(node)?.has(child))
    );
  }

  detach = (parent: Node, child: Node): void =>
    this.#childrenMap.get(parent)?.delete(child) as unknown as void;

  // TODO: rename to delete to resemble Set API
  remove(node: Node): void {
    this.#childrenMap.delete(node);
    this.nodes().forEach((parent) => this.detach(parent, node));
  }
}
