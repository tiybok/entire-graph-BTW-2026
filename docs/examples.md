# GraphAudit examples

All examples audit committed `HEAD` against the specified base revision.

## Structural checks satisfied

```sh
entire graph audit --base HEAD~1 --test "go test ./..."
```

This result is possible only when every changed or directly affected Go symbol
has a direct resolved `CALLS` or `CONSTRUCTS` edge from a Go test symbol and the
command succeeds.

```text
Execution evidence
PASS
go test ./...

Verification gaps
0

Result
STRUCTURAL CHECKS SATISFIED
```

The result remains bounded: it does not establish runtime coverage, program
correctness, or safety.

## Green command with a structural gap

```sh
entire graph audit --base origin/main --test "go test ./..."
```

```text
Execution evidence
PASS
go test ./...

Verification gaps
1

1. Client.Refresh
   internal/client/client.go:84
   relationship: DIRECT_CHANGE
   evidence: REQUIRES_VERIFICATION
   reason: No structurally related Go test evidence was established.

Result
REVIEW REQUIRED
Tests passed, but unresolved structural verification obligations remain.
```

## Incomplete static evidence

When a parser, provider, or semantic-diff diagnostic affects an audited entity,
its evidence state becomes `HEURISTIC_OR_INCOMPLETE`, even if a structural test
edge exists. The result is `REVIEW REQUIRED`; inspect the reported source and
run appropriate behavior-level tests.

## Test command failure

```sh
entire graph audit --base HEAD~1 --test "go test ./..."
```

If the command exits non-zero, GraphAudit reports `BLOCKED`, the command, exit
status, duration, and a bounded output excerpt. It does not assert that the
current change caused the failure.

## Machine-readable result

```sh
entire graph audit --base HEAD~1 --test "go test ./..." --json
```

Use `result`, `summary`, `execution`, `audited_surface`, `verification_gaps`,
and ordered `recommendations` to build CI or agent integrations. The
recommendations provide safe next actions derived from observed evidence; do not
parse the human output.
