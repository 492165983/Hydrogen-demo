import {Link} from '@remix-run/react';

/**
 * "O nosso produto distintivo" style featured product banner for the homepage:
 * product image on the left, heading / copy / buy button on the right.
 * Data comes from a `featured_product` metaobject (see `~/lib/featured-product.js`).
 */
export function FeaturedProduct({banner}) {
  if (!banner?.productHandle) return null;

  const imageUrl =
    banner.image?.url &&
    `${banner.image.url}${banner.image.url.includes('?') ? '&' : '?'}width=840`;

  return (
    <section className="bg-white py-14 md:py-20 lg:py-24">
      <div className="mx-auto grid w-full max-w-[1440px] items-center gap-10 px-6 md:grid-cols-2 md:px-10 md:gap-8 lg:px-14">
        {/* Left: product image */}
        <div className="flex items-center justify-center">
          {imageUrl ? (
            <Link
              to={`/products/${banner.productHandle}`}
              className="block transition-transform duration-300 hover:scale-[1.03]"
              tabIndex={-1}
              aria-hidden="true"
            >
              <img
                src={imageUrl}
                alt={banner.image.alt || banner.heading}
                width={banner.image.width}
                height={banner.image.height}
                loading="lazy"
                className="max-h-[420px] w-auto object-contain md:max-h-[480px]"
              />
            </Link>
          ) : (
            <div className="flex h-[280px] w-[280px] items-center justify-center rounded-3xl bg-neutral-100 md:h-[420px] md:w-[420px]" />
          )}
        </div>

        {/* Right: copy + CTA */}
        <div className="text-center md:pr-8 md:text-left lg:pr-16">
          <h2 className="text-2xl font-extrabold tracking-tight text-neutral-900 md:text-4xl">
            {banner.heading}
          </h2>
          {banner.description && (
            <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-neutral-500 md:mx-0 md:mt-5 md:text-[15px]">
              {banner.description}
            </p>
          )}
          <Link
            to={`/products/${banner.productHandle}`}
            className="mt-7 inline-flex items-center justify-center rounded-lg bg-neutral-900 px-7 py-3 text-sm font-semibold text-white transition hover:bg-[#e4002b] md:mt-9"
          >
            {banner.buttonLabel}
          </Link>
        </div>
      </div>
    </section>
  );
}
