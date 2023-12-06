class OrderedOverlappingHierarchyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class LoopError extends OrderedOverlappingHierarchyError {}
export class CycleError extends OrderedOverlappingHierarchyError {}

interface Direction<T> {
  parent: T;
  child: T;
}

interface Link<T> extends Direction<T> {
  index: number;
}

export default class OrderedOverlappingHierarchy<Node> {
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

  #position = (array: Array<Node>, node: Node, index?: number): number => {
    const effectiveIndex = index ?? array.length;
    if (array.includes(node)) {
      array.splice(array.indexOf(node), 1);
    }
    array.splice(effectiveIndex, 0, node);
    return effectiveIndex;
  };

  links = (): Set<Link<Node>> => {
    const links = new Set<Link<Node>>();
    this.#childrenMap.forEach((children, parent) => {
      children.forEach((child, index) => links.add({ parent, child, index }));
    });
    return links;
  };

  #hasDescendant = ({ parent, child }: Direction<Node>): boolean =>
    !!this.descendants(parent)?.has(child);

  #isTransitiveLink = (direction: Direction<Node>): boolean => {
    const potentialReduction = new OrderedOverlappingHierarchy(this);
    potentialReduction.unlink(direction);
    return potentialReduction.#hasDescendant(direction);
  };

  #reduce = (): void => {
    [...this.links()].filter(this.#isTransitiveLink).forEach(this.unlink, this);
  };

  nodes = (): Set<Node> => new Set(this.#childrenMap.keys());

  link({
    parent,
    child,
    index,
  }: Direction<Node> & { index?: number }):
    | Link<Node>
    | LoopError
    | CycleError {
    if (parent === child) return new LoopError("Cannot link node to itself");
    if (this.nodes().has(child) && this.descendants(child)?.has(parent)) {
      return new CycleError("Cannot link ancestor as a child");
    }

    this.link({ parent: this.hierarch, child: parent })
    this.#add(child);

    const effectiveIndex = this.#position(
      this.#childrenMap.get(parent) as Node[],
      child,
      index
    );

    this.#reduce();

    return { parent, child, index: effectiveIndex };
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

  unlink({ parent, child }: Direction<Node>): void {
    this.#childrenMap.set(
      parent,
      this.children(parent)?.filter((item) => item !== child) || []
    );

    if (this.parents(child)?.size === 0) {
      this.#childrenMap.delete(child);
    }
  }
}
