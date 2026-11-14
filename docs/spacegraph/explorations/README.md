# Explorations

Each file records one take: `<theme>-<seed>.md`. The take is the evidence; the verdicts are the
product output. A take without a findings file is unfinished.

## Record

| Field | Meaning |
|-------|---------|
| Take | Continuous recording under `docs/spacegraph/video/takes/` |
| Cut | 60–120 s cut with the motion intact (optional until the take earns one) |
| Stills | One PNG per mark, extracted from the take |
| Marks | `marks-explore-<theme>.json`; names the beats and their offsets |
| Theme, seed | Reproduce with `GRAPH_EXPLORE_THEME` / `GRAPH_EXPLORE_SEED` |

## Findings

For each pattern the take exercised:

| Pattern | Evidence (mark) | Verdict |
|---------|-----------------|---------|
| ... | `diagnose-02-why-trace` | `keep` / `park` / `change` |

- **keep** — the pattern earns its place; note why.
- **park** — it does not earn its place yet; record the blocker and add it to the kill/park
  register in `SPACEGRAPH.TODO.36.md`.
- **change** — it is close but fights the user; write the smallest change that would fix it.

Mistakes are welcome in a take. Do not cut a detour that exposes a real problem; mark it and write
the finding.

## Capture and render

```bash
cd packages/app
PLAYWRIGHT_BUILD=1 GRAPH_EXPLORE_DEMO=1 GRAPH_EXPLORE_THEME=diagnose GRAPH_EXPLORE_SEED=7 \
  npx playwright test ./e2e/graph/capture-explore.spec.ts

cd ../..
bun run script/copy-capture-video.ts --prefix graph-capture-explore --dest takes/explore-diagnose.webm
bun run script/generate-demo-video.ts \
  --input docs/spacegraph/video/takes/explore-diagnose.webm \
  --marks docs/spacegraph/video/marks-explore-diagnose.json \
  --out docs/spacegraph/video/explore-diagnose.mp4 \
  --stills docs/spacegraph/video/stills/explore-diagnose \
  --mode continuous --no-hook --draft
```

`--mode continuous` never extends the picture. Narration is fitted to the gap before the next mark
(`atempo` up to 1.6×, then trimmed). Omit `--no-hook` only when the marks are numbered and the take
should carry the title/end cards.
