import {defer} from '@shopify/remix-oxygen';
import {Suspense} from 'react';
import {Await, useLoaderData} from '@remix-run/react';
import {getSeoMeta} from '@shopify/hydrogen';

import {Hero} from '~/components/Hero';
import {HeroBanner} from '~/components/HeroBanner';
import {ProductSwimlane} from '~/components/ProductSwimlane';
import {VideoShowcase} from '~/components/VideoShowcase';
import {TextVideoReveal} from '~/components/TextVideoReveal';
import {FeaturedProduct} from '~/components/FeaturedProduct';
import {NewsletterSection} from '~/components/NewsletterSection';
import {WhyHotwav} from '~/components/WhyHotwav';
import {FaqSection} from '~/components/FaqSection';
import {MEDIA_FRAGMENT, PRODUCT_CARD_FRAGMENT} from '~/data/fragments';
import {getHeroPlaceholder} from '~/lib/placeholders';
import {HOMEPAGE_BANNER_QUERY, selectBannerSlides} from '~/lib/banner';
import {VIDEO_SHOWCASE_QUERY, mapVideoShowcases} from '~/lib/video-showcase';
import {
  TEXT_VIDEO_REVEAL_QUERY,
  mapTextVideoReveal,
} from '~/lib/text-video-reveal';
import {
  FEATURED_PRODUCT_QUERY,
  mapFeaturedProduct,
} from '~/lib/featured-product';
import {seoPayload} from '~/lib/seo.server';
import {routeHeaders} from '~/data/cache';

export const headers = routeHeaders;

/**
 * @param {LoaderFunctionArgs} args
 */
export async function loader(args) {
  const {params, context} = args;
  const {language, country} = context.storefront.i18n;

  if (
    params.locale &&
    params.locale.toLowerCase() !== `${language}-${country}`.toLowerCase()
  ) {
    // If the locale URL param is defined, yet we still are on `EN-US`
    // the the locale param must be invalid, send to the 404 page
    throw new Response(null, {status: 404});
  }

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
async function loadCriticalData({context, request}) {
  const {language, country} = context.storefront.i18n;

  const [{shop, hero}, banners] = await Promise.all([
    context.storefront.query(HOMEPAGE_SEO_QUERY, {
      variables: {handle: 'freestyle'},
    }),
    // Banners come from Shopify metaobjects of type `hero_banner`.
    // Failures (e.g. the definition does not exist yet) fall back to the
    // static slides so the homepage always renders.
    context.storefront
      .query(HOMEPAGE_BANNER_QUERY, {
        variables: {country, language},
      })
      .catch((error) => {
        // eslint-disable-next-line no-console
        console.error(
          '[Homepage] Failed to load `hero_banner` metaobjects, using default banner slides.',
          error,
        );
        return null;
      }),
  ]);

  return {
    shop,
    primaryHero: hero,
    bannerSlides: selectBannerSlides(banners?.metaobjects?.nodes),
    seo: seoPayload.home({url: request.url}),
  };
}

/**
 * Load data for rendering content below the fold. This data is deferred and will be
 * fetched after the initial page load. If it's unavailable, the page should still 200.
 * Make sure to not throw any errors here, as it will cause the page to 500.
 * @param {LoaderFunctionArgs}
 */
function loadDeferredData({context}) {
  const {language, country} = context.storefront.i18n;

  const featuredProducts = context.storefront
    .query(HOMEPAGE_FEATURED_PRODUCTS_QUERY, {
      variables: {
        /**
         * Country and language properties are automatically injected
         * into all queries. Passing them is unnecessary unless you
         * want to override them from the following default:
         */
        country,
        language,
      },
    })
    .catch((error) => {
      // Log query errors, but don't throw them so the page can still render
      // eslint-disable-next-line no-console
      console.error(error);
      return null;
    });

  const secondaryHero = context.storefront
    .query(COLLECTION_HERO_QUERY, {
      variables: {
        handle: 'backcountry',
        country,
        language,
      },
    })
    .catch((error) => {
      // Log query errors, but don't throw them so the page can still render
      // eslint-disable-next-line no-console
      console.error(error);
      return null;
    });

  const tertiaryHero = context.storefront
    .query(COLLECTION_HERO_QUERY, {
      variables: {
        handle: 'winter-2022',
        country,
        language,
      },
    })
    .catch((error) => {
      // Log query errors, but don't throw them so the page can still render
      // eslint-disable-next-line no-console
      console.error(error);
      return null;
    });

  // Homepage video strip ("Popular & Best Seller" style), from `video_showcase`
  // metaobjects. Fails soft: no metaobjects published -> section not rendered.
  const videoShowcase = context.storefront
    .query(VIDEO_SHOWCASE_QUERY, {
      variables: {country, language},
    })
    .catch((error) => {
      // eslint-disable-next-line no-console
      console.error(
        '[Homepage] Failed to load `video_showcase` metaobjects.',
        error,
      );
      return null;
    });

  // "Featured product" banner (image + copy + CTA), from `featured_product`
  // metaobjects. Fails soft: no metaobject published -> section not rendered.
  const featuredProduct = context.storefront
    .query(FEATURED_PRODUCT_QUERY, {
      variables: {country, language},
    })
    .catch((error) => {
      // eslint-disable-next-line no-console
      console.error(
        '[Homepage] Failed to load `featured_product` metaobjects.',
        error,
      );
      return null;
    });

  // "Text knockout video" reveal, from `text_video_reveal` metaobjects.
  // Fails soft: nothing published -> section not rendered.
  const textVideoReveal = context.storefront
    .query(TEXT_VIDEO_REVEAL_QUERY, {
      variables: {country, language},
    })
    .catch((error) => {
      // eslint-disable-next-line no-console
      console.error(
        '[Homepage] Failed to load `text_video_reveal` metaobjects.',
        error,
      );
      return null;
    });

  return {
    featuredProducts,
    secondaryHero,
    tertiaryHero,
    videoShowcase,
    textVideoReveal,
    featuredProduct,
  };
}

/**
 * @param {Class<loader>>}
 */
export const meta = ({matches}) => {
  return getSeoMeta(...matches.map((match) => match.data.seo));
};

export default function Homepage() {
  /** @type {LoaderReturnData} */
  const {
    primaryHero,
    secondaryHero,
    tertiaryHero,
    featuredProducts,
    bannerSlides,
    videoShowcase,
    textVideoReveal,
    featuredProduct,
  } = useLoaderData();

  // TODO: skeletons vs placeholders
  const skeletons = getHeroPlaceholder([{}, {}, {}]);

  return (
    <>
      {/* Auto-playing banner carousel (5s per slide).
          Slides come from Shopify (`hero_banner` metaobjects) when available,
          otherwise the static fallback in `~/lib/banner.js` is used.
          The aspect ratios match the current banner art: mobile 1200x1600
          (3:4), desktop 3840x1682 (2.28:1). Change them here if the art ratio changes. */}
      <HeroBanner
        slides={bannerSlides}
        interval={5000}
        heightClass="aspect-[3/4] sm:aspect-[16/9] lg:aspect-[3840/1682] max-h-[90vh]"
      />

      {featuredProduct && (
        <Suspense>
          <Await resolve={featuredProduct}>
            {(response) => {
              const banner = mapFeaturedProduct(response?.metaobjects?.nodes);
              if (!banner) return <></>;
              return <FeaturedProduct banner={banner} />;
            }}
          </Await>
        </Suspense>
      )}

      {videoShowcase && (
        <Suspense>
          <Await resolve={videoShowcase}>
            {(response) =>
              mapVideoShowcases(response?.metaobjects?.nodes).map(
                (showcase) => (
                  <VideoShowcase key={showcase.id} showcase={showcase} />
                ),
              )
            }
          </Await>
        </Suspense>
      )}

      {textVideoReveal && (
        <Suspense>
          <Await resolve={textVideoReveal}>
            {(response) => {
              const reveal = mapTextVideoReveal(response?.metaobjects?.nodes);
              if (!reveal) return <></>;
              return <TextVideoReveal reveal={reveal} />;
            }}
          </Await>
        </Suspense>
      )}

      {primaryHero && (
        <Hero {...primaryHero} height="full" top loading="eager" />
      )}

      {featuredProducts && (
        <Suspense>
          <Await resolve={featuredProducts}>
            {(response) => {
              if (
                !response ||
                !response?.products ||
                !response?.products?.nodes
              ) {
                return <></>;
              }
              return (
                <ProductSwimlane
                  products={response.products}
                  title="Produtos em destaque"
                  count={8}
                />
              );
            }}
          </Await>
        </Suspense>
      )}

      {secondaryHero && (
        <Suspense fallback={<Hero {...skeletons[1]} />}>
          <Await resolve={secondaryHero}>
            {(response) => {
              if (!response || !response?.hero) {
                return <></>;
              }
              return <Hero {...response.hero} />;
            }}
          </Await>
        </Suspense>
      )}

      {tertiaryHero && (
        <Suspense fallback={<Hero {...skeletons[2]} />}>
          <Await resolve={tertiaryHero}>
            {(response) => {
              if (!response || !response?.hero) {
                return <></>;
              }
              return <Hero {...response.hero} />;
            }}
          </Await>
        </Suspense>
      )}

      <WhyHotwav />

      <FaqSection />

      <NewsletterSection />
    </>
  );
}

const COLLECTION_CONTENT_FRAGMENT = `#graphql
  fragment CollectionContent on Collection {
    id
    handle
    title
    descriptionHtml
    heading: metafield(namespace: "hero", key: "title") {
      value
    }
    byline: metafield(namespace: "hero", key: "byline") {
      value
    }
    cta: metafield(namespace: "hero", key: "cta") {
      value
    }
    spread: metafield(namespace: "hero", key: "spread") {
      reference {
        ...Media
      }
    }
    spreadSecondary: metafield(namespace: "hero", key: "spread_secondary") {
      reference {
        ...Media
      }
    }
  }
  ${MEDIA_FRAGMENT}
`;

const HOMEPAGE_SEO_QUERY = `#graphql
  query seoCollectionContent($handle: String, $country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    hero: collection(handle: $handle) {
      ...CollectionContent
    }
    shop {
      name
      description
    }
  }
  ${COLLECTION_CONTENT_FRAGMENT}
`;

const COLLECTION_HERO_QUERY = `#graphql
  query heroCollectionContent($handle: String, $country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    hero: collection(handle: $handle) {
      ...CollectionContent
    }
  }
  ${COLLECTION_CONTENT_FRAGMENT}
`;

// @see: https://shopify.dev/api/storefront/current/queries/products
export const HOMEPAGE_FEATURED_PRODUCTS_QUERY = `#graphql
  query homepageFeaturedProducts($country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    products(first: 8) {
      nodes {
        ...ProductCard
      }
    }
  }
  ${PRODUCT_CARD_FRAGMENT}
`;

/** @typedef {import('@shopify/remix-oxygen').MetaArgs} MetaArgs */
/** @typedef {import('@shopify/remix-oxygen').LoaderFunctionArgs} LoaderFunctionArgs */
/** @typedef {ReturnType<typeof useLoaderData<typeof loader>>} LoaderReturnData */
