/**
 * Formatting utilities for currency and numbers
 */

/**
 * Formats a number as Indonesian Rupiah with clean handling of positive and negative values.
 * e.g. 161000 -> "Rp 161.000"
 *     -58000  -> "-Rp 58.000"
 */
export const formatCurrency = (amount: number, prefix: string = "Rp "): string => {
  if (amount < 0) {
    return `-Rp ${Math.abs(amount).toLocaleString("id-ID")}`;
  }
  return `${prefix}${amount.toLocaleString("id-ID")}`;
};

/**
 * Formats signed cashflow amounts
 * e.g. +161000 -> "+ Rp 161.000"
 *      -58000  -> "- Rp 58.000"
 */
export const formatSignedCurrency = (amount: number, isIncome: boolean): string => {
  const sign = isIncome ? "+ " : "- ";
  return `${sign}Rp ${Math.abs(amount).toLocaleString("id-ID")}`;
};
