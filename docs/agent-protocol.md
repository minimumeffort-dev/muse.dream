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

The host binds only to `127.0.0.1:5190`. It starts morning delivery with the first
courier assigned to the external mock and the other courier assigned to the
baseline. Pass a different local scenario and actor explicitly:

```sh
npm run agent:host -- examples/classroom.dream learner
```

Use the exact actor ID in that source. The private connection file
`.cache/agent-host.json` contains a viewer URL and credentials. Open its URL
locally, or enter its admin token at the host's Connect form. The viewer removes
the token fragment from the address and keeps the credential in memory.
Do not share the connection file. It is ignored by Git and deleted on normal
host shutdown, before asynchronous process cleanup. Existing files are written
with owner-only permissions. Forced termination can leave the ignored file;
its tokens stop working when the host stops.

`DREAM_HOST_PORT` changes the listening port. `DREAM_AGENT_DELAY_MS` changes the
external mock's decision delay, from zero to 30,000 milliseconds. This delay is
wall time; it never changes travel duration, service duration or the simulation
step. A 30-second unanswered decision pauses the host and invalidates pending
requests. No action or replacement policy is invented.
Use one local host at a time; its connection file belongs to that process.

## Actor protocol

The wire version is `dream-agent-1`. Actor tokens are separate from the researcher
admin token. Every actor request sends `Authorization: Bearer <actor token>`.
The server does not enable CORS, accept arbitrary hostnames or contact remote
agent URLs.

| Operation | Request | Result |
| --- | --- | --- |
| Receive a decision | `GET /api/actors/{actor}/decision` | Current identity, private observation |
| Submit an action | `POST /api/actors/{actor}/action` | Stable acknowledgement |
| Read the run | `GET /api/view?after={step}` | Researcher only; incremental transitions |
| Read the report | `GET /api/report` | Researcher only; findings and wall timings |
| Export a recording | `GET /api/export` | Researcher only; replayable episode JSONL |
| Resume after timeout | `POST /api/resume` | Researcher only; new decision identities |
| Transfer control | `POST /api/actors/{actor}/handoff` | Researcher only; rotates the actor token |

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
To replace the supplied mock process, use the returned actor token with your
own client. The supplied [mock client](../scripts/mock-agent.mjs) shows the loop.

## Inspect the result

Pause the viewer and open Report. Each actor has task progress, spending and
travel, service and idle step counts. These are simulation steps, including the
step that starts a move or service. Each blocked or rejected event opens its
recorded observation, action, outcome and reward, and seeks the 3D replay to
that step. The first 64 findings appear; exports retain every transition.

External decision latency is measured separately in wall milliseconds. It is
runtime metadata, excluded from canonical gameplay replay. The report endpoint
includes per-request timings; the viewer shows their total. These measurements
include the mock client's deliberate delay and HTTP overhead.

## Current boundary

The host and credentials live in one local process. Runs survive closing the
browser, but not stopping or restarting the host. Export before stopping if you
need the gameplay record. Exports do not persist controller handoffs, wall
latency or credentials. They are unsigned local records.

This is not a public multi-tenant backend or an OS sandbox for untrusted code.
Controllers on the same machine share that machine's user permissions. The
Vercel app still runs its browser baseline; it does not host this local service.
Hosted execution needs persistent storage, run ownership, account authentication
and a durable execution owner. Python and MCP adapters, agent messaging,
matched-seed comparisons and AI-written summaries remain later slices.
