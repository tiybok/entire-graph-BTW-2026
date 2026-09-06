import { NextRequest, NextResponse } from "next/server";
import { AUDIT_SCENARIOS, AuditReport } from "@/lib/data";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const scenarioKey = searchParams.get("scenario") || "zero_evidence_green";
  const base = searchParams.get("base") || "origin/main";
  const test = searchParams.get("test");

  const report = getAuditReport(scenarioKey, base, test ?? undefined);
  return NextResponse.json(report);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const scenarioKey = body.scenario || "zero_evidence_green";
    const base = body.base || "origin/main";
    const test = body.test;

    const report = getAuditReport(scenarioKey, base, test);
    return NextResponse.json(report);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
}

function getAuditReport(scenarioKey: string, base: string, test?: string): AuditReport {
  if (scenarioKey && AUDIT_SCENARIOS[scenarioKey]) {
    const baseScenario = AUDIT_SCENARIOS[scenarioKey];
    const report: AuditReport = {
      ...baseScenario,
      baseRef: base || baseScenario.baseRef,
      testCommand: test !== undefined ? test : baseScenario.testCommand,
    };

    // If caller explicitly omitted test command
    if (test === "") {
      report.testCommand = undefined;
      report.verdict = "REVIEW REQUIRED";
      report.verdictReason = "Execution evidence required: No test command was supplied (--test \"<cmd>\"). Structural linkages exist, but command execution has not been verified.";
    }

    return report;
  }

  // Fallback default
  return AUDIT_SCENARIOS.zero_evidence_green;
}
