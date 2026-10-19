import {useRouteLoaderData} from '@remix-run/react';

import {DEFAULT_LOCALE} from '~/lib/utils';

/**
 * Locale-aware price formatting — a drop-in replacement for Hydrogen's
 * `<Money>`.
 *
 * Hydrogen's `<Money>` formats through `useMoney()`, which reads its locale
 * from `useShop()` — that is, from a `<ShopifyProvider>` this app never
 * renders. It therefore always falls back to `en-US` and prints Brazilian
 * prices as `R$1,234.56`, while Brazilian shoppers expect `R$ 1.234,56`.
 *
 * This component formats with the locale the loaders actually resolve
 * (`storefront.i18n` → pt-BR), so the currency symbol, the thousands
 * separator and the decimal comma all follow the store language.
 *
 * Props mirror Hydrogen's `<Money>` so existing call sites work unchanged.
 *
 * @param {{
 *   data: {amount?: string | null; currencyCode?: string | null} | null | undefined;
 *   as?: React.ElementType;
 *   withoutCurrency?: boolean;
 *   withoutTrailingZeros?: boolean;
 *   [key: string]: any;
 * }}
 */
export function Money({
  data,
  as: Wrapper = 'div',
  withoutCurrency,
  withoutTrailingZeros,
  ...passthroughProps
}) {
  const rootData = useRouteLoaderData('root');
  const locale = rootData?.selectedLocale ?? DEFAULT_LOCALE;

  const amount = Number(data?.amount ?? 0);
  const currency = data?.currencyCode || locale.currency;
  const intlTag = `${locale.language}-${locale.country}`;

  const currencyFormatter = (options) =>
    new Intl.NumberFormat(intlTag, {style: 'currency', currency, ...options});
  const plainFormatter = (options) => new Intl.NumberFormat(intlTag, options);

  // Whole amounts drop the ",00" tail, matching Hydrogen's behaviour.
  const dropDecimals = {minimumFractionDigits: 0, maximumFractionDigits: 0};
  const isWhole = amount % 1 === 0;

  let output;
  if (withoutCurrency && withoutTrailingZeros) {
    output = isWhole
      ? plainFormatter(dropDecimals).format(amount)
      : plainFormatter().format(amount);
  } else if (withoutCurrency) {
    output = plainFormatter().format(amount);
  } else if (withoutTrailingZeros) {
    output = isWhole
      ? currencyFormatter(dropDecimals).format(amount)
      : currencyFormatter().format(amount);
  } else {
    output = currencyFormatter().format(amount);
  }

  return <Wrapper {...passthroughProps}>{output}</Wrapper>;
}
