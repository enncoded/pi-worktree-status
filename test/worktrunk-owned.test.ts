// Run: npm test
// Needs `wt` and `git` on PATH. Exercises the real extension against a scratch repo with a fake Pi host.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import worktrunkOwned, { parseSwitchOutput } from "../extensions/worktrunk-owned.ts";

test("parseSwitchOutput picks wt switch JSON lines only", () => {
  const out = parseSwitchOutput('noise\n{"action":"created","branch":"b","path":"/x/b"}\n{"other":1}\n{bad');
  assert.deepEqual(out, [{ branch: "b", path: "/x/b" }]);
});

test("claims a worktree, shows widget, tags owner, lists it", async () => {
  const repo = join(realpathSync(mkdtempSync(join(tmpdir(), "wto-"))), "r");
  execFileSync("git", ["init", "-q", repo]);
  execFileSync("git", ["-C", repo, "commit", "-q", "--allow-empty", "-m", "init"]);
  const json = execFileSync("wt", ["-C", repo, "switch", "--create", "feat-y", "--no-cd", "--no-hooks", "--format=json"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });

  const handlers: Record<string, Function> = {};
  const entries: unknown[] = [];
  let widget: string[] | undefined;
  let notice = "";
  let command: any;
  const pi: any = {
    on: (n: string, h: Function) => (handlers[n] = h),
    registerCommand: (_n: string, c: any) => (command = c),
    appendEntry: (_t: string, d: unknown) => entries.push(d),
    getSessionName: () => "test-session",
    exec: async (cmd: string, args: string[], o: any) => {
      try { return { stdout: execFileSync(cmd, args, { cwd: o.cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }), stderr: "", code: 0 }; }
      catch (e: any) { return { stdout: "", stderr: String(e), code: 1 }; }
    },
  };
  const ctx: any = {
    cwd: repo,
    sessionManager: { getBranch: () => [], getSessionId: () => "abcdef123456" },
    ui: { setWidget: (_k: string, l: string[] | undefined) => (widget = l), notify: (m: string) => (notice = m) },
  };
  worktrunkOwned(pi);
  await handlers.session_start({}, ctx);
  assert.equal(widget, undefined);

  await handlers.tool_result({ toolName: "bash", input: { command: `wt -C ${repo} switch --create feat-y --no-cd --format=json` }, content: [{ type: "text", text: json }] }, ctx);
  assert.equal(entries.length, 1);
  assert.match(widget![0], /^🌳 feat-y/);
  const vars = JSON.parse(execFileSync("wt", ["-C", repo, "list", "--format=json"], { encoding: "utf8" })).items.find((i: any) => i.branch === "feat-y").vars;
  assert.equal(vars["pi-session"], "test-session");

  await command.handler("", ctx);
  assert.match(notice, /feat-y .*→ test-session/);

  // resume rebuilds ownership from session entries
  const ctx2 = { ...ctx, sessionManager: { ...ctx.sessionManager, getBranch: () => entries.map((data) => ({ type: "custom", customType: "worktrunk-owned", data })) } };
  widget = undefined;
  await handlers.session_start({}, ctx2);
  assert.match(widget![0], /^🌳 feat-y/);

  // removal shows up as removed
  execFileSync("wt", ["-C", repo, "remove", "feat-y", "--foreground", "--no-hooks"], { stdio: "ignore" });
  await handlers.agent_settled({}, ctx2);
  assert.equal(widget![0], "🌳 feat-y  (removed)");
});
