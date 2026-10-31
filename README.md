# pi-worktrunk

A [Pi](https://github.com/earendil-works/pi-coding-agent) extension that makes Worktrunk worktrees *belong* to the Pi session that
created them, so you can see which agent owns which branch, and which branches are still alive.

It is deliberately small: no new sessions, no new workspaces, no changes to your worktree layout.
A worktree is simply claimed by whichever session's `bash` ran `wt switch ... --format=json`, and every other
view (widget, session name on the branch, `/worktrees`) is derived from that claim.

## What you get

- A status widget in the owning session, in pi-web and in the TUI:

  ```text
  🌳 feat-login  +1…2   main ↑3 ↓1
  ```

  Branch, Worktrunk's own symbols, and drift against the default branch. A branch removed from under the
  session degrades to `🌳 feat-login  (removed)` instead of a stale path.
- The session name is stored on the branch as the Worktrunk var `pi-session`, so `wt list` and the widget
  agree on who owns a worktree even across restarts.
- `/worktrees` lists every linked worktree in the repos this session touches, with the owning Pi session
  (or `(no Pi session)` for worktrees another tool created).

Ownership is recorded in the session transcript, so resuming a session rebuilds the widget without any
extra state file.

## Works with Worktrunk's own extension

This pairs with, and does not replace, Worktrunk's bundled Pi extension
(`wt config plugins pi install`), which keeps the 🤖/💬 activity markers in `wt list`. That one tracks what an
agent is doing; this one tracks who owns the worktree. Both can be installed at the same time, and the widget
renders Worktrunk's symbols inline.

## Install

```bash
pi install git:github.com/enncoded/pi-worktrunk
```

or for one run:

```bash
pi -e git:github.com/enncoded/pi-worktrunk
```

Requirements:

- `wt` (Worktrunk) and `git` on `PATH`.
- Pi sessions launched with subagent children set `PI_SUBAGENT_CHILD=1`; those skip the extension, so the
  parent stays the owner of the worktree.

## Notes

- Only single-line JSON from `wt switch --format=json` is recognised. Piping the output through `jq .`
  (which pretty-prints it) hides the claim from the extension.
- Status lookups are best-effort: if `wt` fails or a worktree disappears, the widget says so and the
  session carries on.

## Development

```bash
npm install
npm test          # drives the real extension against a scratch repo with a fake Pi host
npm run typecheck
```

`npm test` needs `wt` and `git` on `PATH`.

## License

MIT
