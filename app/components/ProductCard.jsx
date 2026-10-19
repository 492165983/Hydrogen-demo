import clsx from 'clsx';
import {flattenConnection, Image, useMoney} from '@shopify/hydrogen';
import {Money} from '~/components/Money';
import {Link} from '~/components/Link';
import {Button} from '~/components/Button';
import {AddToCartButton} from '~/components/AddToCartButton';
import {isDiscounted, isNewArrival} from '~/lib/utils';
import {getProductPlaceholder} from '~/lib/placeholders';

/**
 * @param {{
 *   product: ProductCardFragment;
 *   label?: string;
 *   className?: string;
 *   loading?: HTMLImageElement['loading'];
 *   onClick?: () => void;
 *   quickAdd?: boolean;
 * }}
 */
export function ProductCard({
  product,
  label,
  className,
  loading,
  onClick,
  quickAdd,
}) {
  let badge = null;
  let badgeTone = 'new';

  const cardProduct = product?.variants ? product : getProductPlaceholder();
  if (!cardProduct?.variants?.nodes?.length) return null;

  const firstVariant = flattenConnection(cardProduct.variants)[0];

  if (!firstVariant) return null;
  const {image, price, compareAtPrice} = firstVariant;

  if (label) {
    badge = label;
  } else if (isDiscounted(price, compareAtPrice)) {
    badge = 'Promoção';
    badgeTone = 'sale';
  } else if (isNewArrival(product.publishedAt)) {
    badge = 'Novo';
  }

  return (
    <div className={clsx('flex flex-col bg-white border border-primary/10 rounded-md overflow-hidden', className)}>
      <Link
        onClick={onClick}
        to={`/products/${product.handle}`}
        prefetch="intent"
        className="flex flex-col h-full"
      >
        <div className="card-image relative aspect-square bg-primary/5">
          {image && (
            <Image
              className="object-cover w-full h-full fadeIn"
              sizes="(min-width: 64em) 25vw, (min-width: 48em) 30vw, 45vw"
              aspectRatio="1/1"
              data={image}
              alt={image.altText || `Picture of ${product.title}`}
              loading={loading}
            />
          )}
          {badge && (
            <span
              className={clsx(
                'absolute top-2.5 left-2.5 rounded px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white',
                badgeTone === 'sale' ? 'bg-[#e4002b]' : 'bg-[#7c3aed]',
              )}
            >
              {badge}
            </span>
          )}
        </div>
        <div className="flex flex-1 flex-col items-center gap-1 px-3 py-3 text-center">
          <h3 className="w-full text-sm font-medium leading-snug line-clamp-2">
            {product.title}
          </h3>
          <div className="mt-auto flex items-center gap-2 text-sm">
            <Money withoutTrailingZeros data={price} />
            {isDiscounted(price, compareAtPrice) && (
              <CompareAtPrice className="opacity-50" data={compareAtPrice} />
            )}
          </div>
        </div>
      </Link>
      {quickAdd && firstVariant.availableForSale && (
        <AddToCartButton
          lines={[
            {
              quantity: 1,
              merchandiseId: firstVariant.id,
            },
          ]}
          variant="secondary"
          className="mt-2"
        >
          Add to Cart
        </AddToCartButton>
      )}
      {quickAdd && !firstVariant.availableForSale && (
        <Button variant="secondary" className="mt-2" disabled>
          Sold out
        </Button>
      )}
    </div>
  );
}

/**
 * @param {{
 *   data: MoneyV2;
 *   className?: string;
 * }}
 */
function CompareAtPrice({data, className}) {
  const {currencyNarrowSymbol, withoutTrailingZerosAndCurrency} =
    useMoney(data);

  const styles = clsx('strike', className);

  return (
    <span className={styles}>
      {currencyNarrowSymbol}
      {withoutTrailingZerosAndCurrency}
    </span>
  );
}

/** @typedef {import('@shopify/hydrogen/storefront-api-types').MoneyV2} MoneyV2 */
/** @typedef {import('@shopify/hydrogen/storefront-api-types').Product} Product */
/** @typedef {import('storefrontapi.generated').ProductCardFragment} ProductCardFragment */
