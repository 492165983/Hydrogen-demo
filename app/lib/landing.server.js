/**
 * Admin-editable product pages.
 *
 * Every product page is standard Hydrogen by default. The moment a
 * `product_landing` metaobject entry exists for a product handle, the page
 * switches to "landing mode": the buy box gains admin-authored highlight /
 * trust content and the sections below it are rendered from the entry's JSON
 * — no code change, no deploy. This is the Hydrogen equivalent of building a
 * product template in Liquid.
 *
 * Metaobject definition (`product_landing`):
 *   - product_handle   (single line text) — the product handle to attach to
 *   - sections         (JSON)             — ordered list of page sections
 *   - highlights_title (single line text) — buy-box bullet list heading
 *   - highlights       (list of text)     — buy-box bullet lines
 *   - trust_labels     (list of text)     — warranty / returns / shipping
 *
 * The definition must have the Storefronts access enabled, otherwise the
 * Storefront API cannot read the entries.
 *
 * All admin-authored values are funnelled through `sanitize*` helpers: a
 * malformed or half-filled field degrades to "that section is missing"
 * instead of breaking the product page.
 */

export const LANDING_METAOBJECT_TYPE = 'product_landing';

const LANDING_QUERY = `#graphql
  query productLanding(
    $type: String!
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    metaobjects(type: $type, first: 100) {
      nodes {
        handle
        fields {
          key
          value
        }
      }
    }
  }
`;

/**
 * @param {unknown} value
 * @returns {string | null}
 */
function text(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

/**
 * @param {unknown} value
 * @returns {number | null}
 */
function size(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

/**
 * Numeric passthrough used by positioning / font metrics, where 0 and
 * negative values (e.g. an overlay pulled up by -5%) are legitimate.
 * @param {unknown} value
 * @returns {number | null}
 */
function metric(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Like `metric`, but 0 means "unset" (font metrics: 0vw would hide text). */
function styleMetric(value) {
  const n = metric(value);
  return n === 0 ? null : n;
}

/**
 * @param {unknown} value
 * @returns {boolean}
 */
function isUrl(value) {
  return typeof value === 'string' && /^https?:\/\//.test(value.trim());
}

/**
 * @param {unknown} url
 * @param {string | undefined} [label]
 */
function link(url, label) {
  const href = text(url);
  const name = text(label);
  if (!name) return null;
  return {label: name, href: href ?? '#'};
}

/* ------------------------------------------------------------------ *
 * Section sanitizers. Each returns `null` when the section is not
 * configured well enough to render, which removes it from the page.
 * ------------------------------------------------------------------ */

/**
 * Full-bleed hero image with absolutely positioned text / CTA items.
 * @param {any} raw
 */
function sanitizeHero(raw) {
  const image = text(raw?.image);
  if (!image) return null;

  const items = (Array.isArray(raw?.overlay?.items) ? raw.overlay.items : [])
    .map((item) => {
      const html = text(item?.html);
      if (!html) return null;
      return {
        role: text(item?.role) ?? 'text',
        html,
        href: text(item?.href),
        size: text(item?.size),
        color: text(item?.color),
      };
    })
    .filter(Boolean);

  return {
    type: 'hero',
    image,
    imageMobile: text(raw?.imageMobile),
    width: size(raw?.w),
    height: size(raw?.h),
    alt: text(raw?.alt) ?? '',
    heightClass: text(raw?.heightClass),
    /** `light` = white copy on dark art, `dark` = dark copy on light art. */
    overlay: items.length
      ? {
          align: ['left', 'center', 'right'].includes(raw?.overlay?.align)
            ? raw.overlay.align
            : 'left',
          valign: ['top', 'center', 'bottom'].includes(raw?.overlay?.valign)
            ? raw.overlay.valign
            : 'center',
          theme: raw?.overlay?.theme === 'dark' ? 'dark' : 'light',
          items,
        }
      : null,
  };
}

/**
 * Full-bleed design banner with a % positioned copy layer (desktop and
 * mobile variants). Ported from the Liquid theme's ethan-landing-banner-2.
 * @param {any} raw
 */
function sanitizeBanner(raw) {
  const image = text(raw?.image);
  if (!image) return null;

  const overlay = (value) => {
    const items = (Array.isArray(value?.items) ? value.items : [])
      .map((item) => {
        const html = text(item?.html);
        if (!html) return null;
        return {
          role: text(item?.role) ?? 'text',
          html,
          size: styleMetric(item?.size),
          lineHeight: styleMetric(item?.lineHeight),
          weight: styleMetric(item?.weight),
          color: text(item?.color),
          gradient: text(item?.gradient),
        };
      })
      .filter(Boolean);
    if (!items.length) return null;

    const align = ['left', 'center', 'right'].includes(value?.align)
      ? value.align
      : 'left';
    return {
      align,
      top: metric(value?.top) ?? 0,
      left: metric(value?.left),
      right: metric(value?.right),
      items,
    };
  };

  return {
    type: 'banner',
    image,
    w: size(raw?.w),
    h: size(raw?.h),
    alt: text(raw?.alt) ?? '',
    imageMobile: text(raw?.imageMobile),
    wMobile: size(raw?.wMobile),
    hMobile: size(raw?.hMobile),
    overlay: overlay(raw?.overlay),
    overlayMobile: overlay(raw?.overlayMobile),
  };
}

/**
 * Labeled tabs switching between whole groups of sections (the theme's
 * "Detail" / "Specs" pattern). Panes are recursively sanitised, so any
 * section type can live inside a pane.
 * @param {any} raw
 */
function sanitizeTabs(raw) {
  const panes = (Array.isArray(raw?.panes) ? raw.panes : [])
    .map((pane) => {
      const label = text(pane?.label);
      const sections = sanitizeSections(pane?.sections);
      if (!label || !sections) return null;
      return {label, sections};
    })
    .filter(Boolean);

  // 只剩一个页签照样返回；由 sanitizeSections 负责拆平（不要孤零零一条页签栏）。
  // 早期版本这里直接 return null，会让「Specs 留空」的 tabs 整块消失。
  if (!panes.length) return null;
  return {type: 'tabs', panes};
}

/**
 * Horizontally scrollable image gallery.
 * @param {any} raw
 */
function sanitizeGallery(raw) {
  const slides = (Array.isArray(raw?.slides) ? raw.slides : [])
    .map((slide) => {
      const img = text(slide?.img);
      if (!img) return null;
      return {
        img,
        width: size(slide?.w),
        height: size(slide?.h),
        alt: text(slide?.alt) ?? '',
      };
    })
    .filter(Boolean);

  if (!slides.length) return null;

  return {
    type: 'gallery',
    title: text(raw?.title),
    descHtml: text(raw?.descHtml),
    slides,
  };
}

/**
 * Image beside a block of copy, optionally flipped and with bullets + CTA.
 * @param {any} raw
 */
function sanitizeImageText(raw) {
  const image = text(raw?.image);
  const title = text(raw?.title);
  const html = text(raw?.html);
  if (!image && !title && !html) return null;

  return {
    type: 'imageText',
    image,
    width: size(raw?.w),
    height: size(raw?.h),
    alt: text(raw?.alt) ?? '',
    title,
    html,
    flip: raw?.flip === true,
    theme: raw?.theme === 'dark' ? 'dark' : 'light',
    bullets: (Array.isArray(raw?.bullets) ? raw.bullets : [])
      .map((line) => text(line))
      .filter(Boolean),
    cta: link(raw?.cta?.href, raw?.cta?.label) ?? link(raw?.ctaHref, raw?.ctaLabel),
  };
}

/**
 * Grid of feature cards (icon or image + title + copy).
 * @param {any} raw
 */
function sanitizeFeatures(raw) {
  const items = (Array.isArray(raw?.items) ? raw.items : [])
    .map((item) => {
      const title = text(item?.title);
      if (!title) return null;
      return {
        image: text(item?.image) ?? text(item?.icon),
        title,
        text: text(item?.text),
      };
    })
    .filter(Boolean);

  if (!items.length) return null;

  const columns = Number(raw?.columns);
  return {
    type: 'features',
    title: text(raw?.title),
    subtitle: text(raw?.subtitle),
    columns: [2, 3, 4].includes(columns) ? columns : 3,
    items,
  };
}

/**
 * Specification chart, optionally with a colour-image row on top.
 * @param {any} raw
 */
function sanitizeSpecs(raw) {
  // Theme-authored values may carry `<br>` as a real line break; normalise it
  // to `\n` (rendered with `whitespace-pre-line`) instead of leaking the tag.
  const plain = (value) =>
    typeof value === 'string'
      ? value
          .replace(/<br\s*\/?>/gi, '\n')
          .replace(/\n{2,}/g, '\n')
          .replace(/&nbsp;/g, ' ')
          .trim()
      : value;

  const groups = (Array.isArray(raw?.groups) ? raw.groups : [])
    .map((group) => ({
      category: text(plain(group?.category)) ?? '',
      rows: (Array.isArray(group?.rows) ? group.rows : [])
        .filter((row) => Array.isArray(row) && row.length >= 2)
        .map((row) => [String(plain(row[0])), String(plain(row[1]))]),
    }))
    .filter((group) => group.rows.length > 0);

  if (!groups.length) return null;

  return {
    type: 'specs',
    title: text(raw?.title),
    colorLabel: text(raw?.colorLabel),
    colorImages: (Array.isArray(raw?.colorImages) ? raw.colorImages : [])
      .map((url) => text(url))
      .filter(Boolean),
    groups,
  };
}

/**
 * Side-by-side comparison table (e.g. this model vs. the previous one).
 * @param {any} raw
 */
function sanitizeCompare(raw) {
  const columns = (Array.isArray(raw?.columns) ? raw.columns : [])
    .map((column) => text(column))
    .filter(Boolean);
  if (columns.length < 2) return null;

  const rows = (Array.isArray(raw?.rows) ? raw.rows : [])
    .map((row) => {
      const label = text(row?.label);
      if (!label) return null;
      const values = (Array.isArray(row?.values) ? row.values : [])
        .map((value) => (value == null ? '—' : String(value)));
      if (!values.length) return null;
      return {label, values};
    })
    .filter(Boolean);

  if (!rows.length) return null;

  return {type: 'compare', title: text(raw?.title), columns, rows};
}

/**
 * Accordion of questions and answers.
 * @param {any} raw
 */
function sanitizeFaq(raw) {
  const items = (Array.isArray(raw?.items) ? raw.items : [])
    .map((item) => {
      const q = text(item?.q) ?? text(item?.question);
      const a = text(item?.a) ?? text(item?.answer);
      if (!q || !a) return null;
      return {q, a};
    })
    .filter(Boolean);

  if (!items.length) return null;
  return {type: 'faq', title: text(raw?.title), items};
}

/**
 * Video embed: YouTube / Vimeo URLs become iframes, anything else a <video>.
 * @param {any} raw
 */
function sanitizeVideo(raw) {
  const url = text(raw?.url);
  if (!isUrl(url)) return null;
  return {
    type: 'video',
    title: text(raw?.title),
    url,
    poster: text(raw?.poster),
    ratio: text(raw?.ratio) ?? '16/9',
  };
}

/**
 * Plain rich-text band.
 * @param {any} raw
 */
function sanitizeRichText(raw) {
  const html = text(raw?.html);
  const title = text(raw?.title);
  if (!html && !title) return null;
  return {
    type: 'text',
    title,
    html,
    align: ['left', 'center'].includes(raw?.align) ? raw.align : 'left',
  };
}

/**
 * Closing call-to-action band with optional background image.
 * @param {any} raw
 */
function sanitizeCta(raw) {
  const title = text(raw?.title);
  if (!title) return null;
  return {
    type: 'cta',
    title,
    text: text(raw?.text),
    image: text(raw?.image),
    theme: raw?.theme === 'light' ? 'light' : 'dark',
    button: link(raw?.button?.href, raw?.button?.label),
  };
}

/**
 * Theme's ethan-product-swiper: background image with a centered viewport
 * cycling through two slide images.
 * @param {any} raw
 */
function sanitizeProductSwiper(raw) {
  const slides = (Array.isArray(raw?.slides) ? raw.slides : [])
    .map((slide) => {
      const image = text(slide?.image);
      if (!image) return null;
      return {
        image,
        w: size(slide?.w),
        h: size(slide?.h),
      };
    })
    .filter(Boolean);

  if (!slides.length) return null;

  const section = {type: 'productSwiper', slides};
  const bg = text(raw?.background);
  if (bg) {
    section.background = bg;
    section.bgW = size(raw?.bgW);
    section.bgH = size(raw?.bgH);
  }
  return section;
}

/**
 * Theme's ethan-text-image: base image + optional overlay image + a
 * floating logo/title/copy block.
 * @param {any} raw
 */
function sanitizeTextImage(raw) {
  const image = text(raw?.image);
  if (!image) return null;

  const lines = (Array.isArray(raw?.lines) ? raw.lines : [])
    .map((line) => text(line))
    .filter(Boolean);

  return {
    type: 'textImage',
    image,
    w: size(raw?.w),
    h: size(raw?.h),
    imageAlt: text(raw?.imageAlt),
    wAlt: size(raw?.wAlt),
    hAlt: size(raw?.hAlt),
    logo: text(raw?.logo),
    title: text(raw?.title),
    lines,
  };
}

/**
 * Theme's ethan-swiper-product: gradient header + fixed phone image +
 * slide carousel (image / divider / gradient title / description).
 * @param {any} raw
 */
function sanitizeSwiperProduct(raw) {
  const slides = (Array.isArray(raw?.slides) ? raw.slides : [])
    .map((slide) => {
      const image = text(slide?.image);
      if (!image) return null;
      return {
        image,
        w: size(slide?.w),
        h: size(slide?.h),
        title: text(slide?.title),
        desc: text(slide?.desc),
      };
    })
    .filter(Boolean);

  if (!slides.length) return null;

  const section = {
    type: 'swiperProduct',
    title: text(raw?.title),
    desc: text(raw?.desc),
    slides,
  };
  const phone = text(raw?.phoneImage);
  if (phone) {
    section.phoneImage = phone;
    section.phoneW = size(raw?.phoneW);
    section.phoneH = size(raw?.phoneH);
  }
  return section;
}

/**
 * Theme's ethan-left-right-text: alternating copy/image rows (45% / 55%)
 * on a solid background. `side` says where the copy sits ("left" = copy
 * first then image, "right" = image first then copy).
 * @param {any} raw
 */
function sanitizeLeftRightText(raw) {
  const rows = (Array.isArray(raw?.rows) ? raw.rows : [])
    .map((row) => {
      const image = text(row?.image);
      const heading = text(row?.heading);
      const subheading = text(row?.subheading);
      if (!image && !heading && !subheading) return null;
      return {
        side: row?.side === 'right' ? 'right' : 'left',
        image,
        w: size(row?.w),
        h: size(row?.h),
        heading,
        headingSize: styleMetric(row?.headingSize) ?? 2,
        headingWeight: styleMetric(row?.headingWeight) ?? 400,
        subheading,
        subSize: styleMetric(row?.subSize) ?? 1,
        subWeight: styleMetric(row?.subWeight) ?? 400,
      };
    })
    .filter(Boolean);

  if (!rows.length) return null;
  return {type: 'leftRightText', bg: text(raw?.bg) ?? '#000000', rows};
}

/**
 * Full-bleed image slideshow (theme's `media-slider-section` /
 * `slideshow_ver2`). Keeps every slide that has an image.
 * @param {any} raw
 */
function sanitizeImageSlideshow(raw) {
  const slides = (Array.isArray(raw?.slides) ? raw.slides : [])
    .map((slide) => {
      const image = text(typeof slide === 'string' ? slide : slide?.image);
      if (!image) return null;
      return {
        image,
        imageMobile: text(slide?.imageMobile),
        alt: text(slide?.alt) ?? '',
        w: size(slide?.w),
        h: size(slide?.h),
        wMobile: size(slide?.wMobile),
        hMobile: size(slide?.hMobile),
      };
    })
    .filter(Boolean);
  if (!slides.length) return null;

  return {
    type: 'imageSlideshow',
    ratio: metric(raw?.ratio),
    autoplay: raw?.autoplay === true,
    interval: metric(raw?.interval),
    arrows: raw?.arrows !== false,
    dots: raw?.dots === true,
    slides,
  };
}

const SECTION_SANITIZERS = {
  hero: sanitizeHero,
  banner: sanitizeBanner,
  imageSlideshow: sanitizeImageSlideshow,
  tabs: sanitizeTabs,
  productSwiper: sanitizeProductSwiper,
  textImage: sanitizeTextImage,
  swiperProduct: sanitizeSwiperProduct,
  leftRightText: sanitizeLeftRightText,
  gallery: sanitizeGallery,
  imageText: sanitizeImageText,
  features: sanitizeFeatures,
  specs: sanitizeSpecs,
  compare: sanitizeCompare,
  faq: sanitizeFaq,
  video: sanitizeVideo,
  text: sanitizeRichText,
  cta: sanitizeCta,
};

/**
 * Render the admin's section list, dropping anything unusable. Unknown
 * section types are warned about but never fatal.
 * @param {unknown} value
 * @returns {Array<object> | null}
 */
export function sanitizeSections(value) {
  if (!Array.isArray(value)) return null;

  const sections = [];
  for (const raw of value) {
    if (!raw || typeof raw !== 'object') continue;
    const type = text(raw.type);
    const sanitizer = type ? SECTION_SANITIZERS[type] : null;
    if (!sanitizer) {
      // eslint-disable-next-line no-console
      console.warn(
        `[product_landing] Unknown section type "${type ?? 'undefined'}"; skipping it.`,
      );
      continue;
    }
    const section = sanitizer(raw);
    if (!section) continue;
    // 页签只剩一页时拆平：后台把「规格」页签留空是最常见的半填状态，
    // 这种时候应该直接渲染剩下的内容，而不是让整块（甚至整页）消失。
    if (section.type === 'tabs' && section.panes.length === 1) {
      sections.push(...section.panes[0].sections);
      continue;
    }
    sections.push(section);
  }

  return sections.length ? sections : null;
}

/**
 * @param {unknown} value
 * @returns {string[] | null}
 */
function sanitizeLines(value) {
  if (!Array.isArray(value)) return null;
  const lines = value
    .map((line) => text(line))
    .filter(/** @returns {line is string} */ (line) => Boolean(line));
  return lines.length ? lines : null;
}

/**
 * Turn a metaobject node into the props consumed by the page.
 *
 * Metaobject list fields come back either as a real array or as a
 * JSON/newline encoded string depending on how the field was typed, so both
 * shapes are accepted.
 * @param {any} node
 */
export function parseLandingMetaobject(node) {
  if (!node) return null;

  /** @type {Record<string, string>} */
  const fields = {};
  for (const field of node?.fields ?? []) {
    if (field?.key) fields[field.key] = field.value ?? '';
  }

  const jsonField = (key) => {
    if (!fields[key]) return null;
    try {
      return JSON.parse(fields[key]);
    } catch {
      // eslint-disable-next-line no-console
      console.warn(
        `[product_landing] Field "${key}" is not valid JSON; ignoring it.`,
      );
      return null;
    }
  };

  const listField = (key) => {
    const raw = fields[key]?.trim();
    if (!raw) return null;
    if (raw.startsWith('[')) return sanitizeLines(jsonField(key));
    return sanitizeLines(
      raw
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean),
    );
  };

  const landing = {
    sections: sanitizeSections(jsonField('sections')),
    highlightsTitle: text(fields['highlights_title']),
    highlightsLines: listField('highlights'),
    trustLabels: listField('trust_labels'),
  };

  // At least one field must carry content for the entry to count as
  // "configured"; an empty entry keeps the default product page.
  return Object.values(landing).some((value) => value != null) ? landing : null;
}

/**
 * Load the landing entry attached to a product handle. Returns `null` when
 * nothing matches — or when the definition does not exist yet — so the
 * product page always keeps rendering.
 *
 * @param {{context: any}} args
 * @param {string} productHandle
 */
export async function loadLandingContent({context}, productHandle) {
  const {country, language} = context.storefront.i18n;

  const data = await context.storefront
    .query(LANDING_QUERY, {
      variables: {type: LANDING_METAOBJECT_TYPE, country, language},
      cache: context.storefront.CacheShort(),
    })
    .catch((error) => {
      // eslint-disable-next-line no-console
      console.warn(
        `[product_landing] Could not read "${LANDING_METAOBJECT_TYPE}" metaobjects; falling back to the default product page.`,
        error?.message ?? error,
      );
      return null;
    });

  const nodes = data?.metaobjects?.nodes ?? [];
  const match = nodes.find((node) => {
    const fieldHandle = (node?.fields ?? []).find(
      (field) => field?.key === 'product_handle',
    )?.value;
    return fieldHandle === productHandle || node?.handle === productHandle;
  });

  return match ? parseLandingMetaobject(match) : null;
}
