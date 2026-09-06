package cli

import (
	"context"
	"encoding/json"
	"strings"
	"testing"

	"github.com/entireio/entire-graph/internal/sem"
)

func TestAuditFlagParsing(t *testing.T) {
	flags, err := parseAuditFlags([]string{
		"--base", "origin/main",
		"--test", "go test ./...",
		"--json",
		"--max-bytes", "2048",
	})
	if err != nil {
		t.Fatalf("parseAuditFlags: %v", err)
	}
	if flags.Base != "origin/main" || flags.Test != "go test ./..." || !flags.JSON || flags.MaxBytes != 2048 {
		t.Fatalf("unexpected flags: %+v", flags)
	}
	if _, err := parseAuditFlags([]string{"--max-bytes", "0"}); err == nil {
		t.Fatal("accepted a non-positive output limit")
	}
}

func TestAuditSatisfiedNeedsDirectStructuralEvidenceAndPassingExecution(t *testing.T) {
	diff, snapshot := auditFixture(true)
	report := buildAuditReport(auditFlags{Base: "main", Test: "go test ./..."}, diff, snapshot)
	passed := 0
	report.Execution = AuditExecutionEvidence{Command: "go test ./...", Status: "PASS", ExitCode: &passed}
	adjudicateAudit(report)

	if report.Verdict != AuditVerdictStructuralSatisfied {
		t.Fatalf("verdict = %q, want %q: %+v", report.Verdict, AuditVerdictStructuralSatisfied, report)
	}
	if got := report.Summary.VerificationGaps; got != 0 {
		t.Fatalf("verification gaps = %d, want 0", got)
	}
	if len(report.AuditedSurface) != 1 || !report.AuditedSurface[0].HasTestEvidence {
		t.Fatalf("direct structural test evidence was not retained: %+v", report.AuditedSurface)
	}
	if len(report.Recommendations) != 1 || report.Recommendations[0].Kind != "PRESERVE_EVIDENCE_BOUNDARY" {
		t.Fatalf("satisfied audit did not retain its evidence boundary: %+v", report.Recommendations)
	}
}

func TestAuditGreenExecutionDoesNotEraseStructuralGap(t *testing.T) {
	diff, snapshot := auditFixture(false)
	report := buildAuditReport(auditFlags{Base: "main", Test: "go test ./..."}, diff, snapshot)
	passed := 0
	report.Execution = AuditExecutionEvidence{Command: "go test ./...", Status: "PASS", ExitCode: &passed}
	adjudicateAudit(report)

	if report.Verdict != AuditVerdictReviewRequired {
		t.Fatalf("verdict = %q, want %q", report.Verdict, AuditVerdictReviewRequired)
	}
	if !report.ZeroEvidenceGreen {
		t.Fatal("passing execution with unresolved structural evidence did not trigger zero-evidence detection")
	}
	if len(report.VerificationGaps) != 1 || report.VerificationGaps[0].EvidenceState != EvidenceStateRequiresVerification {
		t.Fatalf("unexpected verification gaps: %+v", report.VerificationGaps)
	}
	if len(report.Recommendations) != 1 || report.Recommendations[0].Kind != "ESTABLISH_STRUCTURAL_TEST_EVIDENCE" {
		t.Fatalf("unexpected recommendations: %+v", report.Recommendations)
	}
	if strings.Contains(report.Recommendations[0].Message, "go test") {
		t.Fatalf("recommendation invented a test command: %+v", report.Recommendations[0])
	}
}

func TestAuditRejectsNameOnlyTestRelationship(t *testing.T) {
	diff, snapshot := auditFixture(false)
	snapshot.Relations = append(snapshot.Relations, sem.RelationRecord{
		FromID: "test", ToID: "changed", Type: "CALLS", Confidence: 1, Resolution: "name_only",
	})
	report := buildAuditReport(auditFlags{Base: "main"}, diff, snapshot)
	if report.AuditedSurface[0].HasTestEvidence {
		t.Fatalf("name-only relation was accepted as structural evidence: %+v", report.AuditedSurface[0])
	}
	if report.AuditedSurface[0].EvidenceState != EvidenceStateRequiresVerification {
		t.Fatalf("evidence state = %q, want %q", report.AuditedSurface[0].EvidenceState, EvidenceStateRequiresVerification)
	}
}

func TestAuditFailureBlocksWithoutAttributingTheFailure(t *testing.T) {
	diff, snapshot := auditFixture(true)
	report := buildAuditReport(auditFlags{Base: "main", Test: "go test ./..."}, diff, snapshot)
	failed := 1
	report.Execution = AuditExecutionEvidence{Command: "go test ./...", Status: "FAIL", ExitCode: &failed}
	adjudicateAudit(report)

	if report.Verdict != AuditVerdictBlocked {
		t.Fatalf("verdict = %q, want %q", report.Verdict, AuditVerdictBlocked)
	}
	if strings.Contains(strings.ToLower(report.VerdictReason), "caused") {
		t.Fatalf("audit over-attributed execution failure: %q", report.VerdictReason)
	}
	if len(report.Recommendations) != 1 || report.Recommendations[0].Kind != "INSPECT_TEST_EXECUTION" {
		t.Fatalf("failed execution did not provide the right next step: %+v", report.Recommendations)
	}
}

func TestRunAuditTestCapturesPassAndFailure(t *testing.T) {
	passed := runAuditTest(context.Background(), t.TempDir(), "printf pass")
	if passed.Status != "PASS" || passed.ExitCode == nil || *passed.ExitCode != 0 || passed.Output != "pass" {
		t.Fatalf("unexpected pass evidence: %+v", passed)
	}
	failed := runAuditTest(context.Background(), t.TempDir(), "printf failure; exit 3")
	if failed.Status != "FAIL" || failed.ExitCode == nil || *failed.ExitCode != 3 || failed.Output != "failure" {
		t.Fatalf("unexpected failure evidence: %+v", failed)
	}
}

func TestAuditRequiresExplicitExecutionEvidence(t *testing.T) {
	diff, snapshot := auditFixture(true)
	report := buildAuditReport(auditFlags{Base: "main"}, diff, snapshot)
	adjudicateAudit(report)
	if report.Verdict != AuditVerdictReviewRequired {
		t.Fatalf("verdict = %q, want %q", report.Verdict, AuditVerdictReviewRequired)
	}
	if report.Execution.Status != "NOT_RUN" {
		t.Fatalf("execution status = %q, want NOT_RUN", report.Execution.Status)
	}
	if len(report.Recommendations) != 1 || report.Recommendations[0].Kind != "RUN_EXPLICIT_TEST_COMMAND" {
		t.Fatalf("unexpected recommendations: %+v", report.Recommendations)
	}
	if !strings.Contains(report.Recommendations[0].Message, "does not infer") {
		t.Fatalf("recommendation did not explain the command boundary: %+v", report.Recommendations[0])
	}
}

func TestAuditRelevantDiagnosticsPreventSatisfiedVerdict(t *testing.T) {
	diff, snapshot := auditFixture(true)
	snapshot.Header.Warnings = []sem.ProviderWarning{{Code: "W_PARSE", FilePath: "service.go"}}
	report := buildAuditReport(auditFlags{Base: "main", Test: "go test ./..."}, diff, snapshot)
	passed := 0
	report.Execution = AuditExecutionEvidence{Command: "go test ./...", Status: "PASS", ExitCode: &passed}
	adjudicateAudit(report)

	if report.Verdict != AuditVerdictReviewRequired || !report.HasIncompleteEvidence {
		t.Fatalf("diagnostic did not require review: %+v", report)
	}
	if report.AuditedSurface[0].EvidenceState != EvidenceStateHeuristicOrIncomplete {
		t.Fatalf("evidence state = %q, want incomplete", report.AuditedSurface[0].EvidenceState)
	}
	if len(report.Diagnostics) != 1 || !strings.Contains(report.Diagnostics[0], "W_PARSE") {
		t.Fatalf("relevant diagnostic was not retained: %+v", report.Diagnostics)
	}
	if len(report.Recommendations) != 1 || report.Recommendations[0].Kind != "VERIFY_INCOMPLETE_EVIDENCE" {
		t.Fatalf("unexpected recommendations: %+v", report.Recommendations)
	}
}

func TestAuditUsesDirectImpactButNotFilenameInference(t *testing.T) {
	diff, snapshot := auditFixture(false)
	snapshot.Symbols = append(snapshot.Symbols, sem.SymbolRecord{
		ID: "caller", Name: "Caller", Kind: "function", FilePath: "caller.go", StartLine: 3, Language: "Go",
	})
	snapshot.Relations = append(snapshot.Relations, sem.RelationRecord{
		FromID: "caller", ToID: "changed", Type: "CALLS", Confidence: 1, Resolution: "exact",
		Evidence: []sem.Evidence{{FilePath: "caller.go", StartLine: 4}},
	})
	report := buildAuditReport(auditFlags{Base: "main"}, diff, snapshot)
	if len(report.AuditedSurface) != 2 {
		t.Fatalf("audited surface = %+v, want changed symbol and direct caller", report.AuditedSurface)
	}
	for _, entity := range report.AuditedSurface {
		if entity.HasTestEvidence {
			t.Fatalf("a *_test.go filename without a relation was treated as evidence: %+v", entity)
		}
	}
}

func TestAuditJSONContractIsStructuredAndDeterministic(t *testing.T) {
	diff, snapshot := auditFixture(false)
	report := buildAuditReport(auditFlags{Base: "main", Test: "go test ./..."}, diff, snapshot)
	passed := 0
	report.Execution = AuditExecutionEvidence{Command: "go test ./...", Status: "PASS", ExitCode: &passed}
	adjudicateAudit(report)
	encoded, err := json.Marshal(report)
	if err != nil {
		t.Fatalf("marshal report: %v", err)
	}
	var decoded struct {
		SchemaVersion int          `json:"schema_version"`
		Result        string       `json:"result"`
		Summary       AuditSummary `json:"summary"`
		Gaps          []struct {
			EvidenceState string `json:"evidence_state"`
		} `json:"verification_gaps"`
		Recommendations []AuditRecommendation `json:"recommendations"`
	}
	if err := json.Unmarshal(encoded, &decoded); err != nil {
		t.Fatalf("unmarshal report: %v", err)
	}
	if decoded.SchemaVersion != auditSchemaVersion || decoded.Result != "REVIEW_REQUIRED" || decoded.Summary.VerificationGaps != 1 || len(decoded.Gaps) != 1 || len(decoded.Recommendations) != 1 || decoded.Recommendations[0].Kind != "ESTABLISH_STRUCTURAL_TEST_EVIDENCE" {
		t.Fatalf("unexpected audit JSON: %s", encoded)
	}
}

func TestAuditTextUsesBoundedClaims(t *testing.T) {
	diff, snapshot := auditFixture(false)
	report := buildAuditReport(auditFlags{Base: "main", Test: "go test ./..."}, diff, snapshot)
	passed := 0
	report.Execution = AuditExecutionEvidence{Command: "go test ./...", Status: "PASS", ExitCode: &passed}
	adjudicateAudit(report)
	text := renderAuditText(report)
	if !strings.Contains(text, "No structurally related Go test evidence was established") {
		t.Fatalf("missing evidence-bounded explanation: %s", text)
	}
	if strings.Contains(text, "No test exists") {
		t.Fatalf("text made an absence claim: %s", text)
	}
	if !strings.Contains(text, "Recommended next steps") || !strings.Contains(text, "locate or add direct Go structural test evidence") {
		t.Fatalf("text did not render the actionable recommendation: %s", text)
	}
}

func auditFixture(withTestRelation bool) (sem.Result, sem.ProviderSnapshot) {
	diff := sem.Result{
		Files: []sem.FileChange{{
			Path:     "service.go",
			Language: "Go",
			Changes:  []sem.EntityChange{{Type: "body_changed", Kind: "function", Name: "Changed", AfterStartLine: 3}},
		}},
	}
	snapshot := sem.ProviderSnapshot{
		Symbols: []sem.SymbolRecord{
			{ID: "changed", Name: "Changed", Kind: "function", FilePath: "service.go", StartLine: 3, Language: "Go"},
			{ID: "test", Name: "TestChanged", Kind: "function", FilePath: "service_test.go", StartLine: 5, Language: "Go"},
		},
		Relations: []sem.RelationRecord{},
	}
	if withTestRelation {
		snapshot.Relations = append(snapshot.Relations, sem.RelationRecord{
			FromID: "test", ToID: "changed", Type: "CALLS", Confidence: 1, Resolution: "exact",
			Evidence: []sem.Evidence{{Kind: "call", FilePath: "service_test.go", StartLine: 6}},
		})
	}
	return diff, snapshot
}
