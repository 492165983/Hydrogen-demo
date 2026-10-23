import {MEDIA_FRAGMENT} from '~/data/fragments';
import {pickVideoSource} from '~/lib/video-showcase';

/**
 * Homepage "text knockout video" scroll section.
 *
 * A single word is carved out of a dark panel: the letterforms are a window onto
 * a looping video. As the panel is pinned and the shopper keeps scrolling, the
 * word grows until the letters cover the whole viewport and the video is shown
 * in full. The effect is driven by scroll position, so scrolling back up plays it
 * in reverse.
 *
 * Content lives in the Shopify admin as a **Metaobject** of type
 * `text_video_reveal`, so the word and the video can be swapped without code:
 *
 *   - word       (single line text) — the knocked-out text, e.g. "PAD 13 PRO"
 *   - subtitle   (single line text) — optional line under the word
 *   - video      (file)             — the revealed video (mp4 recommended)
 *   - poster     (file)             — optional still shown before the video loads
 *                                    (falls back to the video's own preview image)
 *   - cta_text   (single line text) — optional button label
 *   - cta_link   (url)              — where that button points
 *
 * Only the first published entry with both a word and a video is used; when
 * there is none the section is not rendered at all.
 *
 * @see https://shopify.dev/docs/apps/build/custom-data/metaobjects
 */
export const TEXT_VIDEO_REVEAL_QUERY = `#graphql
  query homepageTextVideoReveal($country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    metaobjects(type: "text_video_reveal", first: 10) {
      nodes {
        id
        handle
        fields {
          key
          value
          reference {
            ...Media
          }
          references(first: 4) {
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

/** File fields can be single (`reference`) or list (`references.nodes`). */
function mediaNodesOf(field) {
  const list = field?.references?.nodes?.filter(Boolean) ?? [];
  if (list.length) return list;
  return field?.reference ? [field.reference] : [];
}

function textOf(field) {
  const value = field?.value;
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

/**
 * @param {Array<any>} [nodes] metaobject nodes from `TEXT_VIDEO_REVEAL_QUERY`
 * @returns {{id: string, word: string, subtitle?: string, video: string,
 *   poster?: string, ctaText?: string, ctaHref?: string} | null}
 */
export function mapTextVideoReveal(nodes = []) {
  for (const node of nodes || []) {
    /** @type {Record<string, any>} */
    const fields = {};
    for (const field of node?.fields ?? []) {
      if (field?.key) fields[field.key] = field;
    }

    const word = textOf(fields.word);
    if (!word) continue;

    const video = mediaNodesOf(fields.video).find(
      (media) => media?.__typename === 'Video',
    );
    // Fullscreen playback: anything below 720p looks blurry when upscaled.
    const source = pickVideoSource(video?.sources ?? [], {minHeight: 720});
    if (!source) continue;

    const posterImage = mediaNodesOf(fields.poster).find(
      (media) => media?.image?.url || media?.previewImage?.url,
    );

    return {
      id: node?.id || node?.handle || 'text-video-reveal',
      word,
      subtitle: textOf(fields.subtitle),
      video: source.url,
      poster:
        posterImage?.image?.url ||
        posterImage?.previewImage?.url ||
        video?.previewImage?.url ||
        undefined,
      ctaText: textOf(fields.cta_text),
      ctaHref: textOf(fields.cta_link),
    };
  }

  return null;
}
