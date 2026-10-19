import {MEDIA_FRAGMENT} from '~/data/fragments';

/**
 * Homepage hero banner data source.
 *
 * Banners live in the Shopify admin as **Metaobjects** of type `hero_banner`,
 * so merchants can upload/replace images without touching code.
 *
 * Metaobject fields (keys are case-sensitive):
 *   - title          (single line text)
 *   - subtitle       (single line text)
 *   - cta            (single line text)  — button label
 *   - link           (single line text)  — button/slide target, e.g. /collections/all
 *   - image          (file, image)       — used for both breakpoints if the two
 *                                          fields below are empty
 *   - image_desktop  (file, image)       — optional, wide image for desktop
 *   - image_mobile   (file, image)       — optional, portrait image for mobile
 *   - image_url      (single line text)  — optional alternative to `image`:
 *                                          paste a link to an existing file, e.g.
 *                                          https://cdn.shopify.com/s/files/...jpg?v=123
 *   - image_desktop_url / image_mobile_url (single line text)
 *                                        — optional alternatives to the two file
 *                                          fields above
 *   - alt            (single line text)  — optional, image alt text
 *   - order          (integer)           — optional, controls slide order
 *
 * Images can therefore come from either a **file field** (pick any image that
 * already lives in Content → Files, or upload a new one) or a **text field**
 * holding a pasted file URL. Unset images fall back to the static slides below.
 *
 * If no metaobject is published (or the query fails), the static
 * `DEFAULT_BANNER_SLIDES` below is used instead, so the homepage always has a
 * working banner.
 *
 * @see https://shopify.dev/docs/apps/build/custom-data/metaobjects
 */
export const HOMEPAGE_BANNER_QUERY = `#graphql
  query homepageBanners($country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    metaobjects(type: "hero_banner", first: 10) {
      nodes {
        id
        handle
        fields {
          key
          value
          reference {
            ...Media
          }
        }
      }
    }
  }
  ${MEDIA_FRAGMENT}
`;

/** Width requested from the Shopify CDN for desktop banner images. */
const DESKTOP_IMAGE_WIDTH = 2400;

/** Width requested from the Shopify CDN for mobile banner images. */
const MOBILE_IMAGE_WIDTH = 900;

/**
 * Append a `width` parameter so the CDN serves a right-sized image.
 *
 * Only applied to Shopify CDN URLs — other hosts (signed URLs, third-party
 * CDNs) are returned untouched so we never break their parameters.
 * @param {string} [url]
 * @param {number} width
 */
export function withImageWidth(url, width) {
  if (!url) return undefined;

  try {
    const parsed = new URL(url);
    if (!/(^|\.)cdn\.shopify\.com$/.test(parsed.hostname)) return url;

    parsed.searchParams.set('width', String(width));
    return parsed.toString();
  } catch {
    return url;
  }
}

/**
 * Turn Shopify metaobject nodes into banner slides.
 * @param {Array<any>} [nodes]
 */
export function mapMetaobjectBanners(nodes = []) {
  return (nodes || [])
    .map((node) => {
      /** @type {Record<string, any>} */
      const fields = {};
      for (const field of node?.fields ?? []) {
        if (field?.key) fields[field.key] = field;
      }

      const text = (key) => fields[key]?.value || undefined;
      const fileUrl = (key) => fields[key]?.reference?.image?.url || undefined;
      // A slide image can be set either with a file field (admin file picker)
      // or with a text field containing a pasted file URL.
      const imageSource = (fileKey, urlKey) =>
        fileUrl(fileKey) ?? text(urlKey) ?? undefined;

      const desktopSource =
        imageSource('image_desktop', 'image_desktop_url') ??
        imageSource('image', 'image_url') ??
        imageSource('image_mobile', 'image_mobile_url');
      const mobileSource =
        imageSource('image_mobile', 'image_mobile_url') ??
        imageSource('image', 'image_url') ??
        imageSource('image_desktop', 'image_desktop_url');

      const order = Number.parseInt(text('order') ?? '', 10);

      return {
        id: node?.id ?? node?.handle,
        title: text('title'),
        subtitle: text('subtitle'),
        cta: text('cta'),
        to: text('link') || '/',
        alt: text('alt') || text('title'),
        imageDesktop: withImageWidth(desktopSource, DESKTOP_IMAGE_WIDTH),
        imageMobile: withImageWidth(mobileSource, MOBILE_IMAGE_WIDTH),
        /** @type {number | null} */
        _order: Number.isNaN(order) ? null : order,
      };
    })
    .sort((a, b) => {
      if (a._order === null && b._order === null) return 0;
      if (a._order === null) return 1;
      if (b._order === null) return -1;
      return a._order - b._order;
    })
    .filter((slide) => slide.imageDesktop || slide.imageMobile)
    .map(({_order, ...slide}) => slide);
}

/**
 * Slides to render: published Shopify banners first, static demo slides as a
 * fallback so the homepage is never empty.
 * @param {Array<any>} [nodes]
 */
export function selectBannerSlides(nodes) {
  const slides = mapMetaobjectBanners(nodes);
  return slides.length ? slides : DEFAULT_BANNER_SLIDES;
}

/**
 * Static fallback banner slides.
 *
 * Slide 1 is the real A17 Pro Max banner currently live on hotwav-br.com
 * (desktop `1--A17_PRO_MAX.png` 3000x1314, mobile `1--A17_PRO_MAX_81aff168…`
 * 1500x2000). The copy is baked into those images, so no overlay text is set.
 *
 * The two demo slides after it use generic outdoor imagery (the same files the
 * template placeholders use) to showcase the overlay-text layout; replace them
 * with real banners via the `hero_banner` metaobject or by editing this array.
 *
 * `imageDesktop` / `imageMobile` are independent: the browser downloads only
 * the one matching the current viewport. Point them at a Shopify CDN file, a
 * `/public` path such as `/banners/hero.jpg`, or any absolute URL.
 */
export const DEFAULT_BANNER_SLIDES = [
  {
    id: 'banner-a17-pro-max',
    to: '/products/hotwav-a17-pro-max',
    alt: 'HOTWAV A17 Pro Max',
    imageDesktop:
      'https://cdn.shopify.com/s/files/1/0770/2354/3341/files/1--A17_PRO_MAX.png?v=1785996790&width=2400',
    imageMobile:
      'https://cdn.shopify.com/s/files/1/0770/2354/3341/files/1--A17_PRO_MAX_81aff168-f11d-48f3-a3f0-c0731243c5ca.png?v=1785996833&width=900',
  },
  {
    id: 'banner-rugged',
    title: 'Resistência para qualquer desafio',
    subtitle: 'A nova geração de smartphones robustos HOTWAV.',
    cta: 'Comprar agora',
    to: '/collections/smartphones-smartphones',
    alt: 'Smartphone robusto HOTWAV em uso ao ar livre',
    imageDesktop:
      'https://cdn.shopify.com/s/files/1/0551/4566/0472/files/Hydrogen_Hero_Feature_1.jpg?v=1654902468&width=2400',
    imageMobile:
      'https://cdn.shopify.com/s/files/1/0551/4566/0472/files/Hydrogen_Hero_Feature_1.jpg?v=1654902468&width=900',
  },
  {
    id: 'banner-outdoor',
    title: 'Feito para o exterior',
    subtitle: 'Proteção de nível militar, bateria enorme, pronto para aventura.',
    cta: 'Ver a coleção',
    to: '/collections/rugged-phone',
    alt: 'Banner da coleção de celulares robustos',
    imageDesktop:
      'https://cdn.shopify.com/s/files/1/0551/4566/0472/files/Hydrogen_Hero_Feature_2.jpg?v=1654902468&width=2400',
    imageMobile:
      'https://cdn.shopify.com/s/files/1/0551/4566/0472/files/Hydrogen_Hero_Feature_2.jpg?v=1654902468&width=900',
  },
];
