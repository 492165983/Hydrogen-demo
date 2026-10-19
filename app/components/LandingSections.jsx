import {useEffect, useRef, useState} from 'react';
import {Disclosure} from '@headlessui/react';
import clsx from 'clsx';
import {Link} from '~/components/Link';
import {IconArrow, IconCheck} from '~/components/Icon';

/**
 * Section library for admin-authored product pages.
 *
 * Every section below is a plain function of the JSON the merchant saved in
 * the `product_landing` metaobject — the same idea as a Liquid section, minus
 * the theme editor. Adding a new section type means adding a component here
 * and registering it in `SECTION_COMPONENTS`; everything else (data loading,
 * sanitising, matching by product handle) already works.
 *
 * Copy coming from the admin is trusted HTML, so it is injected as-is.
 */

/** Page gutter. Everything is constrained to the 1440px layout grid. */
function Container({children, className = ''}) {
  return (
    <div className={clsx('mx-auto w-full max-w-[1440px] px-6 md:px-10 lg:px-14', className)}>
      {children}
    </div>
  );
}

/** Image that keeps the aspect ratio the merchant declared as w / h. */
function Art({src, width, height, alt = '', className = '', sizes}) {
  const ratio = width && height ? `${width} / ${height}` : undefined;
  return (
    <div
      className={clsx('relative overflow-hidden bg-primary/5', className)}
      style={{aspectRatio: ratio}}
    >
      <img
        src={src}
        alt={alt}
        loading="lazy"
        sizes={sizes}
        className="h-full w-full object-cover"
      />
    </div>
  );
}

function SectionShell({children, className = '', tone = 'plain'}) {
  return (
    <section
      className={clsx(
        'py-12 md:py-16 lg:py-20',
        tone === 'muted' && 'bg-primary/5',
        className,
      )}
    >
      {children}
    </section>
  );
}

function SectionTitle({children, className = ''}) {
  if (!children) return null;
  return (
    <h2
      className={clsx(
        'text-2xl font-semibold tracking-tight text-primary md:text-4xl',
        className,
      )}
    >
      {children}
    </h2>
  );
}

/* ------------------------------------------------------------------ *
 * Sections
 * ------------------------------------------------------------------ */

function HeroSection({section}) {
  const {image, imageMobile, width, height, alt, overlay, heightClass} = section;

  return (
    <section className="relative w-full">
      <div
        className={clsx(
          'relative w-full overflow-hidden',
          heightClass ?? 'aspect-[4/5] sm:aspect-[16/9] lg:aspect-[2560/1121]',
        )}
      >
        <picture>
          {imageMobile ? (
            <source media="(max-width: 767px)" srcSet={imageMobile} />
          ) : null}
          <img
            src={image}
            alt={alt ?? ''}
            width={width ?? undefined}
            height={height ?? undefined}
            className="h-full w-full object-cover"
          />
        </picture>

        {overlay ? (
          <div
            className={clsx(
              'absolute inset-0 flex',
              overlay.align === 'center' && 'justify-center text-center',
              overlay.align === 'right' && 'justify-end text-right',
              overlay.valign === 'top' && 'items-start',
              overlay.valign === 'bottom' && 'items-end',
              overlay.valign === 'center' && 'items-center',
            )}
          >
            <Container className="py-8 md:py-14">
              <div
                className={clsx(
                  'flex max-w-[620px] flex-col gap-3 md:gap-4',
                  overlay.align === 'center' && 'mx-auto items-center',
                  overlay.align === 'right' && 'ml-auto items-end',
                )}
              >
                {overlay.items.map((item, index) => {
                  const tone =
                    overlay.theme === 'light'
                      ? 'text-white [text-shadow:0_2px_18px_rgba(0,0,0,0.35)]'
                      : 'text-primary';

                  if (item.role === 'cta') {
                    return item.href ? (
                      <Link
                        key={index}
                        to={item.href}
                        className="mt-2 inline-block rounded-full bg-primary px-7 py-3 text-sm font-semibold text-contrast transition-opacity hover:opacity-85"
                      >
                        <span dangerouslySetInnerHTML={{__html: item.html}} />
                      </Link>
                    ) : null;
                  }

                  if (item.role === 'title') {
                    return (
                      <p
                        key={index}
                        className={clsx(
                          'text-3xl font-semibold leading-tight tracking-tight md:text-5xl',
                          tone,
                        )}
                        dangerouslySetInnerHTML={{__html: item.html}}
                      />
                    );
                  }

                  if (item.role === 'eyebrow') {
                    return (
                      <p
                        key={index}
                        className={clsx(
                          'text-xs font-medium uppercase tracking-[0.22em] md:text-sm',
                          tone,
                          'opacity-80',
                        )}
                        dangerouslySetInnerHTML={{__html: item.html}}
                      />
                    );
                  }

                  if (item.role === 'heading') {
                    return (
                      <p
                        key={index}
                        className={clsx(
                          'text-xl font-semibold leading-snug md:text-2xl',
                          tone,
                        )}
                        dangerouslySetInnerHTML={{__html: item.html}}
                      />
                    );
                  }

                  return (
                    <div
                      key={index}
                      className={clsx('text-sm leading-relaxed md:text-base', tone, 'opacity-90')}
                      dangerouslySetInnerHTML={{__html: item.html}}
                    />
                  );
                })}
              </div>
            </Container>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function GallerySection({section}) {
  const railRef = useRef(null);
  const scrollBy = (direction) => {
    const rail = railRef.current;
    if (!rail) return;
    rail.scrollBy({left: direction * rail.clientWidth * 0.8, behavior: 'smooth'});
  };

  return (
    <SectionShell>
      <Container>
        {(section.title || section.descHtml) && (
          <div className="mb-8 flex flex-col gap-3 md:mb-12">
            <SectionTitle>{section.title}</SectionTitle>
            {section.descHtml ? (
              <div
                className="max-w-3xl text-sm leading-relaxed text-primary/70 md:text-base"
                dangerouslySetInnerHTML={{__html: section.descHtml}}
              />
            ) : null}
          </div>
        )}

        <div className="relative">
          <div
            ref={railRef}
            className="hiddenScroll flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 md:gap-6"
          >
            {section.slides.map((slide, index) => (
              <Art
                key={index}
                src={slide.img}
                width={slide.width}
                height={slide.height}
                alt={slide.alt || section.title || ''}
                className="w-[78%] shrink-0 snap-center rounded-2xl md:w-[46%] lg:w-[38%]"
              />
            ))}
          </div>

          {section.slides.length > 1 && (
            <div className="mt-6 flex items-center gap-3">
              <button
                type="button"
                onClick={() => scrollBy(-1)}
                aria-label="Anterior"
                className="grid h-10 w-10 place-items-center rounded-full border border-primary/15 transition-colors hover:bg-primary/5"
              >
                <Chevron direction="left" />
              </button>
              <button
                type="button"
                onClick={() => scrollBy(1)}
                aria-label="Próximo"
                className="grid h-10 w-10 place-items-center rounded-full border border-primary/15 transition-colors hover:bg-primary/5"
              >
                <Chevron direction="right" />
              </button>
            </div>
          )}
        </div>
      </Container>
    </SectionShell>
  );
}

function Chevron({direction = 'right'}) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={direction === 'left' ? 'M15 18l-6-6 6-6' : 'M9 6l6 6-6 6'} />
    </svg>
  );
}

function ImageTextSection({section}) {
  const {image, width, height, alt, title, html, flip, bullets, cta, theme} = section;
  const dark = theme === 'dark';

  return (
    <SectionShell tone={dark ? 'muted' : 'plain'}>
      <Container>
        <div className="grid items-center gap-8 md:grid-cols-2 md:gap-14">
          {image ? (
            <Art
              src={image}
              width={width}
              height={height}
              alt={alt || title || ''}
              className={clsx('rounded-3xl', flip && 'md:order-2')}
            />
          ) : null}

          <div className={clsx('flex flex-col gap-5', flip && !image && 'md:col-span-2')}>
            <SectionTitle>{title}</SectionTitle>
            {html ? (
              <div
                className="text-sm leading-relaxed text-primary/75 md:text-base"
                dangerouslySetInnerHTML={{__html: html}}
              />
            ) : null}

            {bullets?.length ? (
              <ul className="grid gap-2.5">
                {bullets.map((line, index) => (
                  <li key={index} className="flex items-start gap-3 text-sm text-primary/85">
                    <span className="mt-0.5 text-notice">
                      <IconCheck />
                    </span>
                    <span dangerouslySetInnerHTML={{__html: line}} />
                  </li>
                ))}
              </ul>
            ) : null}

            {cta ? (
              <Link
                to={cta.href}
                className="mt-1 inline-flex w-fit items-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-contrast transition-opacity hover:opacity-85"
              >
                {cta.label}
              </Link>
            ) : null}
          </div>
        </div>
      </Container>
    </SectionShell>
  );
}

function FeaturesSection({section}) {
  const columnClasses = {
    2: 'sm:grid-cols-2',
    3: 'sm:grid-cols-2 lg:grid-cols-3',
    4: 'sm:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <SectionShell>
      <Container>
        {(section.title || section.subtitle) && (
          <div className="mb-8 flex flex-col gap-3 text-center md:mb-14">
            <SectionTitle>{section.title}</SectionTitle>
            {section.subtitle ? (
              <p className="mx-auto max-w-2xl text-sm text-primary/65 md:text-base">
                {section.subtitle}
              </p>
            ) : null}
          </div>
        )}

        <div className={clsx('grid gap-4 md:gap-6', columnClasses[section.columns])}>
          {section.items.map((item, index) => (
            <div
              key={index}
              className="flex flex-col gap-3 rounded-2xl border border-primary/10 bg-contrast p-6"
            >
              {item.image ? (
                <img
                  src={item.image}
                  alt=""
                  loading="lazy"
                  className="h-10 w-10 object-contain"
                />
              ) : null}
              <h3 className="text-base font-semibold text-primary md:text-lg">{item.title}</h3>
              {item.text ? (
                <p className="text-sm leading-relaxed text-primary/70">{item.text}</p>
              ) : null}
            </div>
          ))}
        </div>
      </Container>
    </SectionShell>
  );
}

/**
 * Specification chart. Mirrors the Liquid theme's `ethan-feature-chart`:
 * a single centred column of category blocks — full-width grey category row,
 * Single centered column: each spec takes one row — name on top (bold),
 * value below. `min-w-0` + `break-words` keep long unbroken values (model
 * codes, URLs) from widening the page.
 */
function SpecsSection({section}) {
  return (
    <section className="w-full bg-white">
      <Container>
        {section.title ? (
          <h2 className="border-b border-primary/15 pb-8 pt-2 text-center text-2xl font-bold tracking-tight text-primary md:text-[2rem]">
            {section.title}
          </h2>
        ) : null}

        {section.colorImages.length ? (
          <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-4 py-8">
            {section.colorLabel ? (
              <p className="w-full text-center text-base font-bold md:text-2xl">{section.colorLabel}</p>
            ) : null}
            {section.colorImages.map((url, index) => (
              <img
                key={index}
                src={url}
                alt=""
                loading="lazy"
                className="h-auto max-w-[33%] object-contain"
              />
            ))}
          </div>
        ) : null}

        <div className="mx-auto max-w-3xl text-[15px] leading-relaxed md:text-base">
          {section.groups.map((group, groupIndex) => (
            <div key={groupIndex} className="border-b border-primary/10 py-2.5">
              {group.category ? (
                <p className="bg-[#d4d2d2] px-4 py-3 text-lg font-bold text-primary md:text-[22px]">
                  {group.category}
                </p>
              ) : null}
              <dl className="px-4">
                {group.rows.map((row, rowIndex) => (
                  <div
                    key={rowIndex}
                    className="border-b border-primary/5 py-2.5 last:border-b-0 flex justify-between"
                  >
                    <dt className="font-bold text-primary/80">{row[0]}</dt>
                    <dd className="mt-0.5 min-w-0 whitespace-pre-line break-words text-primary/60">
                      {row[1]}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}

function CompareSection({section}) {
  return (
    <SectionShell>
      <Container>
        <SectionTitle className="mb-8 md:mb-12">{section.title}</SectionTitle>
        <div className="hiddenScroll overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr>
                <th className="w-[30%] border-b border-primary/15 pb-4 text-left font-medium text-primary/55" />
                {section.columns.map((column, index) => (
                  <th
                    key={index}
                    className="border-b border-primary/15 pb-4 text-left text-base font-semibold text-primary"
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {section.rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  <th className="border-b border-primary/10 py-4 pr-4 text-left font-medium text-primary/55">
                    {row.label}
                  </th>
                  {row.values.map((value, valueIndex) => (
                    <td key={valueIndex} className="border-b border-primary/10 py-4 pr-4 text-primary/85">
                      {value}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Container>
    </SectionShell>
  );
}

function FaqSection({section}) {
  return (
    <SectionShell tone="muted">
      <Container>
        <SectionTitle className="mb-8 md:mb-12">{section.title}</SectionTitle>
        <div className="grid gap-3">
          {section.items.map((item, index) => (
            <Disclosure key={index} as="div" className="rounded-2xl bg-contrast px-5 py-4">
              {({open}) => (
                <>
                  <Disclosure.Button className="flex w-full items-center justify-between gap-4 text-left text-base font-medium text-primary">
                    {item.q}
                    <span
                      className={clsx(
                        'shrink-0 text-primary/45 transition-transform',
                        open && 'rotate-180',
                      )}
                    >
                      <Chevron direction="right" />
                    </span>
                  </Disclosure.Button>
                  <Disclosure.Panel className="pt-3 text-sm leading-relaxed text-primary/70">
                    {item.a}
                  </Disclosure.Panel>
                </>
              )}
            </Disclosure>
          ))}
        </div>
      </Container>
    </SectionShell>
  );
}

function VideoSection({section}) {
  const embed = toEmbedUrl(section.url);

  return (
    <SectionShell>
      <Container>
        <SectionTitle className="mb-8 md:mb-12">{section.title}</SectionTitle>
        <div
          className="relative overflow-hidden rounded-3xl bg-primary/5"
          style={{aspectRatio: section.ratio}}
        >
          {embed ? (
            <iframe
              src={embed}
              title={section.title ?? 'Vídeo do produto'}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 h-full w-full"
            />
          ) : (
            <video
              src={section.url}
              poster={section.poster ?? undefined}
              controls
              playsInline
              className="absolute inset-0 h-full w-full object-cover"
            />
          )}
        </div>
      </Container>
    </SectionShell>
  );
}

/**
 * YouTube / Vimeo watch URLs are not embeddable as-is, so swap them for the
 * embed form. Everything else is treated as a direct video file.
 * @param {string} url
 */
function toEmbedUrl(url) {
  const youtube = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{6,})/,
  );
  if (youtube) return `https://www.youtube.com/embed/${youtube[1]}`;
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return null;
}

function RichTextSection({section}) {
  return (
    <SectionShell>
      <Container>
        <div
          className={clsx(
            'flex flex-col gap-4',
            section.align === 'center' && 'mx-auto max-w-3xl text-center',
          )}
        >
          <SectionTitle>{section.title}</SectionTitle>
          {section.html ? (
            <div
              className="text-sm leading-relaxed text-primary/75 md:text-base"
              dangerouslySetInnerHTML={{__html: section.html}}
            />
          ) : null}
        </div>
      </Container>
    </SectionShell>
  );
}

function CtaSection({section}) {
  const light = section.theme === 'light';

  return (
    <section className="relative overflow-hidden">
      {section.image ? (
        <>
          <img
            src={section.image}
            alt=""
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-black/45" />
        </>
      ) : (
        <div className="absolute inset-0 bg-primary" />
      )}

      <Container className="relative py-16 md:py-24">
        <div className="flex flex-col items-center gap-4 text-center">
          <h2
            className={clsx(
              'max-w-3xl text-2xl font-semibold tracking-tight md:text-4xl',
              light || section.image ? 'text-white' : 'text-contrast',
            )}
          >
            {section.title}
          </h2>
          {section.text ? (
            <p
              className={clsx(
                'max-w-2xl text-sm md:text-base',
                light || section.image ? 'text-white/85' : 'text-contrast/80',
              )}
            >
              {section.text}
            </p>
          ) : null}
          {section.button ? (
            <Link
              to={section.button.href}
              className="mt-2 inline-flex items-center rounded-full bg-contrast px-7 py-3 text-sm font-semibold text-primary transition-opacity hover:opacity-85"
            >
              {section.button.label}
            </Link>
          ) : null}
        </div>
      </Container>
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * Full-bleed design banners (ported from the Liquid theme's
 * ethan-landing-banner-2): a 100vw image with an absolutely positioned
 * copy layer at % offsets. Desktop (≥700px) and mobile each get their
 * own image and overlay, exactly like the theme.
 * ------------------------------------------------------------------ */

const BANNER_WIDTHS = [480, 720, 960, 1280, 1600, 1920, 2560];

const bannerSrc = (url) => (url.includes('?') ? url : `${url}?width=1600`);

const bannerSrcSet = (url) =>
  url.includes('?')
    ? undefined
    : BANNER_WIDTHS.map((w) => `${url}?width=${w} ${w}w`).join(', ');

function BannerCopy({item}) {
  const style = {};
  if (item.size != null) style.fontSize = `${item.size}vw`;
  if (item.lineHeight != null) style.lineHeight = `${item.lineHeight}vw`;
  if (item.weight != null) style.fontWeight = item.weight;
  if (item.gradient) {
    style.background = item.gradient;
    style.WebkitBackgroundClip = 'text';
    style.backgroundClip = 'text';
    style.color = 'transparent';
  } else if (item.color) {
    style.color = item.color;
  }
  return <p style={style} dangerouslySetInnerHTML={{__html: item.html}} />;
}

function BannerOverlay({overlay, className}) {
  if (!overlay?.items?.length) return null;

  const style = {top: `${overlay.top ?? 0}%`};
  if (overlay.align === 'right' && overlay.right != null) {
    style.right = `${overlay.right}%`;
  } else {
    style.left = `${overlay.left ?? 0}%`;
  }

  return (
    <div
      className={clsx(
        'absolute w-max',
        overlay.align === 'center' && '-translate-x-1/2 text-center',
        overlay.align === 'right' && 'text-right',
        className,
      )}
      style={style}
    >
      {overlay.items.map((item, index) => (
        <BannerCopy key={index} item={item} />
      ))}
    </div>
  );
}

function BannerSection({section}) {
  const hasMobile = Boolean(section.imageMobile);

  return (
    <section className="relative w-full overflow-hidden">
      <picture>
        {hasMobile ? (
          <source
            media="(max-width: 767px)"
            srcSet={bannerSrcSet(section.imageMobile) ?? bannerSrc(section.imageMobile)}
            width={section.wMobile ?? undefined}
            height={section.hMobile ?? undefined}
          />
        ) : null}
        <img
          src={bannerSrc(section.image)}
          srcSet={bannerSrcSet(section.image)}
          sizes="100vw"
          width={section.w ?? undefined}
          height={section.h ?? undefined}
          alt={section.alt ?? ''}
          loading="lazy"
          decoding="async"
          className="block h-auto w-full"
        />
      </picture>

      {/* Theme splits the copy layer at ~768px, mirroring the PC/APP images. */}
      <BannerOverlay overlay={section.overlay} className="hidden md:block" />
      <BannerOverlay
        overlay={section.overlayMobile ?? section.overlay}
        className="block md:hidden"
      />
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * Tabbed detail: a labeled tab bar switching between whole groups of
 * sections (ported from the theme's ethan-tabs-2: "Detail" / "Specs").
 * ------------------------------------------------------------------ */

function TabsSection({section}) {
  const [active, setActive] = useState(0);
  const panes = section.panes ?? [];
  if (!panes.length) return null;

  return (
    <section className="w-full">
      <div
        role="tablist"
        className="flex gap-8 border-b border-primary/10 pl-6 pr-6 pt-2 md:gap-12 md:pl-10 lg:pl-14"
      >
        {panes.map((pane, index) => {
          const selected = index === active;
          return (
            <button
              key={index}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setActive(index)}
              className={clsx(
                '-mb-px border-b-4 pb-3 pt-2 text-base font-bold transition-colors md:text-lg',
                selected
                  ? 'border-primary text-primary'
                  : 'border-transparent text-primary/60 hover:text-notice',
              )}
            >
              {pane.label}
            </button>
          );
        })}
      </div>

      {panes.map((pane, index) => (
        <div key={index} role="tabpanel" hidden={index !== active}>
          {index === active ? (
            pane.sections?.map((child, childIndex) => renderSection(child, childIndex))
          ) : null}
        </div>
      ))}
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * Theme ports for the W11 Pro page (ethan-product-swiper / text-image /
 * swiper-product / left-right-text). Same visual language as the Liquid
 * originals, minus the scroll animations.
 * ------------------------------------------------------------------ */

/** Background image + centered viewport with a two-slide click carousel. */
function ProductSwiperSection({section}) {
  const [index, setIndex] = useState(0);
  const slides = section.slides ?? [];
  if (!slides.length) return null;
  const total = slides.length;

  return (
    <section
      className="relative w-full overflow-hidden bg-black"
      style={{paddingTop: '110%'}}
    >
      {section.background ? (
        <img
          src={bannerSrc(section.background)}
          srcSet={bannerSrcSet(section.background)}
          sizes="100vw"
          width={section.bgW ?? undefined}
          height={section.bgH ?? undefined}
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover object-top"
        />
      ) : null}
      <div
        className="absolute left-1/2 top-[62%] w-[48%] -translate-x-1/2 -translate-y-1/2 overflow-hidden max-md:top-[58%] max-md:w-[70%]"
        style={{aspectRatio: '1329 / 605'}}
      >
        <div
          className="flex h-full transition-transform duration-300"
          style={{
            width: `${total * 100}%`,
            transform: `translateX(-${(index * 100) / total}%)`,
          }}
        >
          {slides.map((slide, i) => (
            <img
              key={i}
              src={bannerSrc(slide.image)}
              srcSet={bannerSrcSet(slide.image)}
              width={slide.w ?? undefined}
              height={slide.h ?? undefined}
              alt=""
              loading="lazy"
              className="h-full object-cover"
              style={{width: `${100 / total}%`}}
            />
          ))}
        </div>
      </div>
      {total > 1 ? (
        <>
          <button
            type="button"
            aria-label="Imagem anterior"
            onClick={() => setIndex((index - 1 + total) % total)}
            className="absolute left-[21%] top-[62%] z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-2xl text-white/40 transition hover:text-white max-md:left-2 max-md:h-8 max-md:w-8 max-md:text-white/70"
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="Próxima imagem"
            onClick={() => setIndex((index + 1) % total)}
            className="absolute right-[21%] top-[62%] z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-2xl text-white/40 transition hover:text-white max-md:right-2 max-md:h-8 max-md:w-8 max-md:text-white/70"
          >
            ›
          </button>
        </>
      ) : null}
    </section>
  );
}

/** Full-width image pair with a floating logo + copy block on top. */
function TextImageSection({section}) {
  if (!section.image) return null;

  return (
    <section className="relative w-full overflow-hidden">
      <img
        src={bannerSrc(section.image)}
        srcSet={bannerSrcSet(section.image)}
        sizes="100vw"
        width={section.w ?? undefined}
        height={section.h ?? undefined}
        alt=""
        loading="lazy"
        decoding="async"
        className="block w-full"
      />
      {section.imageAlt ? (
        <img
          src={bannerSrc(section.imageAlt)}
          srcSet={bannerSrcSet(section.imageAlt)}
          sizes="100vw"
          width={section.wAlt ?? undefined}
          height={section.hAlt ?? undefined}
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : null}
      {section.title || section.logo || section.lines?.length ? (
        <div className="absolute left-[8vw] top-[3vh] z-10 max-w-[88vw] text-white md:left-[9vw] md:top-[8vh]">
          <div className="mb-2 flex items-center gap-2 md:mb-5 md:gap-5">
            {section.title ? (
              <p className="text-[clamp(1rem,2vw,3rem)] font-semibold leading-tight">
                {section.title}
              </p>
            ) : null}
            {section.logo ? (
              <img
                src={bannerSrc(section.logo)}
                alt=""
                loading="lazy"
                className="h-4 w-4 shrink-0 object-contain md:h-[60px] md:w-[60px]"
              />
            ) : null}
          </div>
          {(section.lines ?? []).map((line, i) => (
            <p
              key={i}
              className="my-1.5 text-[clamp(0.75rem,1.3vw,2rem)] leading-snug md:my-2.5 md:leading-normal"
            >
              {line}
            </p>
          ))}
        </div>
      ) : null}
    </section>
  );
}

/** Black section: gradient title, fixed phone render, slide carousel. */
function SwiperProductSection({section}) {
  const [index, setIndex] = useState(0);
  const slides = section.slides ?? [];
  if (!slides.length) return null;

  return (
    <section className="w-full bg-black text-white">
      <div className="pt-10 text-center md:pt-[50px]">
        {section.title ? (
          <h2 className="mb-4 bg-gradient-to-r from-[#ff2d95] to-[#ff6b6b] bg-clip-text px-4 text-[1.6rem] font-bold text-transparent md:mb-5 md:text-[2.5rem]">
            {section.title}
          </h2>
        ) : null}
        {section.desc ? (
          <p className="mx-auto max-w-[1600px] px-4 text-[0.95rem] leading-relaxed text-white md:px-8 md:text-[2.1rem]">
            {section.desc}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col px-5 py-8 md:py-12 lg:flex-row lg:items-center lg:gap-10 lg:px-0 lg:py-[50px]">
        {section.phoneImage ? (
          <div className="w-full lg:w-[40%]">
            <img
              src={bannerSrc(section.phoneImage)}
              srcSet={bannerSrcSet(section.phoneImage)}
              sizes="(max-width: 1023px) 65vw, 40vw"
              width={section.phoneW ?? undefined}
              height={section.phoneH ?? undefined}
              alt=""
              loading="lazy"
              className="mx-auto block w-full max-w-[700px]"
            />
          </div>
        ) : null}

        <div
          className={clsx(
            'relative w-full overflow-hidden',
            section.phoneImage && 'mt-8 lg:mt-0 lg:w-[60%]',
            !section.phoneImage && 'lg:w-full',
          )}
        >
          <div
            className="flex transition-transform duration-500"
            style={{transform: `translateX(-${index * 100}%)`}}
          >
            {slides.map((slide, i) => (
              <div key={i} className="flex w-full shrink-0 flex-col gap-6">
                <div className="flex min-h-[240px] items-center justify-center lg:min-h-[400px]">
                  <img
                    src={bannerSrc(slide.image)}
                    srcSet={bannerSrcSet(slide.image)}
                    width={slide.w ?? undefined}
                    height={slide.h ?? undefined}
                    alt=""
                    loading="lazy"
                    className="max-h-[420px] max-w-full rounded-lg object-contain shadow-[0_10px_30px_rgba(0,0,0,0.5)]"
                  />
                </div>
                <div className="h-px w-[93%] self-center bg-gray-500" />
                <div className="px-1 md:px-12">
                  <h3 className="mb-3 bg-gradient-to-r from-[#ff6b6b] to-[#ffd93d] bg-clip-text text-[1.15rem] font-semibold text-transparent md:text-[1.8rem]">
                    {slide.title}
                  </h3>
                  <p className="text-[0.85rem] leading-relaxed text-[#aaa] md:text-[1.1rem]">
                    {slide.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-2 flex justify-center gap-4 lg:absolute lg:bottom-[-14%] lg:right-[10%] lg:mt-0">
            <button
              type="button"
              aria-label="Anterior"
              disabled={index === 0}
              onClick={() => setIndex(index - 1)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-black transition hover:opacity-80 disabled:opacity-30 lg:bg-white/10 lg:text-white lg:hover:bg-white/20"
            >
              ‹
            </button>
            <button
              type="button"
              aria-label="Próximo"
              disabled={index === slides.length - 1}
              onClick={() => setIndex(index + 1)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-black transition hover:opacity-80 disabled:opacity-30 lg:bg-white/10 lg:text-white lg:hover:bg-white/20"
            >
              ›
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Alternating copy/image rows on a solid background (45% / 55%). */
function LeftRightTextSection({section}) {
  const rows = section.rows ?? [];
  if (!rows.length) return null;

  return (
    <section
      className="w-full"
      style={{backgroundColor: section.bg ?? '#000'}}
    >
      {rows.map((row, i) => (
        <div
          key={i}
          className={clsx(
            'flex flex-col items-center gap-4 px-6 py-8 text-center text-white',
            'md:flex-row md:items-center md:gap-[4%] md:px-[11vw] md:py-[2vw] md:text-left',
          )}
        >
          {row.side === 'right' && row.image ? (
            <img
              src={bannerSrc(row.image)}
              srcSet={bannerSrcSet(row.image)}
              sizes="(max-width: 767px) 100vw, 55vw"
              width={row.w ?? undefined}
              height={row.h ?? undefined}
              alt=""
              loading="lazy"
              className="block w-full md:w-[55%]"
            />
          ) : null}

          <div className="w-full md:w-[45%] md:py-[6%]">
            {row.heading ? (
              <p
                className="mb-3"
                style={{
                  fontSize: `clamp(1rem, ${row.headingSize ?? 2}vw, ${(row.headingSize ?? 2) * 14.4}px)`,
                  fontWeight: row.headingWeight ?? 400,
                }}
              >
                {row.heading}
              </p>
            ) : null}
            {row.subheading ? (
              <p
                className="leading-relaxed"
                style={{
                  fontSize: `clamp(0.8rem, ${row.subSize ?? 1}vw, ${(row.subSize ?? 1) * 14.4}px)`,
                  fontWeight: row.subWeight ?? 400,
                }}
              >
                {row.subheading}
              </p>
            ) : null}
          </div>

          {row.side === 'left' && row.image ? (
            <img
              src={bannerSrc(row.image)}
              srcSet={bannerSrcSet(row.image)}
              sizes="(max-width: 767px) 100vw, 55vw"
              width={row.w ?? undefined}
              height={row.h ?? undefined}
              alt=""
              loading="lazy"
              className="block w-full md:w-[55%]"
            />
          ) : null}
        </div>
      ))}
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * Full-bleed image slideshow. The theme ships two flavours of this —
 * a custom `.media-slider-section` (arrows only, transform track) and
 * the native `slideshow_ver2` section (cross-fade). Both reduce to the
 * same model: N full-width images + optional arrows / dots / autoplay.
 * ------------------------------------------------------------------ */

function ImageSlideshowSection({section}) {
  const slides = section.slides ?? [];
  const count = slides.length;
  const [index, setIndex] = useState(0);

  const autoplayMs = section.autoplay
    ? Math.max(Number(section.interval) || 4000, 1500)
    : 0;

  useEffect(() => {
    if (!autoplayMs || count < 2) return undefined;
    const timer = setInterval(
      () => setIndex((current) => (current + 1) % count),
      autoplayMs,
    );
    return () => clearInterval(timer);
  }, [autoplayMs, count]);

  useEffect(() => {
    // Clamp when the admin shrinks the slide list.
    if (index > count - 1) setIndex(0);
  }, [count, index]);

  if (!count) return null;

  const go = (delta) => setIndex((current) => (current + delta + count) % count);

  const first = slides[0];
  const ratio = Number(section.ratio) || (first.w && first.h ? first.w / first.h : 0);

  const showDots = count > 1 && section.dots === true;
  // Always give a way to switch: arrows unless the merchant asked for dots.
  const showArrows = count > 1 && !showDots;

  return (
    <section className="relative w-full overflow-hidden bg-[#f2f2f2]">
      <div
        className="relative w-full"
        style={count > 1 ? {aspectRatio: ratio || 2.2} : undefined}
      >
        {slides.map((slide, i) => {
          const active = i === index;
          return (
            <div
              key={slide.image ?? i}
              aria-hidden={!active}
              className={clsx(
                count > 1 && 'absolute inset-0 transition-opacity duration-700 ease-out',
                count > 1 && !active && 'pointer-events-none opacity-0',
              )}
            >
              <picture>
                {slide.imageMobile ? (
                  <source
                    media="(max-width: 767px)"
                    srcSet={
                      bannerSrcSet(slide.imageMobile) ?? bannerSrc(slide.imageMobile)
                    }
                    width={slide.wMobile ?? undefined}
                    height={slide.hMobile ?? undefined}
                  />
                ) : null}
                <img
                  src={bannerSrc(slide.image)}
                  srcSet={bannerSrcSet(slide.image)}
                  sizes="100vw"
                  width={slide.w ?? undefined}
                  height={slide.h ?? undefined}
                  alt={slide.alt ?? ''}
                  loading={i === 0 ? 'eager' : 'lazy'}
                  decoding="async"
                  className={clsx(
                    'block w-full',
                    count > 1 ? 'h-full object-cover' : 'h-auto',
                  )}
                />
              </picture>
            </div>
          );
        })}
      </div>

      {showArrows ? (
        <>
          <button
            type="button"
            aria-label="Anterior"
            onClick={() => go(-1)}
            className="absolute left-3 top-1/2 z-10 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/80 text-primary shadow-md transition hover:bg-white md:left-6 md:h-11 md:w-11"
          >
            <IconArrow direction="left" />
          </button>
          <button
            type="button"
            aria-label="Próximo"
            onClick={() => go(1)}
            className="absolute right-3 top-1/2 z-10 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/80 text-primary shadow-md transition hover:bg-white md:right-6 md:h-11 md:w-11"
          >
            <IconArrow direction="right" />
          </button>
        </>
      ) : null}

      {showDots ? (
        <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2">
          {slides.map((slide, i) => (
            <button
              key={`dot-${slide.image ?? i}`}
              type="button"
              aria-label={`Ir para o slide ${i + 1}`}
              onClick={() => setIndex(i)}
              className={clsx(
                'h-2 rounded-full transition-all',
                i === index ? 'w-6 bg-white' : 'w-2 bg-white/60 hover:bg-white/90',
              )}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

const SECTION_COMPONENTS = {
  hero: HeroSection,
  banner: BannerSection,
  imageSlideshow: ImageSlideshowSection,
  tabs: TabsSection,
  productSwiper: ProductSwiperSection,
  textImage: TextImageSection,
  swiperProduct: SwiperProductSection,
  leftRightText: LeftRightTextSection,
  gallery: GallerySection,
  imageText: ImageTextSection,
  features: FeaturesSection,
  specs: SpecsSection,
  compare: CompareSection,
  faq: FaqSection,
  video: VideoSection,
  text: RichTextSection,
  cta: CtaSection,
};

/**
 * Renders one section (or none when the type is unknown). Shared by the top
 * level list and by `tabs` panes, which nest whole section lists.
 */
function renderSection(section, index) {
  const Component = SECTION_COMPONENTS[section.type];
  if (!Component) return null;
  return <Component key={`${section.type}-${index}`} section={section} />;
}

/**
 * Renders the admin-authored sections, in the order they were saved.
 * @param {{sections?: Array<{type: string}> | null}} props
 */
export function LandingSections({sections}) {
  if (!sections?.length) return null;

  return (
    <div className="w-full">
      {sections.map((section, index) => renderSection(section, index))}
    </div>
  );
}

/**
 * Buy-box bullet list. Rendered only when the merchant filled the fields, so
 * products without a landing entry keep the plain Hydrogen buy box.
 * @param {{landing: {highlightsTitle?: string | null, highlightsLines?: string[] | null, trustLabels?: string[] | null} | null}} props
 */
export function LandingHighlights({landing}) {
  if (!landing?.highlightsLines?.length) return null;

  return (
    <div className="grid gap-3">
      {landing.highlightsTitle ? (
        <p className="text-sm font-semibold text-primary">{landing.highlightsTitle}</p>
      ) : null}
      <ul className="grid gap-2">
        {landing.highlightsLines.map((line, index) => (
          <li key={index} className="flex items-start gap-3 text-sm text-primary/80">
            <span className="mt-0.5 shrink-0 text-notice">
              <IconCheck />
            </span>
            <span dangerouslySetInnerHTML={{__html: line}} />
          </li>
        ))}
      </ul>
    </div>
  );
}

/** 保障三栏的默认内容（主站同款：保修 / 退货 / 免邮）。后台填了 trust_labels 则覆盖。 */
const TRUST_DEFAULTS = [
  {
    label: 'Garantia de 2 anos',
    Icon: function IconShield(props) {
      return (
        <svg
          viewBox="0 0 24 24"
          width="26"
          height="26"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          {...props}
        >
          <path d="M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6l7-3z" />
          <path d="M9 12l2 2 4-4" />
        </svg>
      );
    },
  },
  {
    label: 'Devolução em 30 dias',
    Icon: function IconRefresh(props) {
      return (
        <svg
          viewBox="0 0 24 24"
          width="26"
          height="26"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          {...props}
        >
          <path d="M3 12a9 9 0 0 1 15.5-6.2" />
          <path d="M21 12a9 9 0 0 1-15.5 6.2" />
          <path d="M18.5 2v4h-4" />
          <path d="M5.5 22v-4h4" />
        </svg>
      );
    },
  },
  {
    label: 'Frete grátis',
    Icon: function IconTruck(props) {
      return (
        <svg
          viewBox="0 0 24 24"
          width="26"
          height="26"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          {...props}
        >
          <path d="M1 5h13v11H1z" />
          <path d="M14 9h5l4 4v3h-9" />
          <circle cx="6" cy="18.5" r="1.8" />
          <circle cx="18" cy="18.5" r="1.8" />
        </svg>
      );
    },
  },
];

/**
 * Warranty / returns / shipping row for the buy box. Admin labels win;
 * otherwise the main-site defaults are shown.
 * @param {{landing?: {trustLabels?: string[] | null} | null}} props
 */
export function LandingTrustRow({landing}) {
  const adminLabels = landing?.trustLabels?.slice(0, 3);
  const items = adminLabels?.length
    ? adminLabels.map((label) => ({label, Icon: null}))
    : TRUST_DEFAULTS;
  if (!items.length) return null;

  return (
    <ul className="grid grid-cols-3 gap-2 border-y border-primary/10 py-4">
      {items.map(({label, Icon}, index) => (
        <li
          key={index}
          className="flex flex-col items-center gap-1.5 text-center text-xs text-primary/70"
        >
          <span className="text-notice">
            {Icon ? <Icon /> : <IconCheck />}
          </span>
          <span dangerouslySetInnerHTML={{__html: label}} />
        </li>
      ))}
    </ul>
  );
}
