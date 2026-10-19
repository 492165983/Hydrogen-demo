import {useParams, Form, Await, useRouteLoaderData} from '@remix-run/react';
import useWindowScroll from 'react-use/esm/useWindowScroll';
import {Disclosure} from '@headlessui/react';
import {Suspense, useEffect, useMemo} from 'react';
import {CartForm} from '@shopify/hydrogen';
import {Text, Heading, Section} from '~/components/Text';
import {Link} from '~/components/Link';
import {Cart} from '~/components/Cart';
import {CartLoading} from '~/components/CartLoading';
import {Input} from '~/components/Input';
import {Drawer, useDrawer} from '~/components/Drawer';
import {
  IconMenu,
  IconCaret,
  IconLogin,
  IconAccount,
  IconBag,
  IconSearch,
} from '~/components/Icon';
import {useIsHomePath} from '~/lib/utils';
import {useIsHydrated} from '~/hooks/useIsHydrated';
import {useCartFetchers} from '~/hooks/useCartFetchers';

/**
 * @param {LayoutProps}
 */
export function PageLayout({children, layout}) {
  const {headerMenu} = layout || {};
  return (
    <>
      <div className="flex flex-col min-h-screen">
        <div className="">
          <a href="#mainContent" className="sr-only">
            Ir para o conteúdo
          </a>
        </div>
        {headerMenu && layout?.shop.name && (
          <Header
            title={layout.shop.name}
            menu={headerMenu}
            logo={layout.shop.brand?.logo}
          />
        )}
        <main role="main" id="mainContent" className="flex-grow">
          {children}
        </main>
      </div>
      {layout?.shop && <Footer shop={layout.shop} />}
    </>
  );
}

/**
 * @param {{
 *   title: string;
 *   menu?: EnhancedMenu;
 *   logo?: ShopLogoData | null;
 * }}
 */
function Header({title, menu, logo}) {
  const isHome = useIsHomePath();

  const {
    isOpen: isCartOpen,
    openDrawer: openCart,
    closeDrawer: closeCart,
  } = useDrawer();

  const {
    isOpen: isMenuOpen,
    openDrawer: openMenu,
    closeDrawer: closeMenu,
  } = useDrawer();

  const addToCartFetchers = useCartFetchers(CartForm.ACTIONS.LinesAdd);

  // toggle cart drawer when adding to cart
  useEffect(() => {
    if (isCartOpen || !addToCartFetchers.length) return;
    openCart();
  }, [addToCartFetchers, isCartOpen, openCart]);

  return (
    <>
      <CartDrawer isOpen={isCartOpen} onClose={closeCart} />
      {menu && (
        <MenuDrawer isOpen={isMenuOpen} onClose={closeMenu} menu={menu} />
      )}
      <DesktopHeader
        isHome={isHome}
        title={title}
        menu={menu}
        logo={logo}
        openCart={openCart}
      />
      <MobileHeader
        isHome={isHome}
        title={title}
        logo={logo}
        openCart={openCart}
        openMenu={openMenu}
      />
    </>
  );
}

/**
 * The shop logo uploaded in Shopify admin (Settings → Brand → Logo), falling
 * back to the shop name as a wordmark when none is uploaded. Uploading or
 * replacing the logo in the admin updates the header with no code changes.
 *
 * The admin's own alt text is ignored on purpose: it is free-form and often
 * filler. A header logo should announce the brand name.
 *
 * @param {{
 *   logo?: ShopLogoData | null;
 *   title: string;
 *   className?: string;
 * }}
 */
function ShopLogo({logo, title, className = 'h-8 w-auto object-contain'}) {
  const url = logo?.image?.url;

  if (!url) {
    return (
      <span className="whitespace-nowrap text-xl font-extrabold tracking-tight md:text-[23px]">
        {title}
      </span>
    );
  }

  // Rendered at ~40px tall on desktop; one 240px rendition stays crisp up to
  // a 3x display without shipping a srcset roundtrip.
  return (
    <img
      src={cdnWidth(url, 240)}
      alt={title}
      loading="eager"
      decoding="async"
      className={className}
    />
  );
}

/**
 * Append a Shopify CDN width parameter, preserving any existing query args.
 * @param {string} url
 * @param {number} width
 */
function cdnWidth(url, width) {
  return `${url}${url.includes('?') ? '&' : '?'}width=${width}`;
}

/**
 * @param {{isOpen: boolean; onClose: () => void}}
 */
function CartDrawer({isOpen, onClose}) {
  const rootData = useRouteLoaderData('root');
  if (!rootData) return null;

  return (
    <Drawer open={isOpen} onClose={onClose} heading="Carrinho" openFrom="right">
      <div className="grid">
        <Suspense fallback={<CartLoading />}>
          <Await resolve={rootData?.cart}>
            {(cart) => <Cart layout="drawer" onClose={onClose} cart={cart} />}
          </Await>
        </Suspense>
      </div>
    </Drawer>
  );
}

/**
 * @param {{
 *   isOpen: boolean;
 *   onClose: () => void;
 *   menu: EnhancedMenu;
 * }}
 */
export function MenuDrawer({isOpen, onClose, menu}) {
  return (
    <Drawer open={isOpen} onClose={onClose} openFrom="left" heading="Menu">
      <div className="grid">
        <MenuMobileNav menu={menu} onClose={onClose} />
      </div>
    </Drawer>
  );
}

/**
 * @param {{
 *   menu: EnhancedMenu;
 *   onClose: () => void;
 * }}
 */
function MenuMobileNav({menu, onClose}) {
  return (
    <nav className="grid gap-4 p-6 sm:gap-6 sm:px-12 sm:py-8">
      {/* Top level menu items */}
      {(menu?.items || []).map((item) => (
        <span key={item.id} className="block">
          <Link
            to={item.to}
            target={item.target}
            onClick={onClose}
            className={({isActive}) =>
              isActive ? 'pb-1 border-b -mb-px' : 'pb-1'
            }
          >
            <Text as="span" size="copy">
              {item.title}
            </Text>
          </Link>
        </span>
      ))}
    </nav>
  );
}

/**
 * @param {{
 *   title: string;
 *   isHome: boolean;
 *   logo?: ShopLogoData | null;
 *   openCart: () => void;
 *   openMenu: () => void;
 * }}
 */
function MobileHeader({title, isHome, logo, openCart, openMenu}) {
  // useHeaderStyleFix(containerStyle, setContainerStyle, isHome);

  const params = useParams();

  return (
    <header
      role="banner"
      className="sticky top-0 z-40 flex h-[60px] w-full items-center justify-between gap-4 border-b border-black/[0.07] bg-white/95 px-4 leading-none backdrop-blur-md transition-shadow duration-300 md:px-8 lg:hidden"
    >
      <div className="flex w-full items-center justify-start gap-1">
        <button
          onClick={openMenu}
          aria-label="Abrir menu"
          className="relative flex h-10 w-10 items-center justify-center rounded-full text-neutral-900 transition hover:bg-neutral-100"
        >
          <IconMenu />
        </button>
        <Form
          method="get"
          action={params.locale ? `/${params.locale}/search` : '/search'}
          className="flex items-center gap-2"
        >
          <button
            type="submit"
            aria-label="Buscar"
            className="relative flex h-10 w-10 items-center justify-center rounded-full text-neutral-900 transition hover:bg-neutral-100"
          >
            <IconSearch />
          </button>
          <Input
            className="hidden focus:border-neutral-900/30"
            type="search"
            variant="minisearch"
            placeholder="Buscar"
            name="q"
          />
        </Form>
      </div>

      <Link
        className="flex h-full flex-grow items-center justify-center self-stretch"
        to="/"
        prefetch="intent"
      >
        <Heading className="text-center leading-none" as={isHome ? 'h1' : 'h2'}>
          <ShopLogo
            logo={logo}
            title={title}
            className="h-15 w-auto object-contain"
          />
        </Heading>
      </Link>

      <div className="flex w-full items-center justify-end gap-1">
        <AccountLink className="relative flex h-10 w-10 items-center justify-center rounded-full text-neutral-900 transition hover:bg-neutral-100" />
        <CartCount isHome={false} openCart={openCart} />
      </div>
    </header>
  );
}

/**
 * Desktop header: logo (left) / nav (center) / actions (right).
 * @param {{
 *   isHome: boolean;
 *   openCart: () => void;
 *   menu?: EnhancedMenu;
 *   title: string;
 *   logo?: ShopLogoData | null;
 * }}
 */
function DesktopHeader({isHome, menu, openCart, title, logo}) {
  const params = useParams();
  const {y} = useWindowScroll();
  return (
    <header
      role="banner"
      className={`sticky top-0 z-40 hidden h-[76px] w-full items-center justify-between gap-8 border-b border-black/[0.07] bg-white/95 px-10 leading-none backdrop-blur-md transition-shadow duration-300 lg:flex xl:px-14 ${
        y > 8 ? 'shadow-[0_8px_28px_-16px_rgba(0,0,0,0.25)]' : ''
      }`}
    >
      {/* Left: shop logo (Shopify admin → Settings → Brand) */}
      <div className="flex flex-1 items-center justify-start">
        <Link
          to="/"
          prefetch="intent"
          aria-label={title}
          className="flex items-center text-neutral-900 transition-opacity hover:opacity-80"
        >
          <ShopLogo
            logo={logo}
            title={title}
            className="h-11 w-auto object-contain"
          />
        </Link>
      </div>

      {/* Center: top level menu items */}
      <nav className="flex flex-none items-center gap-9">
        {(menu?.items || []).map((item) => (
          <Link
            key={item.id}
            to={item.to}
            target={item.target}
            prefetch="intent"
            className={({isActive}) =>
              [
                'relative py-1 text-[15px] font-semibold tracking-tight transition-colors',
                isActive
                  ? 'text-[#e4002b]'
                  : 'text-neutral-900 hover:text-[#e4002b]',
              ].join(' ')
            }
          >
            {item.title}
          </Link>
        ))}
      </nav>

      {/* Right: search / account / cart */}
      <div className="flex flex-1 items-center justify-end gap-2">
        <Form
          method="get"
          action={params.locale ? `/${params.locale}/search` : '/search'}
          className="flex items-center gap-1 rounded-full bg-neutral-100 py-1 pl-4 pr-1 transition-colors focus-within:bg-neutral-200/80"
        >
          <Input
            className="w-36 border-transparent bg-transparent text-[13px] text-neutral-900 placeholder:opacity-100 placeholder:text-neutral-400 focus:border-transparent xl:w-44"
            type="search"
            variant="minisearch"
            placeholder="Buscar"
            name="q"
          />
          <button
            type="submit"
            aria-label="Buscar"
            className="relative flex h-8 w-8 items-center justify-center rounded-full text-neutral-700 transition hover:bg-white hover:text-[#e4002b]"
          >
            <IconSearch />
          </button>
        </Form>
        <AccountLink className="relative flex h-10 w-10 items-center justify-center rounded-full text-neutral-900 transition hover:bg-neutral-100 hover:text-[#e4002b]" />
        <CartCount isHome={false} openCart={openCart} />
      </div>
    </header>
  );
}

/**
 * @param {{className?: string}}
 */
function AccountLink({className}) {
  const rootData = useRouteLoaderData('root');
  const isLoggedIn = rootData?.isLoggedIn;

  return (
    <Link to="/account" className={className}>
      <Suspense fallback={<IconLogin />}>
        <Await resolve={isLoggedIn} errorElement={<IconLogin />}>
          {(isLoggedIn) => (isLoggedIn ? <IconAccount /> : <IconLogin />)}
        </Await>
      </Suspense>
    </Link>
  );
}

/**
 * @param {{
 *   isHome: boolean;
 *   openCart: () => void;
 * }}
 */
function CartCount({isHome, openCart}) {
  const rootData = useRouteLoaderData('root');
  if (!rootData) return null;

  return (
    <Suspense fallback={<Badge count={0} dark={isHome} openCart={openCart} />}>
      <Await resolve={rootData?.cart}>
        {(cart) => (
          <Badge
            dark={isHome}
            openCart={openCart}
            count={cart?.totalQuantity || 0}
          />
        )}
      </Await>
    </Suspense>
  );
}

/**
 * @param {{
 *   count: number;
 *   dark: boolean;
 *   openCart: () => void;
 * }}
 */
function Badge({openCart, dark, count}) {
  const isHydrated = useIsHydrated();

  const BadgeCounter = useMemo(
    () => (
      <>
        <IconBag />
        <div
          className={`${
            dark
              ? 'text-primary bg-contrast dark:text-contrast dark:bg-primary'
              : 'text-contrast bg-primary'
          } absolute bottom-1 right-1 text-[0.625rem] font-medium subpixel-antialiased h-3 min-w-[0.75rem] flex items-center justify-center leading-none text-center rounded-full w-auto px-[0.125rem] pb-px`}
        >
          <span>{count || 0}</span>
        </div>
      </>
    ),
    [count, dark],
  );

  return isHydrated ? (
    <button
      onClick={openCart}
      className="relative flex items-center justify-center w-8 h-8 focus:ring-primary/5"
    >
      {BadgeCounter}
    </button>
  ) : (
    <Link
      to="/cart"
      className="relative flex items-center justify-center w-8 h-8 focus:ring-primary/5"
    >
      {BadgeCounter}
    </Link>
  );
}

/**
 * Store footer in the style of hotwav.com, upgraded: brand column with
 * social links, "Loja" (catalog) column, "Termos e Políticas" column,
 * bottom bar with copyright + payment badges.
 *
 * @param {{shop?: {name?: string; description?: string; brand?: ShopLogoData | null;
 *   privacyPolicy?: {handle: string; title: string} | null;
 *   shippingPolicy?: {handle: string; title: string} | null;
 *   refundPolicy?: {handle: string; title: string} | null;
 *   termsOfService?: {handle: string; title: string} | null;} | null}}
 */
function Footer({shop}) {
  const shopName = shop?.name || 'HOTWAV Brasil';

  const shopLinks = [
    {title: 'SmartPhones', to: '/collections/smartphones-smartphones'},
    {title: 'Rugged Phones', to: '/collections/rugged-phone'},
    {title: 'Rugged Tablets', to: '/collections/rugged-tablet'},
    {title: 'Todos os Produtos', to: '/products'},
  ];

  const policyLinks = [
    shop?.privacyPolicy && {
      title: 'Política de Privacidade',
      to: `/policies/${shop.privacyPolicy.handle}`,
    },
    shop?.refundPolicy && {
      title: 'Devolução e Reembolso',
      to: `/policies/${shop.refundPolicy.handle}`,
    },
    shop?.shippingPolicy && {
      title: 'Política de Envio',
      to: `/policies/${shop.shippingPolicy.handle}`,
    },
    shop?.termsOfService && {
      title: 'Termos de Serviço',
      to: `/policies/${shop.termsOfService.handle}`,
    },
  ].filter(Boolean);

  const socials = [
    {name: 'Facebook', href: 'https://www.facebook.com/HOTWAV.OFFICIAL/', icon: IconFacebook},
    {name: 'Instagram', href: 'https://www.instagram.com/hotwav_official/', icon: IconInstagram},
    {name: 'YouTube', href: 'https://www.youtube.com/c/HOTWAVOfficial', icon: IconYoutube},
    {name: 'TikTok', href: 'https://www.tiktok.com/@hotwav_official', icon: IconTiktok},
    {name: 'X', href: 'https://twitter.com/Hotwav_official', icon: IconXSocial},
  ];

  const payments = ['VISA', 'Mastercard', 'Pix', 'Boleto', 'PayPal'];

  const columnClasses =
    'grid gap-2 pb-6 text-sm text-contrast/70 [&_a]:transition-colors [&_a:hover]:text-contrast';

  return (
    <footer
      role="contentinfo"
      className="w-full bg-primary text-contrast overflow-hidden"
    >
      {/* brand accent line */}
      <div className="h-0.5 w-full bg-gradient-to-r from-[#e4002b] via-[#e4002b]/40 to-transparent" />

      <div className="mx-auto w-full max-w-[1440px] px-6 py-12 md:px-8 lg:px-12">
        <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr] md:gap-8">
          {/* Brand */}
          <div className="grid content-start gap-4">
            <Link to="/" prefetch="intent" className="inline-flex w-fit">
              <ShopLogo
                logo={shop?.brand?.logo}
                title={shopName}
                className="h-9 w-auto object-contain"
              />
            </Link>
            <p className="max-w-xs text-sm leading-relaxed text-contrast/60">
              Smartphones robustos, tablets resistentes e tecnologia que
              acompanha o seu ritmo — com garantia estendida e frete para todo
              o Brasil.
            </p>
            <div className="flex items-center gap-2.5 pt-1">
              {socials.map(({name, href, icon: Icon}) => (
                <a
                  key={name}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={name}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-contrast/20 text-contrast/80 transition-colors hover:border-contrast/60 hover:text-contrast"
                >
                  <Icon />
                </a>
              ))}
            </div>
          </div>

          {/* Loja */}
          <Disclosure as="div" className="w-full">
            {({open}) => (
              <>
                <Disclosure.Button className="text-left md:cursor-default md:pointer-events-none w-full">
                  <Heading
                    className="flex items-center justify-between pb-3 md:pb-4"
                    size="lead"
                    as="h3"
                  >
                    Loja
                    <span className="md:hidden">
                      <IconCaret direction={open ? 'up' : 'down'} />
                    </span>
                  </Heading>
                </Disclosure.Button>
                <div
                  className={`${open ? 'max-h-56' : 'max-h-0 md:max-h-full'} overflow-hidden transition-all duration-300`}
                >
                  <nav className={columnClasses}>
                    {shopLinks.map((item) => (
                      <Link
                        key={item.title}
                        to={item.to}
                        prefetch="intent"
                        className="w-fit"
                      >
                        {item.title}
                      </Link>
                    ))}
                  </nav>
                </div>
              </>
            )}
          </Disclosure>

          {/* Termos e Políticas */}
          <Disclosure as="div" className="w-full">
            {({open}) => (
              <>
                <Disclosure.Button className="text-left md:cursor-default md:pointer-events-none w-full">
                  <Heading
                    className="flex items-center justify-between pb-3 md:pb-4"
                    size="lead"
                    as="h3"
                  >
                    Termos e Políticas
                    <span className="md:hidden">
                      <IconCaret direction={open ? 'up' : 'down'} />
                    </span>
                  </Heading>
                </Disclosure.Button>
                <div
                  className={`${open ? 'max-h-56' : 'max-h-0 md:max-h-full'} overflow-hidden transition-all duration-300`}
                >
                  <nav className={columnClasses}>
                    {policyLinks.map((item) => (
                      <Link
                        key={item.title}
                        to={item.to}
                        prefetch="intent"
                        className="w-fit"
                      >
                        {item.title}
                      </Link>
                    ))}
                  </nav>
                </div>
              </>
            )}
          </Disclosure>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-contrast/10 pt-6 md:flex-row">
          <p className="text-xs text-contrast/50">
            &copy; {new Date().getFullYear()} {shopName}. Powered by Shopify.
          </p>
          <div className="flex items-center gap-2">
            {payments.map((name) => (
              <span
                key={name}
                className="rounded bg-contrast/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-contrast/80"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ---- Footer inline SVG icons (social) ---- */

function IconFacebook() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
      <path d="M13.5 21v-7.8h2.62l.39-3.04H13.5V8.22c0-.88.24-1.48 1.5-1.48h1.6V4.05c-.28-.04-1.23-.12-2.34-.12-2.31 0-3.9 1.41-3.9 4v2.23H7.75v3.04h2.61V21h3.14Z" />
    </svg>
  );
}

function IconInstagram() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true">
      <rect x="3.2" y="3.2" width="17.6" height="17.6" rx="4.8" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconYoutube() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
      <path d="M21.6 7.2a2.5 2.5 0 0 0-1.76-1.77C18.28 5 12 5 12 5s-6.28 0-7.84.43A2.5 2.5 0 0 0 2.4 7.2 26 26 0 0 0 2 12a26 26 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.76 1.77C5.72 19 12 19 12 19s6.28 0 7.84-.43a2.5 2.5 0 0 0 1.76-1.77A26 26 0 0 0 22 12a26 26 0 0 0-.4-4.8ZM10 15.2V8.8l5.2 3.2L10 15.2Z" />
    </svg>
  );
}

function IconTiktok() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
      <path d="M16.6 4c.36 1.98 1.63 3.26 3.65 3.4v2.63c-1.26.12-2.36-.26-3.65-1.09v5.4c0 4.05-3.4 5.94-6.1 4.83-2.77-1.14-3.5-4.6-1.63-6.6 1.06-1.15 2.62-1.6 4.18-1.3v2.72c-.63-.18-1.2-.2-1.72.1a1.86 1.86 0 0 0-.94 1.72c.1 1.6 1.86 2.28 3.02 1.42.6-.44.86-1.12.86-1.96V4h2.33Z" />
    </svg>
  );
}

function IconXSocial() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
      <path d="M17.75 4h2.67l-5.83 6.66L21.5 20h-5.4l-4.23-5.53L6.94 20H4.26l6.24-7.13L3.8 4h5.53l3.82 5.05L17.75 4Zm-.94 14.36h1.48L8.6 5.55H7.01l9.8 12.81Z" />
    </svg>
  );
}

/**
 * @typedef {{
 *   children: React.ReactNode;
 *   layout?: LayoutQuery & {
 *     headerMenu?: EnhancedMenu | null;
 *     footerMenu?: EnhancedMenu | null;
 *   };
 * }} LayoutProps
 */

/** @typedef {import('storefrontapi.generated').LayoutQuery} LayoutQuery */
/**
 * `shop.brand.logo` as returned by LAYOUT_QUERY (app/root.jsx).
 * @typedef {{
 *   image?: {url?: string; altText?: string; width?: number; height?: number} | null;
 * }} ShopLogoData
 */
/** @typedef {import('~/lib/utils').EnhancedMenu} EnhancedMenu */
/** @typedef {import('~/lib/utils').ChildEnhancedMenuItem} ChildEnhancedMenuItem */
/** @typedef {import('~/root').RootLoader} RootLoader */
