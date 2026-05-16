export type RegionLabel = "State" | "Province" | "County" | "Region" | "Department" | "Prefecture";
export type PostalLabel = "Postal code" | "ZIP code" | "Postcode" | "PIN code";

export interface CountryEntry {
  /** ISO-3166-1 alpha-2. */
  code: string;
  /** English display name. */
  name: string;
  /** Default currency for the country (ISO-4217). */
  defaultCurrency: string;
  regionLabel: RegionLabel;
  postalLabel: PostalLabel;
  /** Lightweight postal-code regex — soft hint only, not a hard block. */
  postalRegex?: RegExp;
  /** Tax / registration label shown in the Money section. */
  taxLabel: string;
  /** Country has no postal code system at all. */
  noPostal?: boolean;
}

const C: ReadonlyArray<CountryEntry> = [
  {
    code: "US",
    name: "United States",
    defaultCurrency: "USD",
    regionLabel: "State",
    postalLabel: "ZIP code",
    postalRegex: /^\d{5}(-\d{4})?$/,
    taxLabel: "EIN",
  },
  {
    code: "CA",
    name: "Canada",
    defaultCurrency: "CAD",
    regionLabel: "Province",
    postalLabel: "Postal code",
    postalRegex: /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/,
    taxLabel: "GST/HST number",
  },
  {
    code: "GB",
    name: "United Kingdom",
    defaultCurrency: "GBP",
    regionLabel: "County",
    postalLabel: "Postcode",
    taxLabel: "VAT number",
  },
  {
    code: "IE",
    name: "Ireland",
    defaultCurrency: "EUR",
    regionLabel: "County",
    postalLabel: "Postcode",
    taxLabel: "VAT number",
  },
  {
    code: "AU",
    name: "Australia",
    defaultCurrency: "AUD",
    regionLabel: "State",
    postalLabel: "Postcode",
    postalRegex: /^\d{4}$/,
    taxLabel: "ABN",
  },
  {
    code: "NZ",
    name: "New Zealand",
    defaultCurrency: "NZD",
    regionLabel: "Region",
    postalLabel: "Postcode",
    postalRegex: /^\d{4}$/,
    taxLabel: "NZBN",
  },
  {
    code: "DE",
    name: "Germany",
    defaultCurrency: "EUR",
    regionLabel: "Region",
    postalLabel: "Postal code",
    postalRegex: /^\d{5}$/,
    taxLabel: "VAT number",
  },
  {
    code: "FR",
    name: "France",
    defaultCurrency: "EUR",
    regionLabel: "Region",
    postalLabel: "Postal code",
    postalRegex: /^\d{5}$/,
    taxLabel: "VAT number",
  },
  {
    code: "ES",
    name: "Spain",
    defaultCurrency: "EUR",
    regionLabel: "Region",
    postalLabel: "Postal code",
    postalRegex: /^\d{5}$/,
    taxLabel: "VAT number",
  },
  {
    code: "IT",
    name: "Italy",
    defaultCurrency: "EUR",
    regionLabel: "Region",
    postalLabel: "Postal code",
    postalRegex: /^\d{5}$/,
    taxLabel: "VAT number",
  },
  {
    code: "PT",
    name: "Portugal",
    defaultCurrency: "EUR",
    regionLabel: "Region",
    postalLabel: "Postal code",
    postalRegex: /^\d{4}-\d{3}$/,
    taxLabel: "VAT number",
  },
  {
    code: "NL",
    name: "Netherlands",
    defaultCurrency: "EUR",
    regionLabel: "Region",
    postalLabel: "Postal code",
    postalRegex: /^\d{4} ?[A-Za-z]{2}$/,
    taxLabel: "VAT number",
  },
  {
    code: "BE",
    name: "Belgium",
    defaultCurrency: "EUR",
    regionLabel: "Region",
    postalLabel: "Postal code",
    postalRegex: /^\d{4}$/,
    taxLabel: "VAT number",
  },
  {
    code: "CH",
    name: "Switzerland",
    defaultCurrency: "CHF",
    regionLabel: "Region",
    postalLabel: "Postal code",
    postalRegex: /^\d{4}$/,
    taxLabel: "VAT number",
  },
  {
    code: "AT",
    name: "Austria",
    defaultCurrency: "EUR",
    regionLabel: "Region",
    postalLabel: "Postal code",
    postalRegex: /^\d{4}$/,
    taxLabel: "VAT number",
  },
  {
    code: "DK",
    name: "Denmark",
    defaultCurrency: "DKK",
    regionLabel: "Region",
    postalLabel: "Postal code",
    postalRegex: /^\d{4}$/,
    taxLabel: "VAT number",
  },
  {
    code: "SE",
    name: "Sweden",
    defaultCurrency: "SEK",
    regionLabel: "Region",
    postalLabel: "Postal code",
    postalRegex: /^\d{3} ?\d{2}$/,
    taxLabel: "VAT number",
  },
  {
    code: "NO",
    name: "Norway",
    defaultCurrency: "NOK",
    regionLabel: "Region",
    postalLabel: "Postal code",
    postalRegex: /^\d{4}$/,
    taxLabel: "VAT number",
  },
  {
    code: "FI",
    name: "Finland",
    defaultCurrency: "EUR",
    regionLabel: "Region",
    postalLabel: "Postal code",
    postalRegex: /^\d{5}$/,
    taxLabel: "VAT number",
  },
  {
    code: "PL",
    name: "Poland",
    defaultCurrency: "PLN",
    regionLabel: "Region",
    postalLabel: "Postal code",
    postalRegex: /^\d{2}-\d{3}$/,
    taxLabel: "VAT number",
  },
  {
    code: "CZ",
    name: "Czechia",
    defaultCurrency: "CZK",
    regionLabel: "Region",
    postalLabel: "Postal code",
    postalRegex: /^\d{3} ?\d{2}$/,
    taxLabel: "VAT number",
  },
  {
    code: "MX",
    name: "Mexico",
    defaultCurrency: "MXN",
    regionLabel: "State",
    postalLabel: "Postal code",
    postalRegex: /^\d{5}$/,
    taxLabel: "RFC",
  },
  {
    code: "BR",
    name: "Brazil",
    defaultCurrency: "BRL",
    regionLabel: "State",
    postalLabel: "Postal code",
    postalRegex: /^\d{5}-?\d{3}$/,
    taxLabel: "CNPJ",
  },
  {
    code: "AR",
    name: "Argentina",
    defaultCurrency: "ARS",
    regionLabel: "Province",
    postalLabel: "Postal code",
    taxLabel: "CUIT",
  },
  {
    code: "CL",
    name: "Chile",
    defaultCurrency: "CLP",
    regionLabel: "Region",
    postalLabel: "Postal code",
    taxLabel: "RUT",
  },
  {
    code: "CO",
    name: "Colombia",
    defaultCurrency: "COP",
    regionLabel: "Department",
    postalLabel: "Postal code",
    taxLabel: "NIT",
  },
  {
    code: "ZA",
    name: "South Africa",
    defaultCurrency: "ZAR",
    regionLabel: "Province",
    postalLabel: "Postal code",
    postalRegex: /^\d{4}$/,
    taxLabel: "Tax number",
  },
  {
    code: "AE",
    name: "United Arab Emirates",
    defaultCurrency: "AED",
    regionLabel: "Region",
    postalLabel: "Postal code",
    taxLabel: "TRN",
  },
  {
    code: "IL",
    name: "Israel",
    defaultCurrency: "ILS",
    regionLabel: "Region",
    postalLabel: "Postal code",
    postalRegex: /^\d{5}(\d{2})?$/,
    taxLabel: "Tax ID",
  },
  {
    code: "IN",
    name: "India",
    defaultCurrency: "INR",
    regionLabel: "State",
    postalLabel: "PIN code",
    postalRegex: /^\d{6}$/,
    taxLabel: "GSTIN",
  },
  {
    code: "SG",
    name: "Singapore",
    defaultCurrency: "SGD",
    regionLabel: "Region",
    postalLabel: "Postal code",
    postalRegex: /^\d{6}$/,
    taxLabel: "UEN",
  },
  {
    code: "HK",
    name: "Hong Kong",
    defaultCurrency: "HKD",
    regionLabel: "Region",
    postalLabel: "Postal code",
    noPostal: true,
    taxLabel: "BR number",
  },
  {
    code: "JP",
    name: "Japan",
    defaultCurrency: "JPY",
    regionLabel: "Prefecture",
    postalLabel: "Postal code",
    postalRegex: /^\d{3}-?\d{4}$/,
    taxLabel: "Tax ID",
  },
  {
    code: "KR",
    name: "South Korea",
    defaultCurrency: "KRW",
    regionLabel: "Region",
    postalLabel: "Postal code",
    postalRegex: /^\d{5}$/,
    taxLabel: "Tax ID",
  },
  {
    code: "MY",
    name: "Malaysia",
    defaultCurrency: "MYR",
    regionLabel: "State",
    postalLabel: "Postal code",
    postalRegex: /^\d{5}$/,
    taxLabel: "Tax ID",
  },
  {
    code: "TH",
    name: "Thailand",
    defaultCurrency: "THB",
    regionLabel: "Region",
    postalLabel: "Postal code",
    postalRegex: /^\d{5}$/,
    taxLabel: "Tax ID",
  },
  {
    code: "PH",
    name: "Philippines",
    defaultCurrency: "PHP",
    regionLabel: "Region",
    postalLabel: "Postal code",
    postalRegex: /^\d{4}$/,
    taxLabel: "TIN",
  },
  {
    code: "ID",
    name: "Indonesia",
    defaultCurrency: "IDR",
    regionLabel: "Region",
    postalLabel: "Postal code",
    postalRegex: /^\d{5}$/,
    taxLabel: "NPWP",
  },
];

export const COUNTRIES: ReadonlyArray<CountryEntry> = C;

const FALLBACK: CountryEntry = {
  code: "ZZ",
  name: "Other",
  defaultCurrency: "USD",
  regionLabel: "Region",
  postalLabel: "Postal code",
  taxLabel: "Tax ID",
};

export function getCountry(code: string): CountryEntry {
  const c = COUNTRIES.find((x) => x.code === code.toUpperCase());
  return c ?? FALLBACK;
}

export function detectCountryFromLocale(locale: string | undefined): string {
  if (!locale) return "US";
  const parts = locale.split(/[-_]/);
  const region = parts[1] ?? "";
  const code = region.toUpperCase();
  return COUNTRIES.some((c) => c.code === code) ? code : "US";
}
