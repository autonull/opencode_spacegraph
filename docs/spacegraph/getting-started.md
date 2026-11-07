# Getting Started with SpaceGraph Fork

## Development Mode (Library + Fork Together)

```bash
git clone <fork-url>
cd <fork>
bun run graph:setup      # clones spacegraphjs/ at pinned tag, installs both trees
bun run graph:dev        # starts dev server (mock backend, no provider needed)
```

## Consumption Mode (Published Packages Only)

```bash
git clone <fork-url> -b session-graph
cd <fork>
bun install              # no spacegraphjs/ directory needed
bun run graph:dev
```

## Verification Commands

```bash
bun run graph:verify           # full gate
bun run graph:capture --mode=verify  # assert screenshots
bun run graph:scale            # performance budget
```

## Hosted Demo (When Deployed)

- Library contract demo: `https://autonull.github.io/spacegraphjs7/contract.html`
- Second host (framework-free): `https://autonull.github.io/spacegraphjs7/second-host.html`