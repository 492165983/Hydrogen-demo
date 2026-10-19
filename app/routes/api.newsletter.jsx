import {json} from '@shopify/remix-oxygen';

/**
 * Newsletter signup endpoint (POST /api/newsletter).
 *
 * New Customer Accounts disables Shopify's classic `/contact` customer form
 * (it answers 403 for headless stores), so subscribers are created through the
 * Storefront API with `acceptsMarketing: true` — that flags them as subscribed
 * in the admin (Clientes → aceita marketing) and is idempotent for repeat
 * signups (an existing address counts as success).
 */
const NEWSLETTER_SUBSCRIBE = `#graphql
  mutation newsletterSubscribe($input: CustomerCreateInput!) {
    customerCreate(input: $input) {
      customer {
        id
        email
        acceptsMarketing
      }
      customerUserErrors {
        code
        message
      }
    }
  }
`;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function randomPassword() {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  // Base64-ish, guaranteed to contain letters, digits and symbols.
  return `Nl-${Array.from(bytes, (b) => b.toString(36)).join('').slice(0, 24)}-9a`;
}

/** @param {import('@shopify/remix-oxygen').ActionFunctionArgs} args */
export async function action({request, context}) {
  if (request.method !== 'POST') {
    return json({ok: false, error: 'method_not_allowed'}, {status: 405});
  }

  const form = await request.formData();

  // Honeypot: bots fill every field they see.
  if (form.get('company')) {
    return json({ok: true});
  }

  const email = String(form.get('email') ?? '')
    .trim()
    .toLowerCase();

  if (!EMAIL_RE.test(email)) {
    return json({ok: false, error: 'invalid_email'}, {status: 400});
  }

  let result;
  try {
    result = await context.storefront.mutate(NEWSLETTER_SUBSCRIBE, {
      variables: {
        input: {
          email,
          password: randomPassword(),
          acceptsMarketing: true,
        },
      },
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[Newsletter] subscribe failed', error);
    return json({ok: false, error: 'server_error'}, {status: 500});
  }

  const errors = result?.customerCreate?.customerUserErrors ?? [];
  const alreadySubscribed = errors.some(
    (error) => error.code === 'TAKEN' || /already/i.test(error.message ?? ''),
  );

  if (result?.customerCreate?.customer || alreadySubscribed) {
    return json({ok: true});
  }

  // eslint-disable-next-line no-console
  console.error('[Newsletter] customerCreate errors', errors);

  return json({ok: false, error: 'subscribe_failed'}, {status: 400});
}
