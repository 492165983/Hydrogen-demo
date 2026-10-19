import {useCallback, useEffect, useRef, useState} from 'react';
import {Image} from '@shopify/hydrogen';
import clsx from 'clsx';
import {IconCaret} from '~/components/Icon';

/**
 * Product gallery with a thumbnail strip that mimics the hotwav.com effect:
 *
 * - One media item is shown at a time in the main stage, with prev/next arrows.
 * - While the pointer is over the gallery, a thumbnail strip is displayed below
 *   the stage (active thumbnail highlighted).
 * - When the pointer leaves, the strip scales down and fades out, collapsing
 *   into a dot pagination in the same spot; it expands back on re-entry.
 * - Touch devices (no hover) always show dots and can swipe between slides.
 *
 * @param {{
 *   media: MediaFragment[];
 *   variantImage?: {url: string; altText?: string | null; width?: number; height?: number} | null;
 *   className?: string;
 * }}
 */
export function ProductGallery({media, variantImage, className}) {
  const slides = media
    .map((med) => {
      const previewUrl = med.previewImage?.url;
      if (med.__typename === 'MediaImage' && med.image) {
        return {
          id: med.id || med.image.id,
          type: 'image',
          url: med.image.url,
          alt: med.alt || 'Imagem do produto',
          width: med.image.width,
          height: med.image.height,
        };
      }
      if (med.__typename === 'Video') {
        return {
          id: med.id,
          type: 'video',
          sources: med.sources,
          poster: previewUrl,
          alt: med.alt || 'Vídeo do produto',
        };
      }
      // Model3d (and anything else) falls back to its preview image. The
      // Storefront API serves `previewImage.url` as a 100x100 thumbnail, so
      // ask the Shopify CDN for a full-size rendition instead.
      if (previewUrl) {
        return {
          id: med.id,
          type: 'image',
          url: withWidth(previewUrl, 1200) || previewUrl,
          alt: med.alt || 'Mídia do produto',
        };
      }
      return null;
    })
    .filter(Boolean);

  // The variant photo returned by the API is not guaranteed to be part of the
  // product's media list (the query only asks for the first few items), so make
  // sure it is always available as its own slide.
  const variantUrl = variantImage?.url;
  if (
    variantUrl &&
    !slides.some((slide) => sameImageUrl(slide.url, variantUrl))
  ) {
    slides.unshift({
      id: `variant-${variantUrl}`,
      type: 'image',
      url: variantUrl,
      alt: variantImage.altText || 'Imagem do produto',
      width: variantImage.width,
      height: variantImage.height,
    });
  }

  const variantIndex = variantUrl
    ? slides.findIndex((slide) => sameImageUrl(slide.url, variantUrl))
    : -1;

  const count = slides.length;
  const [current, setCurrent] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const stageRef = useRef(null);
  const canHover = useRef(true);
  const touchStartX = useRef(null);
  const swiped = useRef(false);
  const lastVariantUrl = useRef(variantUrl);

  useEffect(() => {
    canHover.current = window.matchMedia('(hover: hover)').matches;
  }, []);

  // Pause any playing video when the slide changes
  useEffect(() => {
    stageRef.current
      ?.querySelectorAll('video')
      .forEach((video) => video.pause());
  }, [current]);

  // Follow the selected variant: picking a colour on the right swaps the main
  // image to that variant's photo. Only reacts to actual changes so manually
  // browsing the gallery is not immediately overridden on mount.
  useEffect(() => {
    if (lastVariantUrl.current === variantUrl) return;
    lastVariantUrl.current = variantUrl;
    if (variantIndex >= 0) setCurrent(variantIndex);
  }, [variantIndex, variantUrl]);

  // Keep the active index inside bounds when navigating to another product.
  useEffect(() => {
    setCurrent((prev) => Math.min(prev, Math.max(count - 1, 0)));
  }, [count]);

  const goTo = useCallback(
    (next) => {
      if (!count) return;
      setCurrent(Math.min(Math.max(next, 0), count - 1));
    },
    [count],
  );

  const goNext = useCallback(() => goTo(current + 1), [current, goTo]);
  const goPrev = useCallback(() => goTo(current - 1), [current, goTo]);

  // Expand/collapse react instantly on pointer enter/leave — no artificial
  // delay, so the transition never feels laggy. Moving from the stage down to
  // the thumbnails stays inside the section, so an immediate collapse is safe.
  const expand = useCallback(() => {
    if (!canHover.current || !count) return;
    setExpanded(true);
  }, [count]);

  const collapse = useCallback(() => {
    if (!canHover.current) return;
    setExpanded(false);
  }, []);

  const onTouchStart = (event) => {
    touchStartX.current = event.touches[0].clientX;
    swiped.current = false;
  };

  const onTouchEnd = (event) => {
    if (touchStartX.current === null) return;
    const deltaX = event.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(deltaX) < 40) return;
    swiped.current = true;
    if (deltaX < 0) goNext();
    else goPrev();
  };

  const onKeyDown = (event) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      goNext();
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      goPrev();
    }
  };

  if (!count) return null;

  return (
    <section
      className={clsx('relative w-full select-none', className)}
      aria-roledescription="carousel"
      aria-label="Mídia do produto"
      onMouseEnter={expand}
      onMouseLeave={collapse}
      onFocusCapture={expand}
      onBlurCapture={collapse}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onKeyDown={onKeyDown}
    >
      {/* Main stage */}
      <div
        ref={stageRef}
        className="relative aspect-square w-full overflow-hidden bg-white dark:bg-contrast/10"
      >
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            aria-hidden={index !== current}
            className={clsx(
              'absolute inset-0 transition-opacity duration-500 ease-out',
              index === current
                ? 'z-10 opacity-100'
                : 'z-0 opacity-0 pointer-events-none',
            )}
          >
            {slide.type === 'video' ? (
              <video
                className="h-full w-full object-contain"
                controls
                playsInline
                preload={index === current ? 'metadata' : 'none'}
                poster={withWidth(slide.poster, 1200)}
              >
                {slide.sources.map((source) => (
                  <source
                    key={source.url}
                    src={source.url}
                    type={source.mimeType}
                  />
                ))}
              </video>
            ) : (
              <Image
                loading={index === 0 ? 'eager' : 'lazy'}
                data={{
                  url: slide.url,
                  altText: slide.alt,
                  width: slide.width,
                  height: slide.height,
                }}
                sizes="(min-width: 64em) 48vw, (min-width: 48em) 50vw, 92vw"
                className="fadeIn h-full w-full object-contain"
              />
            )}
          </div>
        ))}

        {/* Prev / next arrows */}
        {count > 1 && (
          <>
            <GalleryArrow
              direction="left"
              label="Mídia anterior"
              disabled={current === 0}
              onClick={goPrev}
            />
            <GalleryArrow
              direction="right"
              label="Próxima mídia"
              disabled={current === count - 1}
              onClick={goNext}
            />
          </>
        )}
      </div>

      {/* Indicator zone — Creality-style morph: each dot IS the thumbnail.
          Idle: 8px dots anchored to the bottom of the zone. On hover every dot
          grows into a rounded thumbnail in place (the row grows upward, the
          bottom edge stays fixed) and the image fades in as it expands. */}
      {count > 1 && (
        <div className="relative mt-3 h-14">
          <div className="absolute inset-x-0 bottom-0 flex items-end justify-center gap-2.5">
            {slides.map((slide, index) => {
              const isActive = index === current;
              return (
                <button
                  key={`thumb-${slide.id}`}
                  type="button"
                  aria-label={`Ir para a mídia ${index + 1}`}
                  aria-current={isActive}
                  onClick={() => goTo(index)}
                  className={clsx(
                    'relative shrink-0 transform-gpu overflow-hidden rounded-xl transition-all duration-500 ease-in-out',
                    expanded ? 'h-14 w-14' : 'h-2 w-2',
                    expanded
                      ? isActive
                        ? 'bg-white ring-2 ring-primary/80 ring-offset-2 ring-offset-white dark:ring-offset-contrast'
                        : 'bg-white ring-1 ring-primary/10'
                      : isActive
                      ? 'bg-primary'
                      : 'bg-primary/25 hover:bg-primary/45',
                  )}
                >
                  <img
                    src={withWidth(slide.poster || slide.url, 144)}
                    alt=""
                    loading="lazy"
                    className={clsx(
                      'h-full w-full object-cover transition-opacity',
                      expanded
                        ? 'delay-100 opacity-100 duration-300'
                        : 'opacity-0 duration-150',
                    )}
                  />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

/**
 * Circular prev/next arrow button, only shown on hover-capable viewports.
 * @param {{
 *   direction: 'left' | 'right';
 *   label: string;
 *   disabled: boolean;
 *   onClick: () => void;
 * }}
 */
function GalleryArrow({direction, label, disabled, onClick}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={clsx(
        'absolute top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-primary/10 text-primary/70 backdrop-blur-sm transition-all duration-200 hover:bg-primary/20 hover:text-primary disabled:pointer-events-none disabled:opacity-30 md:flex',
        direction === 'left' ? 'left-3' : 'right-3',
      )}
    >
      <IconCaret direction={direction} />
    </button>
  );
}

/**
 * Compare two image URLs ignoring CDN cache-busting query strings, so the
 * variant photo can be matched against the product media list.
 * @param {string} [a]
 * @param {string} [b]
 */
function sameImageUrl(a, b) {
  if (!a || !b) return false;
  return a.split('?')[0] === b.split('?')[0];
}

/**
 * Build a Shopify CDN URL with a single `width` transform. Any existing
 * `width`/`height`/`crop` parameters are replaced — Shopify preview images
 * arrive as `?width=100&height=100&crop=center` thumbnails, and keeping the
 * stale `height` would clamp the rendition to 100px tall. The CDN serves any
 * requested size from the original upload, so this costs nothing.
 * Non-Shopify or invalid URLs are returned untouched.
 * @param {string} [url]
 * @param {number} width
 */
function withWidth(url, width) {
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.endsWith('shopify.com')) return url;
    parsed.searchParams.delete('height');
    parsed.searchParams.delete('crop');
    parsed.searchParams.set('width', String(width));
    return parsed.toString();
  } catch {
    return url;
  }
}

/** @typedef {import('storefrontapi.generated').MediaFragment} MediaFragment */
