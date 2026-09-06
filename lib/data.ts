export interface SymbolNode {
  id: string;
  name: string;
  kind: "function" | "class" | "method" | "interface" | "type" | "variable" | "route";
  language: "typescript" | "go" | "python" | "csharp" | "rust" | "java";
  signature: string;
  path: string;
  startLine: number;
  endLine: number;
  container?: string;
  codeSnippet: string;
  docstring?: string;
}

export interface RelationEdge {
  id: string;
  fromId: string;
  toId: string;
  fromName: string;
  toName: string;
  relation: "CALLS" | "IMPORTS" | "EXTENDS" | "HANDLES_ROUTE" | "USES_TYPE" | "PARAM_TYPE" | "RETURNS_TYPE";
  confidence: "EXACT" | "HEURISTIC" | "UNRESOLVED";
  callsite: string;
}

export interface BenchmarkSystem {
  name: string;
  locomoScore: number;
  indexTokens: string;
  version: string;
  notes: string;
  isLeader?: boolean;
}

export interface EntityDiffItem {
  id: string;
  type: "SIGNATURE_CHANGED" | "BODY_CHANGED" | "ADDED" | "RENAMED" | "MOVED" | "REMOVED";
  kind: string;
  name: string;
  path: string;
  oldPath?: string;
  oldSignature?: string;
  newSignature?: string;
  dependentsCount: number;
  riskLevel: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  reconciliation?: string;
  explanation: string;
}

export const INITIAL_SYMBOLS: SymbolNode[] = [
  {
    id: "internal/sem/analyze.go::AnalyzeGitRangeWithOptions",
    name: "AnalyzeGitRangeWithOptions",
    kind: "function",
    language: "go",
    signature: "func AnalyzeGitRangeWithOptions(ctx context.Context, repo string, base, head string, opts AnalyzeOptions) (*Result, error)",
    path: "internal/sem/analyze.go",
    startLine: 42,
    endLine: 118,
    docstring: "AnalyzeGitRangeWithOptions executes entity-level semantic diffing between two Git commits or worktrees.",
    codeSnippet: `func AnalyzeGitRangeWithOptions(ctx context.Context, repo string, base, head string, opts AnalyzeOptions) (*Result, error) {
	snapBase, err := BuildCommittedSnapshot(ctx, repo, base, opts.Profile)
	if err != nil {
		return nil, fmt.Errorf("failed to build base snapshot: %w", err)
	}
	snapHead, err := BuildCommittedSnapshot(ctx, repo, head, opts.Profile)
	if err != nil {
		return nil, fmt.Errorf("failed to build head snapshot: %w", err)
	}
	changes := ReconcileEntityDeltas(snapBase, snapHead)
	return &Result{
		Base:          base,
		Head:          head,
		Files:         changes,
		SchemaVersion: SchemaVersionV1,
	}, nil
}`
  },
  {
    id: "internal/sem/search.go::SearchRepo",
    name: "SearchRepo",
    kind: "function",
    language: "go",
    signature: "func SearchRepo(ctx context.Context, repo string, query string, opts SearchOptions) (*SearchResults, error)",
    path: "internal/sem/search.go",
    startLine: 85,
    endLine: 154,
    docstring: "SearchRepo provides ranked source retrieval with byte budgeting and hybrid identifier/body match scoring.",
    codeSnippet: `func SearchRepo(ctx context.Context, repo string, query string, opts SearchOptions) (*SearchResults, error) {
	terms := TokenizeQuery(query)
	index, err := GetOrBuildCacheIndex(repo, opts.Profile)
	if err != nil {
		return nil, err
	}
	candidates := index.LookupCandidateSymbols(terms)
	ranked := RankWithGraphNeighborhood(candidates, terms, opts.TopK)
	return BudgetContextWindow(ranked, opts.MaxContextBytes), nil
}`
  },
  {
    id: "internal/cli/impact.go::ComputeImpact",
    name: "ComputeImpact",
    kind: "function",
    language: "go",
    signature: "func ComputeImpact(ctx context.Context, repo string, symbol string, opts ImpactOptions) (*ImpactReport, error)",
    path: "internal/cli/impact.go",
    startLine: 35,
    endLine: 95,
    docstring: "ComputeImpact calculates the full blast radius for a symbol including direct/transitive callers, type consumers, and co-changes.",
    codeSnippet: `func ComputeImpact(ctx context.Context, repo string, symbol string, opts ImpactOptions) (*ImpactReport, error) {
	sym, err := DisambiguateSymbol(repo, symbol, opts.File)
	if err != nil {
		return nil, err
	}
	callers := ResolveTransitiveCallers(sym, opts.Depth)
	types := ResolveTypeDependents(sym)
	coChanges := GitHistoryCoChanges(repo, sym.Path, 50)
	return &ImpactReport{
		Symbol:        sym,
		DirectCallers: callers.Direct,
		Transitive:    callers.Transitive,
		TypeConsumers: types,
		CoChanges:     coChanges,
		BlastRadius:   calculateRadiusScore(callers, types),
	}, nil
}`
  },
  {
    id: "internal/sem/dependents.go::CountDependents",
    name: "CountDependents",
    kind: "function",
    language: "go",
    signature: "func CountDependents(graph *Graph, entity *Entity) int",
    path: "internal/sem/dependents.go",
    startLine: 28,
    endLine: 65,
    docstring: "CountDependents calculates downstream callers and type dependencies to compute impact risk on code modification.",
    codeSnippet: `func CountDependents(graph *Graph, entity *Entity) int {
	visited := make(map[string]bool)
	queue := []string{entity.ID()}
	count := 0
	for len(queue) > 0 {
		curr := queue[0]
		queue = queue[1:]
		for _, incoming := range graph.IncomingEdges(curr) {
			if !visited[incoming.FromID] {
				visited[incoming.FromID] = true
				queue = append(queue, incoming.FromID)
				count++
			}
		}
	}
	return count
}`
  },
  {
    id: "internal/sem/call_scanners.go::ResolveCallSites",
    name: "ResolveCallSites",
    kind: "function",
    language: "go",
    signature: "func ResolveCallSites(ast *tree_sitter.Node, src []byte, scope *ScopeTable) []CallSite",
    path: "internal/sem/call_scanners.go",
    startLine: 50,
    endLine: 110,
    docstring: "ResolveCallSites traverses Tree-Sitter AST nodes to link identifier invocations to qualified symbol definitions.",
    codeSnippet: `func ResolveCallSites(ast *tree_sitter.Node, src []byte, scope *ScopeTable) []CallSite {
	var sites []CallSite
	WalkAST(ast, func(n *tree_sitter.Node) bool {
		if n.Type() == "call_expression" {
			target := ExtractCallTarget(n, src)
			resolved, confidence := scope.Lookup(target)
			sites = append(sites, CallSite{
				Target:     target,
				ResolvedTo: resolved,
				Confidence: confidence,
				Line:       n.StartPoint().Row + 1,
			})
		}
		return true
	})
	return sites
}`
  },
  {
    id: "src/auth/token_service.ts::TokenService",
    name: "TokenService",
    kind: "class",
    language: "typescript",
    signature: "class TokenService implements ITokenProvider",
    path: "src/auth/token_service.ts",
    startLine: 12,
    endLine: 68,
    docstring: "TokenService manages cryptographic JWT token issuance, verification, and revocation caching.",
    codeSnippet: `export class TokenService implements ITokenProvider {
  private readonly secretKey: string;
  private readonly tokenCache: Map<string, TokenMetadata>;

  constructor(secretKey: string) {
    this.secretKey = secretKey;
    this.tokenCache = new Map();
  }

  public async generateToken(userId: string, claims: Record<string, unknown>): Promise<string> {
    const payload = { sub: userId, ...claims, exp: Math.floor(Date.now() / 1000) + 3600 };
    return signJWT(payload, this.secretKey);
  }

  public verifyToken(token: string): TokenPayload {
    return verifyJWT(token, this.secretKey);
  }
}`
  },
  {
    id: "src/auth/token_service.ts::generateToken",
    name: "generateToken",
    kind: "method",
    language: "typescript",
    container: "TokenService",
    signature: "public async generateToken(userId: string, claims: Record<string, unknown>): Promise<string>",
    path: "src/auth/token_service.ts",
    startLine: 24,
    endLine: 35,
    codeSnippet: `public async generateToken(userId: string, claims: Record<string, unknown>): Promise<string> {
  const payload = { sub: userId, ...claims, exp: Math.floor(Date.now() / 1000) + 3600 };
  const token = await signJWT(payload, this.secretKey);
  this.tokenCache.set(token, { issuedAt: Date.now(), userId });
  return token;
}`
  },
  {
    id: "src/api/routes.ts::handleAuthRoute",
    name: "handleAuthRoute",
    kind: "route",
    language: "typescript",
    signature: "export async function handleAuthRoute(req: Request, res: Response): Promise<void>",
    path: "src/api/routes.ts",
    startLine: 45,
    endLine: 82,
    docstring: "HTTP Route handler for /api/auth/login validating user credentials and delegating to TokenService.",
    codeSnippet: `export async function handleAuthRoute(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body;
  const user = await UserRepository.findByEmail(email);
  if (!user || !await verifyPassword(password, user.passwordHash)) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }
  const token = await tokenService.generateToken(user.id, { role: user.role });
  res.status(200).json({ token, user: { id: user.id, email: user.email } });
}`
  },
  {
    id: "internal/sem/cache_key.go::ComputeCacheKey",
    name: "ComputeCacheKey",
    kind: "function",
    language: "go",
    signature: "func ComputeCacheKey(repoRoot, commitHash string, profile ProfileMode, ignoreRules []string) string",
    path: "internal/sem/cache_key.go",
    startLine: 18,
    endLine: 54,
    docstring: "Derives cryptographic cache key ensuring zero cache contamination across branches and security boundaries.",
    codeSnippet: `func ComputeCacheKey(repoRoot, commitHash string, profile ProfileMode, ignoreRules []string) string {
	h := sha256.New()
	h.Write([]byte(SchemaVersionV1))
	h.Write([]byte(commitHash))
	h.Write([]byte(profile))
	for _, rule := range ignoreRules {
		h.Write([]byte(rule))
	}
	return hex.EncodeToString(h.Sum(nil))
}`
  },
  {
    id: "pkg/parser/python.go::ParsePythonAST",
    name: "ParsePythonAST",
    kind: "function",
    language: "go",
    signature: "func ParsePythonAST(source []byte) (*PythonModule, error)",
    path: "pkg/parser/python.go",
    startLine: 30,
    endLine: 78,
    docstring: "Parses Python source into semantic symbol definitions, decorator bindings, and class inheritance trees.",
    codeSnippet: `func ParsePythonAST(source []byte) (*PythonModule, error) {
	parser := tree_sitter.NewParser()
	parser.SetLanguage(tree_sitter_python.GetLanguage())
	tree := parser.Parse(source)
	if tree.RootNode().HasError() {
		return RecoverFromParseErrors(tree, source)
	}
	return ExtractDefinitions(tree.RootNode(), source), nil
}`
  }
];

export const INITIAL_EDGES: RelationEdge[] = [
  {
    id: "e1",
    fromId: "src/api/routes.ts::handleAuthRoute",
    toId: "src/auth/token_service.ts::generateToken",
    fromName: "handleAuthRoute",
    toName: "generateToken",
    relation: "CALLS",
    confidence: "EXACT",
    callsite: "src/api/routes.ts:52"
  },
  {
    id: "e2",
    fromId: "src/api/routes.ts::handleAuthRoute",
    toId: "src/auth/token_service.ts::TokenService",
    fromName: "handleAuthRoute",
    toName: "TokenService",
    relation: "USES_TYPE",
    confidence: "EXACT",
    callsite: "src/api/routes.ts:46"
  },
  {
    id: "e3",
    fromId: "internal/cli/impact.go::ComputeImpact",
    toId: "internal/sem/dependents.go::CountDependents",
    fromName: "ComputeImpact",
    toName: "CountDependents",
    relation: "CALLS",
    confidence: "EXACT",
    callsite: "internal/cli/impact.go:64"
  },
  {
    id: "e4",
    fromId: "internal/sem/analyze.go::AnalyzeGitRangeWithOptions",
    toId: "internal/sem/cache_key.go::ComputeCacheKey",
    fromName: "AnalyzeGitRangeWithOptions",
    toName: "ComputeCacheKey",
    relation: "CALLS",
    confidence: "EXACT",
    callsite: "internal/sem/analyze.go:78"
  },
  {
    id: "e5",
    fromId: "internal/sem/analyze.go::AnalyzeGitRangeWithOptions",
    toId: "internal/sem/dependents.go::CountDependents",
    fromName: "AnalyzeGitRangeWithOptions",
    toName: "CountDependents",
    relation: "CALLS",
    confidence: "EXACT",
    callsite: "internal/sem/analyze.go:94"
  },
  {
    id: "e6",
    fromId: "internal/sem/search.go::SearchRepo",
    toId: "internal/sem/cache_key.go::ComputeCacheKey",
    fromName: "SearchRepo",
    toName: "ComputeCacheKey",
    relation: "CALLS",
    confidence: "EXACT",
    callsite: "internal/sem/search.go:102"
  },
  {
    id: "e7",
    fromId: "internal/sem/search.go::SearchRepo",
    toId: "internal/sem/call_scanners.go::ResolveCallSites",
    fromName: "SearchRepo",
    toName: "ResolveCallSites",
    relation: "CALLS",
    confidence: "EXACT",
    callsite: "internal/sem/search.go:121"
  }
];

export const BENCHMARKS_DATA: BenchmarkSystem[] = [
  {
    name: "entire-graph",
    locomoScore: 94.74,
    indexTokens: "0 (Local Tree-Sitter)",
    version: "#104 branch (pre-merge) / v0.4.0",
    notes: "Ranked 1st in 1,540 LoCoMo queries with strictly local AST analysis and zero egress.",
    isLeader: true
  },
  {
    name: "mem0",
    locomoScore: 93.83,
    indexTokens: "50.85M",
    version: "commit 4debc58",
    notes: "Requires 50+ million embedding and extraction tokens during index phase."
  },
  {
    name: "cognee",
    locomoScore: 92.86,
    indexTokens: "12.35M",
    version: "commit 38eece5",
    notes: "Graph pipeline relying on LLM-driven entity extraction."
  },
  {
    name: "bm25 (lexical)",
    locomoScore: 91.88,
    indexTokens: "0",
    version: "0.2.2",
    notes: "Standard BM25 baseline over raw file tokens."
  },
  {
    name: "codebase-memory-mcp",
    locomoScore: 91.30,
    indexTokens: "0",
    version: "v0.9.0 (patched)",
    notes: "Patched to emit Markdown sections."
  },
  {
    name: "graphify",
    locomoScore: 87.34,
    indexTokens: "0",
    version: "unpinned snapshot",
    notes: "AST graph extraction without relational scoring."
  },
  {
    name: "letta",
    locomoScore: 84.68,
    indexTokens: "Not projectable",
    version: "0.16.8",
    notes: "Multi-step memory synthesis architecture."
  },
  {
    name: "supermemory",
    locomoScore: 82.08,
    indexTokens: "Hosted API",
    version: "server-v0.0.7-rc.2",
    notes: "Retrieval capped at 100 items compared to 200 items in other arms."
  }
];

export const RECENT_DIFFS: EntityDiffItem[] = [
  {
    id: "diff-1",
    type: "SIGNATURE_CHANGED",
    kind: "function",
    name: "AnalyzeGitRangeWithOptions",
    path: "internal/sem/analyze.go",
    oldSignature: "func AnalyzeGitRange(repo, base, head string) (*Result, error)",
    newSignature: "func AnalyzeGitRangeWithOptions(ctx context.Context, repo string, base, head string, opts AnalyzeOptions) (*Result, error)",
    dependentsCount: 18,
    riskLevel: "HIGH",
    reconciliation: "RECONCILED_FROM",
    explanation: "Added context cancellation support and custom profiling options. High dependent footprint across CLI commands."
  },
  {
    id: "diff-2",
    type: "BODY_CHANGED",
    kind: "method",
    name: "generateToken",
    path: "src/auth/token_service.ts",
    dependentsCount: 9,
    riskLevel: "MEDIUM",
    explanation: "Added token cache revocation indexing and timestamped metadata."
  },
  {
    id: "diff-3",
    type: "ADDED",
    kind: "function",
    name: "ComputeImpact",
    path: "internal/cli/impact.go",
    newSignature: "func ComputeImpact(ctx context.Context, repo string, symbol string, opts ImpactOptions) (*ImpactReport, error)",
    dependentsCount: 4,
    riskLevel: "LOW",
    explanation: "New one-shot blast radius retrieval verb providing caller, type, and co-change analysis."
  },
  {
    id: "diff-4",
    type: "SIGNATURE_CHANGED",
    kind: "function",
    name: "ComputeCacheKey",
    path: "internal/sem/cache_key.go",
    oldSignature: "func ComputeCacheKey(commitHash string) string",
    newSignature: "func ComputeCacheKey(repoRoot, commitHash string, profile ProfileMode, ignoreRules []string) string",
    dependentsCount: 26,
    riskLevel: "CRITICAL",
    explanation: "Cache key calculation now binds worktree path and .graphignore rules to prevent cache leakage across repositories."
  }
];

export const MOCK_STATS = {
  totalQueries: 1420,
  graphCalls: 894,
  rawFileReadsPrevented: 3820,
  estimatedTokensSaved: "1,940,250",
  graphFirstRate: "88.4%",
  medianLookupTimeMs: 14.2,
  cacheHitRatio: "96.5%"
};

export type AuditVerdict = "BLOCKED" | "REVIEW REQUIRED" | "STRUCTURAL CHECKS SATISFIED";

export interface AuditedSurfaceEntity {
  symbolId: string;
  name: string;
  kind: string;
  path: string;
  line: number;
  relationshipToDiff: "DIRECT_MODIFICATION" | "TRANSITIVE_CALLER" | "TRANSITIVE_CALLEE" | "TYPE_CONSUMER";
  hasStructuralTestEvidence: boolean;
  testSymbolId?: string;
  testSymbolName?: string;
  testPath?: string;
}

export interface VerificationGap {
  symbolId: string;
  name: string;
  kind: string;
  path: string;
  line: number;
  gapReason: string;
  reason?: string;
  suggestedAction: string;
}

export interface AuditReport {
  id: string;
  scenarioKey: string;
  scenarioTitle: string;
  scenarioDescription: string;
  baseRef: string;
  headRef: string;
  testCommand?: string;
  testExitCode?: number;
  testExecutionTimeMs?: number;
  verdict: AuditVerdict;
  verdictReason: string;
  zeroEvidenceGreenDetected: boolean;
  auditedSurface: AuditedSurfaceEntity[];
  verificationGaps: VerificationGap[];
  completenessStatus: "COMPLETE" | "DEGRADED" | "WARNINGS";
  diagnostics: string[];
  disclaimer: string;
}

export const AUDIT_SCENARIOS: Record<string, AuditReport> = {
  zero_evidence_green: {
    id: "audit-scenario-b",
    scenarioKey: "zero_evidence_green",
    scenarioTitle: "Scenario B: Green Test Suite with Missing Structural Evidence (Zero-Evidence Detector)",
    scenarioDescription: "A modified Go AST function ParseHeader passes blanket 'go test ./...' (exit code 0), but no test in *_test.go has a static CALLS relation to ParseHeader.",
    baseRef: "origin/main",
    headRef: "HEAD",
    testCommand: "go test ./...",
    testExitCode: 0,
    testExecutionTimeMs: 1420,
    verdict: "REVIEW REQUIRED",
    verdictReason: "Zero-Evidence Green Test Detected: The test command succeeded (exit code 0), but 1 modified entity in the Audited Structural Surface has no structural Go test evidence.",
    zeroEvidenceGreenDetected: true,
    auditedSurface: [
      {
        symbolId: "internal/parser/header.go::ParseHeader",
        name: "ParseHeader",
        kind: "function",
        path: "internal/parser/header.go",
        line: 48,
        relationshipToDiff: "DIRECT_MODIFICATION",
        hasStructuralTestEvidence: false,
      },
      {
        symbolId: "internal/parser/header.go::HeaderOptions",
        name: "HeaderOptions",
        kind: "struct",
        path: "internal/parser/header.go",
        line: 22,
        relationshipToDiff: "TYPE_CONSUMER",
        hasStructuralTestEvidence: false,
      },
      {
        symbolId: "internal/parser/client.go::SendWithHeader",
        name: "SendWithHeader",
        kind: "method",
        path: "internal/parser/client.go",
        line: 114,
        relationshipToDiff: "TRANSITIVE_CALLER",
        hasStructuralTestEvidence: true,
        testSymbolId: "internal/parser/client_test.go::TestSendWithHeader",
        testSymbolName: "TestSendWithHeader",
        testPath: "internal/parser/client_test.go",
      }
    ],
    verificationGaps: [
      {
        symbolId: "internal/parser/header.go::ParseHeader",
        name: "ParseHeader",
        kind: "function",
        path: "internal/parser/header.go",
        line: 48,
        gapReason: "No structural Go test in *_test.go invokes or references ParseHeader directly.",
        suggestedAction: "Author a unit test TestParseHeader in internal/parser/header_test.go establishing a direct CALLS edge."
      }
    ],
    completenessStatus: "COMPLETE",
    diagnostics: [],
    disclaimer: "STRUCTURAL CHECKS SATISFIED explicitly does NOT denote runtime coverage, runtime safety, or semantic correctness. It confirms only that within the static call graph, structural test relationships and passing command execution were reconciled."
  },
  direct_evidence_passed: {
    id: "audit-scenario-a",
    scenarioKey: "direct_evidence_passed",
    scenarioTitle: "Scenario A: Direct Go Structural Test Evidence",
    scenarioDescription: "A modified Go function CalculateTotal in order.go is directly called by TestCalculateTotal in order_test.go. Explicit test execution passes.",
    baseRef: "origin/main",
    headRef: "HEAD",
    testCommand: "go test ./order",
    testExitCode: 0,
    testExecutionTimeMs: 820,
    verdict: "STRUCTURAL CHECKS SATISFIED",
    verdictReason: "All 2 entities in the Audited Structural Surface possess structural Go test evidence, graph analysis is complete with zero diagnostics, and explicit test command succeeded.",
    zeroEvidenceGreenDetected: false,
    auditedSurface: [
      {
        symbolId: "order/order.go::CalculateTotal",
        name: "CalculateTotal",
        kind: "function",
        path: "order/order.go",
        line: 64,
        relationshipToDiff: "DIRECT_MODIFICATION",
        hasStructuralTestEvidence: true,
        testSymbolId: "order/order_test.go::TestCalculateTotal",
        testSymbolName: "TestCalculateTotal",
        testPath: "order/order_test.go"
      },
      {
        symbolId: "order/order.go::OrderSummary",
        name: "OrderSummary",
        kind: "struct",
        path: "order/order.go",
        line: 18,
        relationshipToDiff: "TYPE_CONSUMER",
        hasStructuralTestEvidence: true,
        testSymbolId: "order/order_test.go::TestCalculateTotal",
        testSymbolName: "TestCalculateTotal",
        testPath: "order/order_test.go"
      }
    ],
    verificationGaps: [],
    completenessStatus: "COMPLETE",
    diagnostics: [],
    disclaimer: "STRUCTURAL CHECKS SATISFIED explicitly does NOT denote runtime coverage, runtime safety, or semantic correctness. It confirms only that within the static call graph, structural test relationships and passing command execution were reconciled."
  },
  no_test_command: {
    id: "audit-scenario-c",
    scenarioKey: "no_test_command",
    scenarioTitle: "Scenario C: No Explicit Test Command",
    scenarioDescription: "Go changes have structural test linkages in *_test.go, but no explicit test command was supplied via --test.",
    baseRef: "origin/main",
    headRef: "HEAD",
    testCommand: undefined,
    testExitCode: undefined,
    testExecutionTimeMs: undefined,
    verdict: "REVIEW REQUIRED",
    verdictReason: "Execution evidence required: No test command was supplied (--test \"<cmd>\"). Structural linkages exist, but command execution has not been verified.",
    zeroEvidenceGreenDetected: false,
    auditedSurface: [
      {
        symbolId: "order/order.go::CalculateTotal",
        name: "CalculateTotal",
        kind: "function",
        path: "order/order.go",
        line: 64,
        relationshipToDiff: "DIRECT_MODIFICATION",
        hasStructuralTestEvidence: true,
        testSymbolId: "order/order_test.go::TestCalculateTotal",
        testSymbolName: "TestCalculateTotal",
        testPath: "order/order_test.go"
      }
    ],
    verificationGaps: [],
    completenessStatus: "COMPLETE",
    diagnostics: [],
    disclaimer: "STRUCTURAL CHECKS SATISFIED explicitly does NOT denote runtime coverage, runtime safety, or semantic correctness. It confirms only that within the static call graph, structural test relationships and passing command execution were reconciled."
  },
  test_failed: {
    id: "audit-scenario-d",
    scenarioKey: "test_failed",
    scenarioTitle: "Scenario D: Failing Explicit Test Command",
    scenarioDescription: "Structural test evidence exists, but the user-supplied test command exited with code 1 (test assertion failure).",
    baseRef: "origin/main",
    headRef: "HEAD",
    testCommand: "go test ./order",
    testExitCode: 1,
    testExecutionTimeMs: 910,
    verdict: "BLOCKED",
    verdictReason: "Test execution failed: The supplied test command exited with status 1. Structural checks cannot pass while tests are failing.",
    zeroEvidenceGreenDetected: false,
    auditedSurface: [
      {
        symbolId: "order/order.go::CalculateTotal",
        name: "CalculateTotal",
        kind: "function",
        path: "order/order.go",
        line: 64,
        relationshipToDiff: "DIRECT_MODIFICATION",
        hasStructuralTestEvidence: true,
        testSymbolId: "order/order_test.go::TestCalculateTotal",
        testSymbolName: "TestCalculateTotal",
        testPath: "order/order_test.go"
      }
    ],
    verificationGaps: [],
    completenessStatus: "COMPLETE",
    diagnostics: [],
    disclaimer: "STRUCTURAL CHECKS SATISFIED explicitly does NOT denote runtime coverage, runtime safety, or semantic correctness. It confirms only that within the static call graph, structural test relationships and passing command execution were reconciled."
  },
  degraded_graph: {
    id: "audit-scenario-e",
    scenarioKey: "degraded_graph",
    scenarioTitle: "Scenario E: Degraded Graph / Parser Incompleteness",
    scenarioDescription: "A target file in the diff produced a Tree-Sitter syntax warning or partial failure during snapshot indexing.",
    baseRef: "origin/main",
    headRef: "HEAD",
    testCommand: "go test ./...",
    testExitCode: 0,
    testExecutionTimeMs: 1200,
    verdict: "REVIEW REQUIRED",
    verdictReason: "Graph analysis incomplete: Diagnostic warning W_SYNTAX_ERROR detected in internal/sem/parser.go. Evidence is degraded.",
    zeroEvidenceGreenDetected: false,
    auditedSurface: [
      {
        symbolId: "internal/sem/parser.go::ParseToken",
        name: "ParseToken",
        kind: "function",
        path: "internal/sem/parser.go",
        line: 12,
        relationshipToDiff: "DIRECT_MODIFICATION",
        hasStructuralTestEvidence: false
      }
    ],
    verificationGaps: [
      {
        symbolId: "internal/sem/parser.go::ParseToken",
        name: "ParseToken",
        kind: "function",
        path: "internal/sem/parser.go",
        line: 12,
        gapReason: "AST parsing encountered syntax error; cannot reliably extract outgoing or incoming structural edges.",
        suggestedAction: "Resolve syntax errors in internal/sem/parser.go before auditing."
      }
    ],
    completenessStatus: "DEGRADED",
    diagnostics: [
      "W_SYNTAX_ERROR: internal/sem/parser.go:12: unrecovered syntax token at line 14",
      "Partial failure: 1 of 8 symbols in scope unindexed"
    ],
    disclaimer: "STRUCTURAL CHECKS SATISFIED explicitly does NOT denote runtime coverage, runtime safety, or semantic correctness. It confirms only that within the static call graph, structural test relationships and passing command execution were reconciled."
  },
  non_go_changes: {
    id: "audit-scenario-g",
    scenarioKey: "non_go_changes",
    scenarioTitle: "Scenario G: Non-Go Unsupported Evidence",
    scenarioDescription: "The diff touches TypeScript or Python files outside V1 Go structural test detection.",
    baseRef: "origin/main",
    headRef: "HEAD",
    testCommand: "npm test",
    testExitCode: 0,
    testExecutionTimeMs: 2300,
    verdict: "REVIEW REQUIRED",
    verdictReason: "Unsupported language scope: V1 structural test detection is constrained strictly to Go (*_test.go). Changes to app/api/search/route.ts require human review.",
    zeroEvidenceGreenDetected: false,
    auditedSurface: [
      {
        symbolId: "app/api/search/route.ts::GET",
        name: "GET",
        kind: "function",
        path: "app/api/search/route.ts",
        line: 6,
        relationshipToDiff: "DIRECT_MODIFICATION",
        hasStructuralTestEvidence: false
      }
    ],
    verificationGaps: [
      {
        symbolId: "app/api/search/route.ts::GET",
        name: "GET",
        kind: "function",
        path: "app/api/search/route.ts",
        line: 6,
        gapReason: "Non-Go file; V1 cannot map structural relationships to test callers.",
        suggestedAction: "Manual peer review required for non-Go language boundaries."
      }
    ],
    completenessStatus: "COMPLETE",
    diagnostics: [
      "NOTICE: Structural test evidence is only evaluated for Go (*_test.go) in V1."
    ],
    disclaimer: "STRUCTURAL CHECKS SATISFIED explicitly does NOT denote runtime coverage, runtime safety, or semantic correctness. It confirms only that within the static call graph, structural test relationships and passing command execution were reconciled."
  }
};
