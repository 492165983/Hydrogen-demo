import {useCallback, useEffect, useRef, useState} from 'react';
import clsx from 'clsx';

/**
 * Shared horizontal-carousel plumbing: tracks the scroll position so arrows can
 * be disabled at the edges, and scrolls by one card per click.
 *
 * Usage:
 *   const {scroller, canPrev, canNext, scrollByCard} = useCarouselScroll();
 *   <div ref={scroller} className="... overflow-x-auto">…</div>
 *   <CarouselArrows canPrev={canPrev} canNext={canNext} onPrev={() => scrollByCard(-1)} onNext={() => scrollByCard(1)} />
 */
export function useCarouselScroll() {
  const scroller = useRef(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const sync = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 4);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    sync();
    const el = scroller.current;
    if (!el) return undefined;

    el.addEventListener('scroll', sync, {passive: true});
    window.addEventListener('resize', sync);
    return () => {
      el.removeEventListener('scroll', sync);
      window.removeEventListener('resize', sync);
    };
  }, [sync]);

  const scrollByCard = useCallback((direction) => {
    const el = scroller.current;
    if (!el) return;
    const card = el.firstElementChild;
    const gap = 16;
    const step = card ? card.offsetWidth + gap : el.clientWidth * 0.8;
    el.scrollBy({left: direction * step, behavior: 'smooth'});
  }, []);

  return {scroller, canPrev, canNext, scrollByCard};
}

export function CarouselArrows({canPrev, canNext, onPrev, onNext, className}) {
  return (
    <div className={clsx('flex shrink-0 items-center gap-2', className)}>
      <ArrowButton direction="prev" disabled={!canPrev} onClick={onPrev} />
      <ArrowButton direction="next" disabled={!canNext} onClick={onNext} />
    </div>
  );
}

function ArrowButton({direction, disabled, onClick}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={direction === 'prev' ? 'Anterior' : 'Próximo'}
      className={clsx(
        'flex h-10 w-10 items-center justify-center rounded-full border border-primary/15 bg-white text-primary transition',
        disabled
          ? 'cursor-default opacity-30'
          : 'hover:border-primary/40 hover:bg-primary hover:text-white',
      )}
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className={clsx(
          'h-4 w-4 fill-none stroke-current stroke-2',
          direction === 'prev' && 'rotate-180',
        )}
      >
        <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
