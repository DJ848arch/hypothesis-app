# hypothesis-app

Scientific platform to test ideas.

## Memory (cross-session context)

This project uses the `memory` MCP server (`@modelcontextprotocol/server-memory`).
The knowledge graph is stored at `.claude/memory/knowledge-graph.json`.

Use memory tools to persist things that should survive session restarts:
- Key architectural decisions and the reasoning behind them
- Non-obvious constraints (API limits, business rules, performance requirements)
- Recurring patterns that should be reused across the codebase
- Bugs that were tricky to fix (so they aren't reintroduced)
- Test hypotheses and their outcomes

Example usage within a session:
```
create_entities: store a decision or fact
create_relations: link related concepts
search_nodes: recall context by keyword
open_nodes: retrieve full details of stored nodes
```

## Security

A post-write security hook runs automatically after every file write/edit.
It scans for hardcoded credentials, injection risks, XSS vectors, and misconfigs.
Fix any flagged issues before committing.

For a full audit of MCP servers and extension permissions:
- macOS: `claudit-sec` (github.com/HarmonicSecurity/claudit-sec)
- Manual: review `.claude/settings.json` permissions and mcpServers entries

## Development conventions

- Commit to branch `claude/research-github-plugins-ag3eD` during active development
- Keep `.claude/memory/knowledge-graph.json` committed so session knowledge is shared
- Do not commit `.env` files or secrets — the security hook will flag them
