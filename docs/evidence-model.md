# GraphAudit evidence model

GraphAudit is an evidence-oriented control layer for a code change. It answers
what structural verification obligations remain; it does not decide whether a
change is correct, safe, or fully tested.

## Evidence sources

An audit combines four local sources:

1. **Semantic changes** from `--base` to the currently checked-out `HEAD`.
2. **Structural relationships** from one full provider snapshot of that same
   committed `HEAD`.
3. **Structural test evidence** from direct resolved relations originating in
   Go `*_test.go` symbols.
4. **Execution evidence** from an explicit `--test "<command>"` invocation.

The audit deliberately does not mix a committed-tree diff with an uncommitted
working-tree snapshot. Uncommitted changes are outside V1’s evidence boundary.

## Audited Structural Surface

The Audited Structural Surface is intentionally conservative:

- directly changed symbols that can be mapped into the current graph;
- changed entities that cannot be mapped, retained as source-verification
  obligations; and
- direct callers or callees reached through resolved `CALLS` or `CONSTRUCTS`
  edges.

Co-change, sibling, weak name-only, unresolved, and transitive relationships
do not create blocking verification gaps in V1. They may be useful context,
but they do not have the precision required for an audit obligation.

## Structural test evidence

A V1 structural test relationship is established only when all of these are
true:

- the source symbol is in a Go `*_test.go` file;
- the relation is a direct, resolved `CALLS` or `CONSTRUCTS` edge;
- the target is a member of the Audited Structural Surface; and
- the relation is not itself flagged with provider warning codes.

The result includes test-symbol and source-location provenance when available.
Static evidence does not show that the test was executed; an explicit test
command supplies that separate execution evidence.

## Evidence states

| State | Meaning | Effect |
| --- | --- | --- |
| `CONFIRMED` | The entity was mapped and its relevant static evidence is resolved with no relevant diagnostics. | Can contribute toward `STRUCTURAL CHECKS SATISFIED` only with structural test and passing execution evidence. |
| `HEURISTIC_OR_INCOMPLETE` | Relevant parser, provider, or semantic-diff diagnostics make the claim incomplete. | Creates a verification gap and prevents the strongest verdict. |
| `REQUIRES_VERIFICATION` | The entity cannot be mapped, is outside V1’s Go structural-test scope, or lacks established structural test evidence. | Creates a verification gap and requires source or execution follow-up. |

Absence of a qualifying edge means only: **no structurally related Go test
evidence was established.** It does not mean no test exists, no caller exists,
or that the code is untested.

## Provenance and follow-up

Every surface member and gap carries the available symbol, file, line,
relationship, evidence state, reason, and recommended action. This lets a
developer inspect the source that supports (or limits) the claim rather than
treating GraphAudit as an oracle.
