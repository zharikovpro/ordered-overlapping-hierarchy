import OrderedOverlappingHierarchy, {
  CycleError,
  LoopError,
  TransitiveReductionError,
} from "./index";

const CHILD = "child";
const PARENT = "parent";
const GRANDPARENT = "grandparent";

describe("OrderedOverlappingHierarchy", () => {
  let family: OrderedOverlappingHierarchy<string>;

  beforeEach(() => {
    family = new OrderedOverlappingHierarchy();
    family.attach(GRANDPARENT);
    family.attach(PARENT, GRANDPARENT);
    family.attach(CHILD, PARENT);
  });

  describe("new OverlappingHierarchy(source)", () => {
    let clone: OrderedOverlappingHierarchy<string>;

    beforeEach(() => {
      clone = new OrderedOverlappingHierarchy(family);
    });

    test("Has the same nodes", () => {
      expect(clone.descendants()).toStrictEqual(family.descendants());
    });

    test("Has the same relationships", () => {
      for (const node of family.descendants()) {
        expect(clone.parents(node)).toStrictEqual(family.parents(node));
      }
    });

    test("Restructuring a clone keeps the source structure intact", () => {
      const originalNodes = family.descendants();
      for (const node of clone.descendants()) {
        clone.delete(node);
      }
      clone.attach("New Child");
      clone.attach("New Parent", "New Child");
      expect(originalNodes).toStrictEqual(family.descendants());
    });
  });

  describe(".children()", () => {
    test("When parent does not exist, returns undefined", () => {
      expect(family.children("missing")).toBeUndefined();
    });

    test("When parent is undefined, returns hierarchs", () => {
      expect(family.children()).toStrictEqual([GRANDPARENT]);
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

  describe(".attach()", () => {
    test("Attaching node to itself returns LoopError", () => {
      expect(family.attach(CHILD, CHILD)).toStrictEqual(
        new LoopError("Cannot attach node to itself")
      );
    });

    test("Attaching ancestor as a child returns CycleError", () => {
      expect(family.attach(GRANDPARENT, CHILD)).toStrictEqual(
        new CycleError("Cannot attach ancestor as a child")
      );
    });

    test("Attaching non-child descendant as a child returns TransitiveReductionError", () => {
      expect(family.attach(CHILD, GRANDPARENT)).toStrictEqual(
        new TransitiveReductionError(
          `Cannot attach non-child descendant as a child`
        )
      );
    });

    test("Attaching another ancestor of a child returns TransitiveReductionError", () => {
      family.attach("p2");
      family.attach(CHILD, "p2");
      expect(family.attach("p2", PARENT)).toStrictEqual(
        new TransitiveReductionError(
          `Cannot attach child whose descendant is a child of the parent`
        )
      );
    });

    test("Adds string node", () => {
      const hierarchy = new OrderedOverlappingHierarchy<string>();
      hierarchy.attach("relative");
      expect(hierarchy.descendants()).toStrictEqual(new Set(["relative"]));
    });

    test("Adds null node", () => {
      const hierarchy = new OrderedOverlappingHierarchy<null>();
      hierarchy.attach(null);
      expect(hierarchy.descendants()).toStrictEqual(new Set([null]));
    });

    test("Adds object node", () => {
      const hierarchy = new OrderedOverlappingHierarchy<object>();
      hierarchy.attach({});
      expect(hierarchy.descendants()).toStrictEqual(new Set([{}]));
    });

    test("Adding existing node does not change hierarchy", () => {
      const originalNodes = family.descendants();
      family.attach(CHILD);
      expect(originalNodes).toStrictEqual(family.descendants());
    });

    test("Attaches node to the parent as a child", () => {
      family.attach("grandchild", CHILD);
      expect(family.children(CHILD)).toStrictEqual(["grandchild"]);
    });

    test("Attaching the same child again does not return error", () => {
      family.attach("grandchild", CHILD);
      expect(family.attach("grandchild", CHILD)).toBeUndefined();
    });

    test("Attaching node to a non-existing parent also adds parent", () => {
      family.attach(CHILD, "missing");
      expect(family.descendants()?.has("missing")).toStrictEqual(true);
    });

    test("Attaches node to another parent as a child", () => {
      family.attach("another parent", GRANDPARENT);
      family.attach(CHILD, "another parent");
      expect(family.children("another parent")?.includes(CHILD)).toStrictEqual(
        true
      );
    });

    test("Attached child has a parent", () => {
      const GREAT_GRANDPARENT = "great-grandparent";
      family.attach(GREAT_GRANDPARENT);
      family.attach(GRANDPARENT, GREAT_GRANDPARENT);
      expect(family.parents(GRANDPARENT)).toStrictEqual(
        new Set([GREAT_GRANDPARENT])
      );
    });

    test("Attaching node to undefined parent removes parents", () => {
      family.attach(CHILD);
      expect(family.parents(CHILD)).toStrictEqual(new Set([]));
    });

    test("Attaching node to parent removes it from hierarchs", () => {
      const hierarchy = new OrderedOverlappingHierarchy<string>();
      hierarchy.attach("A");
      hierarchy.attach("B");
      hierarchy.attach("B", "A");
      expect(hierarchy.children()).toStrictEqual(["A"]);
    });

    describe("Ordering", () => {
      test("New child is attached at the end of the children list by default", () => {
        family.attach("YOUNGER_CHILD", PARENT);
        expect(family.children(PARENT)).toStrictEqual([CHILD, "YOUNGER_CHILD"]);
      });

      test("Existing child retains index by default", () => {
        family.attach("MIDDLE_CHILD", PARENT);
        family.attach("YOUNGER_CHILD", PARENT);
        family.attach(CHILD, PARENT);
        family.attach("MIDDLE_CHILD", PARENT);
        family.attach("YOUNGER_CHILD", PARENT);
        expect(family.children(PARENT)).toStrictEqual([
          CHILD,
          "MIDDLE_CHILD",
          "YOUNGER_CHILD",
        ]);
      });

      test("Zero index inserts new child at the beginning", () => {
        family.attach("OLDEST_CHILD", PARENT, 0);
        expect(family.children(PARENT)).toStrictEqual(["OLDEST_CHILD", CHILD]);
      });

      test("Zero index moves existing child to the beginning", () => {
        family.attach("SECOND", PARENT);
        family.attach("SECOND", PARENT, 0);
        expect(family.children(PARENT)).toStrictEqual(["SECOND", CHILD]);
      });

      test("Non-zero index inserts new child in the middle", () => {
        family.attach("YOUNGER", PARENT);
        family.attach("MIDDLE", PARENT, 1);
        expect(family.children(PARENT)).toStrictEqual([
          CHILD,
          "MIDDLE",
          "YOUNGER",
        ]);
      });

      test("Non-zero index moves first child in the middle", () => {
        family.attach("MIDDLE", PARENT);
        family.attach("YOUNGER", PARENT);
        family.attach(CHILD, PARENT, 1);
        expect(family.children(PARENT)).toStrictEqual([
          "MIDDLE",
          CHILD,
          "YOUNGER",
        ]);
      });

      test("Index bigger than number of items attaches child at the end", () => {
        family.attach("LAST", PARENT, 100);
        expect(family.children(PARENT)).toStrictEqual([CHILD, "LAST"]);
      });

      test("New hierarch is attached at the end of the top level list by default", () => {
        family.attach("HIERARCH");
        expect(family.children()).toStrictEqual([GRANDPARENT, "HIERARCH"]);
      });

      test("Zero index attaches hierarch at the beginning of the top level list", () => {
        family.attach("HIERARCH", undefined, 0);
        expect(family.children()).toStrictEqual(["HIERARCH", GRANDPARENT]);
      });
    });
  });

  describe(".descendants()", () => {
    test("When ancestor is missing, returns undefined", () => {
      expect(family.descendants("missing")).toBeUndefined();
    });

    test("When ancestor is undefined, returns all nodes", () => {
      expect(family.descendants()).toStrictEqual(
        new Set([GRANDPARENT, PARENT, CHILD])
      );
    });

    test("Returns descendants for the ancestor", () => {
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
      family.detach(CHILD, PARENT);
      expect(family.children(PARENT)?.includes(CHILD)).toStrictEqual(false);
    });

    test("Detached child still belongs to another parent", () => {
      family.attach("parent2");
      family.attach(CHILD, "parent2");
      family.detach(CHILD, PARENT);
      expect(family.children("parent2")?.includes(CHILD)).toStrictEqual(true);
    });

    test("Child detached from the only parent still belongs to the hierarchy", () => {
      family.detach(CHILD, PARENT);
      expect(family.descendants().has(CHILD)).toStrictEqual(true);
    });

    test("Child detached from the only parent becomes an hierarch", () => {
      family.detach(CHILD, PARENT);
      expect(family.children()).toContain(CHILD);
    });
  });

  describe(".delete()", function () {
    test("Hierarchy no longer has this hierarch", () => {
      family.delete(GRANDPARENT);
      expect(family.children()).not.toContain(GRANDPARENT);
    });

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
      expect(family.descendants().has(PARENT)).toStrictEqual(false);
    });

    test("Removing the only node of the hierarchy empties the hierarchy", () => {
      const hierarchy = new OrderedOverlappingHierarchy<string>();
      hierarchy.attach("orphan");
      hierarchy.delete("orphan");
      expect(hierarchy.descendants()).toStrictEqual(new Set());
    });
  });
});
