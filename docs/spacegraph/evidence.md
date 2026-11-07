# The Evidence Gap (Critical Path for Product Claim)

## Protocol Defined, Not Executed

**T2.2 (R7.3)** requires n ≥ 5 counterbalanced users, canonical fixture, five investigative tasks:

1. Why did the agent change `src/auth/session.ts`?
2. Which tool calls led to the failing test?
3. What did the subagent contribute?
4. Which changes were made after the failing test?
5. Where did the agent retry or change direction?

**Measured:** task success, time, wrong turns, interactions, preference (1–7), quotes.

## Stop Rule Governs the Product Claim

If the graph does not beat the transcript on the five tasks, **stop feature work**, publish the finding, and keep the library as the deliverable. The RFC (T10.4) will state the result honestly — a negative result is publishable.

## What a Significant Result Looks Like

1. Measured answer to the hypothesis (n ≥ 5, counterbalanced)
2. Usable innovation: hybrid is the entry point, not a mode switch
3. Upstream-ready contribution: flagged, small diff, published deps, review guide
4. Reusable library: contract, adapters, static export, controller, bindings
5. Explorable artifact: exportable (SVG/JSON/HTML), linkable (`#graph:<node>`)
6. Reproducible reviewer experience: provider-free demo, canonical fixture
7. Library adoption evidence: second host runs published contract + adapters

> **Note:** Study recruiting is **deferred** until the system passes the demo gate (F2-F9 fixed, demo video generated). See `SPACEGRAPH.TODO.31.md` Phase 5.1.