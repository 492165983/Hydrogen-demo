import {json} from '@shopify/remix-oxygen';
import {useLoaderData} from '@remix-run/react';
import invariant from 'tiny-invariant';
import {getSeoMeta} from '@shopify/hydrogen';

import {routeHeaders} from '~/data/cache';
import {seoPayload} from '~/lib/seo.server';

export const headers = routeHeaders;

/**
 * @param {LoaderFunctionArgs}
 */
export async function loader({request, params, context}) {
  invariant(params.policyHandle, 'Missing policy handle');

  const policyName = params.policyHandle.replace(/-([a-z])/g, (_, m1) =>
    m1.toUpperCase(),
  );

  const data = await context.storefront.query(POLICY_CONTENT_QUERY, {
    variables: {
      privacyPolicy: false,
      shippingPolicy: false,
      termsOfService: false,
      refundPolicy: false,
      [policyName]: true,
      language: context.storefront.i18n.language,
    },
  });

  invariant(data, 'No data returned from Shopify API');
  const policy = data.shop?.[policyName];

  if (!policy) {
    throw new Response(null, {status: 404});
  }

  const seo = seoPayload.policy({policy, url: request.url});

  return json({policy, seo});
}

/**
 * @param {Class<loader>>}
 */
export const meta = ({matches}) => {
  return getSeoMeta(...matches.map((match) => match.data.seo));
};

export default function Policies() {
  /** @type {LoaderReturnData} */
  const {policy} = useLoaderData();

  return (
    <div className="mx-auto w-full max-w-[920px] px-4 py-10 md:py-14">
      <h1 className="text-center font-sans text-3xl font-extrabold tracking-tight text-primary md:text-4xl">
        {policy.title}
      </h1>
      <div className="mt-3 flex justify-center">
        <span className="h-1 w-12 rounded-full bg-[#e4002b]" />
      </div>
      <div
        dangerouslySetInnerHTML={{__html: policy.body}}
        className="policy-prose mt-10"
      />
    </div>
  );
}

const POLICY_CONTENT_QUERY = `#graphql
  fragment PolicyHandle on ShopPolicy {
    body
    handle
    id
    title
    url
  }

  query PoliciesHandle(
    $language: LanguageCode
    $privacyPolicy: Boolean!
    $shippingPolicy: Boolean!
    $termsOfService: Boolean!
    $refundPolicy: Boolean!
  ) @inContext(language: $language) {
    shop {
      privacyPolicy @include(if: $privacyPolicy) {
        ...PolicyHandle
      }
      shippingPolicy @include(if: $shippingPolicy) {
        ...PolicyHandle
      }
      termsOfService @include(if: $termsOfService) {
        ...PolicyHandle
      }
      refundPolicy @include(if: $refundPolicy) {
        ...PolicyHandle
      }
    }
  }
`;

/** @typedef {import('@shopify/remix-oxygen').MetaArgs} MetaArgs */
/** @typedef {import('@shopify/remix-oxygen').LoaderFunctionArgs} LoaderFunctionArgs */
/** @typedef {ReturnType<typeof useLoaderData<typeof loader>>} LoaderReturnData */
