package cli

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/entireio/entire-graph/internal/sem"
	"github.com/entireio/entire-graph/internal/termsafe"
)

const (
	AuditVerdictBlocked             = "BLOCKED"
	AuditVerdictReviewRequired      = "REVIEW REQUIRED"
	AuditVerdictStructuralSatisfied = "STRUCTURAL CHECKS SATISFIED"

	EvidenceStateConfirmed             = "CONFIRMED"
	EvidenceStateHeuristicOrIncomplete = "HEURISTIC_OR_INCOMPLETE"
	EvidenceStateRequiresVerification  = "REQUIRES_VERIFICATION"

	defaultAuditMaxBytes     = 4096
	minimumAuditMaxBytes     = 512
	auditSchemaVersion       = 1
	auditMandatoryDisclaimer = "Structural Checks Satisfied describes only the structural and execution evidence evaluated by GraphAudit. It does not establish runtime coverage, program correctness, or safety."
)

type auditFlags struct {
	Base     string
	Test     string
	Repo     string
	JSON     bool
	MaxBytes int
}

// AuditTestEvidence is a direct, resolved relation from a Go test symbol to a
// production symbol. It is structural evidence, not evidence that a test ran.
type AuditTestEvidence struct {
	TestSymbolID   string         `json:"test_symbol_id"`
	TestSymbolName string         `json:"test_symbol_name"`
	TestPath       string         `json:"test_path"`
	TestLine       int            `json:"test_line"`
	Relationship   string         `json:"relationship"`
	Resolution     string         `json:"resolution"`
	Evidence       []sem.Evidence `json:"evidence,omitempty"`
}

// AuditEntityRecord is one member of the Audited Structural Surface. A blank
// SymbolID is intentional: it records a changed entity that could not be
// mapped into the current graph and therefore needs source verification.
type AuditEntityRecord struct {
	SymbolID               string              `json:"symbol_id,omitempty"`
	Name                   string              `json:"name"`
	Kind                   string              `json:"kind"`
	Path                   string              `json:"path"`
	Line                   int                 `json:"line,omitempty"`
	Language               string              `json:"language,omitempty"`
	ChangeType             string              `json:"change_type,omitempty"`
	Relationship           string              `json:"relationship"`
	RelatedSymbolID        string              `json:"related_symbol_id,omitempty"`
	EvidenceState          string              `json:"evidence_state"`
	EvidenceReason         string              `json:"evidence_reason"`
	StructuralEvidence     []sem.Evidence      `json:"structural_evidence,omitempty"`
	TestEvidence           []AuditTestEvidence `json:"test_evidence"`
	HasTestEvidence        bool                `json:"has_test_evidence"`
	TestSymbolID           string              `json:"test_symbol_id,omitempty"`
	TestSymbolName         string              `json:"test_symbol_name,omitempty"`
	TestPath               string              `json:"test_path,omitempty"`
	FallbackRecommendation string              `json:"fallback_recommendation,omitempty"`
}

type VerificationGapRecord struct {
	SymbolID           string         `json:"symbol_id,omitempty"`
	Name               string         `json:"name"`
	Kind               string         `json:"kind"`
	Path               string         `json:"path"`
	Line               int            `json:"line,omitempty"`
	ChangeReason       string         `json:"change_reason"`
	Relationship       string         `json:"relationship"`
	EvidenceState      string         `json:"evidence_state"`
	Reason             string         `json:"reason"`
	SupportingEvidence []sem.Evidence `json:"supporting_evidence,omitempty"`
	SuggestedAction    string         `json:"suggested_action"`
}

type AuditExecutionEvidence struct {
	Command     string `json:"command,omitempty"`
	Status      string `json:"status"`
	ExitCode    *int   `json:"exit_code,omitempty"`
	DurationMS  int64  `json:"duration_ms,omitempty"`
	Output      string `json:"output,omitempty"`
	LaunchError string `json:"launch_error,omitempty"`
}

type AuditSummary struct {
	SemanticChanges      int `json:"semantic_changes"`
	AuditedEntities      int `json:"audited_entities"`
	ConfirmedEvidence    int `json:"confirmed_evidence"`
	IncompleteEvidence   int `json:"incomplete_evidence"`
	RequiresVerification int `json:"requires_verification"`
	VerificationGaps     int `json:"verification_gaps"`
}

// AuditReportPayload is the stable machine-readable result for the V1 audit.
// Verdict remains for compatibility with the existing command; Result is the
// automation-oriented spelling introduced with schema version 1.
type AuditReportPayload struct {
	SchemaVersion         int                     `json:"schema_version"`
	Verdict               string                  `json:"verdict"`
	Result                string                  `json:"result"`
	VerdictReason         string                  `json:"verdict_reason"`
	ZeroEvidenceGreen     bool                    `json:"zero_evidence_green_detected"`
	HasIncompleteEvidence bool                    `json:"has_incomplete_evidence"`
	BaseRef               string                  `json:"base_ref"`
	HeadRef               string                  `json:"head_ref"`
	Summary               AuditSummary            `json:"summary"`
	Execution             AuditExecutionEvidence  `json:"execution"`
	TestCommand           string                  `json:"test_command,omitempty"`
	TestExitCode          *int                    `json:"test_exit_code,omitempty"`
	AuditedSurface        []AuditEntityRecord     `json:"audited_surface"`
	VerificationGaps      []VerificationGapRecord `json:"verification_gaps"`
	CompletenessStatus    string                  `json:"completeness_status"`
	Diagnostics           []string                `json:"diagnostics"`
	Limitations           []string                `json:"limitations"`
	Disclaimer            string                  `json:"disclaimer"`
}

func parseAuditFlags(args []string) (auditFlags, error) {
	flags := auditFlags{Base: "HEAD~1", MaxBytes: defaultAuditMaxBytes}
	for i := 0; i < len(args); i++ {
		arg := args[i]
		value := func() (string, error) {
			i++
			if i >= len(args) {
				return "", fmt.Errorf("%s requires a value", arg)
			}
			return args[i], nil
		}
		var err error
		switch arg {
		case "--base":
			flags.Base, err = value()
		case "--test":
			flags.Test, err = value()
		case "--repo":
			flags.Repo, err = value()
		case "--json":
			flags.JSON = true
		case "--max-bytes":
			var raw string
			raw, err = value()
			if err == nil {
				flags.MaxBytes, err = strconv.Atoi(raw)
				if err != nil || flags.MaxBytes < minimumAuditMaxBytes {
					return flags, fmt.Errorf("--max-bytes requires an integer of at least %d, got %q", minimumAuditMaxBytes, raw)
				}
			}
		default:
			return flags, fmt.Errorf("audit received unexpected argument %q", arg)
		}
		if err != nil {
			return flags, err
		}
	}
	return flags, nil
}

func runAudit(ctx context.Context, opts Options, args []string) error {
	flags, err := parseAuditFlags(args)
	if err != nil {
		return err
	}
	repo, err := resolveRepo(ctx, opts.Env, flags.Repo)
	if err != nil {
		return err
	}
	report, err := executeAuditWithVersion(ctx, repo, flags, opts.Version)
	if err != nil {
		return err
	}
	if flags.JSON {
		encoder := json.NewEncoder(termsafe.NewJSONWriter(opts.Stdout))
		encoder.SetEscapeHTML(false)
		return encoder.Encode(report)
	}
	_, err = io.WriteString(opts.Stdout, truncateAuditText(renderAuditText(report), flags.MaxBytes))
	return err
}

func executeAudit(ctx context.Context, repo string, flags auditFlags) (*AuditReportPayload, error) {
	return executeAuditWithVersion(ctx, repo, flags, "dev")
}

func executeAuditWithVersion(ctx context.Context, repo string, flags auditFlags, version string) (*AuditReportPayload, error) {
	// Audit compares a base ref with the currently checked-out HEAD. Build the
	// graph from the same committed state; mixing a HEAD diff with a dirty
	// worktree snapshot would invent evidence for a different program version.
	diff, err := sem.AnalyzeGitRangeWithOptions(ctx, repo, flags.Base, "HEAD", nil, sem.AnalyzeOptions{})
	if err != nil {
		return nil, err
	}
	snapshot, err := sem.BuildProviderSnapshotWithOptions(ctx, repo, version, sem.ProviderSnapshotOptions{
		NoNetwork: true,
		Profile:   sem.ProfileFull,
	})
	if err != nil {
		return nil, err
	}
	report := buildAuditReport(flags, diff, snapshot)
	if strings.TrimSpace(flags.Test) != "" {
		report.Execution = runAuditTest(ctx, repo, flags.Test)
		report.TestExitCode = report.Execution.ExitCode
	}
	adjudicateAudit(report)
	return report, nil
}

func buildAuditReport(flags auditFlags, diff sem.Result, snapshot sem.ProviderSnapshot) *AuditReportPayload {
	report := &AuditReportPayload{
		SchemaVersion:    auditSchemaVersion,
		BaseRef:          flags.Base,
		HeadRef:          "HEAD",
		TestCommand:      flags.Test,
		Execution:        AuditExecutionEvidence{Command: flags.Test, Status: "NOT_RUN"},
		AuditedSurface:   []AuditEntityRecord{},
		VerificationGaps: []VerificationGapRecord{},
		Diagnostics:      []string{},
		Limitations: []string{
			"GraphAudit V1 audits the checked-out HEAD against --base; it does not include uncommitted working-tree changes.",
			"Only direct, resolved CALLS and CONSTRUCTS edges from Go test symbols establish structural test evidence.",
			"A missing structural edge means no structural test evidence was established; it does not prove that no test exists.",
		},
		Disclaimer: auditMandatoryDisclaimer,
	}

	symbols := make(map[string]sem.SymbolRecord, len(snapshot.Symbols))
	byPathName := make(map[string][]sem.SymbolRecord, len(snapshot.Symbols))
	for _, symbol := range snapshot.Symbols {
		symbols[symbol.ID] = symbol
		key := auditPath(symbol.FilePath) + "\x00" + symbol.Name
		byPathName[key] = append(byPathName[key], symbol)
	}

	changedIDs := map[string]struct{}{}
	entities := map[string]AuditEntityRecord{}
	for _, file := range diff.Files {
		for _, change := range file.Changes {
			report.Summary.SemanticChanges++
			candidate, mapped := auditSymbolForChange(file, change, byPathName)
			if !mapped {
				entity := AuditEntityRecord{
					Name:           change.Name,
					Kind:           change.Kind,
					Path:           auditPath(file.Path),
					Line:           change.AfterStartLine,
					Language:       file.Language,
					ChangeType:     change.Type,
					Relationship:   "DIRECT_CHANGE",
					EvidenceState:  EvidenceStateRequiresVerification,
					EvidenceReason: "The semantic change could not be mapped to a symbol in the current HEAD graph.",
					TestEvidence:   []AuditTestEvidence{},
				}
				entities[auditUnmappedKey(entity)] = entity
				continue
			}
			changedIDs[candidate.ID] = struct{}{}
			entity := auditEntityFromSymbol(candidate, change.Type, "DIRECT_CHANGE", "", nil)
			entities[candidate.ID] = entity
		}
	}

	// The audited structural surface is intentionally high precision: changed
	// symbols plus direct, resolved CALLS/CONSTRUCTS neighbors. Co-change,
	// siblings, and weak or transitive relations are not verification blockers.
	for changedID := range changedIDs {
		for _, relation := range snapshot.Relations {
			if !auditStrongRelation(relation) {
				continue
			}
			var neighborID, relationship string
			switch {
			case relation.ToID == changedID:
				neighborID, relationship = relation.FromID, "DIRECT_CALLER_OF_CHANGED_SYMBOL"
			case relation.FromID == changedID:
				neighborID, relationship = relation.ToID, "DIRECT_CALLEE_OF_CHANGED_SYMBOL"
			default:
				continue
			}
			neighbor, ok := symbols[neighborID]
			if !ok || auditTestSymbol(neighbor) {
				continue
			}
			if _, directlyChanged := changedIDs[neighborID]; directlyChanged {
				continue
			}
			if _, alreadyPresent := entities[neighborID]; !alreadyPresent {
				entities[neighborID] = auditEntityFromSymbol(neighbor, "", relationship, changedID, relation.Evidence)
			}
		}
	}

	for _, entity := range entities {
		classifyAuditEntity(&entity, snapshot, diff.Warnings)
		if entity.SymbolID != "" {
			attachAuditTestEvidence(&entity, snapshot, symbols)
		}
		if entity.EvidenceState == EvidenceStateConfirmed && !entity.HasTestEvidence {
			entity.EvidenceState = EvidenceStateRequiresVerification
			entity.EvidenceReason = "No structurally related Go test evidence was established."
		}
		if entity.EvidenceState == EvidenceStateRequiresVerification && entity.FallbackRecommendation == "" {
			entity.FallbackRecommendation = "Inspect the reported source and run a targeted package or integration test supported by repository evidence."
		}
		if entity.EvidenceState == EvidenceStateHeuristicOrIncomplete {
			report.HasIncompleteEvidence = true
		}
		report.AuditedSurface = append(report.AuditedSurface, entity)
	}

	sort.Slice(report.AuditedSurface, func(i, j int) bool {
		left, right := report.AuditedSurface[i], report.AuditedSurface[j]
		if left.Path != right.Path {
			return left.Path < right.Path
		}
		if left.Line != right.Line {
			return left.Line < right.Line
		}
		return left.Name < right.Name
	})
	for _, entity := range report.AuditedSurface {
		switch entity.EvidenceState {
		case EvidenceStateConfirmed:
			report.Summary.ConfirmedEvidence++
		case EvidenceStateHeuristicOrIncomplete:
			report.Summary.IncompleteEvidence++
		default:
			report.Summary.RequiresVerification++
		}
		if entity.EvidenceState != EvidenceStateConfirmed || !entity.HasTestEvidence {
			report.VerificationGaps = append(report.VerificationGaps, auditGapForEntity(entity))
		}
	}
	report.Summary.AuditedEntities = len(report.AuditedSurface)
	report.Summary.VerificationGaps = len(report.VerificationGaps)
	appendAuditDiagnostics(report, snapshot, diff.Warnings)
	if report.HasIncompleteEvidence {
		report.CompletenessStatus = "INCOMPLETE"
	} else {
		report.CompletenessStatus = "COMPLETE"
	}
	return report
}

func appendAuditDiagnostics(report *AuditReportPayload, snapshot sem.ProviderSnapshot, diffWarnings []sem.ProviderWarning) {
	paths := make(map[string]struct{}, len(report.AuditedSurface))
	for _, entity := range report.AuditedSurface {
		paths[entity.Path] = struct{}{}
	}
	seen := map[string]struct{}{}
	appendDiagnostic := func(kind, code, path, detail string) {
		if path != "" {
			path = auditPath(path)
			if _, relevant := paths[path]; !relevant {
				return
			}
		}
		message := strings.TrimSpace(kind + " " + code)
		if path != "" {
			message += " at " + path
		}
		if detail != "" {
			message += ": " + detail
		}
		if _, alreadyPresent := seen[message]; alreadyPresent {
			return
		}
		seen[message] = struct{}{}
		report.Diagnostics = append(report.Diagnostics, message)
	}
	for _, warning := range snapshot.Header.Warnings {
		appendDiagnostic("provider warning", warning.Code, warning.FilePath, warning.EffectOnCompleteness)
	}
	for _, failure := range snapshot.Header.PartialFailures {
		appendDiagnostic("provider partial failure", failure.Code, failure.FilePath, failure.EffectOnCompleteness)
	}
	for _, warning := range diffWarnings {
		appendDiagnostic("semantic-diff warning", warning.Code, warning.FilePath, warning.EffectOnCompleteness)
	}
	sort.Strings(report.Diagnostics)
}

func auditSymbolForChange(file sem.FileChange, change sem.EntityChange, byPathName map[string][]sem.SymbolRecord) (sem.SymbolRecord, bool) {
	candidates := byPathName[auditPath(file.Path)+"\x00"+change.Name]
	if len(candidates) == 0 && change.NewName != "" {
		candidates = byPathName[auditPath(file.Path)+"\x00"+change.NewName]
	}
	if len(candidates) == 0 {
		return sem.SymbolRecord{}, false
	}
	best := candidates[0]
	for _, candidate := range candidates {
		if change.Kind != "" && candidate.Kind == change.Kind {
			best = candidate
			if candidate.StartLine == change.AfterStartLine {
				break
			}
		}
	}
	return best, true
}

func auditEntityFromSymbol(symbol sem.SymbolRecord, changeType, relationship, relatedSymbolID string, evidence []sem.Evidence) AuditEntityRecord {
	return AuditEntityRecord{
		SymbolID:           symbol.ID,
		Name:               symbol.Name,
		Kind:               symbol.Kind,
		Path:               auditPath(symbol.FilePath),
		Line:               symbol.StartLine,
		Language:           symbol.Language,
		ChangeType:         changeType,
		Relationship:       relationship,
		RelatedSymbolID:    relatedSymbolID,
		StructuralEvidence: append([]sem.Evidence(nil), evidence...),
		TestEvidence:       []AuditTestEvidence{},
	}
}

func classifyAuditEntity(entity *AuditEntityRecord, snapshot sem.ProviderSnapshot, diffWarnings []sem.ProviderWarning) {
	if entity.SymbolID == "" {
		entity.EvidenceState = EvidenceStateRequiresVerification
		return
	}
	if entity.Language != "Go" {
		entity.EvidenceState = EvidenceStateRequiresVerification
		entity.EvidenceReason = "GraphAudit V1 establishes structural test evidence only for Go production symbols."
		return
	}
	if auditRelevantDiagnostics(entity.Path, snapshot.Header.Warnings, snapshot.Header.PartialFailures, diffWarnings) {
		entity.EvidenceState = EvidenceStateHeuristicOrIncomplete
		entity.EvidenceReason = "Relevant parser, provider, or semantic-diff diagnostics make this structural evidence incomplete."
		return
	}
	entity.EvidenceState = EvidenceStateConfirmed
	entity.EvidenceReason = "Changed or directly related symbol was resolved in the current HEAD graph."
}

func auditRelevantDiagnostics(path string, warnings []sem.ProviderWarning, failures []sem.PartialFailure, diffWarnings []sem.ProviderWarning) bool {
	for _, diagnostic := range warnings {
		if diagnostic.FilePath == "" || auditPath(diagnostic.FilePath) == path {
			return true
		}
	}
	for _, failure := range failures {
		if failure.FilePath == "" || auditPath(failure.FilePath) == path {
			return true
		}
	}
	for _, warning := range diffWarnings {
		if warning.FilePath == "" || auditPath(warning.FilePath) == path {
			return true
		}
	}
	return false
}

func attachAuditTestEvidence(entity *AuditEntityRecord, snapshot sem.ProviderSnapshot, symbols map[string]sem.SymbolRecord) {
	for _, relation := range snapshot.Relations {
		if relation.ToID != entity.SymbolID || !auditStrongRelation(relation) {
			continue
		}
		testSymbol, ok := symbols[relation.FromID]
		if !ok || !auditTestSymbol(testSymbol) {
			continue
		}
		entity.TestEvidence = append(entity.TestEvidence, AuditTestEvidence{
			TestSymbolID:   testSymbol.ID,
			TestSymbolName: testSymbol.Name,
			TestPath:       auditPath(testSymbol.FilePath),
			TestLine:       testSymbol.StartLine,
			Relationship:   relation.Type,
			Resolution:     relation.Resolution,
			Evidence:       append([]sem.Evidence(nil), relation.Evidence...),
		})
	}
	sort.Slice(entity.TestEvidence, func(i, j int) bool {
		left, right := entity.TestEvidence[i], entity.TestEvidence[j]
		if left.TestPath != right.TestPath {
			return left.TestPath < right.TestPath
		}
		return left.TestLine < right.TestLine
	})
	entity.HasTestEvidence = len(entity.TestEvidence) > 0
	if entity.HasTestEvidence {
		first := entity.TestEvidence[0]
		entity.TestSymbolID, entity.TestSymbolName, entity.TestPath = first.TestSymbolID, first.TestSymbolName, first.TestPath
	}
}

func auditStrongRelation(relation sem.RelationRecord) bool {
	if relation.Type != "CALLS" && relation.Type != "CONSTRUCTS" {
		return false
	}
	if relation.Confidence <= 0 || len(relation.WarningCodes) != 0 {
		return false
	}
	switch relation.Resolution {
	case "exact", "package", "import_resolved":
		return true
	default:
		return false
	}
}

func auditTestSymbol(symbol sem.SymbolRecord) bool {
	return symbol.Language == "Go" && strings.HasSuffix(auditPath(symbol.FilePath), "_test.go")
}

func auditGapForEntity(entity AuditEntityRecord) VerificationGapRecord {
	reason := entity.EvidenceReason
	if !entity.HasTestEvidence && entity.EvidenceState == EvidenceStateConfirmed {
		reason = "No structurally related Go test evidence was established."
	}
	return VerificationGapRecord{
		SymbolID:           entity.SymbolID,
		Name:               entity.Name,
		Kind:               entity.Kind,
		Path:               entity.Path,
		Line:               entity.Line,
		ChangeReason:       entity.ChangeType,
		Relationship:       entity.Relationship,
		EvidenceState:      entity.EvidenceState,
		Reason:             reason,
		SupportingEvidence: append([]sem.Evidence(nil), entity.StructuralEvidence...),
		SuggestedAction:    entity.FallbackRecommendation,
	}
}

func runAuditTest(ctx context.Context, repo, command string) AuditExecutionEvidence {
	started := time.Now()
	output, code, err := runVerifyShell(ctx, repo, command)
	execution := AuditExecutionEvidence{
		Command:    command,
		ExitCode:   &code,
		DurationMS: time.Since(started).Milliseconds(),
		Output:     truncateAuditExecutionOutput(output),
	}
	if err != nil {
		execution.Status = "LAUNCH_ERROR"
		execution.LaunchError = err.Error()
		return execution
	}
	if code == 0 {
		execution.Status = "PASS"
	} else {
		execution.Status = "FAIL"
	}
	return execution
}

func adjudicateAudit(report *AuditReportPayload) {
	report.ZeroEvidenceGreen = report.Execution.Status == "PASS" && len(report.VerificationGaps) > 0
	switch {
	case report.Execution.Status == "LAUNCH_ERROR":
		report.Verdict = AuditVerdictBlocked
		report.VerdictReason = "The supplied test command could not be launched; no execution evidence was established."
	case report.Execution.Status == "FAIL":
		report.Verdict = AuditVerdictBlocked
		report.VerdictReason = "The supplied test command failed. GraphAudit does not attribute that failure to this change."
	case report.Execution.Status == "NOT_RUN":
		report.Verdict = AuditVerdictReviewRequired
		report.VerdictReason = "No explicit test command was supplied, so execution evidence is unavailable."
	case report.Summary.AuditedEntities == 0:
		report.Verdict = AuditVerdictReviewRequired
		report.VerdictReason = "No audited structural entities were established from the semantic range; inspect the change and source evidence directly."
	case report.HasIncompleteEvidence:
		report.Verdict = AuditVerdictReviewRequired
		report.VerdictReason = "Relevant structural evidence is incomplete or heuristic and requires source or execution verification."
	case len(report.VerificationGaps) > 0:
		report.Verdict = AuditVerdictReviewRequired
		report.VerdictReason = "Verification obligations remain unresolved despite the available execution evidence."
	default:
		report.Verdict = AuditVerdictStructuralSatisfied
		report.VerdictReason = "All audited entities have confirmed direct Go structural test evidence and the supplied test command passed."
	}
	report.Result = strings.ReplaceAll(report.Verdict, " ", "_")
}

func renderAuditText(report *AuditReportPayload) string {
	var output strings.Builder
	fmt.Fprintln(&output, "GraphAudit")
	fmt.Fprintln(&output, "Structural Verification Audit")
	fmt.Fprintf(&output, "\nRange\n%s → %s\n", termsafe.Line(report.BaseRef), termsafe.Line(report.HeadRef))
	fmt.Fprintf(&output, "\nSemantic changes\n%d symbols\n", report.Summary.SemanticChanges)
	fmt.Fprintf(&output, "\nAudited structural surface\n%d entities\n", report.Summary.AuditedEntities)
	fmt.Fprintf(&output, "\nStructural evidence\n%d confirmed · %d incomplete · %d requires verification\n",
		report.Summary.ConfirmedEvidence, report.Summary.IncompleteEvidence, report.Summary.RequiresVerification)
	if len(report.Diagnostics) > 0 {
		fmt.Fprintln(&output, "\nRelevant diagnostics")
		for _, diagnostic := range report.Diagnostics {
			fmt.Fprintf(&output, "- %s\n", termsafe.Line(diagnostic))
		}
	}
	fmt.Fprintf(&output, "\nExecution evidence\n%s\n", report.Execution.Status)
	if report.Execution.Command != "" {
		fmt.Fprintf(&output, "%s\n", termsafe.Line(report.Execution.Command))
	}
	if report.Execution.ExitCode != nil {
		fmt.Fprintf(&output, "exit status %d\n", *report.Execution.ExitCode)
	}
	if report.Execution.Output != "" && report.Execution.Status != "PASS" {
		fmt.Fprintf(&output, "%s\n", termsafe.Line(report.Execution.Output))
	}
	fmt.Fprintf(&output, "\nVerification gaps\n%d\n", len(report.VerificationGaps))
	for index, gap := range report.VerificationGaps {
		fmt.Fprintf(&output, "\n%d. %s\n   %s:%d\n   relationship: %s\n   evidence: %s\n   reason: %s\n   next: %s\n",
			index+1, termsafe.Line(gap.Name), termsafe.Line(gap.Path), gap.Line,
			gap.Relationship, gap.EvidenceState, termsafe.Line(gap.Reason), termsafe.Line(gap.SuggestedAction))
	}
	fmt.Fprintf(&output, "\nResult\n%s\n%s\n", report.Verdict, termsafe.Line(report.VerdictReason))
	if report.ZeroEvidenceGreen {
		fmt.Fprintln(&output, "Tests passed, but unresolved structural verification obligations remain.")
	}
	fmt.Fprintf(&output, "\n%s\n", auditMandatoryDisclaimer)
	return output.String()
}

func truncateAuditText(value string, maxBytes int) string {
	if maxBytes <= 0 || len(value) <= maxBytes {
		return value
	}
	marker := "\n… audit output truncated; use --json for complete structured evidence.\n"
	footerAt := strings.LastIndex(value, "\nResult\n")
	if footerAt < 0 {
		return value[:maxBytes-len(marker)] + marker
	}
	footer := value[footerAt:]
	if len(footer) >= maxBytes {
		return footer
	}
	headBudget := maxBytes - len(marker) - len(footer)
	if headBudget <= 0 {
		return footer
	}
	return value[:headBudget] + marker + footer
}

func truncateAuditExecutionOutput(value string) string {
	value = strings.TrimSpace(value)
	const maxBytes = 1024
	if len(value) <= maxBytes {
		return value
	}
	return value[:maxBytes] + "…"
}

func auditPath(path string) string {
	return filepath.ToSlash(filepath.Clean(path))
}

func auditUnmappedKey(entity AuditEntityRecord) string {
	return "unmapped\x00" + entity.Path + "\x00" + entity.Name + fmt.Sprintf("\x00%d", entity.Line)
}
