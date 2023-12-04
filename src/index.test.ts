import OrderedOverlappingHierarchy, {
  CycleError,
  LoopError,
  TransitiveReductionError, // todo: remove if favor of auto-reduction?
} from "./index";

const CHILD = "child";
const PARENT = "parent";
const GRANDPARENT = "grandparent";

describe("OrderedOverlappingHierarchy", () => {
  let family: OrderedOverlappingHierarchy<string>;

  beforeEach(() => {
    family = new OrderedOverlappingHierarchy();
    family.link(GRANDPARENT);
    family.link(PARENT, GRANDPARENT);
    family.link(CHILD, PARENT);
  });

  describe("new OverlappingHierarchy(source)", () => {
    let clone: OrderedOverlappingHierarchy<string>;

    beforeEach(() => {
      clone = new OrderedOverlappingHierarchy(family);
    });

    test("Has the same hierarchs", () => {
      expect(clone.children()).toStrictEqual(family.children());
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
        clone.remove(node);
      }
      clone.link("New Child");
      clone.link("New Parent", "New Child");
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
      family.link("YOUNGER_CHILD", PARENT);
      expect(family.children(PARENT)).toStrictEqual([CHILD, "YOUNGER_CHILD"]);
    });

    test("Mutating returned set does not affect hierarchy", () => {
      const children = family.children(PARENT);
      children?.pop();
      expect(family.children(PARENT)?.includes(CHILD)).toStrictEqual(true);
    });
  });

  describe(".link()", () => {
    test("Linking node to itself returns LoopError", () => {
      expect(family.link(CHILD, CHILD)).toStrictEqual(
        new LoopError("Cannot attach node to itself")
      );
    });

    test("Linking ancestor as a child returns CycleError", () => {
      expect(family.link(GRANDPARENT, CHILD)).toStrictEqual(
        new CycleError("Cannot attach ancestor as a child")
      );
    });

    describe("Transitive reduction", () => {
      // TODO: refactor and add more examples
      // TODO: https://brunoscheufler.com/blog/2021-12-05-decreasing-graph-complexity-with-transitive-reductions
      // https://networkx.org/documentation/stable/reference/algorithms/generated/networkx.algorithms.dag.transitive_reduction.html#
      // https://networkx.org/documentation/stable/_modules/networkx/algorithms/dag.html#transitive_reduction
      // https://stackoverflow.com/questions/1690953/transitive-reduction-algorithm-pseudocode
      // https://bjpcjp.github.io/pdfs/math/transitive-closure-ADM.pdf
      // Implementations: The Boost implementation of transitive closure appears particularly well engineered, and relies on algorithms from [Nuu95]. LEDA (see Section 19.1.1 (page 658)) provides implementations of both transitive closure and reduction in C++ [MN99]
      // https://www.boost.org/doc/libs/1_46_1/boost/graph/transitive_reduction.hpp
      // https://vivekseth.com/transitive-reduction/
      // https://www.semanticscholar.org/paper/The-Transitive-Reduction-of-a-Directed-Graph-Aho-Garey/d0be1e20643e7e15bd4669f1c3ef0c2287852566?p2df
      // https://github.com/jafingerhut/cljol/blob/master/doc/transitive-reduction-notes.md#computing-the-transitive-reduction-of-a-dag
      // https://epubs.siam.org/doi/10.1137/0201008

      test("When Linking non-child descendant as a child", () => {
        expect(family.link(CHILD, GRANDPARENT)).toStrictEqual(
          new TransitiveReductionError(
            `Cannot attach non-child descendant as a child`
          )
        );
      });

      test("When Linking another ancestor of a child", () => {
        family.link("p2");
        family.link(CHILD, "p2");
        expect(family.link("p2", PARENT)).toStrictEqual(
          new TransitiveReductionError(
            `Cannot attach child whose descendant is a child of the parent`
          )
        );
      });

      test("When Linking sibling", () => {
        family.link("child2", PARENT);
        expect(family.link(CHILD, "child2")).toStrictEqual(
          new TransitiveReductionError(`Cannot attach to parents descendants`)
        );
      });

      test("When Linking nibling", () => {
        family.link("child2", PARENT);
        family.link("nibling", "child2");
        expect(family.link(CHILD, "nibling")).toStrictEqual(
          new TransitiveReductionError(`Cannot attach to parents descendants`)
        );
      });

      test("When Linking ... removes redundant edge A->X", () => {
        const hierarchy = new OrderedOverlappingHierarchy<string>();
        // A -> B & X
        // C -> X
        // B -> C => transitive reduction
        hierarchy.link("A");
        hierarchy.link("B");
        hierarchy.link("C");
        hierarchy.link("X");
        hierarchy.link("B", "A");
        hierarchy.link("X", "A");
        hierarchy.link("X", "C");
        hierarchy.link("C", "B");
        expect(hierarchy.children("A")).toStrictEqual(["B"]);
      });

      // TODO: Linking descendant to root throws TransitiveReductionError?
    });

    test("Adds string node", () => {
      const hierarchy = new OrderedOverlappingHierarchy<string>();
      hierarchy.link("relative");
      expect(hierarchy.descendants()).toStrictEqual(new Set(["relative"]));
    });

    test("Adds null node", () => {
      const hierarchy = new OrderedOverlappingHierarchy<null>();
      hierarchy.link(null);
      expect(hierarchy.descendants()).toStrictEqual(new Set([null]));
    });

    test("Adds object node", () => {
      const hierarchy = new OrderedOverlappingHierarchy<object>();
      hierarchy.link({});
      expect(hierarchy.descendants()).toStrictEqual(new Set([{}]));
    });

    test("Adding existing node does not change hierarchy", () => {
      const originalNodes = family.descendants();
      family.link(CHILD);
      expect(originalNodes).toStrictEqual(family.descendants());
    });

    test("Attaches node to the parent as a child", () => {
      family.link("grandchild", CHILD);
      expect(family.children(CHILD)).toStrictEqual(["grandchild"]);
    });

    test("Linking the same child again does not return error", () => {
      family.link("grandchild", CHILD);
      expect(family.link("grandchild", CHILD)).toBeUndefined();
    });

    test("Linking node to a non-existing parent also adds parent", () => {
      family.link(CHILD, "missing");
      expect(family.descendants()?.has("missing")).toStrictEqual(true);
    });

    test("Attaches node to another parent as a child", () => {
      family.link("another parent", GRANDPARENT);
      family.link(CHILD, "another parent");
      expect(family.children("another parent")?.includes(CHILD)).toStrictEqual(
        true
      );
    });

    test("Attached child has a parent", () => {
      const GREAT_GRANDPARENT = "great-grandparent";
      family.link(GREAT_GRANDPARENT);
      family.link(GRANDPARENT, GREAT_GRANDPARENT);
      expect(family.parents(GRANDPARENT)).toStrictEqual(
        new Set([GREAT_GRANDPARENT])
      );
    });

    test("Linking node to undefined parent removes parents", () => {
      family.link(CHILD);
      expect(family.parents(CHILD)).toStrictEqual(new Set([]));
    });

    test("Linking node to parent removes it from hierarchs", () => {
      const hierarchy = new OrderedOverlappingHierarchy<string>();
      hierarchy.link("A");
      hierarchy.link("B");
      hierarchy.link("B", "A");
      expect(hierarchy.children()).toStrictEqual(["A"]);
    });

    describe("Ordering", () => {
      test("New child is attached at the end of the children list by default", () => {
        family.link("YOUNGER_CHILD", PARENT);
        expect(family.children(PARENT)).toStrictEqual([CHILD, "YOUNGER_CHILD"]);
      });

      test("Existing child retains index by default", () => {
        family.link("MIDDLE_CHILD", PARENT);
        family.link("YOUNGER_CHILD", PARENT);
        family.link(CHILD, PARENT);
        family.link("MIDDLE_CHILD", PARENT);
        family.link("YOUNGER_CHILD", PARENT);
        expect(family.children(PARENT)).toStrictEqual([
          CHILD,
          "MIDDLE_CHILD",
          "YOUNGER_CHILD",
        ]);
      });

      test("Zero index inserts new child at the beginning", () => {
        family.link("OLDEST_CHILD", PARENT, 0);
        expect(family.children(PARENT)).toStrictEqual(["OLDEST_CHILD", CHILD]);
      });

      test("Zero index moves existing child to the beginning", () => {
        family.link("SECOND", PARENT);
        family.link("SECOND", PARENT, 0);
        expect(family.children(PARENT)).toStrictEqual(["SECOND", CHILD]);
      });

      test("Non-zero index inserts new child in the middle", () => {
        family.link("YOUNGER", PARENT);
        family.link("MIDDLE", PARENT, 1);
        expect(family.children(PARENT)).toStrictEqual([
          CHILD,
          "MIDDLE",
          "YOUNGER",
        ]);
      });

      test("Non-zero index moves first child in the middle", () => {
        family.link("MIDDLE", PARENT);
        family.link("YOUNGER", PARENT);
        family.link(CHILD, PARENT, 1);
        expect(family.children(PARENT)).toStrictEqual([
          "MIDDLE",
          CHILD,
          "YOUNGER",
        ]);
      });

      test("Index bigger than number of items attaches child at the end", () => {
        family.link("LAST", PARENT, 100);
        expect(family.children(PARENT)).toStrictEqual([CHILD, "LAST"]);
      });

      test("New hierarch is attached at the end of the top level list by default", () => {
        family.link("HIERARCH");
        expect(family.children()).toStrictEqual([GRANDPARENT, "HIERARCH"]);
      });

      test("Zero index attaches hierarch at the beginning of the top level list", () => {
        family.link("HIERARCH", undefined, 0);
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

  describe(".unlink()", () => {
    test("Parent no longer has detached child", () => {
      family.unlink(PARENT, CHILD);
      expect(family.children(PARENT)?.includes(CHILD)).toStrictEqual(false);
    });

    test("Detached child still belongs to another parent", () => {
      family.link("parent2");
      family.link(CHILD, "parent2");
      family.unlink(PARENT, CHILD);
      expect(family.children("parent2")?.includes(CHILD)).toStrictEqual(true);
    });

    test("Child detached from the only parent still belongs to the hierarchy", () => {
      family.unlink(PARENT, CHILD);
      expect(family.descendants().has(CHILD)).toStrictEqual(true);
    });

    test("Child detached from the only parent becomes an hierarch", () => {
      family.unlink(PARENT, CHILD);
      expect(family.children()).toContain(CHILD);
    });
  });

  describe(".delete()", function () {
    test("Hierarchy no longer has this hierarch", () => {
      family.remove(GRANDPARENT);
      expect(family.children()).not.toContain(GRANDPARENT);
    });

    test("Detaches all children from the parent", () => {
      family.remove(PARENT);
      expect(family.parents(CHILD)).toEqual(new Set([]));
    });

    test("Detaches child from all parents", () => {
      family.remove(PARENT);
      expect(family.children(GRANDPARENT)?.includes(PARENT)).toStrictEqual(
        false
      );
    });

    test("Hierarchy no longer has removed node", () => {
      family.remove(PARENT);
      expect(family.descendants().has(PARENT)).toStrictEqual(false);
    });

    test("Removing the only node of the hierarchy empties the hierarchy", () => {
      const hierarchy = new OrderedOverlappingHierarchy<string>();
      hierarchy.link("orphan");
      hierarchy.remove("orphan");
      expect(hierarchy.descendants()).toStrictEqual(new Set());
    });
  });
});
