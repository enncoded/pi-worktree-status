# pi-worktree-status

A [Pi](https://github.com/earendil-works/pi-coding-agent) extension that shows the Worktrunk worktrees a Pi session
is using, each with its branch status and its owner.

A session claims a worktree by running `wt switch ... --format=json` in `bash`. The widget, the session name on the
branch, and `/worktrees` come from that claim.

It doesn't add sessions, workspaces, or change your worktree layout, and it creates nothing. The worktree already
exists by the time the extension sees the `wt switch` output.

## What it does

- Shows a status widget in the owning session, in pi-web and in the TUI:

  ```text
  🌳 feat-login  +1…2   main ↑3 ↓1
  ```

  The line has the branch, Worktrunk's symbols, and how far it has drifted from the default branch (`↑` ahead,
  `↓` behind). If someone removes the worktree, the widget shows `🌳 feat-login  (removed)` instead of a path
  that no longer exists.
- Writes the session name on the branch as the Worktrunk var `pi-session`, so `wt list` and the widget report the
  same owner after a restart.
- Answers `/worktrees` with every linked worktree in the repos the session works in, plus its owner, or
  `(no Pi session)` for a worktree that another tool created.

Each claim is an entry in the session transcript, so a resumed session rebuilds the widget from the transcript.

## Works with Worktrunk's own extension

This does not replace Worktrunk's bundled Pi extension (`wt config plugins pi install`), which keeps the 🤖/💬
activity markers in `wt list`. That extension tracks what an agent is doing. This one tracks which session owns
which worktree. It also includes Worktrunk's symbols in the widget line. Both can be installed at the same time.

## Install

```bash
pi install npm:pi-worktree-status
```

From git instead:

```bash
pi install git:github.com/enncoded/pi-worktree-status
```

For a single run:

```bash
pi -e npm:pi-worktree-status
```

You need `wt` (Worktrunk) and `git` on `PATH`.

Subagent children run with `PI_SUBAGENT_CHILD=1` and skip the extension, so the parent session keeps ownership of
the worktree.

## Notes

- The extension reads only single-line JSON from `wt switch --format=json`. Piping that output through `jq .`
  pretty-prints it, and the extension will not see the claim.
- If `wt` fails or a worktree disappears, the widget says so and the session keeps running.

## Development

```bash
npm install
npm test          # runs the real extension against a scratch repo and a fake Pi host
npm run typecheck
```

`npm test` needs `wt` and `git` on `PATH`.

## License

MIT
