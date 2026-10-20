import {CartForm} from '@shopify/hydrogen';

import {Button} from '~/components/Button';

/**
 * @param {{
 *   children: React.ReactNode;
 *   lines: Array<OptimisticCartLineInput>;
 *   className?: string;
 *   variant?: 'primary' | 'secondary' | 'inline';
 *   width?: 'auto' | 'full';
 *   disabled?: boolean;
 *   [key: string]: any;
 * }}
 */
export function AddToCartButton({
  children,
  lines,
  className = '',
  variant = 'primary',
  width = 'full',
  disabled,
  ...props
}) {
  return (
    <CartForm
      route="/cart"
      inputs={{
        lines,
      }}
      action={CartForm.ACTIONS.LinesAdd}
    >
      {(fetcher) => {
        // Shopify silently caps the quantity when stock is scarce; surface the
        // warning so "I added 3 but got 1" never looks like a broken cart.
        const warning = fetcher.data?.warnings?.[0]?.message;
        const error =
          fetcher.data?.userErrors?.[0]?.message ||
          fetcher.data?.errors?.[0]?.message;

        return (
          <>
            <Button
              as="button"
              type="submit"
              width={width}
              variant={variant}
              className={className}
              disabled={disabled ?? fetcher.state !== 'idle'}
              {...props}
            >
              {children}
            </Button>
            {(warning || error) && (
              <p
                role="status"
                className="mt-2 text-left text-xs font-medium leading-snug text-amber-700"
              >
                {warning || error}
              </p>
            )}
          </>
        );
      }}
    </CartForm>
  );
}

/** @typedef {import('@shopify/hydrogen').OptimisticCartLineInput} OptimisticCartLineInput */
/** @typedef {import('@remix-run/react').FetcherWithComponents} FetcherWithComponents */
