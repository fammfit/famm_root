export interface CurrencyEntry {
  /** ISO-4217. */
  code: string;
  name: string;
  symbol: string;
}

// Common-first ordering; the rest is alphabetical. Trainers in the US/EU
// dominate v1 traffic, so we surface those at the top.
export const CURRENCIES: ReadonlyArray<CurrencyEntry> = [
  { code: "USD", name: "US dollar", symbol: "$" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "GBP", name: "British pound", symbol: "£" },
  { code: "CAD", name: "Canadian dollar", symbol: "$" },
  { code: "AUD", name: "Australian dollar", symbol: "$" },
  { code: "NZD", name: "New Zealand dollar", symbol: "$" },
  { code: "CHF", name: "Swiss franc", symbol: "Fr" },
  { code: "JPY", name: "Japanese yen", symbol: "¥" },
  { code: "SEK", name: "Swedish krona", symbol: "kr" },
  { code: "NOK", name: "Norwegian krone", symbol: "kr" },
  { code: "DKK", name: "Danish krone", symbol: "kr" },
  { code: "PLN", name: "Polish złoty", symbol: "zł" },
  { code: "CZK", name: "Czech koruna", symbol: "Kč" },
  { code: "MXN", name: "Mexican peso", symbol: "$" },
  { code: "BRL", name: "Brazilian real", symbol: "R$" },
  { code: "ARS", name: "Argentine peso", symbol: "$" },
  { code: "CLP", name: "Chilean peso", symbol: "$" },
  { code: "COP", name: "Colombian peso", symbol: "$" },
  { code: "ZAR", name: "South African rand", symbol: "R" },
  { code: "AED", name: "UAE dirham", symbol: "د.إ" },
  { code: "ILS", name: "Israeli shekel", symbol: "₪" },
  { code: "INR", name: "Indian rupee", symbol: "₹" },
  { code: "SGD", name: "Singapore dollar", symbol: "$" },
  { code: "HKD", name: "Hong Kong dollar", symbol: "$" },
  { code: "KRW", name: "South Korean won", symbol: "₩" },
  { code: "MYR", name: "Malaysian ringgit", symbol: "RM" },
  { code: "THB", name: "Thai baht", symbol: "฿" },
  { code: "PHP", name: "Philippine peso", symbol: "₱" },
  { code: "IDR", name: "Indonesian rupiah", symbol: "Rp" },
];

export function getCurrency(code: string): CurrencyEntry | undefined {
  return CURRENCIES.find((c) => c.code === code.toUpperCase());
}
