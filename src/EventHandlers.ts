/**
 * Kavach V3 — factory PoolCreated + per-pool Swap indexing.
 * @see https://docs.envio.dev/docs/HyperIndex/dynamic-contracts
 */
import { KavachV3Factory, KavachV3Pool } from 'generated'

function poolEntityId(chainId: number, poolAddress: string): string {
  return `${chainId}-${poolAddress.toLowerCase()}`
}

function absBigint(n: bigint): bigint {
  return n < 0n ? -n : n
}

/** UTC day start (seconds) for bucketing. */
function utcDayStartSeconds(blockTimestamp: bigint): bigint {
  const ts = blockTimestamp
  return (ts / 86400n) * 86400n
}

KavachV3Factory.PoolCreated.contractRegister(({ event, context }) => {
  context.addKavachV3Pool(event.params.pool)
})

KavachV3Factory.PoolCreated.handler(async ({ event, context }) => {
  const poolAddr = event.params.pool.toLowerCase()
  const id = poolEntityId(event.chainId, poolAddr)

  context.Pool.set({
    id,
    chainId: event.chainId,
    address: poolAddr,
    token0: event.params.token0.toLowerCase(),
    token1: event.params.token1.toLowerCase(),
    feeTier: Number(event.params.fee),
    tickSpacing: Number(event.params.tickSpacing),
    volumeToken0: 0n,
    volumeToken1: 0n,
    swapCount: 0,
    createdAt: event.block.timestamp,
  })
})

KavachV3Pool.Swap.handler(async ({ event, context }) => {
  // Preload optimization runs handlers twice; skip mutating pass on preload to avoid double-counting.
  if (context.isPreload) {
    return
  }

  const poolAddr = event.srcAddress.toLowerCase()
  const id = poolEntityId(event.chainId, poolAddr)
  const pool = await context.Pool.get(id)

  if (!pool) {
    context.log.warn(`Swap on unknown pool ${id} — PoolCreated may be missing or reorg`)
    return
  }

  const abs0 = absBigint(event.params.amount0)
  const abs1 = absBigint(event.params.amount1)

  context.Pool.set({
    ...pool,
    volumeToken0: pool.volumeToken0 + abs0,
    volumeToken1: pool.volumeToken1 + abs1,
    swapCount: pool.swapCount + 1,
    lastSwapAt: event.block.timestamp,
  })

  const dayStart = utcDayStartSeconds(event.block.timestamp)
  const dayId = `${id}-${dayStart}`
  const dayRow = await context.PoolDayData.get(dayId)

  context.PoolDayData.set({
    id: dayId,
    pool_id: id,
    chainId: event.chainId,
    dayStart,
    volumeToken0: (dayRow?.volumeToken0 ?? 0n) + abs0,
    volumeToken1: (dayRow?.volumeToken1 ?? 0n) + abs1,
    swapCount: (dayRow?.swapCount ?? 0) + 1,
  })
})
