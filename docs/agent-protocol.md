# Connect an agent

The local agent host owns the episode. A controller receives one actor's
observation and returns an action. The viewer reads recorded transitions;
closing it does not pause the host or its controllers.

The supplied external controller is a separate Node process running the same
mock policy as the baseline. It uses authenticated HTTP. No model or provider
is connected.

## Start a local run

```sh
npm run build
npm run agent:host
```

The host binds only to `127.0.0.1:5190` and opens an empty saved workspace.
Create an experiment in the browser, assign a controller to each actor, then
press Run. [Saved experiments](experiments.md) describes revisions, history,
comparison and recovery.

The private connection file `.cache/agent-host.json` contains the viewer URL
and researcher token. The tab uses session storage to survive reloads; the
private admin key in the data directory survives host restarts. Actor credentials
are separate, stay out of run files and rotate on recovery or handoff.
Use one host per data directory and keep credentials local.

## Actor protocol

The wire version is `dream-agent-1`. Actor tokens are separate from the researcher
admin token. Every actor request sends `Authorization: Bearer <actor token>`.
The server does not enable CORS, accept arbitrary hostnames or contact remote
agent URLs.

| Operation | Request | Result |
| --- | --- | --- |
| Receive a decision | `GET /api/runs/{run}/actors/{actor}/decision` | Current identity, private observation |
| Submit an action | `POST /api/runs/{run}/actors/{actor}/action` | Stable acknowledgement |
| Read the run | `GET /api/runs/{run}/view?after={step}` | Researcher only; incremental transitions |
| Read the report | `GET /api/runs/{run}/report` | Researcher only; findings and wall timings |
| Export a recording | `GET /api/runs/{run}/export` | Researcher only; replayable episode JSONL |
| Resume after timeout | `POST /api/runs/{run}/resume` | Researcher only; new decision identities |
| Transfer control | `POST /api/runs/{run}/actors/{actor}/handoff` | Researcher only; rotates the actor token |

Researcher operations require the admin bearer token. An actor token cannot
read another actor's inventory, objectives, source or full run trace.

A decision has this shape:

```json
{
  "version": "dream-agent-1",
  "runId": "host-assigned-run-id",
  "actorId": "courier_a",
  "step": 0,
  "requestId": "host-assigned-request-id",
  "epoch": 0,
  "observation": {}
}
```

`observation` contains the actor's current state and tasks, public map/catalog
information and current local availability. Its full shape comes from
`observeAgent` in the episode engine. Send back the identity fields unchanged,
replace `observation` with `action`, and use one of the engine's strict actions:

```json
{
  "version": "dream-agent-1",
  "runId": "host-assigned-run-id",
  "actorId": "courier_a",
  "step": 0,
  "requestId": "host-assigned-request-id",
  "epoch": 0,
  "action": {"agent": "courier_a", "kind": "wait"}
}
```

The available action kinds are `wait`, `move(to)`, `take(stock,quantity)`,
`deliver(stock,quantity)` and `use(service)`. The action's agent must match the
credential and decision. Actions cannot set state, rewards or completion.
Malformed submissions are transport errors. Well-formed actions that break a
world rule reach the engine and become recorded violations.

The host waits for one decision from every actor against the same state, then
commits a joint step. Response order cannot change contention. An identical
retry returns its original acknowledgement, including after commit. A different
action for the same request, a stale step or a revoked controller is rejected.
A queued acknowledgement has `committedStep: null`; the last submission has the
new committed step. Poll the run or next decision for eventual outcomes.

Handoff accepts `{"owner":"external"}` or `{"owner":"baseline"}`. It operates
at the current committed boundary, removes that actor's uncommitted response,
increments its epoch and rotates its credential. Other decisions keep their
same-state observations. The former controller cannot commit a delayed action.
To replace a supplied mock process, use the returned actor token with your
own client. The supplied [mock client](../scripts/mock-agent.mjs) shows the loop;
DREAM_AGENT_RUN_ID selects the run-scoped endpoint. Each run pins its initial
controller assignments, while explicit handoffs are saved as current ownership.

## Inspect the result

Pause the viewer and open Results breakdown. Each actor has task progress, spending and
travel, service and idle step counts. These are simulation steps, including the
step that starts a move or service. Each blocked or rejected event opens its
recorded observation, action, outcome and reward, and seeks the 3D replay to
that step. The first 64 findings appear; exports retain every transition.

External decision latency is measured separately in wall milliseconds. It is
runtime metadata, excluded from canonical gameplay replay. The report endpoint
includes per-request timings; the viewer shows their total. These measurements
include the mock client's deliberate delay and HTTP overhead.

## Current boundary

The host keeps source-pinned runs, controller ownership and wall timings in its
[local saved store](experiments.md). Incomplete runs reopen paused after a
restart; pending decisions are revoked. Gameplay JSONL exports remain unsigned
and exclude controller handoffs, wall latency and credentials.

This is not a public multi-tenant backend or an OS sandbox for untrusted code.
Controllers on the same machine share that machine's user permissions. The
Vercel app still runs its browser baseline; it does not host this local service.
Hosted execution still needs account authentication and a persistent execution
service. Python and MCP adapters, agent messaging and AI-written summaries remain
later slices. Local matched-seed comparisons are available in run history.
