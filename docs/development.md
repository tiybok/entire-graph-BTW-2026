# Developing GraphAudit

GraphAudit is implemented in `internal/cli/audit.go`. It orchestrates existing
Entire Graph primitives rather than adding another parser:

- `sem.AnalyzeGitRangeWithOptions` supplies semantic changes from `--base` to
  `HEAD`.
- `sem.BuildProviderSnapshotWithOptions` creates one full committed-tree
  snapshot with symbols, direct relations, warnings, and partial failures.
- `runVerifyShell` executes the caller-supplied test command and keeps its exit
  result separate from static evidence.

Keep the responsibilities distinct:

- analysis builds the Audited Structural Surface;
- evidence classification maps diagnostics and relation quality to an evidence
  state;
- policy selects the verdict deterministically;
- rendering serializes a completed report.

When extending V1, do not turn weak name matches, co-change, siblings, or
transitive edges into blocking evidence without a tested semantics and an
explicit policy change. Preserve the rule that an absent edge is not proof of
absence.

## Verification

The standard repository commands are declared in `mise.toml`:

```sh
mise run build
mise run test
mise run check
```

The audit unit tests cover direct test evidence, zero-evidence green execution,
failed execution, absent execution evidence, relevant diagnostics, direct
impact, JSON serialization, and bounded user-facing language.
