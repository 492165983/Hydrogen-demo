import {CARD_ICONS, PAYMENT_ICONS} from '~/components/WhyHotwavIcons';

const BRAND_RED = '#e4002b';

// Content copied from the hotwav-br Liquid homepage "Por Que Comprar da Hotwav" section.
const CDN = 'https://cdn.shopify.com/s/files/1/0738/0533/2769/files';

const IMAGES = {
  box: `${CDN}/4_df07c2e2-129b-4d5f-94ab-d17e3f7f5d8e.webp?v=1774518666&width=640`,
  shield: `${CDN}/0b78b19c1a99116fcbd0c864ddde7af6.webp?v=1774513272&width=480`,
  support: `${CDN}/863d88e7a7c764473c11cfdb5f83a937.webp?v=1773196299&width=480`,
  tools: `${CDN}/55_11zon.webp?v=1774582785&width=480`,
  newEquipment: `${CDN}/3840--X100GT-_--P1_01.webp?v=1772438180&width=640`,
};

function FaIcon({icon, className = 'h-8 w-8'}) {
  return (
    <svg
      viewBox={icon.viewBox}
      className={className}
      fill={BRAND_RED}
      aria-hidden="true"
    >
      {icon.paths.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}

function Card({icon, title, children, className = ''}) {
  return (
    <div
      className={`flex flex-col items-center rounded-2xl border border-neutral-200 bg-white p-5 text-center shadow-sm transition-shadow hover:shadow-md md:p-6 ${className}`}
    >
      {icon ? <FaIcon icon={icon} /> : null}
      <h3 className="mt-3 text-[13px] font-semibold leading-snug text-neutral-900 md:text-sm">
        {title}
      </h3>
      <div className="flex flex-1 items-center justify-center pt-4">
        {children}
      </div>
    </div>
  );
}

function CardImage({src, alt, className = ''}) {
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      className={`rounded-lg object-contain ${className}`}
    />
  );
}

function PaymentIcons() {
  return (
    <div className="grid w-full max-w-[260px] grid-cols-4 items-center justify-items-center gap-x-3 gap-y-3">
      {PAYMENT_ICONS.map((icon, i) => (
        <svg
          key={i}
          viewBox={icon.viewBox}
          className="h-5 w-auto"
          fill={BRAND_RED}
          aria-hidden="true"
        >
          {icon.paths.map((d, j) => (
            <path key={j} d={d} />
          ))}
        </svg>
      ))}
    </div>
  );
}

const icon = (label) => CARD_ICONS.find((i) => i.label === label);

export function WhyHotwav() {
  return (
    <section className="mx-auto w-full max-w-[1440px] px-4 py-10 md:px-8 md:py-14 lg:px-10">
      <h2 className="mb-6 text-2xl font-extrabold tracking-tight text-neutral-900 md:mb-8 md:text-3xl">
        Por Que Comprar da Hotwav
      </h2>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {/* Tall card, spans both rows */}
        <Card
          icon={icon('Frete Grátis')}
          title="Frete Grátis"
          className="row-span-2"
        >
          <CardImage
            src={IMAGES.box}
            alt="Caixa HOTWAV"
            className="max-h-full w-full"
          />
        </Card>

        <Card icon={icon('Garantia de Reembolso de 30 Dias')} title="Garantia de Reembolso de 30 Dias">
          <span className="text-5xl font-extrabold leading-none text-[#e4002b]">
            30
          </span>
        </Card>

        <Card icon={icon('Garantia de Qualidade')} title="Garantia de Qualidade">
          <CardImage
            src={IMAGES.shield}
            alt="Garantia de Qualidade"
            className="h-28 md:h-32"
          />
        </Card>

        <Card icon={icon('Pagamento Seguro e Rápido')} title="Pagamento Seguro e Rápido">
          <PaymentIcons />
        </Card>

        <Card icon={icon('Suporte ao Cliente Vitalício')} title="Suporte ao Cliente Vitalício">
          <CardImage
            src={IMAGES.support}
            alt="Suporte ao cliente"
            className="h-28 md:h-32"
          />
        </Card>

        <Card icon={icon('Garantia de Dois Anos')} title="Garantia de Dois Anos">
          <CardImage
            src={IMAGES.tools}
            alt="Garantia de Dois Anos"
            className="h-28 md:h-32"
          />
        </Card>

        <Card
          icon={icon('Veja os Novos Equipamentos')}
          title="Veja os Novos Equipamentos com Antecedência"
        >
          <CardImage
            src={IMAGES.newEquipment}
            alt="Novos equipamentos"
            className="w-full"
          />
        </Card>
      </div>
    </section>
  );
}
