import {useFetcher} from '@remix-run/react';
import {useId} from 'react';
import clsx from 'clsx';

/**
 * Newsletter block: image on the left, copy + subscribe form on the right.
 *
 * Submits to the `POST /api/newsletter` resource route (no page navigation),
 * which flags the address as `acceptsMarketing` in Shopify.
 *
 * The image is a plain prop with a default so the homepage can swap it without
 * touching markup; pass `image`, `title`, `description` etc. to customise.
 */
export function NewsletterSection({
  image = 'https://cdn.shopify.com/s/files/1/0738/0533/2769/files/location.png?v=1774421961&width=1400',
  alt = 'Nossa localização',
  /** CSS object-position; the default map image keeps its pin in frame. */
  imagePosition = '36% 40%',
  eyebrow = 'Newsletter',
  title = 'Ofertas antes de todo mundo',
  description = 'Cadastre seu e-mail e receba lançamentos, cupons e promoções exclusivas da HOTWAV.',
  placeholder = 'Seu melhor e-mail',
  buttonLabel = 'Quero receber',
  note = 'Sem spam. Você pode cancelar a inscrição quando quiser.',
}) {
  const fetcher = useFetcher();
  const inputId = useId();

  const submitting = fetcher.state !== 'idle';
  const success = fetcher.data?.ok === true;
  const error =
    fetcher.data && fetcher.data.ok === false ? fetcher.data.error : null;

  return (
    <section className="pb-16 pt-4 md:pb-20">
      <div className="mx-auto w-full max-w-[1440px] px-6 md:px-10 lg:px-14">
        <div className="grid overflow-hidden rounded-[28px] bg-[#0e0e11] ring-1 ring-white/5 md:grid-cols-2">
          {/* Left: image (links to the Google Maps address) */}
          <a
            href="https://www.google.com/maps?q=22.674604,%20114.059094"
            target="_blank"
            rel="noopener noreferrer"
            className="relative block h-[240px] overflow-hidden sm:h-[320px] md:h-auto md:min-h-[420px]"
          >
            <img
              src={image}
              alt={alt}
              loading="lazy"
              style={{objectPosition: imagePosition}}
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0e0e11] via-transparent to-transparent md:bg-gradient-to-r md:from-transparent md:via-transparent md:to-[#0e0e11]/90" />
          </a>

          {/* Right: copy + form */}
          <div className="relative flex flex-col justify-center px-6 py-10 md:px-12 lg:px-16">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -right-16 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full bg-[#e4002b]/20 blur-[90px]"
            />
            <p className="relative text-[11px] font-bold uppercase tracking-[0.22em] text-[#ff3b52]">
              {eyebrow}
            </p>
            <h2 className="relative mt-3 text-2xl font-extrabold leading-[1.15] tracking-tight text-white md:text-[34px]">
              {title}
            </h2>
            <p className="relative mt-3 max-w-md text-sm leading-relaxed text-white/65 md:text-[15px]">
              {description}
            </p>

            {success ? (
              <div className="relative mt-7 flex items-center gap-3 rounded-2xl border border-emerald-400/25 bg-emerald-400/10 px-4 py-3.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-400 text-[#0e0e11]">
                  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-[3]">
                    <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <p className="text-sm font-medium text-emerald-200">
                  Inscrição confirmada! Fique de olho no seu e-mail.
                </p>
              </div>
            ) : (
              <fetcher.Form method="post" action="/api/newsletter" className="relative mt-7">
                <label htmlFor={inputId} className="sr-only">
                  {placeholder}
                </label>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <input
                    id={inputId}
                    type="email"
                    name="email"
                    required
                    autoComplete="email"
                    placeholder={placeholder}
                    aria-invalid={error ? 'true' : undefined}
                    className={clsx(
                      'h-12 w-full min-w-0 rounded-full border bg-white/[0.06] px-5 text-sm text-white placeholder:text-white/35',
                      'transition-colors focus:outline-none focus:ring-2 focus:ring-offset-0',
                      error
                        ? 'border-[#ff3b52] focus:ring-[#ff3b52]/40'
                        : 'border-white/15 focus:border-[#ff3b52] focus:ring-[#ff3b52]/30',
                    )}
                  />
                  {/* Honeypot — hidden from humans, bots fill it. */}
                  <input
                    type="text"
                    name="company"
                    tabIndex={-1}
                    autoComplete="off"
                    aria-hidden="true"
                    className="hidden"
                  />
                  <button
                    type="submit"
                    disabled={submitting}
                    className={clsx(
                      'h-12 shrink-0 rounded-full px-7 text-sm font-bold text-white transition',
                      'bg-[#e4002b] hover:bg-[#c50024] active:scale-[0.98]',
                      'disabled:cursor-wait disabled:opacity-70',
                    )}
                  >
                    {submitting ? 'Enviando…' : buttonLabel}
                  </button>
                </div>
                <p
                  aria-live="polite"
                  className={clsx(
                    'mt-3 text-xs',
                    error ? 'text-[#ff8a96]' : 'text-white/40',
                  )}
                >
                  {error
                    ? 'Não foi possível concluir agora. Verifique o e-mail e tente novamente.'
                    : note}
                </p>
              </fetcher.Form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
