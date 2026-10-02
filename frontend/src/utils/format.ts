/**
 * Safely converts any value (string, number, null, undefined) to a number,
 * then formats it with the given number of decimal places.
 *
 * PostgreSQL NUMERIC/DECIMAL columns are serialised as strings by the `pg`
 * driver, so never call `.toFixed()` directly on a value from the API.
 *
 * Usage:
 *   fmt(invoice.total_amount)        → "150.00"
 *   fmt(invoice.total_amount, 0)     → "150"
 *   fmt(undefined)                   → "0.00"
 */
export const fmt = (value: unknown, decimals = 2): string => {
  const num = parseFloat(String(value ?? 0));
  return (isNaN(num) ? 0 : num).toFixed(decimals);
};

/**
 * Returns a numeric value safely coerced from any API response field.
 * Useful when you need to do arithmetic on the result before formatting.
 *
 * Usage:
 *   const total = toNum(inv.total_amount) - toNum(inv.amount_paid);
 */
export const toNum = (value: unknown): number => {
  const num = parseFloat(String(value ?? 0));
  return isNaN(num) ? 0 : num;
};
