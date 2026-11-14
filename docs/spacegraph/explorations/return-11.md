# return · seed 11

- Take: `docs/spacegraph/video/takes/explore-return.webm`
- Cut: `docs/spacegraph/video/explore-return.mp4`
- Stills: `docs/spacegraph/video/stills/explore-return/`
- Marks: `docs/spacegraph/video/marks-explore-return.json`
- Format: 1440×900, 30 fps, 12.8 s continuous

Lanes layout; orbit drift and push-in show session continuity.

## What worked

| Pattern | Evidence | Verdict |
|---------|----------|---------|
| Lanes layout shows session as a continuous lane | `return-01-lanes` | keep |
| Orbit drift in lanes reads as a real camera orbit | `return-02-orbit-drift` | keep |
| Push-in to session node is a deliberate camera motion | `return-03-push-in` | keep |
| Fit after detour recovers framing | `return-05-fit` | keep |

## What fought back

| Pattern | Evidence | Verdict |
|---------|----------|---------|
| "See this run" banner persists through the entire take | every still | change — auto-dismiss after first interaction or while recording |
| Opening static fit on lanes; no establishing motion | `return-00-open` → `return-01-lanes` | change — open on push-in to session, then settle on lanes |
| Orbit drift at `return-02` runs 4.0 s but starts immediately after layout | marks file | change — hold on settled lanes for 3–5 s before orbit drift |
| Push-in at `return-03` runs 3.0 s; good duration but no hold before detour | marks file | change — hold on push-in result for 3–5 s before detour |
| Detour at `return-04` is unmotivated; no visible change in the graph | `return-04-detour` | change — detour must change something the viewer can see (layout, lens, selection) |
| Fit at `return-05` is 0.14 s after detour; snap recovery | marks file | change — pace fit as its own 3–5 s beat, not a snap recovery |

## Next

- Land banner auto-dismiss, then re-shoot `return` with paced beats.
- Add opening push-in; hold on settled layout before camera moves.
- Ensure every detour produces a visible change; pace fit as a beat.