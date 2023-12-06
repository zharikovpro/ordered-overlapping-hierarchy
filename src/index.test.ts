import OrderedOverlappingHierarchy, { CycleError, LoopError } from "./index";

const CHILD = "child";
const PARENT = "parent";
const GRANDPARENT = "grandparent";

describe("OrderedOverlappingHierarchy", () => {
  let family: OrderedOverlappingHierarchy<string>;

  beforeEach(() => {
    // grandparent --> parent --> child
    family = new OrderedOverlappingHierarchy(GRANDPARENT);
    family.link(GRANDPARENT, PARENT);
    family.link(PARENT, CHILD);
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
      for (const node of clone.nodes()) {
        for (const parent of clone.parents(node) as Set<string>) {
          clone.unlink(parent, node);
        }
      }
      clone.link(clone.hierarch, "New Child");
      clone.link("New Child", "New Parent");
      expect(originalNodes).toStrictEqual(family.nodes());
    });
  });

  describe(".children()", () => {
    test("When parent does not exist, returns undefined", () => {
      expect(family.children("missing")).toBeUndefined();
    });

    test("Returns children ordered from older to younger", () => {
      // grandparent --> parent --> child & younger_child
      family.link(PARENT, "YOUNGER_CHILD");
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
        expect(family.link(CHILD, CHILD)).toStrictEqual(
          new LoopError("Cannot link node to itself")
        );
      });

      test("Linking ancestor as a child returns CycleError", () => {
        expect(family.link(CHILD, GRANDPARENT)).toStrictEqual(
          new CycleError("Cannot link ancestor as a child")
        );
      });
    });

    test("Adding existing node does not change hierarchy", () => {
      const originalNodes = family.nodes();
      family.link(GRANDPARENT, CHILD);
      expect(originalNodes).toStrictEqual(family.nodes());
    });

    test("Links node to the parent as a child", () => {
      family.link(CHILD, "grandchild");
      expect(family.children(CHILD)).toStrictEqual(["grandchild"]);
    });

    test("Linking the same child again does not return error", () => {
      family.link(CHILD, "grandchild");
      expect(family.link(CHILD, "grandchild")).toBeUndefined();
    });

    test("Linking node to a non-existing parent also adds parent", () => {
      family.link("missing", CHILD);
      expect(family.nodes()?.has("missing")).toStrictEqual(true);
    });

    test("Links node to another parent as a child", () => {
      family.link(GRANDPARENT, "another parent");
      family.link("another parent", CHILD);
      expect(family.children("another parent")?.includes(CHILD)).toStrictEqual(
        true
      );
    });

    describe("Order", () => {
      test("New child is linked at the end of the children list by default", () => {
        family.link(PARENT, "YOUNGER_CHILD");
        expect(family.children(PARENT)).toStrictEqual([CHILD, "YOUNGER_CHILD"]);
      });

      test("Existing child retains index by default", () => {
        // parent --> middle & younger & child
        family.link(PARENT, "MIDDLE_CHILD");
        family.link(PARENT, "YOUNGER_CHILD");
        family.link(PARENT, CHILD);
        family.link(PARENT, "MIDDLE_CHILD");
        family.link(PARENT, "YOUNGER_CHILD");
        expect(family.children(PARENT)).toStrictEqual([
          CHILD,
          "MIDDLE_CHILD",
          "YOUNGER_CHILD",
        ]);
      });

      test("Zero index inserts new child at the beginning", () => {
        family.link(PARENT, "OLDEST_CHILD", 0);
        expect(family.children(PARENT)).toStrictEqual(["OLDEST_CHILD", CHILD]);
      });

      test("Zero index moves existing child to the beginning", () => {
        family.link(PARENT, "SECOND");
        family.link(PARENT, "SECOND", 0);
        expect(family.children(PARENT)).toStrictEqual(["SECOND", CHILD]);
      });

      test("Non-zero index inserts new child in the middle", () => {
        family.link(PARENT, "YOUNGER");
        family.link(PARENT, "MIDDLE", 1);
        expect(family.children(PARENT)).toStrictEqual([
          CHILD,
          "MIDDLE",
          "YOUNGER",
        ]);
      });

      test("Non-zero index moves first child in the middle", () => {
        family.link(PARENT, "MIDDLE");
        family.link(PARENT, "YOUNGER");
        family.link(PARENT, CHILD, 1);
        expect(family.children(PARENT)).toStrictEqual([
          "MIDDLE",
          CHILD,
          "YOUNGER",
        ]);
      });

      test("Index bigger than number of items links child at the end", () => {
        family.link(PARENT, "LAST", 100);
        expect(family.children(PARENT)).toStrictEqual([CHILD, "LAST"]);
      });

      test("New node is linked at the end of the top level children by default", () => {
        family.link(family.hierarch, "parent2");
        expect(family.children(family.hierarch)).toStrictEqual([
          "parent",
          "parent2",
        ]);
      });
    });

    describe("Transitive reduction", () => {
      test("Linking to non-child descendant does not change structure", () => {
        expect(family.link(GRANDPARENT, CHILD)).toBeUndefined();
        expect(family.children(GRANDPARENT)).toStrictEqual([PARENT]);
        expect(family.parents(CHILD)).toStrictEqual(new Set([PARENT]));
      });

      test("Linking another ancestor of a child does not change structure", () => {
        family.link(family.hierarch, "p2");
        family.link("p2", CHILD);
        expect(family.link(PARENT, "p2")).toBeUndefined();
        expect(family.children("p2")).toStrictEqual([CHILD]);
      });

      test("When Linking to sibling, removes redundant parent link", () => {
        family.link(PARENT, "child2");
        expect(family.link("child2", CHILD)).toBeUndefined();
        expect(family.parents(CHILD)).toStrictEqual(new Set(["child2"]));
      });

      test("When Linking to nibling, removes redundant links", () => {
        family.link(PARENT, "child2");
        family.link("child2", "nibling");
        expect(family.link("nibling", CHILD)).toBeUndefined();
        expect(family.parents(CHILD)).toStrictEqual(new Set(["nibling"]));
      });

      test("When connecting sub-graphs with shared node, removes transitive link", () => {
        const hierarchy = new OrderedOverlappingHierarchy<string>("0");
        // 0 --> A & C
        // A --> B & X
        // C --> X
        hierarchy.link("0", "A");
        hierarchy.link("0", "C");
        hierarchy.link("A", "B");
        hierarchy.link("A", "X");
        hierarchy.link("C", "X");
        expect(hierarchy.link("B", "C")).toBeUndefined();
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
      family.unlink(GRANDPARENT, GRANDPARENT);
      expect(family.hierarch).toStrictEqual(GRANDPARENT);
    });

    test("Parent no longer has unlinked child", () => {
      family.unlink(PARENT, CHILD);
      expect(family.children(PARENT)?.includes(CHILD)).toStrictEqual(false);
    });

    test("Child unlinked from one parent still belongs to another parent", () => {
      // 0 --> parent & parent2 --> child
      family.link(family.hierarch, "parent2");
      family.link("parent2", CHILD);
      family.unlink(PARENT, CHILD);
      expect(family.children("parent2")?.includes(CHILD)).toStrictEqual(true);
    });

    test("Child unlinked from the only parent is removed from the hierarchy", () => {
      family.unlink(PARENT, CHILD);
      expect(family.nodes().has(CHILD)).toStrictEqual(false);
    });
  });
});
