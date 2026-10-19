import {Link} from '~/components/Link';

/**
 * @param {{
 *   customer: CustomerDetailsFragment;
 * }}
 */
export function AccountDetails({customer}) {
  const {firstName, lastName, emailAddress, phoneNumber} = customer;

  return (
    <>
      <div className="grid w-full gap-4 p-4 py-6 md:gap-8 md:p-8 lg:p-12">
        <h3 className="font-bold text-lead">Detalhes da conta</h3>
        <div className="lg:p-8 p-6 border border-gray-200 rounded">
          <div className="flex">
            <h3 className="font-bold text-base flex-1">Perfil</h3>
            <Link
              prefetch="intent"
              className="underline text-sm font-normal"
              to="/account/edit"
            >
              Editar
            </Link>
          </div>
          <div className="mt-4 text-sm text-primary/50">Nome</div>
          <p className="mt-1">
            {firstName || lastName
              ? (firstName ? firstName + ' ' : '') + lastName
              : 'Adicionar nome'}{' '}
          </p>

          <div className="mt-4 text-sm text-primary/50">Telefone</div>
          <p className="mt-1">{phoneNumber?.phoneNumber ?? 'N/A'}</p>

          <div className="mt-4 text-sm text-primary/50">E-mail</div>
          <p className="mt-1">{emailAddress?.emailAddress ?? 'N/A'}</p>
        </div>
      </div>
    </>
  );
}

/** @typedef {import('customer-accountapi.generated').CustomerDetailsFragment} CustomerDetailsFragment */
