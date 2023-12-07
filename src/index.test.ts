import OrderedOverlappingHierarchy, { CycleError, LoopError } from "./index";

interface Relationship {
  parent: string;
  child: string;
  index: number;
}

const CHILD = "child";
const PARENT = "parent";
const GRANDPARENT = "grandparent";

describe("OrderedOverlappingHierarchy", () => {
  const familyRelationship = (
    parent: string,
    child: string,
    index?: number
  ): Array<Relationship | LoopError | CycleError> => {
    return family.relate([{ parent, child, index }]);
  };

  // todo: verifyRelationship(hierarchy, relationship) -> checks that parent has child at index; child has parent; relationships has exact relationship; hierarchy has parent; hierarchy has child;

  let family: OrderedOverlappingHierarchy<string>;

  beforeEach(() => {
    // grandparent --> parent --> child
    family = new OrderedOverlappingHierarchy(GRANDPARENT);
    familyRelationship(GRANDPARENT, PARENT);
    familyRelationship(PARENT, CHILD);
  });

  describe("new OverlappingHierarchy(hierarch)", () => {
    test("Exposes hierarch", () => {
      const hierarchy = new OrderedOverlappingHierarchy<string>("");
      expect(hierarchy.hierarch).toStrictEqual("");
    });

    test("String hierarch", () => {
      const hierarchy = new OrderedOverlappingHierarchy<string>("relative");
      expect(hierarchy.members()).toStrictEqual(new Set(["relative"]));
    });

    test("Null hierarch", () => {
      const hierarchy = new OrderedOverlappingHierarchy<null>(null);
      expect(hierarchy.members()).toStrictEqual(new Set([null]));
    });

    test("Object hierarch", () => {
      const hierarchy = new OrderedOverlappingHierarchy<object>({});
      expect(hierarchy.members()).toStrictEqual(new Set([{}]));
    });
  });

  describe("new OverlappingHierarchy(hierarchy)", () => {
    let clone: OrderedOverlappingHierarchy<string>;

    beforeEach(() => {
      clone = new OrderedOverlappingHierarchy(family);
    });

    test("Has the same hierarch", () => {
      expect(clone.hierarch).toStrictEqual(family.hierarch);
    });

    test("Has the same members", () => {
      expect(clone.members()).toStrictEqual(family.members());
    });

    test("Has the same relationships", () => {
      for (const member of family.members()) {
        expect(clone.parents(member)).toStrictEqual(family.parents(member));
      }
    });

    test("Restructuring a clone keeps the source structure intact", () => {
      const originalMembers = family.members();
      clone.relationships().forEach(clone.unrelate, clone);
      clone.relate([{ parent: clone.hierarch, child: "New Child" }]);
      clone.relate([{ parent: "New Child", child: "New Parent" }]);
      expect(family.members()).toStrictEqual(originalMembers);
    });
  });

  describe(".children()", () => {
    test("When parent does not exist, returns undefined", () => {
      expect(family.children("missing")).toBeUndefined();
    });

    test("Returns children ordered from older to younger", () => {
      // grandparent --> parent --> child & younger_child
      familyRelationship(PARENT, "YOUNGER_CHILD");
      expect(family.children(PARENT)).toStrictEqual([CHILD, "YOUNGER_CHILD"]);
    });

    test("Mutating returned set does not affect hierarchy", () => {
      const children = family.children(PARENT);
      children?.pop();
      expect(family.children(PARENT)?.includes(CHILD)).toStrictEqual(true);
    });
  });

  describe(".relate()", () => {
    describe("Errors", () => {
      test("Relating itself returns LoopError", () => {
        expect(familyRelationship(CHILD, CHILD)[0]).toStrictEqual(
          new LoopError("Cannot relate member to itself")
        );
      });

      test("Relating ancestor as a child returns CycleError", () => {
        expect(familyRelationship(CHILD, GRANDPARENT)[0]).toStrictEqual(
          new CycleError("Cannot relate ancestor as a child")
        );
      });
    });

    test("Relating existing member does not change hierarchy", () => {
      const originalMembers = family.members();
      familyRelationship(GRANDPARENT, CHILD);
      expect(originalMembers).toStrictEqual(family.members());
    });

    test("When parent is not a member, relates it to the hierarch", () => {
      familyRelationship("ORPHAN", CHILD);
      expect(family.parents("ORPHAN")).toStrictEqual(
        new Set([family.hierarch])
      );
    });

    test("Relates member to the parent as a child", () => {
      familyRelationship(CHILD, "grandchild");
      expect(family.children(CHILD)).toStrictEqual(["grandchild"]);
    });

    test("Relating the same child again returns the same relationship", () => {
      familyRelationship(CHILD, "grandchild");
      expect(
        (familyRelationship(CHILD, "grandchild")[0] as Relationship).index
      ).toBeDefined();
    });

    test("Relating member to a non-existing parent also adds parent", () => {
      familyRelationship("missing", CHILD);
      expect(family.members()?.has("missing")).toStrictEqual(true);
    });

    test("Relates member to another parent as a child", () => {
      familyRelationship(GRANDPARENT, "another parent");
      familyRelationship("another parent", CHILD);
      expect(family.children("another parent")?.includes(CHILD)).toStrictEqual(
        true
      );
    });

    test("Batch relating 1000 members takes less than a second", () => {
      const hierarchy = new OrderedOverlappingHierarchy<string>("0");
      const relationships: { parent: string; child: string }[] = [];
      for (let i = 0; i < 1000; i++) {
        relationships.push({ parent: hierarchy.hierarch, child: i.toString() });
      }
      const batchStart = Date.now();
      hierarchy.relate(relationships);
      const batchDuration = Date.now() - batchStart;
      expect(batchDuration).toBeLessThan(1000);
    });

    describe("Order", () => {
      test("New child is related as the last by default", () => {
        const relationship = familyRelationship(
          PARENT,
          "YOUNGER_CHILD"
        )[0] as Relationship;
        expect(relationship.index).toStrictEqual(1);
        expect(family.children(PARENT)).toStrictEqual([CHILD, "YOUNGER_CHILD"]);
      });

      test("Existing child retains index by default", () => {
        // parent --> middle & younger & child
        familyRelationship(PARENT, "MIDDLE_CHILD");
        familyRelationship(PARENT, "YOUNGER_CHILD");
        familyRelationship(PARENT, CHILD);
        familyRelationship(PARENT, "MIDDLE_CHILD");
        familyRelationship(PARENT, "YOUNGER_CHILD");
        expect(family.children(PARENT)).toStrictEqual([
          CHILD,
          "MIDDLE_CHILD",
          "YOUNGER_CHILD",
        ]);
      });

      test("Zero index inserts new child at the beginning", () => {
        familyRelationship(PARENT, "OLDEST_CHILD", 0);
        expect(family.children(PARENT)).toStrictEqual(["OLDEST_CHILD", CHILD]);
      });

      test("Zero index moves existing child to the beginning", () => {
        familyRelationship(PARENT, "SECOND");
        familyRelationship(PARENT, "SECOND", 0);
        expect(family.children(PARENT)).toStrictEqual(["SECOND", CHILD]);
      });

      test("Non-zero index inserts new child in the middle", () => {
        familyRelationship(PARENT, "YOUNGER");
        familyRelationship(PARENT, "MIDDLE", 1);
        expect(family.children(PARENT)).toStrictEqual([
          CHILD,
          "MIDDLE",
          "YOUNGER",
        ]);
      });

      test("Non-zero index moves first child in the middle", () => {
        familyRelationship(PARENT, "MIDDLE");
        familyRelationship(PARENT, "YOUNGER");
        familyRelationship(PARENT, CHILD, 1);
        expect(family.children(PARENT)).toStrictEqual([
          "MIDDLE",
          CHILD,
          "YOUNGER",
        ]);
      });

      test("Index greater than number of children relates child as last", () => {
        familyRelationship(PARENT, "LAST", 100);
        expect(family.children(PARENT)).toStrictEqual([CHILD, "LAST"]);
      });

      test("New member is related as the last child by default", () => {
        familyRelationship(family.hierarch, "parent2");
        expect(family.children(family.hierarch)).toStrictEqual([
          "parent",
          "parent2",
        ]);
      });
    });

    describe("Transitive reduction", () => {
      test("Relating to non-child descendant does not change structure", () => {
        family.relate([{ parent: GRANDPARENT, child: CHILD }]);
        expect(family.children(GRANDPARENT)).toStrictEqual([PARENT]);
        expect(family.parents(CHILD)).toStrictEqual(new Set([PARENT]));
      });

      test("Relating another ancestor of a child does not change structure", () => {
        family.relate([{ parent: family.hierarch, child: "p2" }]);
        family.relate([{ parent: "p2", child: CHILD }]);
        family.relate([{ parent: PARENT, child: "p2" }]);
        expect(family.children("p2")).toStrictEqual([CHILD]);
      });

      test("When relating to sibling, removes transitive parent relationship", () => {
        family.relate([{ parent: PARENT, child: "child2" }]);
        family.relate([{ parent: "child2", child: CHILD }]);
        expect(family.parents(CHILD)).toStrictEqual(new Set(["child2"]));
      });

      test("When relating to nibling, removes transitive relationship", () => {
        family.relate([{ parent: PARENT, child: "child2" }]);
        family.relate([{ parent: "child2", child: "nibling" }]);
        family.relate([{ parent: "nibling", child: CHILD }]);
        expect(family.parents(CHILD)).toStrictEqual(new Set(["nibling"]));
      });

      test("When connecting sub-graphs with shared member, removes transitive relationship", () => {
        const hierarchy = new OrderedOverlappingHierarchy<string>("0");
        // 0 --> A & C
        // A --> B & X
        // C --> X
        // B --> C ==> transitive reduction
        hierarchy.relate([
          { parent: "0", child: "A" },
          { parent: "0", child: "C" },
          { parent: "A", child: "B" },
          { parent: "A", child: "X" },
          { parent: "C", child: "X" },
          { parent: "B", child: "C" },
        ]);
        expect(hierarchy.children("A")).toStrictEqual(["B"]);
      });
    });
  });

  describe(".members()", () => {
    test("Returns set of all members", () => {
      expect(family.members()).toStrictEqual(
        new Set([GRANDPARENT, PARENT, CHILD])
      );
    });
  });

  describe(".relationships()", () => {
    test("Returns set of all relationships", () => {
      expect(family.relationships()).toStrictEqual(
        new Set([
          { parent: GRANDPARENT, child: PARENT, index: 0 },
          { parent: PARENT, child: CHILD, index: 0 },
        ])
      );
    });
  });

  describe(".ancestors()", () => {
    test("Returns undefined for non-member", () => {
      expect(family.ancestors("missing")).toBeUndefined();
    });

    test("Returns set of ancestors", () => {
      expect(family.ancestors(CHILD)).toStrictEqual(
        new Set([GRANDPARENT, PARENT])
      );
    });
  });

  describe(".descendants()", () => {
    test("Returns undefined for non-member", () => {
      expect(family.descendants("missing")).toBeUndefined();
    });

    test("Returns set of descendants", () => {
      expect(family.descendants(GRANDPARENT)).toStrictEqual(
        new Set([PARENT, CHILD])
      );
    });
  });

  describe(".parents()", () => {
    test("Returns undefined for non-member", () => {
      expect(family.parents("missing")).toBeUndefined();
    });

    test("Given hierarch, returns empty set", () => {
      expect(family.parents(family.hierarch)).toStrictEqual(new Set());
    });

    test("Given child, returns parents set", () => {
      expect(family.parents(CHILD)).toStrictEqual(new Set([PARENT]));
    });
  });

  describe(".unrelate()", () => {
    test("Unrelating hierarch from itself has no effect", () => {
      family.unrelate({ parent: GRANDPARENT, child: GRANDPARENT });
      expect(family.hierarch).toStrictEqual(GRANDPARENT);
    });

    test("Parent no longer has child", () => {
      family.unrelate({ parent: PARENT, child: CHILD });
      expect(family.children(PARENT)?.includes(CHILD)).toStrictEqual(false);
    });

    test("Child unrelated from one parent still has another parent", () => {
      // 0 --> parent & parent2 --> child
      familyRelationship(family.hierarch, "parent2");
      familyRelationship("parent2", CHILD);
      family.unrelate({ parent: PARENT, child: CHILD });
      expect(family.children("parent2")?.includes(CHILD)).toStrictEqual(true);
    });

    test("Given child with a single parent, when child is unrelated from parent, child is no longer a member", () => {
      family.unrelate({ parent: PARENT, child: CHILD });
      expect(family.members().has(CHILD)).toStrictEqual(false);
    });
  });
});
