import OrderedOverlappingHierarchy, {
  CycleError,
  LoopError
} from "./index";

const CHILD = "child";
const PARENT = "parent";
const GRANDPARENT = "grandparent";

describe("OrderedOverlappingHierarchy", () => {
  let family: OrderedOverlappingHierarchy<string>;

  beforeEach(() => {
    family = new OrderedOverlappingHierarchy(GRANDPARENT);
    family.attach(PARENT, GRANDPARENT);
    family.attach(CHILD, PARENT);
  });

  describe("new OverlappingHierarchy(hierarch)", () => {
    test("Creates hierarchy with a single node", () => {
      const hierarchy = new OrderedOverlappingHierarchy<string>('')
      expect(hierarchy.hierarch).toStrictEqual('');
    });
  })

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
        clone.delete(node);
      }
      clone.attach("New Child", clone.hierarch);
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

    describe('Transitive reduction', () => {
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
      test("Linking to non-child descendant does not change structure", () => { // todo: retains structure, compare full hierarchies
        expect(family.attach(CHILD, GRANDPARENT)).toBeUndefined();
        expect(family.children(GRANDPARENT)).toStrictEqual([PARENT]);
        expect(family.parents(CHILD)).toStrictEqual(new Set([PARENT]));
      });

      // todo: retain the redyced structure VS transform structure?
      test("Linking another ancestor of a child does not change structure", () => {
        family.attach("p2", family.hierarch);
        family.attach(CHILD, "p2");
        expect(family.attach("p2", PARENT)).toBeUndefined()
        expect(family.children("p2")).toStrictEqual([CHILD]);
      });

      test("When attaching to sibling, removes redundant parent link", () => {
        family.attach("child2", PARENT);
        expect(family.attach(CHILD, "child2")).toBeUndefined();
        expect(family.parents(CHILD)).toStrictEqual(new Set(["child2"]));
      });

      test("When attaching to nibling, removes redundant links", () => {
        family.attach("child2", PARENT);
        family.attach("nibling", "child2");
        expect(family.attach(CHILD, "nibling")).toBeUndefined();
        expect(family.parents(CHILD)).toStrictEqual(new Set(["nibling"]));
      });

      test("When attaching ... removes redundant edge A->X", () => {
        const hierarchy = new OrderedOverlappingHierarchy<string>("0")
        // A -> B & X
        // C -> X
        // B -> C => transitive reduction
        hierarchy.attach("A", hierarchy.hierarch);
        hierarchy.attach("C", hierarchy.hierarch);
        hierarchy.attach("B", "A");
        hierarchy.attach("X", "A");
        hierarchy.attach("X", "C");
        expect(hierarchy.attach("C", "B")).toBeUndefined();
        expect(hierarchy.children("A")).toStrictEqual(["B"]);
      });

      // TODO: attaching descendant to root case
    })

    test("Adds string node", () => {
      const hierarchy = new OrderedOverlappingHierarchy<string>("relative");
      expect(hierarchy.nodes()).toStrictEqual(new Set(["relative"]));
    });

    test("Adds null node", () => {
      const hierarchy = new OrderedOverlappingHierarchy<null>(null);
      expect(hierarchy.nodes()).toStrictEqual(new Set([null]));
    });

    test("Adds object node", () => {
      const hierarchy = new OrderedOverlappingHierarchy<object>({});
      expect(hierarchy.nodes()).toStrictEqual(new Set([{}]));
    });

    test("Adding existing node does not change hierarchy", () => {
      const originalNodes = family.nodes();
      family.attach(CHILD, family.hierarch);
      expect(originalNodes).toStrictEqual(family.nodes());
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
      expect(family.nodes()?.has("missing")).toStrictEqual(true);
    });

    test("Attaches node to another parent as a child", () => {
      family.attach("another parent", GRANDPARENT);
      family.attach(CHILD, "another parent");
      expect(family.children("another parent")?.includes(CHILD)).toStrictEqual(
        true
      );
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

      test("New node is attached at the end of the top level children by default", () => {
        family.attach("parent2", family.hierarch);
        expect(family.children(family.hierarch)).toStrictEqual(["parent", "parent2"]);
      });

      // test("Zero index attaches hierarch at the beginning of the top level list", () => {
      //   family.attach("HIERARCH", undefined, 0);
      //   expect(family.hierarch).toStrictEqual(["HIERARCH", GRANDPARENT]);
      // });
    });
  });

  describe(".nodes()", () => {
    test("When ancestor is missing, returns undefined", () => {
      expect(family.descendants("missing")).toBeUndefined();
    });

    test("When ancestor is undefined, returns all nodes", () => {
      expect(family.nodes()).toStrictEqual(
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
      family.attach("parent2", family.hierarch);
      family.attach(CHILD, "parent2");
      family.detach(CHILD, PARENT);
      expect(family.children("parent2")?.includes(CHILD)).toStrictEqual(true);
    });

    test("Child detached from the only parent is removed from the hierarchy", () => {
      family.detach(CHILD, PARENT);
      expect(family.nodes().has(CHILD)).toStrictEqual(false);
    });
  });

  describe(".delete()", function () {
    test("Deleting hierarch has no effect", () => {
      family.delete(GRANDPARENT);
      expect(family.hierarch).toStrictEqual(GRANDPARENT);
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
      expect(family.nodes().has(PARENT)).toStrictEqual(false);
    });

    test("Removing the only node of the hierarchy empties the hierarchy", () => {
      const hierarchy = new OrderedOverlappingHierarchy<string>("orphan");
      hierarchy.delete("orphan");
      expect(hierarchy.nodes()).toStrictEqual(new Set());
    });
  });
});
