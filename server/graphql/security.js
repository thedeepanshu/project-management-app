import { GraphQLError, Kind, NoSchemaIntrospectionCustomRule } from "graphql";

// Protections against abusive queries. GraphQL lets a client ask for deeply
// nested or heavily aliased data in one request, so we cap both before
// anything executes. In production the schema can't be browsed, and
// "Did you mean …?" hints are removed so field names don't leak.

const MAX_DEPTH = 8;
const MAX_ALIASES = 15;

function depthLimitRule(context) {
  const fragments = new Map(
    context.getDocument().definitions
      .filter((definition) => definition.kind === Kind.FRAGMENT_DEFINITION)
      .map((fragment) => [fragment.name.value, fragment])
  );

  function depthOf(selectionSet, depth, seen) {
    if (!selectionSet) return depth;
    let max = depth;
    for (const selection of selectionSet.selections) {
      if (selection.kind === Kind.FIELD) {
        if (selection.name.value.startsWith("__")) continue;
        max = Math.max(max, depthOf(selection.selectionSet, depth + 1, seen));
      } else if (selection.kind === Kind.INLINE_FRAGMENT) {
        max = Math.max(max, depthOf(selection.selectionSet, depth, seen));
      } else if (selection.kind === Kind.FRAGMENT_SPREAD) {
        const name = selection.name.value;
        if (seen.has(name)) continue; // cycles are reported by GraphQL's own rules
        const fragment = fragments.get(name);
        if (fragment) max = Math.max(max, depthOf(fragment.selectionSet, depth, new Set([...seen, name])));
      }
    }
    return max;
  }

  return {
    OperationDefinition(operation) {
      const depth = depthOf(operation.selectionSet, 0, new Set());
      if (depth > MAX_DEPTH) {
        context.reportError(new GraphQLError(`Query is too deep (${depth} levels, max ${MAX_DEPTH}).`, { nodes: [operation] }));
      }
    },
  };
}

function aliasLimitRule(context) {
  let aliases = 0;
  return {
    Field(node) {
      if (node.alias && ++aliases === MAX_ALIASES + 1) {
        context.reportError(new GraphQLError(`Too many aliases in one request (max ${MAX_ALIASES}).`, { nodes: [node] }));
      }
    },
  };
}

/** GraphQL Yoga (Envelop) plugin that installs the rules above. */
export function useQueryProtection({ production }) {
  return {
    onValidate({ addValidationRule }) {
      addValidationRule(depthLimitRule);
      addValidationRule(aliasLimitRule);
      if (production) addValidationRule(NoSchemaIntrospectionCustomRule);

      if (!production) return undefined;
      return ({ result, setResult }) => {
        if (result.length === 0) return;
        setResult(
          result.map((error) =>
            /Did you mean/.test(error.message)
              ? new GraphQLError(error.message.replace(/\s*Did you mean .*$/, ""), { nodes: error.nodes })
              : error
          )
        );
      };
    },
  };
}
