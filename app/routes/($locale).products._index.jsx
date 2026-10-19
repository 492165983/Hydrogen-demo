import {json} from '@shopify/remix-oxygen';
import {useLoaderData} from '@remix-run/react';
import invariant from 'tiny-invariant';
import {
  Pagination,
  getPaginationVariables,
  getSeoMeta,
} from '@shopify/hydrogen';

import {Button} from '~/components/Button';
import {ProductCard} from '~/components/ProductCard';
import {SortFilter, FILTER_URL_PREFIX} from '~/components/SortFilter';
import {PRODUCT_CARD_FRAGMENT} from '~/data/fragments';
import {getImageLoadingPriority} from '~/lib/const';
import {seoPayload} from '~/lib/seo.server';
import {routeHeaders} from '~/data/cache';
import {parseAsCurrency} from '~/lib/utils';

const PAGE_BY = 12;

export const headers = routeHeaders;

// The three product categories in the catalog (pt-BR labels → Shopify productType).
const PRODUCT_TYPE_MAP = [
  {label: 'Smartphones', value: 'Smartphone'},
  {label: 'Rugged Phones', value: 'Rugged Phones'},
  {label: 'Rugged Tablets', value: 'Rugged Tablet'},
];

// Option names that carry a color, across the store's inconsistent naming.
const COLOR_OPTION_NAMES = new Set(['color', 'cor', 'colour', '颜色']);

/**
 * @param {LoaderFunctionArgs}
 */
export async function loader({request, context: {storefront}}) {
  const paginationVariables = getPaginationVariables(request, {
    pageBy: PAGE_BY,
  });
  const locale = storefront.i18n;

  const searchParams = new URL(request.url).searchParams;
  const {sortKey, reverse} = getSortValuesFromParam(searchParams.get('sort'));
  // Root-level products query has no `filters` arg — translate to query syntax.
  const searchQuery = filtersToSearchQuery(searchParams);

  const data = await storefront.query(ALL_PRODUCTS_QUERY, {
    variables: {
      ...paginationVariables,
      query: searchQuery,
      sortKey,
      reverse,
      country: locale.country,
      language: locale.language,
    },
  });

  invariant(data, 'No data returned from Shopify API');

  // Aggregate sidebar facets from up to 100 products.
  const colorMap = new Map();
  const typeCounts = new Map();
  for (const node of data.facets?.nodes ?? []) {
    if (node.productType) {
      typeCounts.set(node.productType, (typeCounts.get(node.productType) ?? 0) + 1);
    }
    for (const option of node.options ?? []) {
      if (!COLOR_OPTION_NAMES.has(option.name.toLowerCase())) continue;
      for (const value of option.optionValues ?? []) {
        const key = value.name.toLowerCase();
        const entry = colorMap.get(key) ?? {
          label: value.name,
          value: value.name,
          swatch: value.swatch?.color ?? null,
          names: new Map(),
          count: 0,
        };
        entry.count += 1;
        entry.names.set(option.name, (entry.names.get(option.name) ?? 0) + 1);
        if (!entry.swatch && value.swatch?.color) entry.swatch = value.swatch.color;
        colorMap.set(key, entry);
      }
    }
  }
  const colorValues = [...colorMap.values()]
    .map((entry) => ({
      name: [...entry.names.entries()].sort((a, b) => b[1] - a[1])[0][0],
      label: entry.label,
      value: entry.value,
      swatch: entry.swatch,
      count: entry.count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 24);

  const productTypes = PRODUCT_TYPE_MAP.map((pt) => ({
    ...pt,
    count: typeCounts.get(pt.value) ?? 0,
  }));

  const seo = seoPayload.collection({
    url: request.url,
    collection: {
      id: 'all-products',
      title: 'Todos os produtos',
      handle: 'products',
      descriptionHtml: 'Todos os produtos da loja',
      description: 'Todos os produtos da loja',
      seo: {
        title: 'Todos os produtos',
        description: 'Todos os produtos da loja',
      },
      metafields: [],
      products: data.products,
      updatedAt: '',
    },
  });

  const appliedFilters = buildAppliedFilters(searchParams, locale);

  return json({
    products: data.products,
    appliedFilters,
    colorValues,
    productTypes,
    seo,
  });
}

/**
 * Translate filter URL params into the products(query:) search syntax.
 * @param {URLSearchParams} searchParams
 * @returns {string | null}
 */
function filtersToSearchQuery(searchParams) {
  const terms = [];
  for (const [key, raw] of searchParams.entries()) {
    if (!key.startsWith(FILTER_URL_PREFIX)) continue;
    const filterKey = key.substring(FILTER_URL_PREFIX.length);
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      continue;
    }
    switch (filterKey) {
      case 'available':
        if (parsed === true) terms.push('available:true');
        break;
      case 'price':
        if (parsed?.min != null) terms.push(`price:>=${parsed.min}`);
        if (parsed?.max != null) terms.push(`price:<=${parsed.max}`);
        break;
      case 'productType':
        terms.push(`product_type:'${parsed}'`);
        break;
      case 'variantOption':
        if (parsed?.name && parsed?.value) {
          terms.push(`variant_option:${parsed.name}:'${parsed.value}'`);
        }
        break;
      default:
        break;
    }
  }
  return terms.length ? terms.join(' ') : null;
}

/**
 * @param {URLSearchParams} searchParams
 * @param {typeof storefront.i18n} locale
 */
function buildAppliedFilters(searchParams, locale) {
  const chips = [];
  for (const [key, raw] of searchParams.entries()) {
    if (!key.startsWith(FILTER_URL_PREFIX)) continue;
    const filterKey = key.substring(FILTER_URL_PREFIX.length);
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      continue;
    }
    let label = null;
    switch (filterKey) {
      case 'available':
        if (parsed === true) label = 'Em estoque';
        break;
      case 'price': {
        const min = parsed?.min != null ? parseAsCurrency(parsed.min, locale) : '';
        const max = parsed?.max != null ? parseAsCurrency(parsed.max, locale) : '';
        label =
          min && max ? `${min} - ${max}` : min ? `≥ ${min}` : max ? `≤ ${max}` : 'Preço';
        break;
      }
      case 'productType':
        label =
          PRODUCT_TYPE_MAP.find((pt) => pt.value === parsed)?.label ?? parsed;
        break;
      case 'variantOption':
        label = parsed?.value;
        break;
      default:
        break;
    }
    if (label) chips.push({filter: {[filterKey]: parsed}, label});
  }
  return chips;
}

/**
 * @param {{matches: any}}
 */
export const meta = ({matches}) => {
  return getSeoMeta(...matches.map((match) => match.data.seo));
};

export default function AllProducts() {
  /** @type {LoaderReturnData} */
  const {products, appliedFilters, colorValues, productTypes} = useLoaderData();

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 md:px-8 py-6">
      <h1 className="mb-6 text-2xl font-bold md:text-3xl">Todos os produtos</h1>

      <SortFilter
        appliedFilters={appliedFilters}
        colorValues={colorValues}
        productTypes={productTypes}
      >
        <Pagination connection={products}>
          {({nodes, isLoading, NextLink, PreviousLink, hasNextPage}) => (
            <>
              <div
                className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5"
                data-test="product-grid"
              >
                {nodes.map((product, i) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    loading={getImageLoadingPriority(i)}
                  />
                ))}
              </div>
              <div className="flex items-center justify-center mt-8 gap-4">
                <Button as={PreviousLink} variant="secondary">
                  {isLoading ? 'Carregando...' : 'Anteriores'}
                </Button>
                {hasNextPage && (
                  <Button as={NextLink} variant="secondary">
                    {isLoading ? 'Carregando...' : 'Carregar mais produtos'}
                  </Button>
                )}
              </div>
            </>
          )}
        </Pagination>
      </SortFilter>
    </div>
  );
}

const ALL_PRODUCTS_QUERY = `#graphql
  query AllProducts(
    $country: CountryCode
    $language: LanguageCode
    $query: String
    $sortKey: ProductSortKeys
    $reverse: Boolean
    $first: Int
    $last: Int
    $startCursor: String
    $endCursor: String
  ) @inContext(country: $country, language: $language) {
    products(
      first: $first,
      last: $last,
      before: $startCursor,
      after: $endCursor,
      query: $query,
      sortKey: $sortKey,
      reverse: $reverse
    ) {
      nodes {
        ...ProductCard
      }
      pageInfo {
        hasPreviousPage
        hasNextPage
        startCursor
        endCursor
      }
    }
    facets: products(first: 100) {
      nodes {
        productType
        options {
          name
          optionValues {
            name
            swatch {
              color
            }
          }
        }
      }
    }
  }
  ${PRODUCT_CARD_FRAGMENT}
`;

/**
 * @param {SortParam | null} sortParam
 */
function getSortValuesFromParam(sortParam) {
  switch (sortParam) {
    case 'price-high-low':
      return {sortKey: 'PRICE', reverse: true};
    case 'price-low-high':
      return {sortKey: 'PRICE', reverse: false};
    case 'best-selling':
      return {sortKey: 'BEST_SELLING', reverse: false};
    case 'newest':
      return {sortKey: 'CREATED_AT', reverse: true};
    // products query has no MANUAL / RELEVANCE sort — fall back to best selling
    default:
      return {sortKey: 'BEST_SELLING', reverse: false};
  }
}

/** @typedef {import('@shopify/remix-oxygen').MetaArgs} MetaArgs */
/** @typedef {import('@shopify/remix-oxygen').LoaderFunctionArgs} LoaderFunctionArgs */
/** @typedef {import('@shopify/hydrogen/storefront-api-types').ProductFilter} ProductFilter */
/** @typedef {import('~/components/SortFilter').SortParam} SortParam */
/** @typedef {ReturnType<typeof useLoaderData<typeof loader>>} LoaderReturnData */
