/**
 * Конвертация nanotons в TON.
 */
export function priceNanoToTon(pricePerPostNano: string | number | bigint): number {
  const raw = pricePerPostNano;
  const nano =
    typeof raw === 'string' ? BigInt(raw) : typeof raw === 'bigint' ? raw : BigInt(Number(raw) || 0);
  return Number(nano) / 1_000_000_000;
}

/**
 * Форматирование цены в TON для отображения.
 */
export function formatPriceInTon(pricePerPostNano: string | number | bigint): string {
  const ton = priceNanoToTon(pricePerPostNano);
  return ton.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 9,
  });
}
