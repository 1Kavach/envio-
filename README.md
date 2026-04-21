# Kavachswap — Envio indexer (V3 CLMM)

Indexes **KavachV3Factory** `PoolCreated` on **Base (8453)** and **Ethereum (1)**, registers each **KavachV3Pool** dynamically, and aggregates **Swap** volume into:

- **`Pool`** — lifetime `volumeToken0` / `volumeToken1`, `swapCount`, `lastSwapAt`
- **`PoolDayData`** — per-UTC-day buckets (for charts / rolling windows)

Factory addresses match the Kavach repo deployment receipts:

| Network | `KavachV3Factory` (from `deployments/`) |
|--------|-------------------------------------------|
| Base   | `0xb466D255cF671634Af91afa740Ce038A89734f9a` |
| Mainnet| `0x4d659c45CA59f04C9a5c0C4Ce7c22e64faE47c2F` |

## Which GitHub repo?

- Point **Envio Hosted** at **`1kavach/kavachswap`** and set the indexer root to this **`envio/`** folder **if** the dashboard allows a subdirectory; otherwise copy these files to the **repo root** of `kavachswap`.
- **`1kavach/stablecoin`** is separate: add another Envio project there when you know which stablecoin contracts/events to index.

## Windows

The Envio npm package **does not include a native Windows CLI binary**. Use one of:

1. **WSL2** (Ubuntu) — Node 22+, `pnpm` or `npm`, then `pnpm codegen` / `pnpm dev` (Docker for local Hasura stack).
2. **Envio Hosted only** — push to GitHub, connect the repo; their builders run codegen/deploy.

## Commands (Linux / macOS / WSL)

```bash
cd envio
pnpm install   # recommended; npm install also works where the binary exists
pnpm codegen
pnpm dev       # local Docker graph + indexer
```

After deploy, copy the **GraphQL URL** into your Kavach BFF as `ENVIO_GRAPHQL_URL` (one deployment per indexer; multichain data is merged here with `chainId` on each row).

## Example: top pools by lifetime volume (adjust to your Hasura/Envio GraphQL shape)

See `queries/example-top-pools.graphql`. Generated field names may differ slightly; introspect the endpoint after first sync.

## Scope (v1)

- **Included:** Kavach **V3** factory + pools, **Swap** aggregates, **Base + Ethereum** in one indexer (`unordered_multichain_mode`).
- **Not included yet:** Stable / CPMM factories, token metadata (symbol/decimals), USD normalization, "native pools only" owner filter. Add in a follow-up pass.
