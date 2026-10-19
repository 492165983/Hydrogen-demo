/**
 * Locales the storefront serves.
 *
 * This shop sells to Brazil only and Brazilian Portuguese (`pt-BR`) is its
 * default language, so a single locale is enough. The `default` entry is used
 * for unprefixed URLs — i.e. every page is Portuguese unless a prefix says
 * otherwise. `getLocaleFromRequest` falls back to `default` for any unknown
 * prefix, so `/pt-br/...` URLs also resolve to Portuguese.
 *
 * @type {Record<string, Locale>}
 */
export const countries = {
  default: {
    label: 'Brasil (BRL R$)',
    language: 'PT',
    country: 'BR',
    currency: 'BRL',
  },
};

/** @typedef {import('~/lib/type').Localizations} Localizations */
/** @typedef {import('~/lib/type').Locale} Locale */
