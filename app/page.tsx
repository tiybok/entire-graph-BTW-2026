"use client";

import React, { useState, useEffect } from "react";
import {
  Search,
  Network,
  AlertTriangle,
  GitCompare,
  BarChart3,
  Terminal,
  FileCode,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  Zap,
  CheckCircle2,
  Copy,
  ExternalLink,
  Layers,
  Code2,
  Cpu,
  Info,
  XCircle,
} from "lucide-react";
import {
  INITIAL_SYMBOLS,
  BENCHMARKS_DATA,
  RECENT_DIFFS,
  MOCK_STATS,
  SymbolNode,
  AUDIT_SCENARIOS,
  AuditReport,
} from "@/lib/data";

type TabType = "search" | "neighbors" | "impact" | "diff" | "audit" | "benchmarks" | "cli";

export default function EntireGraphApp() {
  const [activeTab, setActiveTab] = useState<TabType>("search");

  // Search State
  const [searchQuery, setSearchQuery] = useState("token");
  const [selectedLanguage, setSelectedLanguage] = useState<string>("all");
  const [selectedKind, setSelectedKind] = useState<string>("all");
  const [searchProfile, setSearchProfile] = useState<"fast" | "full" | "syntax-only">("fast");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Neighbors State
  const [neighborSymbol, setNeighborSymbol] = useState("generateToken");
  const [neighborDirection, setNeighborDirection] = useState<"both" | "in" | "out">("both");
  const [neighborData, setNeighborData] = useState<any>(null);

  // Impact State
  const [impactSymbol, setImpactSymbol] = useState("AnalyzeGitRangeWithOptions");
  const [impactData, setImpactData] = useState<any>(null);

  // CLI Playground State
  const [cliCommand, setCliCommand] = useState("entire graph search --query 'token' --format text --top-k 5");
  const [cliOutput, setCliOutput] = useState("");

  // Diff Filter
  const [diffRiskFilter, setDiffRiskFilter] = useState("all");

  // Audit State (Track 2: Build with Graph Intelligence)
  const [selectedScenarioKey, setSelectedScenarioKey] = useState<string>("zero_evidence_green");
  const [auditBaseRef, setAuditBaseRef] = useState<string>("origin/main");
  const [auditTestCmd, setAuditTestCmd] = useState<string>("go test ./...");
  const [auditReport, setAuditReport] = useState<AuditReport>(AUDIT_SCENARIOS.zero_evidence_green);
  const [isAuditing, setIsAuditing] = useState(false);

  const runAuditAnalysis = async (scenario = selectedScenarioKey, base = auditBaseRef, test = auditTestCmd) => {
    setIsAuditing(true);
    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario, base, test }),
      });
      const data = await res.json();
      setAuditReport(data);
    } catch (e) {
      console.error("Audit query failed:", e);
    } finally {
      setIsAuditing(false);
    }
  };

  // Perform search
  const executeSearch = async (query: string, lang = selectedLanguage, kind = selectedKind) => {
    setIsSearching(true);
    try {
      const params = new URLSearchParams();
      if (query) params.append("query", query);
      if (lang && lang !== "all") params.append("language", lang);
      if (kind && kind !== "all") params.append("kind", kind);

      const res = await fetch(`/api/search?${params.toString()}`);
      const data = await res.json();
      setSearchResults(data.results || []);
    } catch (e) {
      console.error("Search failed:", e);
    } finally {
      setIsSearching(false);
    }
  };

  // Perform neighbor fetch
  const fetchNeighbors = async (sym: string, dir = neighborDirection) => {
    try {
      const res = await fetch(`/api/neighbors?symbol=${encodeURIComponent(sym)}&direction=${dir}`);
      const data = await res.json();
      setNeighborData(data);
    } catch (e) {
      console.error("Neighbors query failed:", e);
    }
  };

  // Perform impact fetch
  const fetchImpact = async (sym: string) => {
    try {
      const res = await fetch(`/api/impact?symbol=${encodeURIComponent(sym)}&depth=2`);
      const data = await res.json();
      setImpactData(data);
    } catch (e) {
      console.error("Impact query failed:", e);
    }
  };

  useEffect(() => {
    executeSearch(searchQuery);
    fetchNeighbors(neighborSymbol, neighborDirection);
    fetchImpact(impactSymbol);
  }, []);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRunCli = (cmd: string) => {
    setCliCommand(cmd);
    if (cmd.includes("search")) {
      setCliOutput(`[entire-graph 0.4.0] working-tree search (profile: fast, time: 14ms)
RANK 1 (score: 95)  src/auth/token_service.ts:24-35
  method generateToken(userId: string, claims: Record<string, unknown>): Promise<string>
  CONTAINER: TokenService
  VERIFY: npm test -- src/auth/token_service.test.ts

RANK 2 (score: 82)  src/api/routes.ts:45-82
  route handleAuthRoute(req: Request, res: Response): Promise<void>
  CALLS: TokenService#generateToken (exact)

RANK 3 (score: 48)  internal/sem/analyze.go:42-118
  func AnalyzeGitRangeWithOptions(ctx context.Context, repo string, ...) (*Result, error)`);
    } else if (cmd.includes("neighbors")) {
      setCliOutput(`[entire-graph 0.4.0] neighbors query for 'generateToken' (direction: both)
INCOMING CALLERS (1):
  <- src/api/routes.ts:52  handleAuthRoute (relation: CALLS, confidence: EXACT)
OUTGOING CALLEES (0):
  (no outgoing symbol calls)`);
    } else if (cmd.includes("impact")) {
      setCliOutput(`[entire-graph 0.4.0] blast-radius report for 'AnalyzeGitRangeWithOptions'
BLAST RADIUS: HIGH (dependent count: 18)
DIRECT CALLERS:
  <- internal/cli/impact.go:64  ComputeImpact
TYPE CONSUMERS:
  <- internal/cli/root.go:94  Execute
CO-CHANGING FILES (historical 30d):
  - internal/sem/analyze.go
  - internal/sem/analyze_test.go
  - internal/cli/root.go`);
    } else if (cmd.includes("audit")) {
      setCliOutput(`AUDIT VERDICT: REVIEW REQUIRED
Reason: Zero-Evidence Green Test Detected: The test command succeeded (exit code 0), but 1 entity in the Audited Structural Surface has no structural Go test evidence.

================================================================================
⚠ ZERO-EVIDENCE GREEN TEST DETECTED
The test suite passed with exit code 0, but affected AST entities lack
structural Go test callers. Do not accept this change as verified.
================================================================================

AUDITED STRUCTURAL SURFACE (3 entities):
  ✗ [UNVERIFIED] ParseHeader (internal/parser/header.go:48)
  ✗ [UNVERIFIED] HeaderOptions (internal/parser/header.go:22)
  ✓ [TESTED] SendWithHeader (internal/parser/client.go:114) <- TestSendWithHeader

VERIFICATION GAPS (1 gaps):
  - ParseHeader (internal/parser/header.go:48): No structural Go test in *_test.go invokes or references ParseHeader.
    Suggested action: Author a unit test TestParseHeader in internal/parser/header_test.go establishing a direct CALLS edge.

TEST EXECUTION:
  Command: go test ./...
  Exit status: 0

DISCLAIMER:
  STRUCTURAL CHECKS SATISFIED explicitly does NOT denote runtime coverage, runtime safety, or semantic correctness.`);
    } else {
      setCliOutput(`[entire-graph 0.4.0] command executed successfully.`);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-neutral-950 text-neutral-100 font-sans antialiased">
      {/* Top Application Bar */}
      <header className="border-b border-neutral-800 bg-neutral-900/70 backdrop-blur sticky top-0 z-30 px-4 lg:px-8 py-3">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold">
              <Network className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-semibold tracking-tight text-white text-base">Entire Graph</h1>
                <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-800 border border-neutral-700 text-neutral-300 font-mono">
                  v0.4.0
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> No-Egress Local AST
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Precomputed Code Graph & Blast-Radius Engine for Coding Agents
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
            <div className="px-2.5 py-1 rounded-md bg-neutral-800/80 border border-neutral-700/60 flex items-center gap-1.5 text-neutral-300 font-mono">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>LoCoMo <strong>94.74</strong> (#1)</span>
            </div>
            <div className="px-2.5 py-1 rounded-md bg-neutral-800/80 border border-neutral-700/60 flex items-center gap-1.5 text-neutral-300 font-mono">
              <Cpu className="w-3.5 h-3.5 text-blue-400" />
              <span>Index Tokens: <strong>0</strong></span>
            </div>
            <div className="px-2.5 py-1 rounded-md bg-neutral-800/80 border border-neutral-700/60 flex items-center gap-1.5 text-neutral-300 font-mono">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Tokens Saved: <strong>1.9M+</strong></span>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="border-b border-neutral-800/80 bg-neutral-900/40 px-4 lg:px-8">
        <div className="max-w-7xl mx-auto flex overflow-x-auto no-scrollbar gap-1 py-2 text-xs font-medium">
          <button
            id="tab-search"
            onClick={() => setActiveTab("search")}
            className={`px-3 py-2 rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === "search"
                ? "bg-neutral-800 text-white font-semibold shadow-sm border border-neutral-700"
                : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50"
            }`}
          >
            <Search className="w-3.5 h-3.5 text-emerald-400" />
            <span>Ranked Code Search</span>
          </button>

          <button
            id="tab-neighbors"
            onClick={() => setActiveTab("neighbors")}
            className={`px-3 py-2 rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === "neighbors"
                ? "bg-neutral-800 text-white font-semibold shadow-sm border border-neutral-700"
                : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50"
            }`}
          >
            <Network className="w-3.5 h-3.5 text-blue-400" />
            <span>Call Graph & Neighbors</span>
          </button>

          <button
            id="tab-impact"
            onClick={() => setActiveTab("impact")}
            className={`px-3 py-2 rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === "impact"
                ? "bg-neutral-800 text-white font-semibold shadow-sm border border-neutral-700"
                : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50"
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>Blast Radius (Impact)</span>
          </button>

          <button
            id="tab-diff"
            onClick={() => setActiveTab("diff")}
            className={`px-3 py-2 rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === "diff"
                ? "bg-neutral-800 text-white font-semibold shadow-sm border border-neutral-700"
                : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50"
            }`}
          >
            <GitCompare className="w-3.5 h-3.5 text-purple-400" />
            <span>Entity Diff & Dependents</span>
          </button>

          <button
            id="tab-audit"
            onClick={() => setActiveTab("audit")}
            className={`px-3 py-2 rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === "audit"
                ? "bg-neutral-800 text-white font-semibold shadow-sm border border-neutral-700"
                : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="flex items-center gap-1.5">
              <span>GraphAudit</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Track 2
              </span>
            </span>
          </button>

          <button
            id="tab-benchmarks"
            onClick={() => setActiveTab("benchmarks")}
            className={`px-3 py-2 rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === "benchmarks"
                ? "bg-neutral-800 text-white font-semibold shadow-sm border border-neutral-700"
                : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50"
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-rose-400" />
            <span>LoCoMo Benchmarks</span>
          </button>

          <button
            id="tab-cli"
            onClick={() => setActiveTab("cli")}
            className={`px-3 py-2 rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === "cli"
                ? "bg-neutral-800 text-white font-semibold shadow-sm border border-neutral-700"
                : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50"
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-cyan-400" />
            <span>Agent CLI Simulator</span>
          </button>
        </div>
      </nav>

      {/* Main View Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-8 space-y-6">
        {/* TAB 1: CODE SEARCH */}
        {activeTab === "search" && (
          <div className="space-y-6">
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex flex-col md:flex-row gap-3 items-center">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-neutral-400" />
                  <input
                    id="search-input"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && executeSearch(searchQuery)}
                    placeholder="Search in plain language (e.g. 'token generation', 'git diff reconcile', 'compute cache key')..."
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg pl-10 pr-4 py-2.5 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                  <select
                    id="search-lang-select"
                    value={selectedLanguage}
                    onChange={(e) => {
                      setSelectedLanguage(e.target.value);
                      executeSearch(searchQuery, e.target.value, selectedKind);
                    }}
                    className="bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="all">All Languages</option>
                    <option value="go">Go</option>
                    <option value="typescript">TypeScript</option>
                    <option value="python">Python</option>
                  </select>

                  <select
                    id="search-kind-select"
                    value={selectedKind}
                    onChange={(e) => {
                      setSelectedKind(e.target.value);
                      executeSearch(searchQuery, selectedLanguage, e.target.value);
                    }}
                    className="bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="all">All Kinds</option>
                    <option value="function">Function</option>
                    <option value="method">Method</option>
                    <option value="class">Class</option>
                    <option value="route">Route</option>
                  </select>

                  <button
                    id="search-execute-btn"
                    onClick={() => executeSearch(searchQuery)}
                    disabled={isSearching}
                    className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium px-4 py-2 rounded-lg text-xs flex items-center gap-2 transition-colors whitespace-nowrap cursor-pointer"
                  >
                    {isSearching ? "Searching..." : "Execute Search"}
                  </button>
                </div>
              </div>

              {/* Suggestions chips */}
              <div className="flex items-center gap-2 flex-wrap text-xs text-neutral-400">
                <span className="text-neutral-500">Quick queries:</span>
                {[
                  "token service",
                  "analyze git range",
                  "compute cache key",
                  "count dependents",
                  "call sites ast",
                ].map((chip) => (
                  <button
                    key={chip}
                    onClick={() => {
                      setSearchQuery(chip);
                      executeSearch(chip);
                    }}
                    className="px-2.5 py-1 bg-neutral-800/80 hover:bg-neutral-700/80 border border-neutral-700/60 rounded-full text-neutral-300 transition-colors"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>

            {/* Results section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-neutral-400 px-1">
                <span>
                  Found <strong>{searchResults.length}</strong> ranked symbols for "{searchQuery}"
                </span>
                <span className="font-mono text-neutral-500">
                  Profile: {searchProfile} • Budget: unbounded
                </span>
              </div>

              <div className="space-y-3">
                {searchResults.map((sym, idx) => (
                  <div
                    key={sym.id}
                    className="bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded-xl p-4 transition-all space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-800/70 pb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/50">
                          #{idx + 1}
                        </span>
                        <h3 className="font-mono font-semibold text-white text-sm">{sym.name}</h3>
                        <span className="text-xs px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700">
                          {sym.kind}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded bg-neutral-800 text-neutral-400">
                          {sym.language}
                        </span>
                        {sym.container && (
                          <span className="text-xs text-neutral-400">
                            in <strong className="text-neutral-300">{sym.container}</strong>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs text-neutral-400 font-mono">
                          Score: {sym.score}
                        </span>
                        <button
                          onClick={() => handleCopy(`${sym.path}:${sym.startLine}`, sym.id)}
                          className="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded text-xs flex items-center gap-1 font-mono transition-colors"
                          title="Copy file:line locator"
                        >
                          {copiedId === sym.id ? (
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                          <span>{sym.path}:{sym.startLine}</span>
                        </button>
                      </div>
                    </div>

                    {sym.docstring && (
                      <p className="text-xs text-neutral-300 italic bg-neutral-950/50 p-2.5 rounded border border-neutral-800/50">
                        {sym.docstring}
                      </p>
                    )}

                    <div className="bg-neutral-950 rounded-lg p-3 border border-neutral-800 font-mono text-xs overflow-x-auto text-neutral-300 leading-relaxed">
                      <div className="text-neutral-500 mb-1 select-none">
                        // {sym.path} lines {sym.startLine}-{sym.endLine}
                      </div>
                      <pre>
                        <code>{sym.codeSnippet}</code>
                      </pre>
                    </div>

                    <div className="flex items-center justify-between pt-1 text-xs">
                      <span className="text-neutral-500 text-[11px]">
                        Match: {sym.matchReason}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setNeighborSymbol(sym.name);
                            fetchNeighbors(sym.name);
                            setActiveTab("neighbors");
                          }}
                          className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-blue-400 rounded text-xs flex items-center gap-1 transition-colors"
                        >
                          <Network className="w-3 h-3" />
                          <span>Check Callers</span>
                        </button>
                        <button
                          onClick={() => {
                            setImpactSymbol(sym.name);
                            fetchImpact(sym.name);
                            setActiveTab("impact");
                          }}
                          className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-amber-400 rounded text-xs flex items-center gap-1 transition-colors"
                        >
                          <AlertTriangle className="w-3 h-3" />
                          <span>Blast Radius</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CALL GRAPH & NEIGHBORS */}
        {activeTab === "neighbors" && (
          <div className="space-y-6">
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row gap-3 items-center">
                <div className="relative flex-1 w-full">
                  <label className="block text-xs font-medium text-neutral-400 mb-1">
                    Target Symbol Name
                  </label>
                  <input
                    id="neighbor-symbol-input"
                    type="text"
                    value={neighborSymbol}
                    onChange={(e) => setNeighborSymbol(e.target.value)}
                    placeholder="e.g. generateToken, SearchRepo, CountDependents..."
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="w-full sm:w-auto">
                  <label className="block text-xs font-medium text-neutral-400 mb-1">
                    Direction
                  </label>
                  <select
                    id="neighbor-dir-select"
                    value={neighborDirection}
                    onChange={(e) => {
                      const d = e.target.value as any;
                      setNeighborDirection(d);
                      fetchNeighbors(neighborSymbol, d);
                    }}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-blue-500"
                  >
                    <option value="both">Both (Incoming & Outgoing)</option>
                    <option value="in">Incoming Only (Who calls this)</option>
                    <option value="out">Outgoing Only (What this calls)</option>
                  </select>
                </div>

                <div className="w-full sm:w-auto self-end">
                  <button
                    id="neighbor-query-btn"
                    onClick={() => fetchNeighbors(neighborSymbol)}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium px-4 py-2 rounded-lg text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    Query Graph Neighbors
                  </button>
                </div>
              </div>

              {/* Quick symbol shortcuts */}
              <div className="flex items-center gap-2 flex-wrap text-xs text-neutral-400">
                <span className="text-neutral-500">Test symbols:</span>
                {["generateToken", "AnalyzeGitRangeWithOptions", "SearchRepo", "CountDependents"].map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setNeighborSymbol(s);
                      fetchNeighbors(s);
                    }}
                    className="px-2.5 py-1 bg-neutral-800/80 hover:bg-neutral-700 rounded-full text-neutral-300 font-mono text-[11px]"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {neighborData?.symbol ? (
              <div className="space-y-6">
                {/* Target Symbol Card */}
                <div className="bg-neutral-900/90 border border-blue-900/40 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800/60 font-mono">
                        TARGET
                      </span>
                      <h3 className="font-mono font-bold text-white text-base">
                        {neighborData.symbol.name}
                      </h3>
                      <span className="text-xs text-neutral-400 font-mono">
                        ({neighborData.symbol.kind})
                      </span>
                    </div>
                    <p className="text-xs font-mono text-neutral-400 mt-1">
                      {neighborData.symbol.path}:{neighborData.symbol.startLine}-{neighborData.symbol.endLine}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="px-3 py-1 rounded bg-neutral-800 text-neutral-300 font-mono">
                      Incoming Callers: <strong>{neighborData.totalIncoming}</strong>
                    </span>
                    <span className="px-3 py-1 rounded bg-neutral-800 text-neutral-300 font-mono">
                      Outgoing Callees: <strong>{neighborData.totalOutgoing}</strong>
                    </span>
                  </div>
                </div>

                {/* Incoming vs Outgoing Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Incoming Callers */}
                  <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                      <h4 className="font-semibold text-sm text-neutral-200 flex items-center gap-2">
                        <ArrowRight className="w-4 h-4 text-emerald-400 rotate-180" />
                        Incoming Callers ({neighborData.incoming.length})
                      </h4>
                      <span className="text-[11px] text-neutral-500">Who calls this symbol</span>
                    </div>

                    {neighborData.incoming.length === 0 ? (
                      <p className="text-xs text-neutral-500 py-4 text-center">
                        No direct incoming callers resolved in working index.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {neighborData.incoming.map((item: any) => (
                          <div
                            key={item.edgeId}
                            className="p-3 bg-neutral-950 rounded-lg border border-neutral-800 space-y-1.5 font-mono text-xs"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-emerald-400">{item.caller.name}</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300">
                                {item.relation}
                              </span>
                            </div>
                            <div className="text-neutral-400 text-[11px]">
                              Callsite: {item.callsite}
                            </div>
                            <div className="text-neutral-500 text-[10px]">
                              Confidence: {item.confidence}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Outgoing Callees */}
                  <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                      <h4 className="font-semibold text-sm text-neutral-200 flex items-center gap-2">
                        <ArrowRight className="w-4 h-4 text-blue-400" />
                        Outgoing Callees ({neighborData.outgoing.length})
                      </h4>
                      <span className="text-[11px] text-neutral-500">What this symbol calls</span>
                    </div>

                    {neighborData.outgoing.length === 0 ? (
                      <p className="text-xs text-neutral-500 py-4 text-center">
                        No outgoing calls to indexed internal symbols.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {neighborData.outgoing.map((item: any) => (
                          <div
                            key={item.edgeId}
                            className="p-3 bg-neutral-950 rounded-lg border border-neutral-800 space-y-1.5 font-mono text-xs"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-blue-400">{item.callee.name}</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300">
                                {item.relation}
                              </span>
                            </div>
                            <div className="text-neutral-400 text-[11px]">
                              Callsite: {item.callsite}
                            </div>
                            <div className="text-neutral-500 text-[10px]">
                              Confidence: {item.confidence}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-neutral-500 bg-neutral-900 border border-neutral-800 rounded-xl">
                Enter a symbol name to inspect caller/callee relations.
              </div>
            )}
          </div>
        )}

        {/* TAB 3: BLAST RADIUS / IMPACT */}
        {activeTab === "impact" && (
          <div className="space-y-6">
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row gap-3 items-center">
                <div className="relative flex-1 w-full">
                  <label className="block text-xs font-medium text-neutral-400 mb-1">
                    Symbol for Impact Analysis
                  </label>
                  <input
                    id="impact-symbol-input"
                    type="text"
                    value={impactSymbol}
                    onChange={(e) => setImpactSymbol(e.target.value)}
                    placeholder="e.g. AnalyzeGitRangeWithOptions, TokenService, CountDependents..."
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="w-full sm:w-auto self-end">
                  <button
                    id="impact-query-btn"
                    onClick={() => fetchImpact(impactSymbol)}
                    className="w-full bg-amber-600 hover:bg-amber-500 text-white font-medium px-4 py-2 rounded-lg text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    Calculate Blast Radius
                  </button>
                </div>
              </div>
            </div>

            {impactData?.symbol && (
              <div className="space-y-6">
                {/* Blast Radius Header */}
                <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h3 className="font-mono font-bold text-white text-base">
                        {impactData.symbol.name}
                      </h3>
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded font-bold font-mono ${
                          impactData.blastRadiusScore === "CRITICAL"
                            ? "bg-rose-950 text-rose-300 border border-rose-800"
                            : impactData.blastRadiusScore === "HIGH"
                            ? "bg-amber-950 text-amber-300 border border-amber-800"
                            : "bg-emerald-950 text-emerald-300 border border-emerald-800"
                        }`}
                      >
                        BLAST RADIUS: {impactData.blastRadiusScore}
                      </span>
                    </div>
                    <p className="text-xs font-mono text-neutral-400 mt-1">
                      {impactData.symbol.path}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 text-xs">
                    <div className="p-3 bg-neutral-950 rounded-lg border border-neutral-800 text-center min-w-[100px]">
                      <div className="text-lg font-bold text-neutral-100">
                        {impactData.totalImpactedEntities}
                      </div>
                      <div className="text-[11px] text-neutral-400">Total Dependents</div>
                    </div>
                  </div>
                </div>

                {/* 3-way Impact Details */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {/* Direct & Transitive Callers */}
                  <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 border-b border-neutral-800 pb-2 flex items-center justify-between">
                      <span>Callers (Direct + Hop 2)</span>
                      <span className="font-mono text-emerald-400">
                        {impactData.directCallers.length + impactData.transitiveCallers.length}
                      </span>
                    </h4>
                    <div className="space-y-2 text-xs font-mono">
                      {impactData.directCallers.map((c: any, i: number) => (
                        <div key={i} className="p-2 bg-neutral-950 rounded border border-neutral-800">
                          <span className="text-emerald-400 font-bold">{c.name}</span>
                          <div className="text-[11px] text-neutral-500">at {c.callsite}</div>
                        </div>
                      ))}
                      {impactData.transitiveCallers.map((c: any, i: number) => (
                        <div key={i} className="p-2 bg-neutral-950/60 rounded border border-neutral-800/60">
                          <span className="text-neutral-300 font-bold">{c.name}</span>
                          <span className="text-[10px] ml-1 text-neutral-500">(2 hops)</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Type Consumers */}
                  <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 border-b border-neutral-800 pb-2 flex items-center justify-between">
                      <span>Type Consumers</span>
                      <span className="font-mono text-purple-400">
                        {impactData.typeConsumers.length}
                      </span>
                    </h4>
                    <div className="space-y-2 text-xs font-mono">
                      {impactData.typeConsumers.length === 0 ? (
                        <p className="text-neutral-500 text-xs italic py-2">No type dependents</p>
                      ) : (
                        impactData.typeConsumers.map((t: any, i: number) => (
                          <div key={i} className="p-2 bg-neutral-950 rounded border border-neutral-800">
                            <span className="text-purple-400 font-bold">{t.name}</span>
                            <div className="text-[11px] text-neutral-500">{t.relation}</div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Co-Changing Files */}
                  <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 border-b border-neutral-800 pb-2 flex items-center justify-between">
                      <span>Co-Change History (Git)</span>
                      <span className="font-mono text-amber-400">
                        {impactData.coChangingFiles.length}
                      </span>
                    </h4>
                    <div className="space-y-2 text-xs font-mono">
                      {impactData.coChangingFiles.map((f: any, i: number) => (
                        <div key={i} className="p-2 bg-neutral-950 rounded border border-neutral-800 flex items-center justify-between">
                          <span className="text-neutral-300 truncate max-w-[180px]">{f.path}</span>
                          <span className="text-[10px] text-neutral-500">{f.coChangeCount} commits</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: ENTITY DIFF & DEPENDENTS */}
        {activeTab === "diff" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-neutral-900 border border-neutral-800 rounded-xl p-4">
              <div>
                <h3 className="font-semibold text-sm text-neutral-200">
                  Semantic Entity Diffs (Commit HEAD vs Base)
                </h3>
                <p className="text-xs text-neutral-400">
                  Calculates downstream dependents for each modified signature to detect high-risk breaking edits.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-neutral-400">Filter Risk:</span>
                <select
                  id="diff-risk-select"
                  value={diffRiskFilter}
                  onChange={(e) => setDiffRiskFilter(e.target.value)}
                  className="bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1 text-neutral-200"
                >
                  <option value="all">All Risks</option>
                  <option value="critical">Critical Only</option>
                  <option value="high">High Only</option>
                </select>
              </div>
            </div>

            <div className="space-y-3">
              {RECENT_DIFFS.filter(
                (d) => diffRiskFilter === "all" || d.riskLevel.toLowerCase() === diffRiskFilter
              ).map((diff) => (
                <div
                  key={diff.id}
                  className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-800/80 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs px-2 py-0.5 rounded font-mono font-semibold ${
                          diff.riskLevel === "CRITICAL"
                            ? "bg-rose-950 text-rose-300 border border-rose-800"
                            : diff.riskLevel === "HIGH"
                            ? "bg-amber-950 text-amber-300 border border-amber-800"
                            : "bg-neutral-800 text-neutral-300"
                        }`}
                      >
                        {diff.riskLevel} RISK
                      </span>
                      <span className="font-mono font-bold text-white text-sm">{diff.name}</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-neutral-800 text-neutral-400">
                        {diff.type}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs font-mono">
                      <span className="text-neutral-400">
                        Dependents: <strong className="text-neutral-200">{diff.dependentsCount}</strong>
                      </span>
                      <span className="text-neutral-500">{diff.path}</span>
                    </div>
                  </div>

                  <p className="text-xs text-neutral-300">{diff.explanation}</p>

                  {(diff.oldSignature || diff.newSignature) && (
                    <div className="bg-neutral-950 rounded-lg p-3 border border-neutral-800 font-mono text-xs space-y-1">
                      {diff.oldSignature && (
                        <div className="text-rose-400 flex items-start gap-2">
                          <span className="select-none text-rose-600">-</span>
                          <code>{diff.oldSignature}</code>
                        </div>
                      )}
                      {diff.newSignature && (
                        <div className="text-emerald-400 flex items-start gap-2">
                          <span className="select-none text-emerald-600">+</span>
                          <code>{diff.newSignature}</code>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB: GRAPHAUDIT (TRACK 2: BUILD WITH GRAPH INTELLIGENCE) */}
        {activeTab === "audit" && (
          <div className="space-y-6">
            {/* Header / Intro Card */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono font-semibold border border-amber-500/30 uppercase tracking-wide">
                      Track 2: Build with Graph Intelligence
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400 font-mono">
                      Pre-Merge Decision Engine
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-white mt-2">
                    GraphAudit: Structural Verification Audit
                  </h2>
                  <p className="text-xs text-neutral-400 mt-1 max-w-3xl leading-relaxed">
                    Reconciles AST modifications against structural test evidence in <code className="text-emerald-400">*_test.go</code> and explicit test execution.
                    Prevents premature merges by catching passing tests that fail to execute modified code.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-right hidden sm:block">
                    <div className="text-xs text-neutral-400 font-mono">Status Contract</div>
                    <div className="text-xs text-emerald-400 font-semibold">Strict Terminology Enforced</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                </div>
              </div>

              {/* Scenario Preset Selector */}
              <div className="pt-2 border-t border-neutral-800/80 space-y-2">
                <div className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                  <FileCode className="w-3.5 h-3.5 text-blue-400" />
                  <span>Acceptance Test Scenarios (from docs/TEST_PLAN.md):</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
                  {Object.entries(AUDIT_SCENARIOS).map(([key, s]) => (
                    <button
                      key={key}
                      id={`scenario-${key}`}
                      onClick={() => {
                        setSelectedScenarioKey(key);
                        setAuditBaseRef(s.baseRef);
                        setAuditTestCmd(s.testCommand || "");
                        runAuditAnalysis(key, s.baseRef, s.testCommand);
                      }}
                      className={`p-2.5 rounded-lg border text-left transition-all flex flex-col justify-between gap-1.5 ${
                        selectedScenarioKey === key
                          ? "bg-neutral-800 border-emerald-500/60 shadow-sm"
                          : "bg-neutral-950/60 border-neutral-800 hover:border-neutral-700 text-neutral-400"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-neutral-200 truncate">{s.scenarioTitle.split(":")[0]}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold uppercase ${
                            s.verdict === "STRUCTURAL CHECKS SATISFIED"
                              ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                              : s.verdict === "BLOCKED"
                              ? "bg-rose-950 text-rose-300 border border-rose-800"
                              : "bg-amber-950 text-amber-300 border border-amber-800"
                          }`}
                        >
                          {s.verdict === "STRUCTURAL CHECKS SATISFIED" ? "Satisfied" : s.verdict}
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-400 line-clamp-2 leading-tight">
                        {s.scenarioDescription}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Interactive Audit Input Form */}
              <div className="pt-3 border-t border-neutral-800/80 flex flex-col sm:flex-row gap-3">
                <div className="flex-1 space-y-1">
                  <label className="text-xs text-neutral-400 font-mono">Base Git Ref (--base):</label>
                  <input
                    id="input-audit-base"
                    type="text"
                    value={auditBaseRef}
                    onChange={(e) => setAuditBaseRef(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-xs font-mono text-neutral-100 focus:outline-none focus:border-emerald-500"
                    placeholder="origin/main or HEAD~1"
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <label className="text-xs text-neutral-400 font-mono">Test Command (--test):</label>
                  <input
                    id="input-audit-test"
                    type="text"
                    value={auditTestCmd}
                    onChange={(e) => setAuditTestCmd(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-xs font-mono text-neutral-100 focus:outline-none focus:border-emerald-500"
                    placeholder="e.g. go test ./..."
                  />
                </div>
                <div className="flex items-end">
                  <button
                    id="btn-run-audit"
                    onClick={() => runAuditAnalysis(selectedScenarioKey, auditBaseRef, auditTestCmd)}
                    disabled={isAuditing}
                    className="w-full sm:w-auto px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 whitespace-nowrap shadow-sm disabled:opacity-50"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>{isAuditing ? "Auditing Graph..." : "Execute Audit"}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* AUDIT RESULTS SECTION */}
            {auditReport && (
              <div className="space-y-6">
                {/* VERDICT HERO CARD */}
                <div
                  className={`border rounded-xl p-6 relative overflow-hidden transition-all ${
                    auditReport.verdict === "STRUCTURAL CHECKS SATISFIED"
                      ? "bg-emerald-950/20 border-emerald-500/40"
                      : auditReport.verdict === "BLOCKED"
                      ? "bg-rose-950/20 border-rose-500/40"
                      : "bg-amber-950/20 border-amber-500/40"
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs font-mono text-neutral-400">
                        <span>AUDIT DECISION VERDICT:</span>
                        <span className="text-neutral-500">•</span>
                        <span>{auditReport.baseRef} ➔ {auditReport.headRef}</span>
                      </div>

                      <div className="flex items-center gap-3">
                        {auditReport.verdict === "STRUCTURAL CHECKS SATISFIED" ? (
                          <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
                            <CheckCircle2 className="w-7 h-7" />
                          </div>
                        ) : auditReport.verdict === "BLOCKED" ? (
                          <div className="p-2 rounded-lg bg-rose-500/20 text-rose-400">
                            <XCircle className="w-7 h-7" />
                          </div>
                        ) : (
                          <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400">
                            <ShieldAlert className="w-7 h-7" />
                          </div>
                        )}

                        <div>
                          <div
                            className={`text-2xl font-black tracking-tight font-mono ${
                              auditReport.verdict === "STRUCTURAL CHECKS SATISFIED"
                                ? "text-emerald-400"
                                : auditReport.verdict === "BLOCKED"
                                ? "text-rose-400"
                                : "text-amber-400"
                            }`}
                          >
                            {auditReport.verdict}
                          </div>
                          <p className="text-xs text-neutral-300 mt-0.5 max-w-2xl font-sans">
                            {auditReport.verdictReason}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs font-mono border-t md:border-t-0 md:border-l border-neutral-800 pt-3 md:pt-0 md:pl-5">
                      <div>
                        <div className="text-neutral-500">Test Exit Code</div>
                        <div className="text-white font-bold">
                          {auditReport.testExitCode !== undefined ? auditReport.testExitCode : "None supplied"}
                        </div>
                      </div>
                      <div>
                        <div className="text-neutral-500">Execution Time</div>
                        <div className="text-white font-bold">
                          {auditReport.testExecutionTimeMs ? `${auditReport.testExecutionTimeMs}ms` : "N/A"}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ZERO-EVIDENCE GREEN TEST DETECTOR BANNER */}
                  {auditReport.zeroEvidenceGreenDetected && (
                    <div className="mt-5 p-4 rounded-lg bg-amber-950/60 border border-amber-600/60 flex items-start gap-3 text-xs">
                      <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <div className="font-bold text-amber-200 tracking-wide">
                          ZERO-EVIDENCE GREEN TEST DETECTOR TRIGGERED
                        </div>
                        <p className="text-amber-300/90 leading-relaxed font-sans">
                          The explicit test command completed successfully with exit code 0, but 1 or more modified AST entities
                          have <strong>zero structural test linkages</strong> in <code className="text-amber-200">*_test.go</code>.
                          This change has not been structurally exercised. Do not accept this change as verified.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* 4 METRIC CARDS */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3.5 space-y-1">
                    <div className="text-neutral-400 font-mono">Changed AST Entities</div>
                    <div className="text-lg font-bold text-white font-mono">
                      {auditReport.auditedSurface.filter(e => e.relationshipToDiff === "DIRECT_MODIFICATION").length}
                    </div>
                    <div className="text-[11px] text-neutral-500">From semantic diff</div>
                  </div>

                  <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3.5 space-y-1">
                    <div className="text-neutral-400 font-mono">Audited Surface</div>
                    <div className="text-lg font-bold text-white font-mono">
                      {auditReport.auditedSurface.length}
                    </div>
                    <div className="text-[11px] text-neutral-500">Callers, types & siblings</div>
                  </div>

                  <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3.5 space-y-1">
                    <div className="text-neutral-400 font-mono">Verified Test Callers</div>
                    <div className="text-lg font-bold text-emerald-400 font-mono">
                      {auditReport.auditedSurface.filter((e) => e.hasStructuralTestEvidence).length}
                    </div>
                    <div className="text-[11px] text-neutral-500">In *_test.go call graph</div>
                  </div>

                  <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3.5 space-y-1">
                    <div className="text-neutral-400 font-mono">Verification Gaps</div>
                    <div className={`text-lg font-bold font-mono ${auditReport.verificationGaps.length > 0 ? "text-amber-400" : "text-emerald-400"}`}>
                      {auditReport.verificationGaps.length}
                    </div>
                    <div className="text-[11px] text-neutral-500">Unverified surface items</div>
                  </div>
                </div>

                {/* SECTION 1: VERIFICATION GAPS */}
                {auditReport.verificationGaps.length > 0 && (
                  <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-sm text-neutral-200 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                        <span>Verification Gaps ({auditReport.verificationGaps.length})</span>
                      </h3>
                      <span className="text-xs text-neutral-500 font-mono">Unverified Structural Surface</span>
                    </div>

                    <div className="space-y-2.5">
                      {auditReport.verificationGaps.map((gap, idx) => (
                        <div
                          key={idx}
                          className="bg-neutral-950 border border-amber-900/40 rounded-lg p-3.5 space-y-2 text-xs"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-neutral-800 pb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-white text-sm">{gap.name}</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400 font-mono">
                                {gap.kind}
                              </span>
                            </div>
                            <span className="font-mono text-neutral-500 text-[11px]">
                              {gap.path}:{gap.line}
                            </span>
                          </div>

                          <div className="space-y-1 text-neutral-300 leading-relaxed font-sans">
                            <p className="text-amber-300/90 font-medium">{gap.gapReason}</p>
                            <p className="text-neutral-400">
                              <strong className="text-neutral-200">Recommended action:</strong> {gap.suggestedAction}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* SECTION 2: AUDITED STRUCTURAL SURFACE */}
                <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm text-neutral-200 flex items-center gap-2">
                      <Network className="w-4 h-4 text-blue-400" />
                      <span>Audited Structural Surface ({auditReport.auditedSurface.length} entities)</span>
                    </h3>
                    <span className="text-xs text-neutral-500 font-mono">AST Entities & Test Linkages</span>
                  </div>

                  <div className="divide-y divide-neutral-800 font-mono text-xs">
                    {auditReport.auditedSurface.map((ent, idx) => (
                      <div key={idx} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            {ent.hasStructuralTestEvidence ? (
                              <span className="text-emerald-400 font-bold">✓ [TESTED]</span>
                            ) : (
                              <span className="text-amber-400 font-bold">✗ [UNVERIFIED]</span>
                            )}
                            <span className="font-bold text-white">{ent.name}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400">
                              {ent.kind}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800/80 text-neutral-500">
                              {ent.relationshipToDiff}
                            </span>
                          </div>
                          <div className="text-neutral-500 text-[11px]">
                            {ent.path}:{ent.line}
                          </div>
                        </div>

                        <div className="text-right text-[11px]">
                          {ent.hasStructuralTestEvidence && ent.testSymbolName ? (
                            <div className="text-emerald-400 flex items-center gap-1.5 sm:justify-end">
                              <span>caller:</span>
                              <code className="text-emerald-300 font-semibold">{ent.testSymbolName}</code>
                            </div>
                          ) : (
                            <div className="text-neutral-500">No test callers found</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* SECTION 3: TEST EXECUTION & DIAGNOSTICS */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 space-y-2">
                    <h4 className="font-semibold text-neutral-200 flex items-center gap-2">
                      <Terminal className="w-3.5 h-3.5 text-neutral-400" />
                      <span>Test Execution Details</span>
                    </h4>
                    <div className="font-mono space-y-1 text-neutral-400">
                      <div>Command: <code className="text-neutral-200">{auditReport.testCommand || "None provided"}</code></div>
                      <div>Exit Status: <code className="text-neutral-200">{auditReport.testExitCode !== undefined ? auditReport.testExitCode : "N/A"}</code></div>
                      <div>Duration: <code className="text-neutral-200">{auditReport.testExecutionTimeMs ? `${auditReport.testExecutionTimeMs}ms` : "N/A"}</code></div>
                    </div>
                  </div>

                  <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 space-y-2">
                    <h4 className="font-semibold text-neutral-200 flex items-center gap-2">
                      <Code2 className="w-3.5 h-3.5 text-neutral-400" />
                      <span>Evidence Completeness Status</span>
                    </h4>
                    <div className="space-y-1">
                      <div className="font-mono text-neutral-400">
                        Status: <span className="text-emerald-400 font-bold">{auditReport.completenessStatus}</span>
                      </div>
                      {auditReport.diagnostics.length > 0 ? (
                        <div className="space-y-1 pt-1 font-mono text-[11px] text-amber-400">
                          {auditReport.diagnostics.map((diag, i) => (
                            <div key={i}>• {diag}</div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-neutral-500 text-[11px]">0 parser warnings or unindexed partial failures</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* MANDATORY DISCLAIMER */}
                <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 text-xs space-y-1.5">
                  <div className="flex items-center gap-2 text-neutral-400 font-mono text-[11px] uppercase tracking-wider">
                    <Info className="w-3.5 h-3.5 text-neutral-400" />
                    <span>Audit Terminology & Scope Boundary</span>
                  </div>
                  <p className="text-neutral-400 leading-relaxed font-sans text-[11px]">
                    {auditReport.disclaimer}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: LOCOMO BENCHMARKS */}
        {activeTab === "benchmarks" && (
          <div className="space-y-6">
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="font-semibold text-base text-white">
                  LoCoMo 1,540 Shared-Reader Code Retrieval Benchmark
                </h3>
                <span className="text-xs font-mono px-2.5 py-1 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                  entire-graph Ranked #1
                </span>
              </div>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Shared reader and judge, a 200-item retrieval budget requested for every arm, measuring retrieval accuracy
                over 1,540 questions while building an AST index without model calls or index-time tokens.
              </p>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-neutral-950/80 border-b border-neutral-800 text-neutral-400 uppercase tracking-wider font-semibold">
                      <th className="p-3.5 pl-5">System</th>
                      <th className="p-3.5">LoCoMo Score</th>
                      <th className="p-3.5">Index-Time Tokens</th>
                      <th className="p-3.5">Version Tested</th>
                      <th className="p-3.5 pr-5">Disclosures / Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/60 font-mono">
                    {BENCHMARKS_DATA.map((sys) => (
                      <tr
                        key={sys.name}
                        className={
                          sys.isLeader
                            ? "bg-emerald-950/20 text-emerald-200 font-semibold"
                            : "hover:bg-neutral-800/30 text-neutral-300"
                        }
                      >
                        <td className="p-3.5 pl-5 flex items-center gap-2">
                          {sys.isLeader && <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />}
                          <span>{sys.name}</span>
                        </td>
                        <td className="p-3.5 text-sm font-bold text-white">
                          {sys.locomoScore.toFixed(2)}
                        </td>
                        <td className="p-3.5 text-neutral-400">{sys.indexTokens}</td>
                        <td className="p-3.5 text-neutral-400 text-[11px]">{sys.version}</td>
                        <td className="p-3.5 pr-5 text-neutral-400 text-[11px] font-sans">
                          {sys.notes}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Token Savings Architecture */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-3">
                <h4 className="font-semibold text-sm text-neutral-200 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  No-Egress Local AST Guarantee
                </h4>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Unlike LLM memory engines that upload codebase files to external vector databases or spend millions of
                  embedding tokens, Entire Graph analyzes tree-sitter AST nodes completely locally. It makes zero network
                  requests, zero model calls, and zero API-key queries.
                </p>
              </div>

              <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-3">
                <h4 className="font-semibold text-sm text-neutral-200 flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-blue-400" />
                  Agent Token Savings Model
                </h4>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Coding agents replace multi-turn grep and full-file reads with one targeted search query. Each query credits
                  the file read it replaces (file bytes minus returned snippet payload at 4 bytes = 1 token).
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: AGENT CLI SIMULATOR */}
        {activeTab === "cli" && (
          <div className="space-y-6">
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-4">
              <div>
                <h3 className="font-semibold text-sm text-neutral-200">
                  Agent Command-Line Simulation
                </h3>
                <p className="text-xs text-neutral-400">
                  Simulate the exact terminal commands that coding agents run via Entire CLI.
                </p>
              </div>

              <div className="flex flex-wrap gap-2 text-xs">
                {[
                  "entire graph search --query 'token' --format text --top-k 5",
                  "entire graph neighbors --symbol generateToken --direction both",
                  "entire graph impact --symbol AnalyzeGitRangeWithOptions --depth 2",
                  "entire graph audit --base origin/main --test 'go test ./...'",
                  "entire graph capabilities --json",
                ].map((cmd) => (
                  <button
                    key={cmd}
                    onClick={() => handleRunCli(cmd)}
                    className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-mono rounded-lg transition-colors text-left"
                  >
                    $ {cmd}
                  </button>
                ))}
              </div>

              <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 font-mono text-xs space-y-3">
                <div className="flex items-center justify-between text-neutral-500 border-b border-neutral-800 pb-2">
                  <span>Terminal output</span>
                  <span>Exit code: 0</span>
                </div>
                <div className="text-emerald-400 font-bold">$ {cliCommand}</div>
                <pre className="text-neutral-300 whitespace-pre-wrap leading-relaxed">
                  {cliOutput || `Click one of the command presets above to simulate CLI output.`}
                </pre>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-neutral-800 bg-neutral-900/50 py-4 px-4 lg:px-8 text-center text-xs text-neutral-500 font-mono">
        Entire Graph • Local Tree-Sitter AST Code Engine • Node.js / Next.js Runtime
      </footer>
    </div>
  );
}
