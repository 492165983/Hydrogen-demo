import {MEDIA_FRAGMENT} from '~/data/fragments';

/**
 * Homepage video showcase data source ("Popular & Best Seller" style strip).
 *
 * Videos live in the Shopify admin as **Metaobjects** of type `video_showcase`,
 * so merchants can upload/replace videos without touching code.
 *
 * Metaobject definition `video_showcase`:
 *   - title    (single line text)  — section heading, e.g. "Popular & Best Seller"
 *   - videos   (file, or file list) — pick/upload the videos (mp4 recommended);
 *                                  an image picked here renders as a plain
 *                                  image card without a play button
 *   - captions (single line text, or text list) — optional caption(s), matched
 *                                  by order when a list (1st caption = 1st video…),
 *                                  or applied to the first video when single
 *
 * Both the single-value and the list variant are supported, so the definition
 * works whether the field was created as "file"/"text" or "files"/"text list".
 *
 * All published `video_showcase` entries are merged into ONE horizontal strip
 * on the homepage (title = first non-empty `title`), so videos can be uploaded
 * one entry at a time and still sit in the same row. When nothing is published
 * (or the query fails), the section is simply not rendered — no static fallback.
 *
 * @see https://shopify.dev/docs/apps/build/custom-data/metaobjects
 */
export const VIDEO_SHOWCASE_QUERY = `#graphql
  query homepageVideoShowcase($country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    metaobjects(type: "video_showcase", first: 30) {
      nodes {
        id
        handle
        fields {
          key
          value
          reference {
            ...Media
          }
          references(first: 24) {
            nodes {
              ...Media
            }
          }
        }
      }
    }
  }
  ${MEDIA_FRAGMENT}
`;

/**
 * Pick an mp4 source.
 *
 * @param {Array<any>} sources Shopify `MediaFile.sources`
 * @param {{minHeight?: number}} [options] lowest rendition that is acceptable.
 *   The small swimlane cards (~250px wide) look identical at 480p and load much
 *   faster; the fullscreen text-reveal section needs at least 720p or the
 *   upscaled picture turns visibly blurry.
 * Shopify exposes HLS (.m3u8) too, which needs special playback — skipped.
 */
export function pickVideoSource(sources = [], {minHeight = 480} = {}) {
  const mp4 = (sources || []).filter(
    (source) => source?.url && (source.mimeType || '').includes('mp4'),
  );
  const pool = mp4.length ? mp4 : (sources || []).filter((s) => s?.url);
  if (!pool.length) return null;

  const heightOf = (source) => {
    const match = source.url.match(/(?:SD|HD)-(\d+)p/i);
    return match ? Number.parseInt(match[1], 10) : null;
  };
  // Smallest rendition at or above `minHeight` (fastest download that still
  // looks sharp); otherwise the largest we have.
  const sorted = [...pool].sort(
    (a, b) => (heightOf(a) ?? 9999) - (heightOf(b) ?? 9999),
  );
  return (
    sorted.find((source) => (heightOf(source) ?? 0) >= minHeight) ??
    sorted[sorted.length - 1]
  );
}

/**
 * Text fields can be single (`"a17"`) or list (`'["a","b"]'`, JSON in `value`).
 * @returns {string[]}
 */
function parseTextList(value) {
  if (!value) return [];
  const raw = String(value).trim();
  if (!raw) return [];
  if (raw.startsWith('[')) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter((v) => typeof v === 'string' && v.trim());
      }
    } catch {
      /* fall through to single value */
    }
  }
  return [raw];
}

/** File fields can be single (`reference`) or list (`references.nodes`). */
function mediaNodesOf(field) {
  const list = field?.references?.nodes?.filter(Boolean) ?? [];
  if (list.length) return list;
  return field?.reference ? [field.reference] : [];
}

/**
 * Turn Shopify metaobject nodes into ONE showcase section.
 *
 * Every published `video_showcase` entry contributes its video(s) to the same
 * horizontal strip (new entries append to the right), so the merchant can add
 * videos one entry at a time without them splitting into separate rows.
 * The section heading is the first non-empty `title` across the entries.
 *
 * @param {Array<any>} [nodes]
 */
export function mapVideoShowcases(nodes = []) {
  /** @type {Array<any>} */
  const items = [];
  /** @type {string | undefined} */
  let title;
  /** @type {string | undefined} */
  let id;

  for (const node of nodes || []) {
    /** @type {Record<string, any>} */
    const fields = {};
    for (const field of node?.fields ?? []) {
      if (field?.key) fields[field.key] = field;
    }

    const captions = parseTextList(fields.captions?.value);
    const nodeTitle = fields.title?.value?.trim() || undefined;

    if (!title && nodeTitle) title = nodeTitle;
    if (!id) id = node?.id ?? node?.handle;

    mediaNodesOf(fields.videos).forEach((media, index) => {
      if (media?.__typename === 'Video') {
        const source = pickVideoSource(media.sources);
        if (!source) return;
        items.push({
          id: media.id || `${node.handle}-video-${index}`,
          kind: 'video',
          url: source.url,
          poster: media.previewImage?.url || undefined,
          alt: media.alt || undefined,
          caption: captions[index] || undefined,
        });
        return;
      }
      if (media?.__typename === 'MediaImage' && media.image?.url) {
        items.push({
          id: media.id || `${node.handle}-image-${index}`,
          kind: 'image',
          url: media.image.url,
          alt: media.alt || captions[index] || undefined,
          caption: captions[index] || undefined,
        });
      }
    });
  }

  return items.length ? [{id: id || 'video-showcase', title, items}] : [];
}
