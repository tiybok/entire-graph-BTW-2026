# GraphAudit: Known Limitations & Technical Boundaries

> Historical note: this early note is retained for context. The current V1
> contract is [limitations](limitations.md), together with the
> [evidence model](evidence-model.md) and [audit policy](audit-policy.md).

GraphAudit intentionally operates within strict boundaries to ensure claims remain defensible.

---

## 1. Static Analysis & Lack of Runtime Coverage Claims

- **No Execution Tracing**: GraphAudit evaluates static call graph edges extracted from AST structures via Tree-Sitter. It has zero knowledge of runtime branch conditions, loop counts, or code paths.
- **Not Runtime Coverage**: A test calling a function does not guarantee that the specific modified lines, edge cases, or exception blocks within that function were executed at runtime.
- **No Correctness or Safety Conclusion**: `STRUCTURAL CHECKS SATISFIED` reports only the structural relationships and explicit command execution that GraphAudit evaluated. It must not be read as a conclusion about program correctness or absence of bugs.

---

## 2. Dynamic Dispatch, Interfaces, and Reflection

- **Go Interfaces**: In statically typed Go, calls dispatched through interfaces may not resolve to concrete struct methods when static assignment cannot be proven.
- **Reflection & Dynamic Calls**: Invocations utilizing `reflect`, string-based dispatch, or plugin architectures are invisible to static AST relationship extractors.
- **Runtime Registration**: HTTP route handlers or dependency injection containers registered at runtime without direct static call links will appear uncalled.

---

## 3. Scope of Absence of Edges

- **Absence of Evidence is Not Evidence of Absence**: When GraphAudit reports:
  > *"No structurally related Go test evidence was established."*
  This means strictly that no static link was detected in the AST. It does **not** mean that no test exercises this code (for example, black-box end-to-end integration tests, subprocess invocations, or shell scripts).

---

## 4. Go-Only V1 Structural Evidence Scope

- **Language Support**: V1 structural test detection is strictly limited to Go files matching the pattern `*_test.go`.
- **Other Languages**: Modifications to TypeScript, JavaScript, Python, Rust, or configuration files cannot establish structural test evidence in V1 and will immediately trigger `REVIEW REQUIRED`.

---

## 5. Explicit Test Command Limitations

- **No Command Auto-Inference**: GraphAudit does not guess which test command to run. The user or CI orchestrator must supply the command via `--test "<command>"`.
- **Subprocess Execution Scope**: The test command runs as a standard subprocess under the user's environment. GraphAudit inspects only the exit status code (0 for success, non-zero for failure). It does not parse framework-specific stdout/stderr test outputs for individual test pass/fail counts.
