import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

/**
 * Scroll-driven "text knockout" video reveal for the homepage.
 *
 * The panel is pinned for ~3 screens. A single word is carved out of a dark
 * veil that covers a full-bleed video, so the letterforms act as a window onto
 * the footage. As the shopper keeps scrolling the word grows, the camera
 * "dives" into the letters and the veil dissolves, leaving the video filling the
 * whole viewport for the last stretch of the pin. Scrolling back up replays the
 * sequence in reverse.
 *
 * Performance: the <video> is never clipped or masked — it stays on its own
 * composited layer and simply plays. Only the solid dark veil above it is
 * masked, which is a cheap shape repaint per frame. (Masking the video itself
 * forces the browser to re-rasterise video frames on every scroll tick, which is
 * what makes this kind of effect stutter.)
 *
 * Data comes from a `text_video_reveal` metaobject — see
 * `~/lib/text-video-reveal.js` for the field list.
 */

/** Share of the scroll range used to grow the word before the dive starts. */
const GROW_END = 0.55;
/** Share of the scroll range spent diving into the letters. */
const DIVE_END = 0.7;
/** The veil dissolves across the dive. */
const VEIL_FADE_START = 0.56;
const VEIL_FADE_END = 0.7;
const CTA_IN_START = 0.74;
const CTA_IN_END = 0.86;

const clamp01 = (value) => Math.min(1, Math.max(0, value));
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

export function TextVideoReveal({reveal}) {
  const maskId = `tvrm${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;

  const sectionRef = useRef(null);
  const stageRef = useRef(null);
  const videoRef = useRef(null);
  const textRef = useRef(null);
  const veilRef = useRef(null);
  const subtitleRef = useRef(null);
  const hintRef = useRef(null);
  const ctaRef = useRef(null);
  const shadeRef = useRef(null);

  const progressRef = useRef(0);
  const rafRef = useRef(0);
  const metrics = useRef({w: 0, h: 0, grow: 1, dive: 2});

  const [dims, setDims] = useState({w: 0, h: 0});
  const [reduced, setReduced] = useState(false);

  /** Paint the section for a given scroll progress (0 → 1). */
  const apply = useCallback((p) => {
    const {w, h, grow, dive} = metrics.current;
    const text = textRef.current;

    if (text && w && h) {
      const grown = 1 + (grow - 1) * easeOutCubic(clamp01(p / GROW_END));
      const diveT = clamp01((p - GROW_END) / (DIVE_END - GROW_END));
      const scale = grown + (dive - grow) * (diveT * diveT);
      text.setAttribute(
        'transform',
        `translate(${w / 2} ${h / 2}) scale(${scale.toFixed(4)}) translate(${
          -w / 2
        } ${-h / 2})`,
      );
    }

    if (veilRef.current) {
      veilRef.current.style.opacity = String(
        1 - clamp01((p - VEIL_FADE_START) / (VEIL_FADE_END - VEIL_FADE_START)),
      );
    }

    if (subtitleRef.current) {
      subtitleRef.current.style.opacity = String(clamp01(1 - p * 3.6));
      subtitleRef.current.style.transform = `translateY(${(-p * 26).toFixed(
        1,
      )}px)`;
    }

    if (hintRef.current) {
      hintRef.current.style.opacity = String(clamp01(1 - p * 4.5));
    }

    if (shadeRef.current) {
      shadeRef.current.style.opacity = String(
        clamp01((p - CTA_IN_START + 0.04) / 0.12),
      );
    }

    if (ctaRef.current) {
      const visible = clamp01((p - CTA_IN_START) / (CTA_IN_END - CTA_IN_START));
      ctaRef.current.style.opacity = String(visible);
      ctaRef.current.style.pointerEvents = visible > 0.5 ? 'auto' : 'none';
      ctaRef.current.style.transform = `translateY(${(1 - visible) * 16}px)`;
    }
  }, []);

  /**
   * Fit the word to the pinned stage: it starts at ~70% of the width (or 46% of
   * the height for long words), then grows until its ink covers the viewport.
   * The dive scale overshoots that, pushing the letter gaps past the edges while
   * the veil dissolves.
   */
  const measure = useCallback(() => {
    const stage = stageRef.current;
    const text = textRef.current;
    if (!stage || !text) return;

    const w = stage.clientWidth;
    const h = stage.clientHeight;
    if (!w || !h) return;

    const family = getComputedStyle(text).fontFamily || 'sans-serif';
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    let naturalWidth = 0;
    let inkHeight = 72;
    if (context) {
      context.font = `800 100px ${family}`;
      const measured = context.measureText(text.textContent || '');
      naturalWidth = measured.width;
      // Real ink height (caps, ascenders, descenders) — far more accurate than
      // getBBox(), which reports the em box.
      inkHeight =
        (measured.actualBoundingBoxAscent || 72) +
        (measured.actualBoundingBoxDescent || 0);
    }
    if (!naturalWidth) naturalWidth = 560;

    // Font size in px such that the word spans 70% of the width …
    let base = (w * 0.7) / (naturalWidth / 100);
    // … but the ink is never taller than half the panel.
    const heightLimit = (h * 0.46) / (inkHeight / 100);
    if (base > heightLimit) base = heightLimit;

    const widthAtBase = (naturalWidth / 100) * base;
    const heightAtBase = (inkHeight / 100) * base;
    // Scale at which the glyph ink covers the viewport, plus the overshoot used
    // for the "dive into the letters" phase.
    const cover = Math.max(w / widthAtBase, h / heightAtBase);

    text.setAttribute('font-size', base.toFixed(2));
    text.setAttribute('x', String(w / 2));
    text.setAttribute('y', String(h / 2));

    metrics.current = {w, h, grow: cover * 1.04, dive: cover * 2.1};
    setDims((current) =>
      current.w === w && current.h === h ? current : {w, h},
    );

    if (sectionRef.current) {
      sectionRef.current.style.setProperty(
        '--tv-ink',
        `${heightAtBase.toFixed(1)}px`,
      );
    }
    apply(progressRef.current);
  }, [apply]);

  useLayoutEffect(() => {
    if (typeof window === 'undefined') return;
    setReduced(
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
    );
  }, []);

  // Play only while the panel is on screen — also keeps scrolling past it light.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.play?.().catch(() => {});
        } else {
          video.pause?.();
        }
      },
      {threshold: 0.05},
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, [reveal?.video]);

  useEffect(() => {
    if (!reveal?.video) return;

    measure();

    if (reduced) {
      apply(0.7);
      return;
    }

    const paint = () => {
      rafRef.current = 0;
      apply(progressRef.current);
    };

    const read = () => {
      const section = sectionRef.current;
      if (!section) return;
      const rect = section.getBoundingClientRect();
      // Pinned range: from the moment the panel reaches the top of the viewport
      // until its bottom edge meets the bottom of the viewport.
      const distance = rect.height - window.innerHeight;
      const next = distance > 0 ? clamp01(-rect.top / distance) : 0;
      if (Math.abs(next - progressRef.current) < 0.0004) return;
      progressRef.current = next;
      if (!rafRef.current) rafRef.current = requestAnimationFrame(paint);
    };

    const onResize = () => {
      measure();
      read();
    };

    read();
    window.addEventListener('scroll', read, {passive: true});
    window.addEventListener('resize', onResize);

    let observer;
    if (typeof ResizeObserver !== 'undefined' && stageRef.current) {
      observer = new ResizeObserver(onResize);
      observer.observe(stageRef.current);
    }

    // The webfont usually lands after hydration; measure again once it does.
    document.fonts?.ready?.then(() => measure()).catch(() => {});

    return () => {
      window.removeEventListener('scroll', read);
      window.removeEventListener('resize', onResize);
      observer?.disconnect();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    };
  }, [apply, measure, reduced, reveal?.video]);

  if (!reveal?.word || !reveal?.video) return null;

  const {word, subtitle, video, poster, ctaText, ctaHref} = reveal;
  const ready = dims.w > 0 && dims.h > 0;

  return (
    <section
      ref={sectionRef}
      className={
        reduced
          ? 'relative w-full bg-[#0A0A0A]'
          : 'relative h-[280svh] w-full bg-[#0A0A0A] md:h-[320svh]'
      }
      style={reduced ? {height: '100svh'} : undefined}
    >
      <div
        ref={stageRef}
        className={
          reduced
            ? 'relative h-full w-full overflow-hidden'
            : 'sticky top-0 h-[100svh] w-full overflow-hidden'
        }
      >
        {/* Full-bleed footage. Never clipped: it stays on its own layer and just
            plays, which is what keeps the whole thing smooth. */}
        <video
          ref={videoRef}
          src={video}
          poster={poster}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          tabIndex={-1}
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
          style={{willChange: 'transform'}}
        />

        {/* Dark veil with the word knocked out of it. Only this solid layer is
            masked, so every frame is a cheap shape repaint. It is always in the
            DOM (the word has to exist to be measured) and a plain panel covers
            it for the single frame before the first measurement. */}
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full"
        >
          <defs>
            <mask
              id={maskId}
              maskUnits="userSpaceOnUse"
              x="0"
              y="0"
              width={Math.max(dims.w, 1)}
              height={Math.max(dims.h, 1)}
            >
              <rect
                x="0"
                y="0"
                width={Math.max(dims.w, 1)}
                height={Math.max(dims.h, 1)}
                fill="#fff"
              />
              <text
                ref={textRef}
                x={dims.w / 2}
                y={dims.h / 2}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={Math.max(dims.h, 1) * 0.12}
                fontWeight="800"
                fill="#000"
                className="font-sans"
              >
                {word}
              </text>
            </mask>
          </defs>
          <rect
            ref={veilRef}
            x="0"
            y="0"
            width={Math.max(dims.w, 1)}
            height={Math.max(dims.h, 1)}
            fill="#0A0A0A"
            mask={`url(#${maskId})`}
          />
        </svg>

        {!ready && <div className="absolute inset-0 z-10 bg-[#0A0A0A]" />}

        {/* Copy sits above the veil so it reads on the dark panel while the word
            is small, then fades out as the letters take over. */}
        <div className="pointer-events-none absolute inset-0 z-20">
          <h2 className="sr-only">{word}</h2>

          {subtitle && (
            <p
              ref={subtitleRef}
              className="absolute inset-x-0 mx-auto max-w-[560px] px-6 text-center text-[11px] font-medium uppercase leading-relaxed tracking-[0.34em] text-white/45 md:text-xs"
              style={{
                top: 'calc(50% + (var(--tv-ink, 120px) / 2) + 42px)',
              }}
            >
              {subtitle}
            </p>
          )}

          <div
            ref={hintRef}
            className="absolute inset-x-0 bottom-8 flex flex-col items-center gap-3 md:bottom-10"
          >
            <span className="text-[10px] uppercase tracking-[0.36em] text-white/35">
              Role para revelar
            </span>
            <span className="relative h-9 w-px overflow-hidden bg-white/15">
              <span className="tv-scroll-dot absolute inset-x-0 top-0 h-3 bg-white/70" />
            </span>
          </div>
        </div>

        <div
          ref={shadeRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 z-[25] h-48 bg-gradient-to-t from-black/55 to-transparent opacity-0"
        />

        {ctaText && (
          <div
            ref={ctaRef}
            className="absolute inset-x-0 bottom-10 z-30 flex justify-center opacity-0 md:bottom-14"
            style={{pointerEvents: 'none'}}
          >
            <a
              href={ctaHref || '/collections/all'}
              className="group inline-flex items-center gap-2.5 rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-neutral-900 shadow-[0_10px_30px_rgba(0,0,0,0.35)] transition-colors hover:bg-neutral-100"
            >
              {ctaText}
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </a>
          </div>
        )}
      </div>
    </section>
  );
}
