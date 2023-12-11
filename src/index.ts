class OrderedOverlappingHierarchyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class LoopError extends OrderedOverlappingHierarchyError {}
export class CycleError extends OrderedOverlappingHierarchyError {}

interface ParentChild<T> {
  parent: T;
  child: T;
}

interface Relationship<T> extends ParentChild<T> {
  childIndex: number;
}

interface RelateArgument<T> extends ParentChild<T> {
  childIndex?: number;
}

export default class OrderedOverlappingHierarchy<Member> {
  readonly hierarch: Member;

  #childrenMap: Map<Member, Array<Member>> = new Map();

  #filter = (filter: (member: Member) => boolean): Set<Member> =>
    new Set([...this.members()].filter(filter));

  constructor(source: Member | OrderedOverlappingHierarchy<Member>) {
    this.hierarch =
      source instanceof OrderedOverlappingHierarchy ? source.hierarch : source;
    this.#childrenMap.set(this.hierarch, []);
    if (source instanceof OrderedOverlappingHierarchy) {
      source.members().forEach((member) => {
        this.#childrenMap.set(
          member,
          Array.from(source.children(member) || [])
        );
      });
    }
  }

  #add = (member: Member): void => {
    this.#childrenMap.set(member, this.children(member) || []);
  };

  #position = (
    array: Array<Member>,
    member: Member,
    index?: number
  ): number => {
    const effectiveIndex = index ?? array.length;
    if (array.includes(member)) {
      array.splice(array.indexOf(member), 1);
    }
    array.splice(effectiveIndex, 0, member);
    return effectiveIndex;
  };

  relationships = (): Set<Relationship<Member>> => {
    const relationships = new Set<Relationship<Member>>();
    this.#childrenMap.forEach((children, parent) => {
      children.forEach((child, index) =>
        relationships.add({ parent, child, childIndex: index })
      );
    });
    return relationships;
  };

  #hasDescendant = ({ parent, child }: ParentChild<Member>): boolean =>
    !!this.descendants(parent)?.has(child);

  #isTransitiveRelationship = (direction: ParentChild<Member>): boolean => {
    const potentialReduction = new OrderedOverlappingHierarchy(this);
    potentialReduction.unrelate(direction);
    return potentialReduction.#hasDescendant(direction);
  };

  #reduce = (): void => {
    [...this.relationships()]
      .filter(this.#isTransitiveRelationship)
      .forEach(this.unrelate, this);
  };

  members = (): Set<Member> => new Set(this.#childrenMap.keys());

  relate = (
    relationships: Array<RelateArgument<Member>>
  ): Array<Relationship<Member> | LoopError | CycleError> => {
    const errors = relationships.map((rel) => this.#createRelationship(rel));
    this.#reduce();
    return errors;
  };

  #createRelationship({
    parent,
    child,
    childIndex,
  }: RelateArgument<Member>):
  Relationship<Member> | LoopError | CycleError {
    if (parent === child)
      return new LoopError("Cannot relate member to itself");
    if (this.members().has(child) && this.descendants(child)?.has(parent)) {
      return new CycleError("Cannot relate ancestor as a child");
    }

    if (!this.members().has(parent)) {
      this.#createRelationship({ parent: this.hierarch, child: parent });
    }
    this.#add(child);

    const effectiveIndex = this.#position(
      this.#childrenMap.get(parent) as Member[],
      child,
      childIndex
    );

    return { parent, child, childIndex: effectiveIndex };
  }

  children(member: Member): Array<Member> | undefined {
    const children = this.#childrenMap.get(member);
    return children ? [...children] : undefined;
  }

  descendants(member: Member): Set<Member> | undefined {
    if (!this.#childrenMap.has(member)) return undefined;

    const children = this.children(member) as Member[];
    const childrenDescendants = children.flatMap((child) =>
      Array.from(this.descendants(child) as Set<Member>)
    );

    return new Set([...children, ...childrenDescendants]);
  }

  ancestors = (member: Member): Set<Member> | undefined =>
    this.#childrenMap.has(member)
      ? this.#filter((n) => !!this.descendants(n)?.has(member))
      : undefined;

  parents = (member: Member): Set<Member> | undefined =>
    this.#childrenMap.has(member)
      ? this.#filter((n) => !!this.children(n)?.includes(member))
      : undefined;

  unrelate({ parent, child }: ParentChild<Member>): void {
    this.#childrenMap.set(
      parent,
      this.children(parent)?.filter((item) => item !== child) || []
    );

    if (this.parents(child)?.size === 0) {
      this.#childrenMap.delete(child);
    }
  }
}
