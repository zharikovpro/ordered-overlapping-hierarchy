import OrderedOverlappingHierarchy, {
  CycleError,
  LoopError,
  TransitiveReductionError,
} from "./index";

const CHILD = "child";
const PARENT = "parent";
const GRANDPARENT = "grandparent";

describe("OverlappingHierarchy", () => {
  let family: OrderedOverlappingHierarchy<string>;

  beforeEach(() => {
    family = new OrderedOverlappingHierarchy();
    family.add(GRANDPARENT);
    family.attach(PARENT, GRANDPARENT);
    family.attach(CHILD, PARENT);
  });

  describe("new OverlappingHierarchy(source)", () => {
    let clone: OrderedOverlappingHierarchy<string>;

    beforeEach(() => {
      clone = new OrderedOverlappingHierarchy(family);
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
        clone.delete(node);
      }
      clone.add("New Child");
      clone.attach("New Parent", "New Child");
      expect(originalNodes).toStrictEqual(family.nodes());
    });
  });

  describe(".children()", () => {
    test("When parent does not exist, returns undefined", () => {
      expect(family.children("missing")).toBeUndefined();
    });

    test("Returns children ordered from older to younger", () => {
      family.attach("YOUNGER_CHILD", PARENT);
      expect(family.children(PARENT)).toStrictEqual([CHILD, "YOUNGER_CHILD"]);
    });

    test("Mutating returned set does not affect hierarchy", () => {
      const children = family.children(PARENT);
      children?.pop();
      expect(family.children(PARENT)?.includes(CHILD)).toStrictEqual(true);
    });
  });

  describe(".add()", () => {
    test("Adds string node", () => {
      family.add("relative");
      expect(family.nodes().has("relative")).toStrictEqual(true);
    });

    test("Adds null node", () => {
      const hierarchy = new OrderedOverlappingHierarchy<null>();
      hierarchy.add(null);
      expect(hierarchy.nodes()).toStrictEqual(new Set([null]));
    });

    test("Adds object node", () => {
      const hierarchy = new OrderedOverlappingHierarchy<object>();
      hierarchy.add({});
      expect(hierarchy.nodes()).toStrictEqual(new Set([{}]));
    });

    test("Adding existing node does not change hierarchy", () => {
      const originalNodes = family.nodes();
      family.add(CHILD);
      expect(originalNodes).toStrictEqual(family.nodes());
    });
  });

  describe(".attach()", () => {
    test("Attaching node to itself returns LoopError", () => {
      expect(family.attach( CHILD, CHILD)).toStrictEqual(
        new LoopError("Cannot attach node to itself")
      );
    });

    test("Attaching ancestor as a child returns CycleError", () => {
      expect(family.attach( GRANDPARENT,CHILD)).toStrictEqual(
        new CycleError("Cannot attach ancestor as a child")
      );
    });

    test("Attaching non-child descendant as a child returns TransitiveReductionError", () => {
      expect(family.attach(CHILD, GRANDPARENT )).toStrictEqual(
        new TransitiveReductionError(
          `Cannot attach non-child descendant as a child`
        )
      );
    });

    test("Attaching another ancestor of a child returns TransitiveReductionError", () => {
      family.add("p2");
      family.attach( CHILD, "p2");
      expect(family.attach( "p2", PARENT)).toStrictEqual(
        new TransitiveReductionError(
          `Cannot attach child whose descendant is a child of the parent`
        )
      );
    });

    test("Attaches node to the parent as a child", () => {
      family.attach( "grandchild", CHILD);
      expect(family.children(CHILD)).toStrictEqual(["grandchild"]);
    });

    test("Attaching the same child again does not return error", () => {
      family.attach( "grandchild", CHILD);
      expect(family.attach( "grandchild", CHILD)).toBeUndefined();
    });

    test("Attaching node to a non-existing parent also adds parent", () => {
      family.attach( CHILD, "missing");
      expect(family.nodes()?.has("missing")).toStrictEqual(true);
    });

    test("Attaches node to another parent as a child", () => {
      family.attach( "another parent", GRANDPARENT);
      family.attach( CHILD, "another parent");
      expect(family.children("another parent")?.includes(CHILD)).toStrictEqual(
        true
      );
    });

    test("Attached child has a parent", () => {
      const GREAT_GRANDPARENT = "great-grandparent";
      family.add(GREAT_GRANDPARENT);
      family.attach( GRANDPARENT, GREAT_GRANDPARENT);
      expect(family.parents(GRANDPARENT)).toStrictEqual(
        new Set([GREAT_GRANDPARENT])
      );
    });

    describe("Ordering", () => {
      test("New child is attached at the end of the children list by default", () => {
        family.attach( "YOUNGER_CHILD", PARENT);
        expect(family.children(PARENT)).toStrictEqual([CHILD, "YOUNGER_CHILD"]);
      });

      test("Existing child retains index by default", () => {
        family.attach( "MIDDLE_CHILD", PARENT);
        family.attach("YOUNGER_CHILD", PARENT);
        family.attach( CHILD, PARENT);
        family.attach( "MIDDLE_CHILD", PARENT);
        family.attach( "YOUNGER_CHILD", PARENT);
        expect(family.children(PARENT)).toStrictEqual([
          CHILD,
          "MIDDLE_CHILD",
          "YOUNGER_CHILD",
        ]);
      });

      test("Zero index inserts new child at the beginning", () => {
        family.attach( "OLDEST_CHILD", PARENT, 0);
        expect(family.children(PARENT)).toStrictEqual(["OLDEST_CHILD", CHILD]);
      });

      test("Zero index moves existing child to the beginning", () => {
        family.attach("SECOND", PARENT);
        family.attach( "SECOND", PARENT, 0);
        expect(family.children(PARENT)).toStrictEqual(["SECOND", CHILD]);
      });

      test("Non-zero index inserts new child in the middle", () => {
        family.attach( "YOUNGER", PARENT);
        family.attach( "MIDDLE", PARENT, 1);
        expect(family.children(PARENT)).toStrictEqual([
          CHILD,
          "MIDDLE",
          "YOUNGER",
        ]);
      });

      test("Non-zero index moves first child in the middle", () => {
        family.attach( "MIDDLE", PARENT);
        family.attach( "YOUNGER", PARENT);
        family.attach( CHILD, PARENT, 1);
        expect(family.children(PARENT)).toStrictEqual([
          "MIDDLE",
          CHILD,
          "YOUNGER",
        ]);
      });

      test("Index bigger than number of items attaches child at the end", () => {
        family.attach( "LAST", PARENT, 100);
        expect(family.children(PARENT)).toStrictEqual([CHILD, "LAST"]);
      });
    });
  });

  describe(".nodes()", () => {
    test("Returns nodes", () => {
      expect(family.nodes()).toStrictEqual(
        new Set([GRANDPARENT, PARENT, CHILD])
      );
    });
  });

  describe(".hierarchs()", () => {
    test("Returns hierarchs", () => {
      expect(family.hierarchs()).toStrictEqual(new Set([GRANDPARENT]));
    });

    test("Given 1000 nodes, performs x200 times faster than previous implementation", () => {
      class OldImplementation<Node> extends OrderedOverlappingHierarchy<Node> {
        hierarchs = (): Set<Node> =>
          new Set(
            Array.from(this.nodes()).filter((node) => !this.parents(node)?.size)
          );
      }

      const measureDuration = (
        hierarchy: OrderedOverlappingHierarchy<number>
      ): number => {
        for (let i = 0; i < 1000; i++) {
          hierarchy.add(i);
        }
        const start = Date.now();
        hierarchy.hierarchs();
        return Date.now() - start;
      };

      const oldDuration = measureDuration(new OldImplementation<number>());
      const newDuration = measureDuration(new OrderedOverlappingHierarchy<number>());

      expect(newDuration).toBeLessThan(oldDuration / 200);
    });
  });

  describe(".descendants()", () => {
    test("Returns undefined for non-member", () => {
      expect(family.descendants("missing")).toBeUndefined();
    });

    test("Returns descendants", () => {
      expect(family.descendants(GRANDPARENT)).toStrictEqual(
        new Set([PARENT, CHILD])
      );
    });
  });

  describe(".ancestors()", () => {
    test("Returns undefined for non-member", () => {
      expect(family.ancestors("missing")).toBeUndefined();
    });

    test("Returns ancestors", () => {
      expect(family.ancestors(CHILD)).toStrictEqual(
        new Set([GRANDPARENT, PARENT])
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

  describe(".detach()", () => {
    test("Parent no longer has detached child", () => {
      family.detach(PARENT, CHILD);
      expect(family.children(PARENT)?.includes(CHILD)).toStrictEqual(false);
    });

    test("Detached child still belongs to another parent", () => {
      family.add("parent2");
      family.attach(  CHILD, "parent2");
      family.detach( PARENT, CHILD);
      expect(family.children("parent2")?.includes(CHILD)).toStrictEqual(true);
    });

    test("Child detached from the only parent still belongs to the hierarchy", () => {
      family.detach(PARENT, CHILD);
      expect(family.nodes().has(CHILD)).toStrictEqual(true);
    });
  });

  describe(".delete()", function () {
    test("Detaches all children from the parent", () => {
      family.delete(PARENT);
      expect(family.parents(CHILD)).toEqual(new Set([]));
    });

    test("Detaches child from all parents", () => {
      family.delete(PARENT);
      expect(family.children(GRANDPARENT)?.includes(PARENT)).toStrictEqual(
        false
      );
    });

    test("Hierarchy no longer has removed node", () => {
      family.delete(PARENT);
      expect(family.nodes().has(PARENT)).toStrictEqual(false);
    });

    test("Removing the only node of the hierarchy empties the hierarchy", () => {
      const hierarchy = new OrderedOverlappingHierarchy<string>();
      hierarchy.add("orphan");
      hierarchy.delete("orphan");
      expect(hierarchy.nodes()).toStrictEqual(new Set());
    });
  });
});
