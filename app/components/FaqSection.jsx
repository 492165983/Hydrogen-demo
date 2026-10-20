import {useState} from 'react';

const FAQS = [
  {
    q: 'Política de Garantia',
    a: (
      <>
        Oferecemos garantia de 12 meses para compras realizadas no{' '}
        <a
          href="https://hotwav.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-neutral-900 underline underline-offset-2 hover:text-[#e4002b]"
        >
          hotwav.com
        </a>
        . O prazo da garantia inicia‑se na data em que o produto é recebido
        pelo comprador consumidor original.
      </>
    ),
  },
  {
    q: 'Quando receberei o meu pedido?',
    a: 'Após a realização do seu pedido, enviaremos o produto o mais breve possível. O local de envio depende da sua região, realizamos o envio a partir do centro de distribuição mais próximo. O prazo de chegada, contado a partir da data do envio, geralmente é de 3 a 10 dias úteis.',
  },
  {
    q: 'Política de Devolução e Reembolso',
    a: 'Caso você não esteja satisfeito com o produto comprado, entre em contato conosco dentro de 30 dias após o recebimento do item, e processaremos sua solicitação de devolução ou troca. Devoluções não autorizadas não serão aceitas. O produto deve ser devolvido dentro de 30 dias após o seu recebimento. Todos os produtos devem ser devolvidos nas mesmas condições em que foram recebidos: sem uso, sem desgaste, com todas as etiquetas intactas e na embalagem original. Você também precisará apresentar o comprovante de compra ou recibo. Para devoluções ou trocas, o cliente deverá utilizar um método de envio com código de rastreamento.',
  },
  {
    q: 'Quais são as garantias?',
    a: 'Garantia de 2 anos, suporte ao cliente vitalício.',
  },
  {
    q: "Os celulares HOTWAV são realmente à prova d'água?",
    a: 'Sim, com certificação IP68.',
  },
];

export function FaqSection() {
  // All items expanded by default (matches the reference layout).
  const [open, setOpen] = useState(() => FAQS.map(() => true));

  const toggle = (i) =>
    setOpen((prev) => prev.map((v, j) => (j === i ? !v : v)));

  return (
    <section className="mx-auto w-full max-w-[1440px] px-4 pb-12 md:px-8 md:pb-16 lg:px-10">
      <h2 className="mb-4 text-2xl font-extrabold tracking-tight text-neutral-900 md:mb-6 md:text-3xl">
        Perguntas Frequentes
      </h2>

      <div className="border-b border-neutral-200">
        {FAQS.map((item, i) => {
          const isOpen = open[i];
          return (
            <div key={i} className="border-t border-neutral-200">
              <button
                type="button"
                onClick={() => toggle(i)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between gap-4 py-4 text-left"
              >
                <span className="text-sm font-semibold text-neutral-900 md:text-base">
                  {item.q}
                </span>
                <svg
                  viewBox="0 0 24 24"
                  className={`h-4 w-4 shrink-0 text-neutral-500 transition-transform duration-300 ${
                    isOpen ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
              <div
                className={`grid transition-all duration-300 ease-in-out ${
                  isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                }`}
              >
                <div className="overflow-hidden">
                  <p className="pb-5 text-sm leading-relaxed text-neutral-600">
                    {item.a}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
