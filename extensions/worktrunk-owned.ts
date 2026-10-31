// Session-owned Worktrunk worktrees.
//
// A worktree belongs to the Pi session whose bash ran `wt switch ... --format=json`
// for it. No new sessions or workspaces are created per worktree. Instead:
//   - the owning session shows a "🌳 branch  status" widget (renders in pi-web and the TUI),
//   - the owner's session name is stored as Worktrunk var `pi-session` on that branch,
//   - `/worktrees` lists every worktree in the repo(s) and which session owns it.
// Activity markers (🤖/💬) still come from Worktrunk's own Pi extension (`wt config plugins pi install`);
// this one only adds ownership, the widget and `/worktrees`.

import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { existsSync } from "node:fs";

type Owned = { branch: string; path: string };
type ListItem = {
  branch?: string;
  worktree?: { path?: string; main?: boolean };
  default_branch?: { ahead?: number; behind?: number };
  display?: { symbols?: string };
  vars?: Record<string, string>;
};

const ENTRY = "worktrunk-owned";
const VAR = "pi-session";
const WIDGET = "worktrunk-owned";

// shortcut: only recognises single-line JSON from `wt switch --format=json`; output piped through `jq .` is missed.
export function parseSwitchOutput(text: string): Owned[] {
  const out: Owned[] = [];
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (!t.startsWith("{")) continue;
    try {
      const j = JSON.parse(t);
      if (j.action && typeof j.branch === "string" && typeof j.path === "string") out.push({ branch: j.branch, path: j.path });
    } catch {}
  }
  return out;
}

export default function worktrunkOwned(pi: ExtensionAPI): void {
  // Subagent workers reuse the worktree their parent created; the parent stays the owner.
  if (process.env.PI_SUBAGENT_CHILD === "1") return;

  let owned: Owned[] = [];
  const label = (ctx: ExtensionContext) => pi.getSessionName() ?? ctx.sessionManager.getSessionId().slice(0, 8);

  async function listItems(cwd: string): Promise<ListItem[]> {
    try {
      const r = await pi.exec("wt", ["-C", cwd, "list", "--format=json"], { cwd });
      return r.code === 0 ? (JSON.parse(r.stdout).items ?? []) : [];
    } catch {
      return []; // never break the session over a status line
    }
  }

  async function refresh(ctx: ExtensionContext): Promise<void> {
    if (!owned.length) return ctx.ui.setWidget(WIDGET, undefined);
    const me = label(ctx);
    const lines: string[] = [];
    for (const o of owned) {
      const item = existsSync(o.path) ? (await listItems(o.path)).find((i) => i.worktree?.path === o.path) : undefined;
      if (!item) {
        lines.push(`🌳 ${o.branch}  (removed)`);
        continue;
      }
      const { ahead = 0, behind = 0 } = item.default_branch ?? {};
      const drift = ahead || behind ? `  main ↑${ahead} ↓${behind}` : "";
      lines.push(`🌳 ${o.branch}  ${item.display?.symbols ?? ""}${drift}`.trimEnd());
      if (item.vars?.[VAR] !== me) {
        await pi.exec("wt", ["-C", o.path, "config", "state", "vars", "set", `${VAR}=${me}`], { cwd: o.path }).catch(() => {});
      }
    }
    ctx.ui.setWidget(WIDGET, lines);
  }

  pi.on("session_start", async (_event, ctx) => {
    owned = [];
    for (const e of ctx.sessionManager.getBranch()) {
      const d = e.type === "custom" && e.customType === ENTRY ? (e.data as Owned | undefined) : undefined;
      if (d && !owned.some((o) => o.path === d.path)) owned.push(d);
    }
    await refresh(ctx);
  });

  pi.on("tool_result", async (event, ctx) => {
    if (event.toolName !== "bash") return;
    if (!/\bwt\b[\s\S]*\bswitch\b/.test(String(event.input.command ?? ""))) return;
    const text = event.content.map((c) => (c.type === "text" ? c.text : "")).join("\n");
    let added = false;
    for (const o of parseSwitchOutput(text)) {
      if (owned.some((x) => x.path === o.path)) continue;
      owned.push(o);
      pi.appendEntry(ENTRY, o);
      added = true;
    }
    if (added) await refresh(ctx);
  });

  pi.on("agent_settled", async (_event, ctx) => refresh(ctx));

  pi.registerCommand("worktrees", {
    description: "List worktrees in this session's repos and which Pi session owns each",
    handler: async (_args, ctx) => {
      const roots = [ctx.cwd, ...owned.map((o) => o.path).filter((p) => existsSync(p))];
      const seen = new Set<string>();
      const lines: string[] = [];
      for (const root of roots) {
        for (const i of await listItems(root)) {
          const p = i.worktree?.path;
          if (!p || i.worktree?.main || seen.has(p)) continue;
          seen.add(p);
          lines.push(`${i.branch}  ${i.display?.symbols ?? ""}  → ${i.vars?.[VAR] ?? "(no Pi session)"}`);
        }
      }
      ctx.ui.notify(lines.length ? lines.join("\n") : "No linked worktrees found from this session.", "info");
    },
  });
}
