import OrderedOverlappingHierarchy, { CycleError, LoopError } from "./index";

const CHILD = "child";
const PARENT = "parent";
const GRANDPARENT = "grandparent";

describe("OrderedOverlappingHierarchy", () => {
  let family: OrderedOverlappingHierarchy<string>;

  beforeEach(() => {
    family = new OrderedOverlappingHierarchy(GRANDPARENT);
    family.link(GRANDPARENT, PARENT);
    family.link(PARENT, CHILD);
  });

  describe("new OverlappingHierarchy(hierarch)", () => {
    test("Creates hierarchy with a single node", () => {
      const hierarchy = new OrderedOverlappingHierarchy<string>("");
      expect(hierarchy.hierarch).toStrictEqual("");
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
          clone.detach(parent, node);
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
    test("Attaching node to itself returns LoopError", () => {
      expect(family.link(CHILD, CHILD)).toStrictEqual(
        new LoopError("Cannot attach node to itself")
      );
    });

    test("Attaching ancestor as a child returns CycleError", () => {
      expect(family.link(CHILD, GRANDPARENT)).toStrictEqual(
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
      test("Linking to non-child descendant does not change structure", () => {
        // todo: retains structure, compare full hierarchies
        expect(family.link(GRANDPARENT, CHILD)).toBeUndefined();
        expect(family.children(GRANDPARENT)).toStrictEqual([PARENT]);
        expect(family.parents(CHILD)).toStrictEqual(new Set([PARENT]));
      });

      // todo: retain the redyced structure VS transform structure?
      test("Linking another ancestor of a child does not change structure", () => {
        family.link(family.hierarch, "p2");
        family.link("p2", CHILD);
        expect(family.link(PARENT, "p2")).toBeUndefined();
        expect(family.children("p2")).toStrictEqual([CHILD]);
      });

      test("When attaching to sibling, removes redundant parent link", () => {
        family.link(PARENT, "child2");
        expect(family.link("child2", CHILD)).toBeUndefined();
        expect(family.parents(CHILD)).toStrictEqual(new Set(["child2"]));
      });

      test("When attaching to nibling, removes redundant links", () => {
        family.link(PARENT, "child2");
        family.link("child2", "nibling");
        expect(family.link("nibling", CHILD)).toBeUndefined();
        expect(family.parents(CHILD)).toStrictEqual(new Set(["nibling"]));
      });

      test("When attaching ... removes redundant edge A->X", () => {
        const hierarchy = new OrderedOverlappingHierarchy<string>("0");
        // A -> B & X
        // C -> X
        // B -> C => transitive reduction
        hierarchy.link("0", "A");
        hierarchy.link("0", "C");
        hierarchy.link("A", "B");
        hierarchy.link("A", "X");
        hierarchy.link("C", "X");
        expect(hierarchy.link("B", "C")).toBeUndefined();
        expect(hierarchy.children("A")).toStrictEqual(["B"]);
      });

      // TODO: attaching descendant to root case
    });

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
      family.link(GRANDPARENT, CHILD);
      expect(originalNodes).toStrictEqual(family.nodes());
    });

    test("Attaches node to the parent as a child", () => {
      family.link(CHILD, "grandchild");
      expect(family.children(CHILD)).toStrictEqual(["grandchild"]);
    });

    test("Attaching the same child again does not return error", () => {
      family.link(CHILD, "grandchild");
      expect(family.link(CHILD, "grandchild")).toBeUndefined();
    });

    test("Attaching node to a non-existing parent also adds parent", () => {
      family.link("missing", CHILD);
      expect(family.nodes()?.has("missing")).toStrictEqual(true);
    });

    test("Attaches node to another parent as a child", () => {
      family.link(GRANDPARENT, "another parent");
      family.link("another parent", CHILD);
      expect(family.children("another parent")?.includes(CHILD)).toStrictEqual(
        true
      );
    });

    describe("Ordering", () => {
      test("New child is attached at the end of the children list by default", () => {
        family.link(PARENT, "YOUNGER_CHILD");
        expect(family.children(PARENT)).toStrictEqual([CHILD, "YOUNGER_CHILD"]);
      });

      test("Existing child retains index by default", () => {
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

      test("Index bigger than number of items attaches child at the end", () => {
        family.link(PARENT, "LAST", 100);
        expect(family.children(PARENT)).toStrictEqual([CHILD, "LAST"]);
      });

      test("New node is attached at the end of the top level children by default", () => {
        family.link(family.hierarch, "parent2");
        expect(family.children(family.hierarch)).toStrictEqual([
          "parent",
          "parent2",
        ]);
      });

      // todo: test("Zero index attaches hierarch at the beginning of the top level list", () => {
      //   family.link(undefined, "HIERARCH", 0);
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
    test("Unlinking hierarch from itself has no effect", () => {
      family.detach(GRANDPARENT, GRANDPARENT);
      expect(family.hierarch).toStrictEqual(GRANDPARENT);
    });

    test("Parent no longer has detached child", () => {
      family.detach(PARENT, CHILD);
      expect(family.children(PARENT)?.includes(CHILD)).toStrictEqual(false);
    });

    test("Detached child still belongs to another parent", () => {
      family.link(family.hierarch, "parent2");
      family.link("parent2", CHILD);
      family.detach(PARENT, CHILD);
      expect(family.children("parent2")?.includes(CHILD)).toStrictEqual(true);
    });

    test("Child detached from the only parent is removed from the hierarchy", () => {
      family.detach(PARENT, CHILD);
      expect(family.nodes().has(CHILD)).toStrictEqual(false);
    });
  });
});
