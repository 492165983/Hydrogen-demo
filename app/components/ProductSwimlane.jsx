import clsx from 'clsx';

import {CarouselArrows, useCarouselScroll} from '~/components/CarouselArrows';
import {ProductCard} from '~/components/ProductCard';

const mockProducts = {
  nodes: new Array(12).fill(''),
};

/**
 * Horizontal product carousel.
 *
 * Constrained to the same 1440px container as the rest of the homepage (video
 * showcase, landing sections) instead of running edge to edge, with
 * prev / next arrow buttons in the heading row.
 *
 * @param {ProductSwimlaneProps}
 */
export function ProductSwimlane({
  title = 'Produtos em destaque',
  products = mockProducts,
  count = 12,
}) {
  const {scroller, canPrev, canNext, scrollByCard} = useCarouselScroll();

  const nodes = (products?.nodes ?? []).filter(Boolean).slice(0, count);
  if (!nodes.length) return null;

  return (
    <section className="py-12 md:py-16 lg:py-20">
      <div className="mx-auto w-full max-w-[1440px] px-6 md:px-10 lg:px-14">
        <div className="flex items-end justify-between gap-4">
          {title ? (
            <h2 className="text-2xl font-bold tracking-tight text-primary md:text-4xl">
              {title}
            </h2>
          ) : (
            <span />
          )}
          <CarouselArrows
            canPrev={canPrev}
            canNext={canNext}
            onPrev={() => scrollByCard(-1)}
            onNext={() => scrollByCard(1)}
          />
        </div>

        <div
          ref={scroller}
          className="hiddenScroll mt-5 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 md:mt-7 md:gap-4"
        >
          {nodes.map((product) => (
            <ProductCard
              product={product}
              key={product.id}
              className={clsx(
                'w-[72vw] max-w-[360px] shrink-0 snap-start md:w-[300px] md:max-w-none lg:w-[320px]',
              )}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * @typedef {HomepageFeaturedProductsQuery & {
 *   title?: string;
 *   count?: number;
 * }} ProductSwimlaneProps
 */

/** @typedef {import('storefrontapi.generated').HomepageFeaturedProductsQuery} HomepageFeaturedProductsQuery */
