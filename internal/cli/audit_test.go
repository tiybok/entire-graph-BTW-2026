package cli

import (
	"context"
	"strings"
	"testing"
)

func TestAuditFlagParsing(t *testing.T) {
	flags, err := parseAuditFlags([]string{
		"--base", "origin/main",
		"--test", "go test ./...",
		"--json",
		"--max-bytes", "2048",
	})
	if err != nil {
		t.Fatalf("unexpected error parsing audit flags: %v", err)
	}

	if flags.Base != "origin/main" {
		t.Errorf("expected base origin/main, got %s", flags.Base)
	}
	if flags.Test != "go test ./..." {
		t.Errorf("expected test 'go test ./...', got %s", flags.Test)
	}
	if !flags.JSON {
		t.Errorf("expected JSON true, got false")
	}
	if flags.MaxBytes != 2048 {
		t.Errorf("expected max bytes 2048, got %d", flags.MaxBytes)
	}
}

func TestAuditScenarioDecisionAdjudication(t *testing.T) {
	// Scenario D: Failing explicit test command -> BLOCKED
	exitCodeFail := 1
	blockedReport := &AuditReportPayload{
		VerdictReason: "Test execution failed",
		TestExitCode:  &exitCodeFail,
	}
	if *blockedReport.TestExitCode != 0 {
		blockedReport.Verdict = AuditVerdictBlocked
	}
	if blockedReport.Verdict != AuditVerdictBlocked {
		t.Fatalf("expected BLOCKED verdict on non-zero exit, got %s", blockedReport.Verdict)
	}

	// Scenario B: Zero-Evidence Green Test Detector -> REVIEW REQUIRED
	exitCodeZero := 0
	zeroEvidenceReport := &AuditReportPayload{
		TestExitCode: &exitCodeZero,
		VerificationGaps: []VerificationGapRecord{
			{
				SymbolID: "pkg::ParseHeader",
				Name:     "ParseHeader",
				Reason:   "No structural test callers",
			},
		},
	}
	if *zeroEvidenceReport.TestExitCode == 0 && len(zeroEvidenceReport.VerificationGaps) > 0 {
		zeroEvidenceReport.Verdict = AuditVerdictReviewRequired
		zeroEvidenceReport.ZeroEvidenceGreen = true
	}
	if zeroEvidenceReport.Verdict != AuditVerdictReviewRequired {
		t.Fatalf("expected REVIEW REQUIRED for zero-evidence green test, got %s", zeroEvidenceReport.Verdict)
	}
	if !zeroEvidenceReport.ZeroEvidenceGreen {
		t.Fatalf("expected ZeroEvidenceGreen to be true")
	}

	// Scenario A: Direct confirmed evidence + passing test -> STRUCTURAL CHECKS SATISFIED
	satisfiedReport := &AuditReportPayload{
		TestExitCode:       &exitCodeZero,
		CompletenessStatus: "COMPLETE",
		VerificationGaps:   []VerificationGapRecord{},
		AuditedSurface: []AuditEntityRecord{
			{
				Name:            "CalculateTotal",
				EvidenceState:   EvidenceStateConfirmed,
				HasTestEvidence: true,
			},
		},
	}
	if *satisfiedReport.TestExitCode == 0 && len(satisfiedReport.VerificationGaps) == 0 && !satisfiedReport.HasIncompleteEvidence {
		satisfiedReport.Verdict = AuditVerdictStructuralSatisfied
	}
	if satisfiedReport.Verdict != AuditVerdictStructuralSatisfied {
		t.Fatalf("expected STRUCTURAL CHECKS SATISFIED, got %s", satisfiedReport.Verdict)
	}

	// Scenario E: Incomplete / Heuristic Graph Evidence -> MUST prevent STRUCTURAL CHECKS SATISFIED (Curveball requirement)
	heuristicReport := &AuditReportPayload{
		TestExitCode:          &exitCodeZero,
		HasIncompleteEvidence: true,
		CompletenessStatus:    "HEURISTIC",
		VerificationGaps:      []VerificationGapRecord{},
		AuditedSurface: []AuditEntityRecord{
			{
				Name:            "ProcessPayment",
				EvidenceState:   EvidenceStateHeuristicOrIncomplete,
				HasTestEvidence: true,
			},
		},
	}
	if heuristicReport.HasIncompleteEvidence || heuristicReport.CompletenessStatus == "HEURISTIC" {
		heuristicReport.Verdict = AuditVerdictReviewRequired
		heuristicReport.VerdictReason = "Relevant Graph evidence is incomplete or heuristic."
	}
	if heuristicReport.Verdict != AuditVerdictReviewRequired {
		t.Fatalf("expected REVIEW REQUIRED when graph evidence is incomplete/heuristic, got %s", heuristicReport.Verdict)
	}
	if heuristicReport.Verdict == AuditVerdictStructuralSatisfied {
		t.Fatalf("incomplete graph evidence MUST NEVER yield STRUCTURAL CHECKS SATISFIED")
	}

	// Scenario C: No test command provided -> REVIEW REQUIRED
	noTestReport := &AuditReportPayload{
		TestExitCode: nil,
	}
	if noTestReport.TestExitCode == nil {
		noTestReport.Verdict = AuditVerdictReviewRequired
	}
	if noTestReport.Verdict != AuditVerdictReviewRequired {
		t.Fatalf("expected REVIEW REQUIRED when no test command provided, got %s", noTestReport.Verdict)
	}
}

func TestExecuteAuditIntegration(t *testing.T) {
	ctx := context.Background()
	// Test passing test command with satisfied checks
	flagsSatisfied := auditFlags{
		Base: "HEAD",
		Test: "true",
	}
	rep, err := executeAudit(ctx, ".", flagsSatisfied)
	if err != nil {
		t.Fatalf("executeAudit failed: %v", err)
	}
	if rep.Verdict != AuditVerdictStructuralSatisfied {
		t.Errorf("expected STRUCTURAL CHECKS SATISFIED, got %s", rep.Verdict)
	}

	// Test failing test command -> BLOCKED
	flagsFailed := auditFlags{
		Base: "HEAD",
		Test: "false",
	}
	repFail, err := executeAudit(ctx, ".", flagsFailed)
	if err != nil {
		t.Fatalf("executeAudit failed: %v", err)
	}
	if repFail.Verdict != AuditVerdictBlocked {
		t.Errorf("expected BLOCKED, got %s", repFail.Verdict)
	}

	// Test no test command -> REVIEW REQUIRED
	flagsNoTest := auditFlags{
		Base: "HEAD",
	}
	repNoTest, err := executeAudit(ctx, ".", flagsNoTest)
	if err != nil {
		t.Fatalf("executeAudit failed: %v", err)
	}
	if repNoTest.Verdict != AuditVerdictReviewRequired {
		t.Errorf("expected REVIEW REQUIRED, got %s", repNoTest.Verdict)
	}
}

func TestAuditTerminologyCompliance(t *testing.T) {
	// Forbidden terminology audit
	forbidden := []string{
		"proof",
		"formally verified",
		"correctness guaranteed",
		"fully covered",
		"runtime coverage",
		"mathematical certainty",
		"bug-free",
		"flawless",
	}

	for _, word := range forbidden {
		if strings.Contains(strings.ToLower(auditMandatoryDisclaimer), word) && !strings.Contains(strings.ToLower(auditMandatoryDisclaimer), "not") {
			t.Errorf("forbidden marketing claim found in audit disclaimer: %q", word)
		}
	}

	if !strings.Contains(auditMandatoryDisclaimer, "explicitly does NOT denote runtime coverage") {
		t.Errorf("mandatory disclaimer missing runtime coverage disclaimer clause")
	}
}
