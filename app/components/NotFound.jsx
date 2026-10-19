import {Button} from './Button';
import {FeaturedSection} from './FeaturedSection';
import {PageHeader, Text} from './Text';

/** Page-type nouns used in the 404 copy, keyed by the `type` prop. */
const NOT_FOUND_NOUNS = {
  page: 'página',
  product: 'página de produto',
  collection: 'coleção',
  article: 'página',
  policy: 'página',
  search: 'página',
};

/**
 * @param {{type?: string}}
 */
export function NotFound({type = 'page'}) {
  const noun = NOT_FOUND_NOUNS[type] ?? 'página';
  const heading = `Não encontramos esta ${noun}`;
  const description = `Não conseguimos encontrar a ${noun} que você procura. Verifique o endereço ou volte para a página inicial.`;

  return (
    <>
      <PageHeader heading={heading}>
        <Text width="narrow" as="p">
          {description}
        </Text>
        <Button width="auto" variant="secondary" to={'/'}>
          Voltar para a página inicial
        </Button>
      </PageHeader>
      <FeaturedSection />
    </>
  );
}
