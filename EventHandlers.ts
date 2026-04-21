import type { Pool } from "generated";
import { KavachV3Factory, KavachV3Pool } from "generated";

const SECONDS_PER_DAY = 86400n;

function poolEntityId(chainId: number, poolAddress: string): string {
  return `${chainId}_${poolAddress.toLowerCase()}`;
}

function absBigInt(n: bigint): bigint {
  return n < 0n ? -n : n;
}

function dayStartTs(blockTimestamp: bigint): bigint {
  return (blockTimestamp / SECONDS_PER_DAY) * SECONDS_PER_DAY;
}

KavachV3Factory.PoolCreated.contractRegister(({ event, context }) => {
  context.addKavachV3Pool(event.params.pool);
});

KavachV3Factory.PoolCreated.handler(async ({ event, context }) => {
  const poolAddr = event.params.pool.toLowerCase();
  const id = poolEntityId(event.chainId, poolAddr);
  const ts = event.block.timestamp;

  const pool: Pool = {
    id,
    chainId: event.chainId,
    address: poolAddr,
    token0: event.params.token0.toLowerCase(),
    token1: event.params.token1.toLowerCase(),
    feeTier: event.params.fee,
    tickSpacing: event.params.tickSpacing,
    volumeToken0: 0n,
    volumeToken1: 0n,
    swapCount: 0,
    createdAt: ts,
    lastSwapAt: undefined,
  };

  context.Pool.set(pool);
});

KavachV3Pool.Swap.handler(async ({ event, context }) => {
  if (context.isPreload) {
    return;
  }

  const poolAddr = event.srcAddress.toLowerCase();
  const poolId = poolEntityId(event.chainId, poolAddr);
  const pool = await context.Pool.get(poolId);

  if (!pool) {
    context.log.warn(
      `Swap on unknown pool ${poolId} — PoolCreated may be missing or start_block too high`
    );
    return;
  }

  const vol0 = absBigInt(event.params.amount0);
  const vol1 = absBigInt(event.params.amount1);
  const ts = event.block.timestamp;

  context.Pool.set({
    ...pool,
    volumeToken0: pool.volumeToken0 + vol0,
    volumeToken1: pool.volumeToken1 + vol1,
    swapCount: pool.swapCount + 1,
    lastSwapAt: ts,
  });

  const dayStart = dayStartTs(ts);
  const dayId = `${poolId}_${dayStart}`;
  const existingDay = await context.PoolDayData.get(dayId);

  if (existingDay) {
    context.PoolDayData.set({
      ...existingDay,
      volumeToken0: existingDay.volumeToken0 + vol0,
      volumeToken1: existingDay.volumeToken1 + vol1,
      swapCount: existingDay.swapCount + 1,
    });
  } else {
    context.PoolDayData.set({
      id: dayId,
      pool_id: poolId,
      chainId: event.chainId,
      dayStart,
      volumeToken0: vol0,
      volumeToken1: vol1,
      swapCount: 1,
    });
  }
});
