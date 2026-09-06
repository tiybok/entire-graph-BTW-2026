# GraphAudit audit policy

## Command

```sh
entire graph audit --base <ref> [--test "<command>"] [--json]
```

GraphAudit compares `<ref>` with the currently checked-out committed `HEAD`.
It does not claim to audit uncommitted changes. The core never infers a test
command: pass one explicitly when execution evidence is required.

## Verdict policy

| Verdict | Deterministic condition |
| --- | --- |
| `BLOCKED` | The explicit test command could not start or exited non-zero. The audit does not attribute the failure to the current change. |
| `REVIEW REQUIRED` | No test command was supplied, no audited entity was established, a relevant diagnostic makes evidence incomplete, or any verification gap remains. |
| `STRUCTURAL CHECKS SATISFIED` | A non-empty audited surface has confirmed direct Go structural-test evidence for every member and the explicit test command passed. |

`STRUCTURAL CHECKS SATISFIED` describes only the structural and execution
evidence evaluated by GraphAudit. It does not establish runtime coverage,
program correctness, or safety.

## Zero-Evidence Green Test Detector

A successful command is execution evidence only. If it succeeds while an
Audited Structural Surface member has no established structural test evidence,
GraphAudit returns `REVIEW REQUIRED` and sets
`zero_evidence_green_test_detected` in JSON.

This is intentional: green output cannot erase a structural verification gap.

## Process exit behavior

GraphAudit follows the existing CLI convention: a completed audit writes its
verdict and exits normally, including `REVIEW REQUIRED` and `BLOCKED`. Invalid
arguments or operational errors take the CLI’s existing non-zero error path.
Automation should read the JSON `result` field in V1 rather than infer policy
from the process status.

## JSON contract

`--json` emits schema version `1` with a stable top-level shape:

```json
{
  "schema_version": 1,
  "result": "REVIEW_REQUIRED",
  "summary": {
    "semantic_changes": 3,
    "audited_entities": 4,
    "verification_gaps": 2
  },
  "execution": {"status": "PASS"},
  "verification_gaps": []
}
```

Fields are additive within the schema version. Consumers should use evidence
states and `verification_gaps`, not just the top-level verdict, when deciding
how to present a result.
