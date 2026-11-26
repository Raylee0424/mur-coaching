# Claude Code CLI cheat sheet (MUR Coaching)

Nothing is lost when a chat closes. Work lives in files: the ticket and plan in `tasks/current/`, the brain's `MUR Coaching - Active State.md`, and git. A fresh session picks up from those. Caveman turns on by itself in every new session.

## Start

Open a terminal in the project folder and run:

```bash
claude
```

## What to say

### Resume a half-finished batch

```text
Resume Batch <N>. Read tasks/current/<ticket>.md and its -plan.md, then check git status/diff to see which phase is done. Continue the agent workflow from where it stopped.
```

### Start the next batch (you don't know what's next)

```text
Next batch. From Active State and the Roadmap, propose the next batch in ≤10 lines. After I approve, write it as a ticket in tasks/current/ and run the agent workflow (architect plan → I approve → implementor → main-session verify → memory offload).
```

### Start a batch you already have in mind

```text
New batch: <describe it in plain words>. Write the ticket, then run the agent workflow.
```

### Bug

```text
Bug: <what happens, where, steps>. Write a ticket in tasks/current/, use the debug agent on it, then the implementor.
```

### Tiny edit (1–2 files)

```text
use cavecrew-builder to <small change in file X>
```

### Approve a plan

Short answers are fine: `approved`, `yes`, `do Phase B`. Answer any open questions the plan lists in one line each.

## The agent workflow

1. A ticket goes in `tasks/current/<ticket>.md`.
2. The `architect` agent (opus) writes `tasks/current/<ticket>-plan.md`. It writes no code.
3. You read the plan and approve or correct it.
4. The `implementor` agent (sonnet) builds the plan and runs the checks. It never runs `pnpm build` or touches the dev servers.
5. The main session reviews the diff, checks the pages in the browser, and runs `pnpm build` last. After the build, restart the web dev server.
6. Memory offload: the brain notes are updated, and the ticket and plan move to `tasks/archive/`.
7. Ask for a commit when you want one: `commit it`, then `push it`.

## Token-saving habits

- **One session per batch.** After a batch's memory offload, type `/clear` before the next batch. A long chat costs more every turn, because it carries all the earlier history.
- **Don't resume old chats** with `claude --resume` or `claude --continue`. They reload the whole history. A fresh session plus the ticket is much cheaper.
- **Use one place only.** Don't have one session write prompts for another. Give the task straight to the CLI session.
- **Approve the plan before code is written.** Fixing a plan is cheap. Undoing code is not.
- **Skip tickets for tiny fixes.** Use `cavecrew-builder`.
- **Keep replies short.** Don't restate context the files already hold.
- **If one session gets long mid-batch,** type `/compact` to shrink its history.
- **Don't run the same batch in two sessions at once.** They will edit the same files.
