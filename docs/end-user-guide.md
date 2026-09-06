# End-user guide

Entire Graph helps a coding agent find the right code before it edits. It
builds a local map of a Git repository and gives the agent ranked search,
definitions, relationships, and change-impact evidence with source locations.
It does not replace source review: the agent should use a graph result to
locate code, then inspect the cited lines before answering or changing files.

## Start here

You need the Entire CLI, Git 2.36 or newer, and the Graph plugin. Install the
plugin once, then activate it in each repository where agents should use it:

```sh
entire plugin install graph
entire graph version

cd /path/to/your/repository
entire graph init-agents --repo .
```

`init-agents` creates `.entire/graph-agent.md` and adds a managed instruction
block to `AGENTS.md` and `CLAUDE.md`. Review and commit those files if the
workflow should be shared with your team. Start a new agent task afterwards so
it can load the new instructions.

If installation or activation fails, run `entire graph doctor --json` and see
[agent activation](agents.md) for the expected files and recovery steps.

## Work with your agent

Describe the outcome you want in ordinary language. The agent uses the graph
in the background, then reads the relevant source before it responds.

| Ask for | Example prompt | What the agent should use |
| --- | --- | --- |
| The implementation | “Where is request authentication implemented?” | `search` |
| One declaration | “Show me the definition of `AuthorizeRequest`.” | `def` |
| Callers or dependencies | “What calls `AuthorizeRequest`?” | `neighbors` |
| Change risk | “What could changing `AuthorizeRequest` affect?” | `impact` |
| A branch review | “Summarize the semantic changes from `main` to `HEAD`.” | `diff` |
| A full export | “Export this repository’s graph as NDJSON.” | `snapshot` |

For a code-location or bug-fix task, a healthy agent workflow is:

1. Run a targeted `search` in the repository.
2. Read the small source regions the result identifies.
3. Check callers or impact when a behavior change could have wider effects.
4. Make the smallest complete change.
5. Run the relevant test or explain why it could not run.

The generated guide asks agents to follow this sequence. It is a useful signal
that activation worked when the agent’s first locating action is a graph search
rather than a broad file scan.

## Use the commands yourself

The same capabilities are available at the terminal. Outside an Entire
session, pass `--repo .` (or the path to the repository).

```sh
# Find likely implementation regions from a plain-language question.
entire graph search --repo . --profile full \
  --query "where is request authentication implemented" --format text

# Inspect callers and callees of a known symbol.
entire graph neighbors --repo . --symbol AuthorizeRequest \
  --relation CALLS --direction both

# See a bounded change-impact summary.
entire graph impact --repo . --symbol AuthorizeRequest

# Compare semantic entities between two revisions.
entire graph diff --base main --head HEAD --json
```

Run `entire graph help` for the command list and
`entire graph <command> --help` for the flags supported by your installed
version. The [command reference](commands.md) explains the defaults and the
[search guide](search.md) explains how to read ranked results.

## Understand the result

- **Locations are leads, not proof.** Follow the returned `file:line` links
  into source. Static analysis can miss reflection, generated code, interface
  dispatch, or runtime wiring.
- **Ambiguous symbols need a file.** `neighbors` and `impact` return matching
  definitions when a name is ambiguous. Re-run with `--file path/to/file` to
  select one.
- **Diagnostics matter.** JSON responses include warnings, partial failures,
  and completeness data. Treat incomplete parsing as a reason to widen the
  source review, not as a clean result.
- **`VERIFY:` is a suggestion.** Search may print a test command derived from
  repository content. Review it before running it, especially in an untrusted
  checkout.

## Choose working-tree or committed-tree results

Interactive commands (`search`, `def`, `explain`, `neighbors`, and `impact`)
use your working tree by default. This lets an agent see uncommitted edits, but
each query builds a fresh snapshot. Add `--head` when you explicitly want the
committed tree instead:

```sh
entire graph search --repo . --head --query "database connection setup"
```

Committed-tree queries can reuse a local cache. `entire graph index --repo .
--head --profile full` prewarms one such cache variant; it does not speed up
the default working-tree path. See [operations](operations.md#cache) for cache
locations, keys, and prewarming details.

## Privacy and safety

Analysis runs locally: Entire Graph does not upload source, call a model API,
or download grammars while it builds or queries a graph. It parses files and
uses local Git subprocesses. Credential-store paths are excluded by default
from the graph and search corpus, though a path-based rule cannot identify a
secret embedded in an otherwise ordinary source file.

`verify` is different: it executes the command you provide with your own
permissions. Read the command first. For the complete read, write, execution,
and network boundaries, see [trust and security](trust-and-security.md).

## Where to go next

- [Command reference](commands.md) for the complete user-facing command map.
- [Agent activation](agents.md) to manage generated instructions safely.
- [Language support](language-support.md) to check analysis coverage.
- [Technical architecture](ARCHITECTURE.md) to understand the implementation
  and extension points.
