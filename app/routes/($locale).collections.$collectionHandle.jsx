import {useEffect} from 'react';
import {json} from '@shopify/remix-oxygen';
import {useLoaderData, useNavigate} from '@remix-run/react';
import {useInView} from 'react-intersection-observer';
import {
  Pagination,
  Image,
  getPaginationVariables,
  Analytics,
  getSeoMeta,
} from '@shopify/hydrogen';
import invariant from 'tiny-invariant';

import {Text} from '~/components/Text';
import {Button} from '~/components/Button';
import {ProductCard} from '~/components/ProductCard';
import {SortFilter, FILTER_URL_PREFIX} from '~/components/SortFilter';
import {PRODUCT_CARD_FRAGMENT} from '~/data/fragments';
import {routeHeaders} from '~/data/cache';
import {seoPayload} from '~/lib/seo.server';
import {getImageLoadingPriority} from '~/lib/const';
import {parseAsCurrency} from '~/lib/utils';

export const headers = routeHeaders;

const PAGE_BY = 12;

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
export async function loader({params, request, context}) {
  const paginationVariables = getPaginationVariables(request, {
    pageBy: PAGE_BY,
  });
  const {collectionHandle} = params;
  const locale = context.storefront.i18n;

  invariant(collectionHandle, 'Missing collectionHandle param');

  const searchParams = new URL(request.url).searchParams;

  const {sortKey, reverse} = getSortValuesFromParam(searchParams.get('sort'));
  const filters = parseFilterParams(searchParams);

  const {collection} = await context.storefront.query(COLLECTION_QUERY, {
    variables: {
      ...paginationVariables,
      handle: collectionHandle,
      filters,
      sortKey,
      reverse,
      country: context.storefront.i18n.country,
      language: context.storefront.i18n.language,
    },
  });

  if (!collection) {
    throw new Response('collection', {status: 404});
  }

  // Aggregate sidebar facets (colors + product-type counts) from the
  // collection's products in a single aliased query.
  const colorMap = new Map();
  const typeCounts = new Map();
  for (const node of collection.facets?.nodes ?? []) {
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
  // Use the most frequent exact option name per color (names vary per product).
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

  const seo = seoPayload.collection({collection, url: request.url});

  // Applied filter chips, built straight from the URL params so custom
  // filters (productType / variantOption) get labels even when Shopify
  // doesn't return them in products.filters.
  const appliedFilters = buildAppliedFilters(searchParams, locale);

  return json({
    collection,
    appliedFilters,
    colorValues,
    productTypes,
    seo,
  });
}

/**
 * @param {URLSearchParams} searchParams
 * @returns {ProductFilter[]}
 */
function parseFilterParams(searchParams) {
  // Only these keys are understood by the Storefront API — anything else
  // (hand-typed or mangled URLs) must be dropped, or the API errors out
  // and the whole page becomes an error page.
  const ALLOWED = new Set(['available', 'price', 'productType', 'variantOption']);
  return [...searchParams.entries()].reduce((filters, [key, value]) => {
    if (key.startsWith(FILTER_URL_PREFIX)) {
      const filterKey = key.substring(FILTER_URL_PREFIX.length);
      if (!ALLOWED.has(filterKey)) return filters;
      try {
        const parsed = JSON.parse(value);
        // Drop price filters with non-numeric bounds — the Storefront API
        // rejects them and would turn the whole page into an error page.
        if (filterKey === 'price') {
          if (parsed === null || typeof parsed !== 'object') return filters;
          const num = (v) =>
            v == null || v === '' || Number.isNaN(Number(v)) ? undefined : Number(v);
          const min = num(parsed.min);
          const max = num(parsed.max);
          if (min === undefined && max === undefined) return filters;
          filters.push({
            price: {
              ...(min === undefined ? {} : {min}),
              ...(max === undefined ? {} : {max}),
            },
          });
          return filters;
        }
        filters.push({[filterKey]: parsed});
      } catch {
        // ignore malformed params
      }
    }
    return filters;
  }, []);
}

/**
 * @param {URLSearchParams} searchParams
 * @param {typeof context.storefront.i18n} locale
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

export default function Collection() {
  /** @type {LoaderReturnData} */
  const {collection, appliedFilters, colorValues, productTypes} = useLoaderData();

  const {ref, inView} = useInView();

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 md:px-8 py-6">
      {/* Collection banner */}
      {collection.image && (
        <div className="relative mb-8 overflow-hidden rounded-lg">
          <Image
            data={collection.image}
            sizes="100vw"
            className="h-48 w-full object-cover md:h-64"
            alt={collection.image.altText || collection.title}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <h1 className="absolute bottom-4 left-5 text-2xl font-bold text-white md:bottom-6 md:left-8 md:text-3xl">
            {collection.title}
          </h1>
        </div>
      )}
      {!collection.image && (
        <h1 className="mb-6 text-2xl font-bold md:text-3xl">{collection.title}</h1>
      )}

      <SortFilter
        appliedFilters={appliedFilters}
        colorValues={colorValues}
        productTypes={productTypes}
      >
        <Pagination connection={collection.products}>
          {({
            nodes,
            isLoading,
            PreviousLink,
            NextLink,
            nextPageUrl,
            hasNextPage,
            state,
          }) => (
            <>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5" data-test="product-grid">
                {nodes.map((product, i) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    loading={getImageLoadingPriority(i)}
                  />
                ))}
              </div>
              <div className="flex items-center justify-center mt-8 gap-4">
                {collection.products.pageInfo.hasPreviousPage && (
                  <Button as={PreviousLink} variant="secondary">
                    {isLoading ? 'Carregando...' : 'Anteriores'}
                  </Button>
                )}
                {hasNextPage && (
                  <Button ref={ref} as={NextLink} variant="secondary">
                    {isLoading ? 'Carregando...' : 'Carregar mais produtos'}
                  </Button>
                )}
              </div>
              <ProductsLoadedOnScroll
                nodes={nodes}
                inView={inView}
                nextPageUrl={nextPageUrl}
                hasNextPage={hasNextPage}
                state={state}
              />
            </>
          )}
        </Pagination>
      </SortFilter>

      <Analytics.CollectionView
        data={{
          collection: {
            id: collection.id,
            handle: collection.handle,
          },
        }}
      />
    </div>
  );
}

/**
 * @param {{
 *   nodes: any;
 *   inView: boolean;
 *   nextPageUrl: string;
 *   hasNextPage: boolean;
 *   state: any;
 * }}
 */
function ProductsLoadedOnScroll({
  nodes,
  inView,
  nextPageUrl,
  hasNextPage,
  state,
}) {
  const navigate = useNavigate();

  useEffect(() => {
    if (inView && hasNextPage) {
      navigate(nextPageUrl, {
        replace: true,
        preventScrollReset: true,
        state,
      });
    }
  }, [inView, navigate, state, nextPageUrl, hasNextPage]);

  return null;
}

const COLLECTION_QUERY = `#graphql
  query CollectionDetails(
    $handle: String!
    $country: CountryCode
    $language: LanguageCode
    $filters: [ProductFilter!]
    $sortKey: ProductCollectionSortKeys!
    $reverse: Boolean
    $first: Int
    $last: Int
    $startCursor: String
    $endCursor: String
  ) @inContext(country: $country, language: $language) {
    collection(handle: $handle) {
      id
      handle
      title
      description
      seo {
        description
        title
      }
      image {
        id
        url
        width
        height
        altText
      }
      products(
        first: $first,
        last: $last,
        before: $startCursor,
        after: $endCursor,
        filters: $filters,
        sortKey: $sortKey,
        reverse: $reverse
      ) {
        filters {
          id
          label
          type
        }
        nodes {
          ...ProductCard
        }
        pageInfo {
          hasPreviousPage
          hasNextPage
          endCursor
          startCursor
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
  }
  ${PRODUCT_CARD_FRAGMENT}
`;

/**
 * @param {SortParam | null} sortParam
 */
function getSortValuesFromParam(sortParam) {
  switch (sortParam) {
    case 'price-high-low':
      return {
        sortKey: 'PRICE',
        reverse: true,
      };
    case 'price-low-high':
      return {
        sortKey: 'PRICE',
        reverse: false,
      };
    case 'best-selling':
      return {
        sortKey: 'BEST_SELLING',
        reverse: false,
      };
    case 'newest':
      return {
        sortKey: 'CREATED',
        reverse: true,
      };
    case 'featured':
      return {
        sortKey: 'MANUAL',
        reverse: false,
      };
    default:
      return {
        sortKey: 'RELEVANCE',
        reverse: false,
      };
  }
}

/** @typedef {import('@shopify/remix-oxygen').MetaArgs} MetaArgs */
/** @typedef {import('@shopify/remix-oxygen').LoaderFunctionArgs} LoaderFunctionArgs */
/** @typedef {import('@shopify/hydrogen/storefront-api-types').Filter} Filter */
/** @typedef {import('@shopify/hydrogen/storefront-api-types').ProductCollectionSortKeys} ProductCollectionSortKeys */
/** @typedef {import('@shopify/hydrogen/storefront-api-types').ProductFilter} ProductFilter */
/** @typedef {import('~/components/SortFilter').SortParam} SortParam */
/** @typedef {ReturnType<typeof useLoaderData<typeof loader>>} LoaderReturnData */
