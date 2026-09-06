# GraphAudit limitations

GraphAudit is a local, deterministic structural-evidence tool. Its V1
boundaries are deliberate.

- It compares `--base` to committed `HEAD`; uncommitted worktree changes are
  not part of one audit.
- Structural test evidence is limited to Go `*_test.go` symbols with direct
  resolved `CALLS` or `CONSTRUCTS` edges.
- Reflection, dynamic dispatch, runtime dependency injection, generated code,
  interfaces, and unsupported language constructs can hide relationships from
  static analysis.
- A parser, provider, or diff diagnostic affecting an audited entity becomes
  incomplete evidence and prevents `STRUCTURAL CHECKS SATISFIED`.
- A missing static edge establishes neither that a test is absent nor that a
  symbol has no runtime callers.
- Test execution reports a command’s exit status, not framework-level coverage
  or behavior proof.
- Verdicts are process-success output in V1; CI integrations should inspect
  `--json` rather than use exit status to distinguish review from satisfied.

These limits are not hidden. Audit results carry evidence states, gaps,
provenance, limitations, and next actions so a developer can make the final
verification decision with the relevant context.
