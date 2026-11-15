/**
 * Shared utility functions for the ASHA web app.
 */

/** Format an INR monetary value as a human-readable string, e.g. "₹1,250.00" */
export function formatCurrency(amount: number, locale = "en-IN"): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** Format a date to a locale-aware medium date string, e.g. "12 Nov 2026" */
export function formatDate(
  date: Date | string,
  locale = "en-IN",
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
}

/**
 * Merge Tailwind class strings, filtering out falsy values.
 * Drop-in replacement for the `cn` / `clsx` pattern without an extra dep.
 */
export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}
