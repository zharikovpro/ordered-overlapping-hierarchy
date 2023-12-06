import OrderedOverlappingHierarchy, { CycleError, LoopError } from "./index";

interface Link {
  parent: string;
  child: string;
  index: number;
}

const CHILD = "child";
const PARENT = "parent";
const GRANDPARENT = "grandparent";

describe("OrderedOverlappingHierarchy", () => {
  const familyLink = (
    parent: string,
    child: string,
    index?: number
  ): Link | LoopError | CycleError => {
    return family.link({ parent, child, index });
  };

  // todo: verifyLink(hierarchy, link) -> checks that parent has child at index; child has parent; links has exact link; hierarchy has parent; hierarchy has child;

  let family: OrderedOverlappingHierarchy<string>;

  beforeEach(() => {
    // grandparent --> parent --> child
    family = new OrderedOverlappingHierarchy(GRANDPARENT);
    familyLink(GRANDPARENT, PARENT);
    familyLink(PARENT, CHILD);
  });

  describe("new OverlappingHierarchy(hierarch)", () => {
    test("Hierarchy with the single node", () => {
      const hierarchy = new OrderedOverlappingHierarchy<string>("");
      expect(hierarchy.hierarch).toStrictEqual("");
    });

    test("String hierarch", () => {
      const hierarchy = new OrderedOverlappingHierarchy<string>("relative");
      expect(hierarchy.nodes()).toStrictEqual(new Set(["relative"]));
    });

    test("Null hierarch", () => {
      const hierarchy = new OrderedOverlappingHierarchy<null>(null);
      expect(hierarchy.nodes()).toStrictEqual(new Set([null]));
    });

    test("Object hierarch", () => {
      const hierarchy = new OrderedOverlappingHierarchy<object>({});
      expect(hierarchy.nodes()).toStrictEqual(new Set([{}]));
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

    test("Has the same nodes", () => {
      expect(clone.nodes()).toStrictEqual(family.nodes());
    });

    test("Has the same relationships", () => {
      for (const node of family.nodes()) {
        expect(clone.parents(node)).toStrictEqual(family.parents(node));
      }
    });

    test("Restructuring a clone keeps the source structure intact", () => {
      const originalNodes = family.nodes();
      for (const child of clone.nodes()) {
        for (const parent of clone.parents(child) as Set<string>) {
          clone.unlink({ parent, child });
        }
      }
      clone.link({ parent: clone.hierarch, child: "New Child" });
      clone.link({ parent: "New Child", child: "New Parent" });
      expect(originalNodes).toStrictEqual(family.nodes());
    });
  });

  describe(".children()", () => {
    test("When parent does not exist, returns undefined", () => {
      expect(family.children("missing")).toBeUndefined();
    });

    test("Returns children ordered from older to younger", () => {
      // grandparent --> parent --> child & younger_child
      familyLink(PARENT, "YOUNGER_CHILD");
      expect(family.children(PARENT)).toStrictEqual([CHILD, "YOUNGER_CHILD"]);
    });

    test("Mutating returned set does not affect hierarchy", () => {
      const children = family.children(PARENT);
      children?.pop();
      expect(family.children(PARENT)?.includes(CHILD)).toStrictEqual(true);
    });
  });

  describe(".link()", () => {
    describe("Errors", () => {
      test("Linking itself returns LoopError", () => {
        expect(familyLink(CHILD, CHILD)).toStrictEqual(
          new LoopError("Cannot link node to itself")
        );
      });

      test("Linking ancestor as a child returns CycleError", () => {
        expect(familyLink(CHILD, GRANDPARENT)).toStrictEqual(
          new CycleError("Cannot link ancestor as a child")
        );
      });
    });

    test("Adding existing node does not change hierarchy", () => {
      const originalNodes = family.nodes();
      familyLink(GRANDPARENT, CHILD);
      expect(originalNodes).toStrictEqual(family.nodes());
    });

    test("When parent doesn not belongs to the hierarchy, links it to the hierarch", () => {
      familyLink("ORPHAN", CHILD);
      expect(family.parents("ORPHAN")).toStrictEqual(new Set([family.hierarch]));
    });

    test("Links node to the parent as a child", () => {
      familyLink(CHILD, "grandchild");
      expect(family.children(CHILD)).toStrictEqual(["grandchild"]);
    });

    test("Linking the same child again returns link", () => {
      familyLink(CHILD, "grandchild");
      expect((familyLink(CHILD, "grandchild") as Link).index).toBeDefined();
    });

    test("Linking node to a non-existing parent also adds parent", () => {
      familyLink("missing", CHILD);
      expect(family.nodes()?.has("missing")).toStrictEqual(true);
    });

    test("Links node to another parent as a child", () => {
      familyLink(GRANDPARENT, "another parent");
      familyLink("another parent", CHILD);
      expect(family.children("another parent")?.includes(CHILD)).toStrictEqual(
        true
      );
    });

    describe("Order", () => {
      test("New child is linked at the end of the children list by default", () => {
        const link = familyLink(PARENT, "YOUNGER_CHILD") as Link;
        expect(link.index).toStrictEqual(1);
        expect(family.children(PARENT)).toStrictEqual([CHILD, "YOUNGER_CHILD"]);
      });

      test("Existing child retains index by default", () => {
        // parent --> middle & younger & child
        familyLink(PARENT, "MIDDLE_CHILD");
        familyLink(PARENT, "YOUNGER_CHILD");
        familyLink(PARENT, CHILD);
        familyLink(PARENT, "MIDDLE_CHILD");
        familyLink(PARENT, "YOUNGER_CHILD");
        expect(family.children(PARENT)).toStrictEqual([
          CHILD,
          "MIDDLE_CHILD",
          "YOUNGER_CHILD",
        ]);
      });

      test("Zero index inserts new child at the beginning", () => {
        familyLink(PARENT, "OLDEST_CHILD", 0);
        expect(family.children(PARENT)).toStrictEqual(["OLDEST_CHILD", CHILD]);
      });

      test("Zero index moves existing child to the beginning", () => {
        familyLink(PARENT, "SECOND");
        familyLink(PARENT, "SECOND", 0);
        expect(family.children(PARENT)).toStrictEqual(["SECOND", CHILD]);
      });

      test("Non-zero index inserts new child in the middle", () => {
        familyLink(PARENT, "YOUNGER");
        familyLink(PARENT, "MIDDLE", 1);
        expect(family.children(PARENT)).toStrictEqual([
          CHILD,
          "MIDDLE",
          "YOUNGER",
        ]);
      });

      test("Non-zero index moves first child in the middle", () => {
        familyLink(PARENT, "MIDDLE");
        familyLink(PARENT, "YOUNGER");
        familyLink(PARENT, CHILD, 1);
        expect(family.children(PARENT)).toStrictEqual([
          "MIDDLE",
          CHILD,
          "YOUNGER",
        ]);
      });

      test("Index bigger than number of items links child at the end", () => {
        familyLink(PARENT, "LAST", 100);
        expect(family.children(PARENT)).toStrictEqual([CHILD, "LAST"]);
      });

      test("New node is linked at the end of the top level children by default", () => {
        familyLink(family.hierarch, "parent2");
        expect(family.children(family.hierarch)).toStrictEqual([
          "parent",
          "parent2",
        ]);
      });
    });

    describe("Transitive reduction", () => {
      test("Linking to non-child descendant does not change structure", () => {
        familyLink(GRANDPARENT, CHILD);
        expect(family.children(GRANDPARENT)).toStrictEqual([PARENT]);
        expect(family.parents(CHILD)).toStrictEqual(new Set([PARENT]));
      });

      test("Linking another ancestor of a child does not change structure", () => {
        familyLink(family.hierarch, "p2");
        familyLink("p2", CHILD);
        familyLink(PARENT, "p2");
        expect(family.children("p2")).toStrictEqual([CHILD]);
      });

      test("When Linking to sibling, removes redundant parent link", () => {
        familyLink(PARENT, "child2");
        familyLink("child2", CHILD);
        expect(family.parents(CHILD)).toStrictEqual(new Set(["child2"]));
      });

      test("When Linking to nibling, removes redundant links", () => {
        familyLink(PARENT, "child2");
        familyLink("child2", "nibling");
        familyLink("nibling", CHILD);
        expect(family.parents(CHILD)).toStrictEqual(new Set(["nibling"]));
      });

      test("When connecting sub-graphs with shared node, removes transitive link", () => {
        const hierarchy = new OrderedOverlappingHierarchy<string>("0");
        // 0 --> A & C
        // A --> B & X
        // C --> X
        hierarchy.link({ parent: "0", child: "A" });
        hierarchy.link({ parent: "0", child: "C" });
        hierarchy.link({ parent: "A", child: "B" });
        hierarchy.link({ parent: "A", child: "X" });
        hierarchy.link({ parent: "C", child: "X" });
        hierarchy.link({ parent: "B", child: "C" });
        expect(hierarchy.children("A")).toStrictEqual(["B"]);
      });
    });
  });

  describe(".nodes()", () => {
    test("Returns set of all nodes", () => {
      expect(family.nodes()).toStrictEqual(
        new Set([GRANDPARENT, PARENT, CHILD])
      );
    });
  });

  describe(".links()", () => {
    test("Returns set of all links", () => {
      expect(family.links()).toStrictEqual(
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

    test("Given top-level node, returns empty set", () => {
      expect(family.parents(GRANDPARENT)).toStrictEqual(new Set());
    });

    test("Given child, returns parents set", () => {
      expect(family.parents(CHILD)).toStrictEqual(new Set([PARENT]));
    });
  });

  describe(".unlink()", () => {
    test("Unlinking hierarch from itself has no effect", () => {
      family.unlink({ parent: GRANDPARENT, child: GRANDPARENT });
      expect(family.hierarch).toStrictEqual(GRANDPARENT);
    });

    test("Parent no longer has unlinked child", () => {
      family.unlink({ parent: PARENT, child: CHILD });
      expect(family.children(PARENT)?.includes(CHILD)).toStrictEqual(false);
    });

    test("Child unlinked from one parent still belongs to another parent", () => {
      // 0 --> parent & parent2 --> child
      familyLink(family.hierarch, "parent2");
      familyLink("parent2", CHILD);
      family.unlink({ parent: PARENT, child: CHILD });
      expect(family.children("parent2")?.includes(CHILD)).toStrictEqual(true);
    });

    test("Child unlinked from the only parent is removed from the hierarchy", () => {
      family.unlink({ parent: PARENT, child: CHILD });
      expect(family.nodes().has(CHILD)).toStrictEqual(false);
    });
  });
});
