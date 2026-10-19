import {useCallback, useEffect, useRef, useState} from 'react';
import clsx from 'clsx';
import {Link} from '~/components/Link';

/** Default responsive height of the banner. */
const DEFAULT_HEIGHT_CLASS =
  'h-[580px] min-h-[580px] sm:h-[580px] lg:h-[1100px] max-h-[90vh]';

/** Minimum horizontal travel (px) before a touch gesture counts as a swipe. */
const SWIPE_THRESHOLD = 40;

/**
 * Auto-playing hero banner carousel.
 *
 * Each slide can define a separate image for desktop and mobile; the browser
 * only downloads the one that matches the current viewport (`<picture>` +
 * `<source media>`).
 *
 * Auto-play keeps running while the pointer is over the banner and after a
 * manual navigation: clicking an arrow or a dot restarts the countdown from a
 * full interval. It only pauses while the tab is in the background, and is
 * disabled entirely for users with `prefers-reduced-motion: reduce`.
 *
 * @param {HeroBannerProps} props
 */
export function HeroBanner({
  slides = [],
  autoPlay = true,
  interval = 5000,
  heightClass = DEFAULT_HEIGHT_CLASS,
  className,
  ariaLabel = 'Promoções',
}) {
  const count = slides.length;
  const [current, setCurrent] = useState(0);
  const [hidden, setHidden] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  const touchStartX = useRef(null);
  const swiped = useRef(false);
  const swipeTimer = useRef(null);
  const wasPaused = useRef(false);

  // Monotonically increasing token bumped on every navigation (auto or manual)
  // and whenever auto-play resumes. The progress bar is keyed on it, so its
  // fill always restarts together with a fresh countdown.
  const [cycleToken, setCycleToken] = useState(0);

  // Respect the user's motion preference
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduceMotion(query.matches);
    update();
    query.addEventListener?.('change', update);
    return () => query.removeEventListener?.('change', update);
  }, []);

  // Pause while the tab is in the background
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const onVisibilityChange = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () =>
      document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);

  // Keep the active index valid when slides change
  useEffect(() => {
    if (count && current > count - 1) setCurrent(0);
  }, [count, current]);

  const goTo = useCallback(
    (next) => {
      if (!count) return;
      setCurrent(((next % count) + count) % count);
      setCycleToken((token) => token + 1);
    },
    [count],
  );

  const goNext = useCallback(() => {
    if (!count) return;
    setCurrent((prev) => (prev + 1) % count);
    setCycleToken((token) => token + 1);
  }, [count]);

  const goPrev = useCallback(() => {
    if (!count) return;
    setCurrent((prev) => (prev - 1 + count) % count);
    setCycleToken((token) => token + 1);
  }, [count]);

  // Auto-play.
  //
  // Only the tab being in the background pauses it: hovering the banner, or
  // leaving focus on an arrow / dot after clicking it, does NOT, so the
  // countdown keeps running while the pointer is over the image.
  const paused = hidden || reduceMotion;
  const slideDuration = Math.max(interval, 1000);

  // Restart the countdown + progress fill when auto-play resumes
  useEffect(() => {
    if (wasPaused.current && !paused) setCycleToken((token) => token + 1);
    wasPaused.current = paused;
  }, [paused]);

  // A `setTimeout` (not `setInterval`) that is re-created whenever `cycleToken`
  // changes: auto-advance and manual navigation both restart the countdown from
  // a full interval, so the progress fill and the switch stay in sync.
  useEffect(() => {
    if (!autoPlay || paused || count <= 1) return;

    const id = setTimeout(goNext, slideDuration);
    return () => clearTimeout(id);
  }, [autoPlay, paused, count, slideDuration, goNext, cycleToken]);

  // Clear any pending swipe-reset timer on unmount
  useEffect(() => () => clearTimeout(swipeTimer.current), []);

  /** @param {React.TouchEvent} event */
  const onTouchStart = (event) => {
    touchStartX.current = event.touches[0]?.clientX ?? null;
    swiped.current = false;
  };

  /** @param {React.TouchEvent} event */
  const onTouchEnd = (event) => {
    if (touchStartX.current === null) return;

    const delta =
      (event.changedTouches[0]?.clientX ?? touchStartX.current) -
      touchStartX.current;
    touchStartX.current = null;

    if (Math.abs(delta) < SWIPE_THRESHOLD) return;

    // Suppress the click that follows a swipe so the slide link is not opened
    swiped.current = true;
    clearTimeout(swipeTimer.current);
    swipeTimer.current = setTimeout(() => {
      swiped.current = false;
    }, 400);

    if (delta < 0) goNext();
    else goPrev();
  };

  /** Block navigation when the gesture was a swipe rather than a tap. */
  const onClickCapture = (event) => {
    if (!swiped.current) return;
    event.preventDefault();
    event.stopPropagation();
  };

  /** @param {React.KeyboardEvent} event */
  const onKeyDown = (event) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      goPrev();
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      goNext();
    }
  };

  if (!count) return null;

  return (
    <section
      aria-roledescription="carousel"
      aria-label={ariaLabel}
      tabIndex={0}
      className={clsx(
        'relative w-full overflow-hidden bg-primary/5 focus:outline-none',
        className,
      )}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onKeyDown={onKeyDown}
      style={{'--banner-interval': `${slideDuration}ms`}}
    >
      <div className={clsx('relative w-full', heightClass)}>
        {slides.map((slide, index) => {
          const isActive = index === current;

          return (
            <div
              key={slide.id ?? slide.imageDesktop ?? index}
              aria-roledescription="slide"
              aria-label={`${index + 1} de ${count}`}
              aria-hidden={!isActive}
              className={clsx(
                'absolute inset-0 transition-opacity duration-700 ease-out',
                isActive
                  ? 'z-10 opacity-100'
                  : 'z-0 opacity-0 pointer-events-none',
              )}
            >
              <Link
                to={slide.to || '/'}
                prefetch="viewport"
                onClickCapture={onClickCapture}
                aria-hidden={!isActive}
                tabIndex={isActive ? undefined : -1}
                className="block w-full h-full"
              >
                <picture>
                  {slide.imageDesktop ? (
                    <source
                      media="(min-width: 48em)"
                      srcSet={slide.imageDesktop}
                    />
                  ) : null}
                  <img
                    src={slide.imageMobile || slide.imageDesktop || ''}
                    alt={slide.alt || slide.title || ''}
                    loading={index === 0 ? 'eager' : 'lazy'}
                    decoding="async"
                    className="absolute inset-0 object-cover w-full h-full"
                  />
                </picture>

                {(slide.title || slide.subtitle || slide.cta) && (
                  <div
                    className={clsx(
                      'absolute inset-0 flex flex-col items-start justify-center gap-3 px-6 text-left sm:px-10 lg:px-16',
                      'bg-gradient-to-r from-black/55 via-black/25 to-transparent',
                    )}
                  >
                    <div className="max-w-xl">
                      {slide.title ? (
                        <h2 className="text-2xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl">
                          {slide.title}
                        </h2>
                      ) : null}
                      {slide.subtitle ? (
                        <p className="mt-3 text-sm text-white/90 sm:text-base lg:text-lg">
                          {slide.subtitle}
                        </p>
                      ) : null}
                      {slide.cta ? (
                        <span className="inline-flex items-center justify-center mt-5 px-6 py-3 text-sm font-medium bg-white rounded-full text-primary sm:text-base">
                          {slide.cta}
                        </span>
                      ) : null}
                    </div>
                  </div>
                )}
              </Link>
            </div>
          );
        })}
      </div>

      {count > 1 ? (
        <>
          {/* Arrows (pointer devices / tablets and up) */}
          <button
            type="button"
            aria-label="Slide anterior"
            onClick={goPrev}
            className="absolute z-20 hidden w-10 h-10 -translate-y-1/2 rounded-full sm:flex items-center justify-center top-1/2 left-4 bg-white/70 text-primary hover:bg-white transition-colors"
          >
            <IconChevron direction="left" />
          </button>
          <button
            type="button"
            aria-label="Próximo slide"
            onClick={goNext}
            className="absolute z-20 hidden w-10 h-10 -translate-y-1/2 rounded-full sm:flex items-center justify-center top-1/2 right-4 bg-white/70 text-primary hover:bg-white transition-colors"
          >
            <IconChevron direction="right" />
          </button>

          {/* Dots — the active dot (`aria-current="true"`) doubles as the
              auto-play progress bar: it fills over the slide duration. */}
          <div className="absolute z-20 flex items-center gap-2 -translate-x-1/2 bottom-5 left-1/2">
            {slides.map((slide, index) => {
              const isActive = index === current;

              return (
                <button
                  key={slide.id ?? slide.imageDesktop ?? index}
                  type="button"
                  aria-label={`Ir para o slide ${index + 1}`}
                  aria-current={isActive ? 'true' : 'false'}
                  onClick={() => goTo(index)}
                  className={clsx(
                    'relative h-2 overflow-hidden rounded-full transition-all duration-300',
                    isActive
                      ? 'w-10 bg-white'
                      : 'w-2 bg-white hover:bg-white',
                  )}
                >
                  {isActive && autoPlay && count > 1 && !reduceMotion ? (
                    <span
                      // Remounting restarts the fill: on every slide change
                      // (auto or manual) and on every auto-play resume.
                      key={`banner-progress-${cycleToken}`}
                      data-paused={paused ? 'true' : 'false'}
                      className="block absolute inset-y-0 left-0 rounded-full bg-green-500 banner-progress"
                    />
                  ) : null}
                </button>
              );
            })}
          </div>
        </>
      ) : null}
    </section>
  );
}

/**
 * @param {{direction: 'left' | 'right'}} props
 */
function IconChevron({direction}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-5 h-5"
      aria-hidden="true"
    >
      <polyline
        points={direction === 'left' ? '15 18 9 12 15 6' : '9 18 15 12 9 6'}
      />
    </svg>
  );
}

/**
 * @typedef {{
 *   id?: string;
 *   title?: string;
 *   subtitle?: string;
 *   cta?: string;
 *   to?: string;
 *   alt?: string;
 *   imageDesktop?: string;
 *   imageMobile?: string;
 *   image?: string;
 * }} HeroBannerSlide
 */

/**
 * @typedef {{
 *   slides: Array<HeroBannerSlide>;
 *   autoPlay?: boolean;
 *   interval?: number;
 *   heightClass?: string;
 *   className?: string;
 *   ariaLabel?: string;
 * }} HeroBannerProps
 */
