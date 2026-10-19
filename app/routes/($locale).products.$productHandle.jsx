import {useRef, useState, Suspense} from 'react';
import {Disclosure, Listbox} from '@headlessui/react';
import {defer} from '@shopify/remix-oxygen';
import {useLoaderData, Await} from '@remix-run/react';
import {
  getSeoMeta,
  ShopPayButton,
  getSelectedProductOptions,
  Analytics,
  useOptimisticVariant,
  getAdjacentAndFirstAvailableVariants,
  useSelectedOptionInUrlParam,
  getProductOptions,
} from '@shopify/hydrogen';
import invariant from 'tiny-invariant';
import clsx from 'clsx';
import {Heading, Section, Text} from '~/components/Text';
import {Link} from '~/components/Link';
import {Button} from '~/components/Button';
import {Money} from '~/components/Money';
import {AddToCartButton} from '~/components/AddToCartButton';
import {Skeleton} from '~/components/Skeleton';
import {ProductSwimlane} from '~/components/ProductSwimlane';
import {ProductGallery} from '~/components/ProductGallery';
import {
  LandingSections,
  LandingHighlights,
  LandingTrustRow,
} from '~/components/LandingSections';
import {loadLandingContent} from '~/lib/landing.server';
import {IconCaret, IconCheck, IconClose} from '~/components/Icon';
import {getExcerpt} from '~/lib/utils';
import {seoPayload} from '~/lib/seo.server';
import {routeHeaders} from '~/data/cache';
import {MEDIA_FRAGMENT, PRODUCT_CARD_FRAGMENT} from '~/data/fragments';

export const headers = routeHeaders;

/**
 * @param {LoaderFunctionArgs} args
 */
export async function loader(args) {
  const {productHandle} = args.params;
  invariant(productHandle, 'Missing productHandle param, check route filename');

  // Start fetching non-critical data without blocking time to first byte
  const deferredData = loadDeferredData(args);

  // Await the critical data required to render initial state of the page
  const criticalData = await loadCriticalData(args);

  return defer({...deferredData, ...criticalData});
}

/**
 * Load data necessary for rendering content above the fold. This is the critical data
 * needed to render the page. If it's unavailable, the whole page should 400 or 500 error.
 * @param {LoaderFunctionArgs}
 */
async function loadCriticalData({params, request, context}) {
  const {productHandle} = params;
  invariant(productHandle, 'Missing productHandle param, check route filename');

  const selectedOptions = getSelectedProductOptions(request);

  const [{shop, product}, landing] = await Promise.all([
    context.storefront.query(PRODUCT_QUERY, {
      variables: {
        handle: productHandle,
        selectedOptions,
        country: context.storefront.i18n.country,
        language: context.storefront.i18n.language,
      },
    }),
    // Admin-editable page content. This is attempted for every product: as
    // soon as a `product_landing` entry exists for the handle, the page picks
    // up the merchant's sections without any code change or deploy. Returns
    // null when nothing matches (or the definition does not exist yet).
    loadLandingContent({context}, productHandle),
  ]);

  if (!product?.id) {
    throw new Response('product', {status: 404});
  }

  const recommended = getRecommendedProducts(context.storefront, product.id);
  const selectedVariant = product.selectedOrFirstAvailableVariant ?? {};
  const variants = getAdjacentAndFirstAvailableVariants(product);

  const seo = seoPayload.product({
    product: {...product, variants},
    selectedVariant,
    url: request.url,
  });

  return {
    product,
    variants,
    shop,
    storeDomain: shop.primaryDomain.url,
    recommended,
    seo,
    landing,
  };
}

/**
 * Load data for rendering content below the fold. This data is deferred and will be
 * fetched after the initial page load. If it's unavailable, the page should still 200.
 * Make sure to not throw any errors here, as it will cause the page to 500.
 * @param {LoaderFunctionArgs} args
 */
function loadDeferredData(args) {
  // Put any API calls that are not critical to be available on first page render
  // For example: product reviews, product recommendations, social feeds.

  return {};
}

/**
 * @param {Class<loader>>}
 */
export const meta = ({matches}) => {
  return getSeoMeta(...matches.map((match) => match.data.seo));
};

export default function Product() {
  /** @type {LoaderReturnData} */
  const {product, shop, recommended, variants, storeDomain, landing} =
    useLoaderData();
  const {media, title, vendor, descriptionHtml} = product;
  const {shippingPolicy, refundPolicy} = shop;

  // Landing mode: the merchant created a `product_landing` entry for this
  // handle. The buy box gains the extra highlight / trust content and the
  // sections below it come from the admin entry. Only configured blocks are
  // rendered — nothing is mixed in from other products.
  const hasLanding = Boolean(landing);

  // Optimistically selects a variant with given available variant information
  const selectedVariant = useOptimisticVariant(
    product.selectedOrFirstAvailableVariant,
    variants,
  );

  // Sets the search param to the selected variant without navigation
  // only when no search params are set in the url
  useSelectedOptionInUrlParam(selectedVariant.selectedOptions);

  // Get the product options array
  const productOptions = getProductOptions({
    ...product,
    selectedOrFirstAvailableVariant: selectedVariant,
  });

  return (
    <>
      <Section className="px-0 md:px-8 lg:px-12">
        <div className="mx-auto grid w-full max-w-[1240px] items-start md:grid-cols-2 md:gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-14">
          <ProductGallery
            media={media.nodes}
            variantImage={selectedVariant?.image}
            className="w-full"
          />
          <div className="sticky md:-mb-nav md:top-nav md:-translate-y-nav md:h-screen md:pt-nav hiddenScroll md:overflow-y-scroll">
            <section className="flex flex-col w-full max-w-xl gap-8 p-6 md:mx-auto md:max-w-lg md:px-0">
              <div className="grid gap-2">
                <Heading as="h1" className="whitespace-normal">
                  {title}
                </Heading>
                {vendor && (
                  <Text className={'opacity-50 font-medium'}>{vendor}</Text>
                )}
              </div>

              <ProductForm
                productOptions={productOptions}
                selectedVariant={selectedVariant}
                storeDomain={storeDomain}
                landing={landing}
              />

              <LandingTrustRow landing={landing} />

              <div className="grid gap-4 py-4">
                {descriptionHtml && (
                  <ProductDetail
                    title="Detalhes do produto"
                    content={descriptionHtml}
                  />
                )}
                {shippingPolicy?.body && (
                  <ProductDetail
                    title="Envio"
                    content={getExcerpt(shippingPolicy.body)}
                    learnMore={`/policies/${shippingPolicy.handle}`}
                  />
                )}
                {refundPolicy?.body && (
                  <ProductDetail
                    title="Devoluções"
                    content={getExcerpt(refundPolicy.body)}
                    learnMore={`/policies/${refundPolicy.handle}`}
                  />
                )}
              </div>
            </section>
          </div>
        </div>
      </Section>

      {/* Admin-authored page sections (only rendered in landing mode). */}
      {hasLanding ? <LandingSections sections={landing?.sections} /> : null}

      <Suspense fallback={<Skeleton className="h-32" />}>
        <Await
          errorElement="Houve um problema ao carregar produtos relacionados"
          resolve={recommended}
        >
          {(products) => (
            <ProductSwimlane title="Produtos relacionados" products={products} />
          )}
        </Await>
      </Suspense>
      <Analytics.ProductView
        data={{
          products: [
            {
              id: product.id,
              title: product.title,
              price: selectedVariant?.price.amount || '0',
              vendor: product.vendor,
              variantId: selectedVariant?.id || '',
              variantTitle: selectedVariant?.title || '',
              quantity: 1,
            },
          ],
        }}
      />
    </>
  );
}

/* ------------------------------------------------------------------ *
 * Buy box — 对齐 hotwav.com 主站顺序：
 * 价格 → 库存 → 卖点 → 选项 → 数量 → 加购/ShopPay → 安全支付
 * ------------------------------------------------------------------ */

/** 库存低于该值时提示“仅剩 X 件”（null/undefined 不提示） */
const LOW_STOCK_THRESHOLD = 10;

/** 安全支付徽标 — 需要增删支付方式时改这里即可 */
const PAYMENT_METHODS = [
  {
    key: 'visa',
    node: (
      <span className="text-[13px] font-extrabold italic tracking-tight text-[#1A1F71]">
        VISA
      </span>
    ),
  },
  {
    key: 'mastercard',
    node: (
      <svg viewBox="0 0 32 20" className="h-4 w-7" role="img" aria-label="Mastercard">
        <circle cx="12" cy="10" r="7" fill="#EB001B" />
        <circle cx="20" cy="10" r="7" fill="#F79E1B" fillOpacity="0.9" />
      </svg>
    ),
  },
  {
    key: 'pix',
    node: <span className="text-[13px] font-bold text-[#32BCAD]">Pix</span>,
  },
  {
    key: 'paypal',
    node: (
      <span className="text-[13px] font-extrabold italic text-[#003087]">
        PayPal
      </span>
    ),
  },
];

/**
 * @param {{
 *   productOptions: MappedProductOptions[];
 *   selectedVariant: ProductFragment['selectedOrFirstAvailableVariant'];
 *   storeDomain: string;
 *   landing?: import('~/lib/landing.server').LandingContent | null;
 * }}
 */
export function ProductForm({
  productOptions,
  selectedVariant,
  storeDomain,
  landing,
}) {
  const closeRef = useRef(null);
  const [quantity, setQuantity] = useState(1);

  const isOutOfStock = !selectedVariant?.availableForSale;

  const isOnSale =
    selectedVariant?.price?.amount &&
    selectedVariant?.compareAtPrice?.amount &&
    selectedVariant?.price?.amount < selectedVariant?.compareAtPrice?.amount;

  // 单变体产品带一个假的 "Title: Default Title" 选项，不渲染
  const visibleOptions = productOptions.filter(
    (option) =>
      !(
        option.name === 'Title' &&
        option.optionValues.length === 1 &&
        option.optionValues[0].name === 'Default Title'
      ),
  );

  return (
    <div className="grid gap-6">
      {/* 价格 */}
      {selectedVariant && (
        <div className="flex flex-wrap items-baseline gap-3">
          <Money
            as="span"
            data={selectedVariant?.price}
            className="text-2xl font-semibold"
            data-test="price"
          />
          {isOnSale && (
            <Money
              as="span"
              data={selectedVariant?.compareAtPrice}
              className="text-base line-through opacity-40"
            />
          )}
        </div>
      )}

      {/* 库存 */}
      <InventoryLine selectedVariant={selectedVariant} />

      {/* 卖点清单（后台 metaobject 的 highlights 字段，留空则不显示） */}
      <LandingHighlights landing={landing} />

      {/* 选项（颜色 / 容量等） */}
      <div className="grid gap-5">
        {visibleOptions.map((option, optionIndex) => (
          <OptionPicker
            key={option.name}
            option={option}
            optionIndex={optionIndex}
            selectedVariant={selectedVariant}
            closeRef={closeRef}
          />
        ))}
      </div>

      {/* 数量 */}
      <div className="grid gap-2">
        <p className="text-sm text-primary/60">Quantidade:</p>
        <QuantityStepper quantity={quantity} setQuantity={setQuantity} />
      </div>

      {/* 购买按钮 */}
      {selectedVariant && (
        <div className="grid gap-3">
          {isOutOfStock ? (
            <Button
              variant="secondary"
              disabled
              className="w-full py-3.5 text-base font-semibold opacity-60"
            >
              Esgotado
            </Button>
          ) : (
            <>
              <AddToCartButton
                lines={[
                  {
                    merchandiseId: selectedVariant.id,
                    quantity,
                  },
                ]}
                variant="primary"
                className="w-full bg-contrast border-2 border-[#e33636] py-3.5 text-base font-semibold text-[#e33636] transition-colors hover:bg-[#e33636] hover:text-contrast"
                data-test="add-to-cart"
              >
                Adicionar ao carrinho
              </AddToCartButton>
              <ShopPayButton
                width="100%"
                variantIds={[selectedVariant?.id]}
                storeDomain={storeDomain}
              />
            </>
          )}
        </div>
      )}

      {/* 安全支付 */}
      <SecurePaymentRow />
    </div>
  );
}

/** 库存状态行：有货 / 仅剩 X 件 / 售罄 */
function InventoryLine({selectedVariant}) {
  if (!selectedVariant) return null;

  if (!selectedVariant.availableForSale) {
    return (
      <p className="flex items-center gap-2 text-sm font-medium text-[#d02e2e]">
        <IconClose className="h-4 w-4" />
        Esgotado
      </p>
    );
  }

  const qty = selectedVariant.quantityAvailable;
  const low = typeof qty === 'number' && qty > 0 && qty <= LOW_STOCK_THRESHOLD;

  return (
    <p
      className={clsx(
        'flex items-center gap-2 text-sm font-medium',
        low ? 'text-amber-600' : 'text-[#1a9c53]',
      )}
    >
      <IconStockCheck />
      {low ? `Apenas ${qty} em estoque` : 'Em estoque'}
    </p>
  );
}

/**
 * 单个选项（如 color）。有色板/图用色板，纯文字值用药丸按钮；
 * 值超过 7 个时退回下拉列表（沿用原实现）。
 */
function OptionPicker({option, optionIndex, selectedVariant, closeRef}) {
  const selectedValue =
    selectedVariant?.selectedOptions?.[optionIndex]?.value ?? option.name;

  if (option.optionValues.length > 7) {
    return (
      <div className="grid gap-2.5">
        <OptionLabel option={option} selectedValue={selectedValue} />
        <div className="relative w-full">
          <Listbox>
            {({open}) => (
              <>
                <Listbox.Button
                  ref={closeRef}
                  className={clsx(
                    'flex items-center justify-between w-full rounded-md border border-primary/20 py-3 px-4 text-sm font-medium transition hover:border-primary/50',
                    open ? 'rounded-b-none' : '',
                  )}
                >
                  <span>{selectedValue}</span>
                  <IconCaret direction={open ? 'up' : 'down'} />
                </Listbox.Button>
                <Listbox.Options
                  className={clsx(
                    'absolute z-30 max-h-48 w-full overflow-y-scroll rounded-b-md border border-primary/20 bg-contrast px-2 py-2',
                    open ? 'max-h-48' : 'max-h-0 border-0',
                  )}
                >
                  {option.optionValues
                    .filter((value) => value.available)
                    .map(
                      ({
                        isDifferentProduct,
                        name,
                        variantUriQuery,
                        handle,
                        selected,
                      }) => (
                        <Listbox.Option
                          key={`option-${option.name}-${name}`}
                          value={name}
                        >
                          <Link
                            {...(!isDifferentProduct ? {rel: 'nofollow'} : {})}
                            to={`/products/${handle}?${variantUriQuery}`}
                            preventScrollReset
                            className={clsx(
                              'flex w-full cursor-pointer items-center justify-start rounded p-2 text-left text-sm transition hover:bg-primary/5',
                              selected && 'bg-primary/10 font-medium',
                            )}
                            onClick={() => {
                              if (!closeRef?.current) return;
                              closeRef.current.click();
                            }}
                          >
                            {name}
                            {selected && (
                              <span className="ml-2">
                                <IconCheck />
                              </span>
                            )}
                          </Link>
                        </Listbox.Option>
                      ),
                    )}
                </Listbox.Options>
              </>
            )}
          </Listbox>
        </div>
      </div>
    );
  }

  const hasSwatch = option.optionValues.some(
    (value) => value.swatch?.color || value.swatch?.image?.previewImage?.url,
  );

  return (
    <div className="grid gap-2.5">
      <OptionLabel option={option} selectedValue={selectedValue} />
      {hasSwatch ? (
        <div className="flex flex-wrap items-center gap-3">
          {option.optionValues.map((value) => (
            <SwatchLink key={option.name + value.name} option={option} value={value} />
          ))}
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {option.optionValues.map((value) => (
            <ValuePill key={option.name + value.name} option={option} value={value} />
          ))}
        </div>
      )}
    </div>
  );
}

/** “color: Orange” 样式的标签行（主站同款） */
function OptionLabel({option, selectedValue}) {
  return (
    <p className="text-sm text-primary/60">
      <span>{option.name}: </span>
      <span className="font-semibold text-primary">{selectedValue}</span>
    </p>
  );
}

/** 色板（颜色值），选中描边、售罄降透明度 */
function SwatchLink({option, value}) {
  const {name, selected, available, swatch} = value;
  const image = swatch?.image?.previewImage?.url;
  const color = swatch?.color;

  return (
    <Link
      to={`/products/${value.handle}?${value.variantUriQuery}`}
      {...(!value.isDifferentProduct ? {rel: 'nofollow'} : {})}
      preventScrollReset
      prefetch="intent"
      replace
      aria-label={name}
      title={name}
      className={clsx(
        'rounded-lg border-2 p-[3px] transition-all duration-150',
        selected ? 'border-primary' : 'border-transparent hover:border-primary/30',
        available ? 'opacity-100' : 'opacity-40',
      )}
    >
      <span
        className="block h-9 w-9 overflow-hidden rounded-md border border-primary/10"
        style={{backgroundColor: color || 'transparent'}}
      >
        {!!image && (
          <img src={image} alt={name} className="h-full w-full object-cover" />
        )}
      </span>
    </Link>
  );
}

/** 纯文字值（如容量/套餐）的药丸按钮 */
function ValuePill({option, value}) {
  const {name, selected, available} = value;

  return (
    <Link
      to={`/products/${value.handle}?${value.variantUriQuery}`}
      {...(!value.isDifferentProduct ? {rel: 'nofollow'} : {})}
      preventScrollReset
      prefetch="intent"
      replace
      className={clsx(
        'rounded-md border px-4 py-2 text-sm font-medium transition',
        selected
          ? 'border-primary bg-primary text-contrast'
          : 'border-primary/20 hover:border-primary/60',
        available ? 'opacity-100' : 'opacity-40',
      )}
    >
      {name}
    </Link>
  );
}

/** 数量步进器（− 输入 +），最低 1 件 */
function QuantityStepper({quantity, setQuantity}) {
  const clamp = (n) => Math.max(1, Number.isFinite(n) ? Math.floor(n) : 1);

  return (
    <div className="inline-flex w-fit items-center rounded-md border border-primary/15">
      <button
        type="button"
        aria-label="Diminuir quantidade"
        disabled={quantity <= 1}
        onClick={() => setQuantity((q) => clamp(q - 1))}
        className="flex h-11 w-11 items-center justify-center text-primary/70 transition hover:text-primary disabled:cursor-not-allowed disabled:opacity-30"
      >
        <svg viewBox="0 0 10 2" width="12" height="3" aria-hidden="true">
          <path d="M0 0H10V2H0V0Z" fill="currentColor" />
        </svg>
      </button>
      <input
        type="number"
        inputMode="numeric"
        min="1"
        value={quantity}
        onChange={(event) => setQuantity(clamp(parseInt(event.target.value, 10)))}
        onBlur={(event) => setQuantity(clamp(parseInt(event.target.value, 10) || 1))}
        aria-label="Quantidade"
        className="h-11 w-14 border-x border-primary/15 bg-transparent text-center text-sm font-semibold [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <button
        type="button"
        aria-label="Aumentar quantidade"
        onClick={() => setQuantity((q) => clamp(q + 1))}
        className="flex h-11 w-11 items-center justify-center text-primary/70 transition hover:text-primary"
      >
        <svg viewBox="0 0 10 10" width="12" height="12" aria-hidden="true">
          <path d="M4 0h2v4h4v2H6v4H4V6H0V4h4V0Z" fill="currentColor" />
        </svg>
      </button>
    </div>
  );
}

/** “Pagamento 100% seguro” + 支付方式徽标 */
function SecurePaymentRow() {
  return (
    <div className="grid gap-2.5 rounded-lg bg-primary/[0.04] px-4 py-3.5">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <IconLock className="h-4 w-4 text-notice" />
        Pagamento 100% seguro
      </p>
      <ul className="flex flex-wrap items-center gap-2">
        {PAYMENT_METHODS.map((method) => (
          <li
            key={method.key}
            className="flex h-7 min-w-12 items-center justify-center rounded border border-primary/10 bg-contrast px-2.5"
          >
            {method.node}
          </li>
        ))}
      </ul>
    </div>
  );
}

function IconStockCheck(props) {
  return (
    <svg viewBox="0 0 18 18" width="18" height="18" aria-hidden="true" {...props}>
      <circle cx="9" cy="9" r="9" fill="currentColor" />
      <path
        d="M5 8.8L7.6 11.6L13 6"
        stroke="#fff"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconLock(props) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

/**
 * @param {{
 *   title: string;
 *   content: string;
 *   learnMore?: string;
 * }}
 */
function ProductDetail({title, content, learnMore}) {
  return (
    <Disclosure key={title} as="div" className="grid w-full gap-2">
      {({open}) => (
        <>
          <Disclosure.Button className="text-left">
            <div className="flex justify-between">
              <Text size="lead" as="h4">
                {title}
              </Text>
              <IconClose
                className={clsx(
                  'transition-transform transform-gpu duration-200',
                  !open && 'rotate-[45deg]',
                )}
              />
            </div>
          </Disclosure.Button>

          <Disclosure.Panel className={'pb-4 pt-2 grid gap-2'}>
            <div
              className="prose dark:prose-invert"
              dangerouslySetInnerHTML={{__html: content}}
            />
            {learnMore && (
              <div className="">
                <Link
                  className="pb-px border-b border-primary/30 text-primary/50"
                  to={learnMore}
                >
                  Learn more
                </Link>
              </div>
            )}
          </Disclosure.Panel>
        </>
      )}
    </Disclosure>
  );
}

const PRODUCT_VARIANT_FRAGMENT = `#graphql
  fragment ProductVariant on ProductVariant {
    id
    availableForSale
    quantityAvailable
    selectedOptions {
      name
      value
    }
    image {
      id
      url
      altText
      width
      height
    }
    price {
      amount
      currencyCode
    }
    compareAtPrice {
      amount
      currencyCode
    }
    sku
    title
    unitPrice {
      amount
      currencyCode
    }
    product {
      title
      handle
    }
  }
`;

const PRODUCT_FRAGMENT = `#graphql
  fragment Product on Product {
    id
    title
    vendor
    handle
    descriptionHtml
    description
    encodedVariantExistence
    encodedVariantAvailability
    options {
      name
      optionValues {
        name
        firstSelectableVariant {
          ...ProductVariant
        }
        swatch {
          color
          image {
            previewImage {
              url
            }
          }
        }
      }
    }
    selectedOrFirstAvailableVariant(selectedOptions: $selectedOptions, ignoreUnknownOptions: true, caseInsensitiveMatch: true) {
      ...ProductVariant
    }
    adjacentVariants (selectedOptions: $selectedOptions) {
      ...ProductVariant
    }
    seo {
      description
      title
    }
    media(first: 7) {
      nodes {
        ...Media
      }
    }
  }
  ${PRODUCT_VARIANT_FRAGMENT}
`;

const PRODUCT_QUERY = `#graphql
  query Product(
    $country: CountryCode
    $language: LanguageCode
    $handle: String!
    $selectedOptions: [SelectedOptionInput!]!
  ) @inContext(country: $country, language: $language) {
    product(handle: $handle) {
      ...Product
    }
    shop {
      name
      primaryDomain {
        url
      }
      shippingPolicy {
        body
        handle
      }
      refundPolicy {
        body
        handle
      }
    }
  }
  ${MEDIA_FRAGMENT}
  ${PRODUCT_FRAGMENT}
`;

const RECOMMENDED_PRODUCTS_QUERY = `#graphql
  query productRecommendations(
    $productId: ID!
    $count: Int
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    recommended: productRecommendations(productId: $productId) {
      ...ProductCard
    }
    additional: products(first: $count, sortKey: BEST_SELLING) {
      nodes {
        ...ProductCard
      }
    }
  }
  ${PRODUCT_CARD_FRAGMENT}
`;

/**
 * @param {Storefront} storefront
 * @param {string} productId
 */
async function getRecommendedProducts(storefront, productId) {
  const products = await storefront.query(RECOMMENDED_PRODUCTS_QUERY, {
    variables: {productId, count: 12},
  });

  invariant(products, 'No data returned from Shopify API');

  const mergedProducts = (products.recommended ?? [])
    .concat(products.additional.nodes)
    .filter(
      (value, index, array) =>
        array.findIndex((value2) => value2.id === value.id) === index,
    );

  const originalProduct = mergedProducts.findIndex(
    (item) => item.id === productId,
  );

  mergedProducts.splice(originalProduct, 1);

  return {nodes: mergedProducts};
}

/** @typedef {import('@shopify/remix-oxygen').MetaArgs} MetaArgs */
/** @typedef {import('@shopify/remix-oxygen').LoaderFunctionArgs} LoaderFunctionArgs */
/** @typedef {import('@shopify/hydrogen').MappedProductOptions} MappedProductOptions */
/** @typedef {import('@shopify/hydrogen/storefront-api-types').Maybe} Maybe */
/** @typedef {import('@shopify/hydrogen/storefront-api-types').ProductOptionValueSwatch} ProductOptionValueSwatch */
/** @typedef {import('storefrontapi.generated').ProductFragment} ProductFragment */
/** @typedef {import('~/lib/type').Storefront} Storefront */
/** @typedef {ReturnType<typeof useLoaderData<typeof loader>>} LoaderReturnData */
