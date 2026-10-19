/**
 * Homepage "featured product" banner ("O nosso produto distintivo" style):
 * pick one product in the admin, plus heading / description / button copy.
 * Data comes from a `featured_product` metaobject — nothing is hard-coded.
 *
 * Metaobject definition `featured_product`:
 *   - product      (product reference, required) — the product to feature;
 *                  image + link are derived from it
 *   - heading      (single line text, optional)   — defaults to product title
 *   - description  (multi-line text, optional)
 *   - button_label (single line text, optional)   — defaults to "Compre agora"
 *   - image        (file, optional)              — overrides the product image
 *
 * Only the first published entry is shown. When nothing is published (or the
 * query fails) the section is simply not rendered — no static fallback.
 */
export const FEATURED_PRODUCT_QUERY = `#graphql
  query homepageFeaturedProduct($country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    metaobjects(type: "featured_product", first: 5) {
      nodes {
        id
        fields {
          key
          value
          reference {
            __typename
            ... on Product {
              id
              handle
              title
              featuredImage {
                url
                altText
                width
                height
              }
            }
            ... on MediaImage {
              image {
                url
                altText
                width
                height
              }
            }
          }
        }
      }
    }
  }
`;

/** Index a metaobject's fields by key. */
function fieldMap(node) {
  /** @type {Record<string, any>} */
  const fields = {};
  for (const field of node?.fields ?? []) {
    if (field?.key) fields[field.key] = field;
  }
  return fields;
}

/**
 * Turn `featured_product` metaobject nodes into a renderable banner.
 * @param {Array<any>} [nodes]
 * @returns {{id: string, productHandle: string, productTitle: string,
 *   heading: string, description?: string, buttonLabel: string,
 *   image?: {url: string, alt?: string, width?: number, height?: number}} | null}
 */
export function mapFeaturedProduct(nodes = []) {
  for (const node of nodes ?? []) {
    const fields = fieldMap(node);

    const ref = fields.product?.reference;
    if (ref?.__typename !== 'Product' || !ref.handle) continue;

    // Optional `image` (file) field overrides the product featured image.
    const override = fields.image?.reference;
    const overrideImage =
      override?.__typename === 'MediaImage' ? override.image : null;

    const image = overrideImage ?? ref.featuredImage ?? null;

    return {
      id: node?.id ?? node?.handle ?? ref.id,
      productHandle: ref.handle,
      productTitle: ref.title || '',
      heading: fields.heading?.value || ref.title || '',
      description: fields.description?.value || undefined,
      buttonLabel: fields.button_label?.value || 'Compre agora',
      image: image?.url
        ? {url: image.url, alt: image.altText || ref.title, width: image.width, height: image.height}
        : undefined,
    };
  }
  return null;
}
