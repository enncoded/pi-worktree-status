# pi-worktrunk

A [Pi](https://github.com/earendil-works/pi-coding-agent) extension that ties each Worktrunk worktree to the Pi
session that created it. A session claims a worktree by running `wt switch ... --format=json` in `bash`, and the
widget, the session name on the branch, and `/worktrees` all read that claim.

It doesn't add sessions,  workspaces, or change your worktree layout.

## What it does

- Shows a status widget in the owning session, in pi-web and in the TUI:

  ```text
  🌳 feat-login  +1…2   main ↑3 ↓1
  ```

  The line has the branch, Worktrunk's symbols, and how far the branch has drifted from the default branch
  (`↑` ahead, `↓` behind). If someone removes the worktree, the widget shows `🌳 feat-login  (removed)`
  instead of a path that no longer exists.
- Writes the session name onto the branch as the Worktrunk var `pi-session`, so `wt list` and the widget
  report the same owner after a restart.
- Answers `/worktrees` with every linked worktree in the repos the session touches, plus the owning Pi session,
  or `(no Pi session)` for a worktree that another tool created.

Each claim is an entry in the session transcript, so a resumed session rebuilds the widget from it.

## Works with Worktrunk's own extension

This does not replace Worktrunk's bundled Pi extension (`wt config plugins pi install`), which keeps the 🤖/💬
activity markers in `wt list`. That extension tracks what an agent is doing. This one tracks who owns the
worktree, and it draws Worktrunk's symbols in the widget. Both can be installed at the same time.

## Install

```bash
pi install git:github.com/enncoded/pi-worktrunk
```

For a single run:

```bash
pi -e git:github.com/enncoded/pi-worktrunk
```

You need `wt` (Worktrunk) and `git` on `PATH`.

Subagent children run with `PI_SUBAGENT_CHILD=1` and skip the extension, so the parent session keeps
ownership of the worktree.

## Notes

- The extension reads only single-line JSON from `wt switch --format=json`. Piping that output through
  `jq .` pretty-prints it, and the extension will not see the claim.
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
