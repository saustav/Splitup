/** ISO 4217 currency with display metadata (flag from ISO 3166-1 alpha-2). */
export type CurrencyOption = {
  code: string;
  name: string;
  symbol: string;
  country: string;
  countryCode: string;
  flag: string;
};

function flagEmoji(countryCode: string): string {
  const code = countryCode.toUpperCase();
  if (code.length !== 2) return '🌐';
  return String.fromCodePoint(
    ...[...code].map((c) => 0x1f1e6 - 65 + c.charCodeAt(0))
  );
}

function c(
  code: string,
  name: string,
  symbol: string,
  country: string,
  countryCode: string
): CurrencyOption {
  return { code, name, symbol, country, countryCode, flag: flagEmoji(countryCode) };
}

/** Default currency for new groups. */
export const DEFAULT_CURRENCY_CODE = 'USD';

const ENTRIES: [string, string, string, string, string][] = [
  ['USD', 'US Dollar', '$', 'United States', 'US'],
  ['EUR', 'Euro', '€', 'Eurozone', 'EU'],
  ['GBP', 'British Pound', '£', 'United Kingdom', 'GB'],
  ['JPY', 'Japanese Yen', '¥', 'Japan', 'JP'],
  ['CNY', 'Chinese Yuan', '¥', 'China', 'CN'],
  ['AUD', 'Australian Dollar', 'A$', 'Australia', 'AU'],
  ['CAD', 'Canadian Dollar', 'C$', 'Canada', 'CA'],
  ['CHF', 'Swiss Franc', 'Fr', 'Switzerland', 'CH'],
  ['HKD', 'Hong Kong Dollar', 'HK$', 'Hong Kong', 'HK'],
  ['SGD', 'Singapore Dollar', 'S$', 'Singapore', 'SG'],
  ['SEK', 'Swedish Krona', 'kr', 'Sweden', 'SE'],
  ['NOK', 'Norwegian Krone', 'kr', 'Norway', 'NO'],
  ['DKK', 'Danish Krone', 'kr', 'Denmark', 'DK'],
  ['NZD', 'New Zealand Dollar', 'NZ$', 'New Zealand', 'NZ'],
  ['KRW', 'South Korean Won', '₩', 'South Korea', 'KR'],
  ['INR', 'Indian Rupee', '₹', 'India', 'IN'],
  ['MXN', 'Mexican Peso', 'MX$', 'Mexico', 'MX'],
  ['BRL', 'Brazilian Real', 'R$', 'Brazil', 'BR'],
  ['ZAR', 'South African Rand', 'R', 'South Africa', 'ZA'],
  ['RUB', 'Russian Ruble', '₽', 'Russia', 'RU'],
  ['TRY', 'Turkish Lira', '₺', 'Turkey', 'TR'],
  ['PLN', 'Polish Złoty', 'zł', 'Poland', 'PL'],
  ['THB', 'Thai Baht', '฿', 'Thailand', 'TH'],
  ['IDR', 'Indonesian Rupiah', 'Rp', 'Indonesia', 'ID'],
  ['MYR', 'Malaysian Ringgit', 'RM', 'Malaysia', 'MY'],
  ['PHP', 'Philippine Peso', '₱', 'Philippines', 'PH'],
  ['VND', 'Vietnamese Dong', '₫', 'Vietnam', 'VN'],
  ['AED', 'UAE Dirham', 'د.إ', 'United Arab Emirates', 'AE'],
  ['SAR', 'Saudi Riyal', '﷼', 'Saudi Arabia', 'SA'],
  ['ILS', 'Israeli Shekel', '₪', 'Israel', 'IL'],
  ['EGP', 'Egyptian Pound', 'E£', 'Egypt', 'EG'],
  ['NGN', 'Nigerian Naira', '₦', 'Nigeria', 'NG'],
  ['KES', 'Kenyan Shilling', 'KSh', 'Kenya', 'KE'],
  ['PKR', 'Pakistani Rupee', '₨', 'Pakistan', 'PK'],
  ['BDT', 'Bangladeshi Taka', '৳', 'Bangladesh', 'BD'],
  ['LKR', 'Sri Lankan Rupee', 'Rs', 'Sri Lanka', 'LK'],
  ['NPR', 'Nepalese Rupee', 'Rs', 'Nepal', 'NP'],
  ['AFN', 'Afghan Afghani', '؋', 'Afghanistan', 'AF'],
  ['ARS', 'Argentine Peso', '$', 'Argentina', 'AR'],
  ['CLP', 'Chilean Peso', '$', 'Chile', 'CL'],
  ['COP', 'Colombian Peso', '$', 'Colombia', 'CO'],
  ['PEN', 'Peruvian Sol', 'S/', 'Peru', 'PE'],
  ['UYU', 'Uruguayan Peso', '$U', 'Uruguay', 'UY'],
  ['BOB', 'Bolivian Boliviano', 'Bs', 'Bolivia', 'BO'],
  ['PYG', 'Paraguayan Guaraní', '₲', 'Paraguay', 'PY'],
  ['CRC', 'Costa Rican Colón', '₡', 'Costa Rica', 'CR'],
  ['GTQ', 'Guatemalan Quetzal', 'Q', 'Guatemala', 'GT'],
  ['HNL', 'Honduran Lempira', 'L', 'Honduras', 'HN'],
  ['NIO', 'Nicaraguan Córdoba', 'C$', 'Nicaragua', 'NI'],
  ['PAB', 'Panamanian Balboa', 'B/.', 'Panama', 'PA'],
  ['DOP', 'Dominican Peso', 'RD$', 'Dominican Republic', 'DO'],
  ['JMD', 'Jamaican Dollar', 'J$', 'Jamaica', 'JM'],
  ['TTD', 'Trinidad Dollar', 'TT$', 'Trinidad and Tobago', 'TT'],
  ['BBD', 'Barbadian Dollar', 'Bds$', 'Barbados', 'BB'],
  ['BSD', 'Bahamian Dollar', 'B$', 'Bahamas', 'BS'],
  ['BZD', 'Belize Dollar', 'BZ$', 'Belize', 'BZ'],
  ['XCD', 'East Caribbean Dollar', 'EC$', 'Eastern Caribbean', 'AG'],
  ['CZK', 'Czech Koruna', 'Kč', 'Czech Republic', 'CZ'],
  ['HUF', 'Hungarian Forint', 'Ft', 'Hungary', 'HU'],
  ['RON', 'Romanian Leu', 'lei', 'Romania', 'RO'],
  ['BGN', 'Bulgarian Lev', 'лв', 'Bulgaria', 'BG'],
  ['HRK', 'Croatian Kuna', 'kn', 'Croatia', 'HR'],
  ['ISK', 'Icelandic Króna', 'kr', 'Iceland', 'IS'],
  ['UAH', 'Ukrainian Hryvnia', '₴', 'Ukraine', 'UA'],
  ['BYN', 'Belarusian Ruble', 'Br', 'Belarus', 'BY'],
  ['MDL', 'Moldovan Leu', 'L', 'Moldova', 'MD'],
  ['GEL', 'Georgian Lari', '₾', 'Georgia', 'GE'],
  ['AMD', 'Armenian Dram', '֏', 'Armenia', 'AM'],
  ['AZN', 'Azerbaijani Manat', '₼', 'Azerbaijan', 'AZ'],
  ['KZT', 'Kazakhstani Tenge', '₸', 'Kazakhstan', 'KZ'],
  ['UZS', 'Uzbekistani Som', 'soʻm', 'Uzbekistan', 'UZ'],
  ['TJS', 'Tajikistani Somoni', 'SM', 'Tajikistan', 'TJ'],
  ['KGS', 'Kyrgyzstani Som', 'с', 'Kyrgyzstan', 'KG'],
  ['TMT', 'Turkmenistani Manat', 'm', 'Turkmenistan', 'TM'],
  ['MNT', 'Mongolian Tögrög', '₮', 'Mongolia', 'MN'],
  ['TWD', 'New Taiwan Dollar', 'NT$', 'Taiwan', 'TW'],
  ['MOP', 'Macanese Pataca', 'MOP$', 'Macau', 'MO'],
  ['KHR', 'Cambodian Riel', '៛', 'Cambodia', 'KH'],
  ['LAK', 'Lao Kip', '₭', 'Laos', 'LA'],
  ['MMK', 'Myanmar Kyat', 'K', 'Myanmar', 'MM'],
  ['BND', 'Brunei Dollar', 'B$', 'Brunei', 'BN'],
  ['FJD', 'Fijian Dollar', 'FJ$', 'Fiji', 'FJ'],
  ['PGK', 'Papua New Guinean Kina', 'K', 'Papua New Guinea', 'PG'],
  ['WST', 'Samoan Tālā', 'WS$', 'Samoa', 'WS'],
  ['TOP', 'Tongan Paʻanga', 'T$', 'Tonga', 'TO'],
  ['VUV', 'Vanuatu Vatu', 'VT', 'Vanuatu', 'VU'],
  ['SBD', 'Solomon Islands Dollar', 'SI$', 'Solomon Islands', 'SB'],
  ['XPF', 'CFP Franc', '₣', 'French Pacific', 'PF'],
  ['MAD', 'Moroccan Dirham', 'د.م.', 'Morocco', 'MA'],
  ['TND', 'Tunisian Dinar', 'د.ت', 'Tunisia', 'TN'],
  ['DZD', 'Algerian Dinar', 'د.ج', 'Algeria', 'DZ'],
  ['LYD', 'Libyan Dinar', 'ل.د', 'Libya', 'LY'],
  ['ETB', 'Ethiopian Birr', 'Br', 'Ethiopia', 'ET'],
  ['GHS', 'Ghanaian Cedi', '₵', 'Ghana', 'GH'],
  ['TZS', 'Tanzanian Shilling', 'TSh', 'Tanzania', 'TZ'],
  ['UGX', 'Ugandan Shilling', 'USh', 'Uganda', 'UG'],
  ['RWF', 'Rwandan Franc', 'FRw', 'Rwanda', 'RW'],
  ['XOF', 'West African CFA Franc', 'CFA', 'Senegal', 'SN'],
  ['XAF', 'Central African CFA Franc', 'FCFA', 'Cameroon', 'CM'],
  ['AOA', 'Angolan Kwanza', 'Kz', 'Angola', 'AO'],
  ['MZN', 'Mozambican Metical', 'MT', 'Mozambique', 'MZ'],
  ['ZMW', 'Zambian Kwacha', 'ZK', 'Zambia', 'ZM'],
  ['BWP', 'Botswana Pula', 'P', 'Botswana', 'BW'],
  ['NAD', 'Namibian Dollar', 'N$', 'Namibia', 'NA'],
  ['MUR', 'Mauritian Rupee', '₨', 'Mauritius', 'MU'],
  ['SCR', 'Seychellois Rupee', '₨', 'Seychelles', 'SC'],
  ['MVR', 'Maldivian Rufiyaa', 'Rf', 'Maldives', 'MV'],
  ['QAR', 'Qatari Riyal', '﷼', 'Qatar', 'QA'],
  ['KWD', 'Kuwaiti Dinar', 'د.ك', 'Kuwait', 'KW'],
  ['BHD', 'Bahraini Dinar', '.د.ب', 'Bahrain', 'BH'],
  ['OMR', 'Omani Rial', '﷼', 'Oman', 'OM'],
  ['JOD', 'Jordanian Dinar', 'د.ا', 'Jordan', 'JO'],
  ['LBP', 'Lebanese Pound', 'ل.ل', 'Lebanon', 'LB'],
  ['IQD', 'Iraqi Dinar', 'ع.د', 'Iraq', 'IQ'],
  ['IRR', 'Iranian Rial', '﷼', 'Iran', 'IR'],
  ['YER', 'Yemeni Rial', '﷼', 'Yemen', 'YE'],
  ['SYP', 'Syrian Pound', '£S', 'Syria', 'SY'],
  ['ALL', 'Albanian Lek', 'L', 'Albania', 'AL'],
  ['MKD', 'Macedonian Denar', 'ден', 'North Macedonia', 'MK'],
  ['RSD', 'Serbian Dinar', 'дин', 'Serbia', 'RS'],
  ['BAM', 'Bosnia Mark', 'KM', 'Bosnia and Herzegovina', 'BA'],
];

export const CURRENCIES: CurrencyOption[] = ENTRIES.map(([code, name, symbol, country, countryCode]) =>
  c(code, name, symbol, country, countryCode)
);

/** USD first, then alphabetical by ISO 4217 code. */
export const CURRENCIES_SORTED: CurrencyOption[] = [
  ...CURRENCIES.filter((x) => x.code === DEFAULT_CURRENCY_CODE),
  ...CURRENCIES.filter((x) => x.code !== DEFAULT_CURRENCY_CODE).sort((a, b) =>
    a.code.localeCompare(b.code)
  ),
];

const byCode = new Map(CURRENCIES.map((item) => [item.code, item]));

export function getCurrencyByCode(code: string): CurrencyOption | undefined {
  return byCode.get(code.toUpperCase());
}

export function currencyLabel(option: CurrencyOption): string {
  return `${option.flag} ${option.code} — ${option.name} (${option.country})`;
}

export function isValidCurrencyCode(code: string): boolean {
  return byCode.has(code.toUpperCase());
}
