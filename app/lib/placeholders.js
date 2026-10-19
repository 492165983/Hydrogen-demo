// Demo store placeholders
const PLACEHOLDERS = {
  HEROS: [
    // primaryHero
    {
      heading: {value: 'Resistência para qualquer desafio'},
      byline: {
        value: 'A nova geração de smartphones robustos HOTWAV',
      },
      cta: {value: 'Comprar agora →'},
      handle: 'freestyle',
      spread: {
        reference: {
          mediaContentType: 'IMAGE',
          alt: 'Trilhas na neve levando a uma pessoa no topo de uma montanha.',
          previewImage: {
            url: 'https://cdn.shopify.com/s/files/1/0551/4566/0472/files/Hydrogen_Hero_Feature_1.jpg?v=1654902468',
          },
          id: 'gid://shopify/MediaImage/29259478466616',
          image: {
            url: 'https://cdn.shopify.com/s/files/1/0551/4566/0472/files/Hydrogen_Hero_Feature_1.jpg?v=1654902468',
            width: 2500,
            height: 3155,
          },
        },
      },
      spreadSecondary: {
        reference: {
          __typename: 'MediaImage',
          mediaContentType: 'IMAGE',
          alt: 'Praticante de esporte radical no topo de uma montanha nevada.',
          previewImage: {
            url: 'https://cdn.shopify.com/s/files/1/0551/4566/0472/files/Hydrogen_Hero_Feature_2.jpg?v=1654902468',
          },
          id: 'gid://shopify/MediaImage/29259478499384',
          image: {
            url: 'https://cdn.shopify.com/s/files/1/0551/4566/0472/files/Hydrogen_Hero_Feature_2.jpg?v=1654902468',
            width: 2500,
            height: 3155,
          },
        },
      },
      height: 'full',
      top: true,
      decoding: 'sync',
      loading: 'eager',
    },
    // secondaryHero
    {
      heading: {value: 'Feito para o trabalho pesado'},
      byline: null,
      cta: {value: 'Comprar agora →'},
      handle: 'backcountry',
      spread: {
        reference: {
          __typename: 'MediaImage',
          mediaContentType: 'IMAGE',
          alt: 'Pessoa subindo uma montanha nevada com equipamento nos ombros.',
          previewImage: {
            url: 'https://cdn.shopify.com/s/files/1/0551/4566/0472/files/Chalet_Collection_Feature_1.jpg?v=1654902306',
          },
          id: 'gid://shopify/MediaImage/29259478368312',
          image: {
            url: 'https://cdn.shopify.com/s/files/1/0551/4566/0472/files/Chalet_Collection_Feature_1.jpg?v=1654902306',
            width: 2500,
            height: 2500,
          },
        },
      },
      spreadSecondary: {
        reference: {
          __typename: 'MediaImage',
          mediaContentType: 'IMAGE',
          alt: 'Refúgio coberto de neve iluminado à noite sob um céu estrelado.',
          previewImage: {
            url: 'https://cdn.shopify.com/s/files/1/0551/4566/0472/files/Chalet_Collection_Feature_2.jpg?v=1654902306',
          },
          id: 'gid://shopify/MediaImage/29259478401080',
          image: {
            url: 'https://cdn.shopify.com/s/files/1/0551/4566/0472/files/Chalet_Collection_Feature_2.jpg?v=1654902306',
            width: 2500,
            height: 2500,
          },
        },
      },
    },
    // tertiaryHero
    {
      heading: {value: 'Coleção 2026'},
      byline: {value: 'Acabou de chegar'},
      cta: {value: 'Comprar agora →'},
      handle: 'winter-2022',
      spread: {
        reference: {
          __typename: 'MediaImage',
          mediaContentType: 'IMAGE',
          alt: 'Três pessoas se divertindo enquanto a neve cai ao redor.',
          previewImage: {
            url: 'https://cdn.shopify.com/s/files/1/0551/4566/0472/files/Collection_Feature_Wide.jpg?v=1654902160',
          },
          id: 'gid://shopify/MediaImage/29259478302776',
          image: {
            url: 'https://cdn.shopify.com/s/files/1/0551/4566/0472/files/Collection_Feature_Wide.jpg?v=1654902160',
            width: 5000,
            height: 2500,
          },
        },
      },
      spreadSecondary: null,
    },
  ],
  PRODUCT_INFO: [
    {
      title: 'Descrição',
      content:
        'Conteúdo de exemplo exibido enquanto os dados do produto não estiverem disponíveis.',
    },
    {
      title: 'Tamanho e ajuste',
      content:
        'Conteúdo de exemplo exibido enquanto os dados do produto não estiverem disponíveis.',
    },
    {
      title: 'Entrega e devoluções',
      content: `Conteúdo de exemplo exibido enquanto os dados do produto não estiverem disponíveis.`,
    },
  ],
  PRODUCT: {
    label: 'Edição limitada',
    id: 'gid://shopify/Product/6730850828344',
    title: 'Smartphone HOTWAV',
    publishedAt: '2021-06-17T18:33:17Z',
    handle: 'snowboard',
    description:
      "Descrição Produto de exemplo. Este texto aparece somente quando os dados reais do produto não estão disponíveis.",
    priceRange: {
      minVariantPrice: {
        amount: '775.0',
        currencyCode: 'CAD',
      },
      maxVariantPrice: {
        amount: '775.0',
        currencyCode: 'CAD',
      },
    },
    options: [
      {
        name: 'Cor',
        values: ['Manhã', 'Tarde', 'Noite'],
      },
      {
        name: 'Tamanho',
        values: ['154', '158', '160'],
      },
    ],
    variants: {
      nodes: [
        {
          id: 'gid://shopify/ProductVariant/41007289630776',
          image: {
            url: 'https://cdn.shopify.com/s/files/1/0551/4566/0472/products/hydrogen-morning.jpg?v=1636146509',
            altText: 'Smartphone HOTWAV, cor Manhã',
            width: 1200,
            height: 1504,
          },
          price: {
            amount: '775.0',
            currencyCode: 'CAD',
          },
          compareAtPrice: {
            amount: '840.0',
            currencyCode: 'CAD',
          },
        },
      ],
    },
  },
};

/**
 * getHeroPlaceholder() returns placeholder content when the expected metafields
 * don't exist. Define the following five custom metafields on your Shopify store to override placeholders:
 * - hero.title             Single line text
 * - hero.byline            Single line text
 * - hero.cta               Single line text
 * - hero.spread            File
 * - hero.spread_secondary   File
 *
 * @see https://help.shopify.com/manual/metafields/metafield-definitions/creating-custom-metafield-definitions
 * @see https://github.com/Shopify/hydrogen/discussions/1790
 * @param {any[]} heros
 */

export function getHeroPlaceholder(heros) {
  if (!heros?.length) return [];

  // when we pass a collection without metafields,
  // we merge it with placeholder data
  return heros.map((hero, index) => {
    // assume passed hero has metafields data already
    if (hero?.heading?.value) {
      return hero;
    }

    // hero placeholder
    const placeholder = PLACEHOLDERS.HEROS[index];

    // prioritize metafield data if available, else the hero hero values
    // otherwise the placeholder values
    const byLine =
      hero?.byLine || hero?.descriptionHtml
        ? {value: hero.descriptionHtml}
        : placeholder.byline;

    const heading =
      hero?.heading || hero?.title ? {value: hero.title} : placeholder.heading;

    // merge hero placeholder with hero data
    return {
      heading,
      byLine,
      cta: hero?.cta || placeholder.cta,
      handle: hero?.handle || placeholder.handle,
      id: hero?.id || index,
      spread: hero?.spread || placeholder.spread,
      spreadSecondary: hero?.spreadSecondary || placeholder.spreadSecondary,
      height: placeholder?.height || undefined,
      top: placeholder?.top || undefined,
    };
  });
}

// get product info placeholder data

export function getProductInfoPlaceholder() {
  function getMultipleRandom(arr, infos) {
    const shuffled = [...arr].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, infos);
  }
  return getMultipleRandom(PLACEHOLDERS.PRODUCT_INFO, 3);
}

/**
 * @return {Product}
 */
export function getProductPlaceholder() {
  return PLACEHOLDERS.PRODUCT;
}

/** @typedef {import('@shopify/hydrogen/storefront-api-types').Product} Product */
