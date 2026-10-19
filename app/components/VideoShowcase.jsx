import {useRef, useState} from 'react';
import clsx from 'clsx';

import {CarouselArrows, useCarouselScroll} from '~/components/CarouselArrows';

/**
 * "Popular & Best Seller" style video strip for the homepage.
 *
 * Data comes from `video_showcase` metaobjects (see `~/lib/video-showcase.js`).
 * Horizontal scroll strip of 9:16 cards with prev/next arrows in the heading
 * row; each card shows its poster with a play button and starts playback on
 * click. On mobile each card is ~65vw (so the next card peeks in), on desktop
 * a fixed 250px.
 */
export function VideoShowcase({showcase}) {
  const {scroller, canPrev, canNext, scrollByCard} = useCarouselScroll();

  if (!showcase || !showcase.items?.length) return null;

  return (
    <section className="py-12 md:py-16 lg:py-20">
      <div className="mx-auto w-full max-w-[1440px] px-6 md:px-10 lg:px-14">
        <div className="flex items-end justify-between gap-4">
          {showcase.title ? (
            <h2 className="text-2xl font-bold tracking-tight text-primary md:text-4xl">
              {showcase.title}
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
          {showcase.items.map((item) => (
            <VideoCard key={item.id} item={item} />
          ))}
        </div>
      </div>
    </section>
  );
}

function VideoCard({item}) {
  const videoRef = useRef(null);
  const [playing, setPlaying] = useState(false);

  const play = () => {
    setPlaying(true);
    // Wait for the <video> with controls to mount, then start with sound
    // (allowed: playback follows a user gesture).
    requestAnimationFrame(() => {
      videoRef.current?.play?.().catch(() => setPlaying(false));
    });
  };

  return (
    <figure
      className={clsx(
        'group relative aspect-[9/16] w-[65vw] max-w-[320px] shrink-0 snap-start overflow-hidden rounded-2xl bg-neutral-900 md:w-[250px] md:max-w-none',
      )}
    >
      {item.kind === 'image' ? (
        <img
          src={item.url}
          alt={item.alt || ''}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : playing ? (
        <video
          ref={videoRef}
          src={item.url}
          poster={item.poster}
          controls
          playsInline
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <>
          <video
            src={item.url}
            poster={item.poster}
            preload="metadata"
            muted
            playsInline
            className="absolute inset-0 h-full w-full object-cover"
          />
          <button
            type="button"
            onClick={play}
            aria-label="Reproduzir vídeo"
            className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors hover:bg-black/10"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 shadow-lg transition-transform group-hover:scale-110">
              <svg viewBox="0 0 24 24" className="ml-1 h-6 w-6 fill-neutral-900">
                <path d="M8 5.5v13l11-6.5-11-6.5z" />
              </svg>
            </span>
          </button>
        </>
      )}

      {item.caption && (
        <figcaption className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-3 pb-3 pt-8 text-sm font-medium leading-snug text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.6)]">
          <span className="line-clamp-3">{item.caption}</span>
        </figcaption>
      )}
    </figure>
  );
}
