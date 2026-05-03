export function computeProbabilitiesFromReserves(reserves: bigint[]): bigint[] {
  if (reserves.length === 0 || reserves.some((reserve) => reserve === 0n)) {
    return reserves.map(() => 0n);
  }

  const scale = 10n ** 18n;
  const inverseBalances = reserves.map((reserve) => (scale * scale) / reserve);
  const inverseSum = inverseBalances.reduce((sum, value) => sum + value, 0n);

  if (inverseSum === 0n) {
    return reserves.map(() => 0n);
  }

  return inverseBalances.map((value) => (value * scale) / inverseSum);
}
