import {useMemo, useState} from 'react';
import {Disclosure, Menu} from '@headlessui/react';
import {
  Link,
  useLocation,
  useSearchParams,
  useNavigate,
} from '@remix-run/react';
import useDebounce from 'react-use/esm/useDebounce';

import {IconFilters, IconCaret, IconXMark, IconCheck} from '~/components/Icon';
export const FILTER_URL_PREFIX = 'filter.';

/**
 * Collection page layout in the style of hotwav.com:
 * top bar (Filters toggle + Sort by), left sidebar filters, product grid.
 *
 * @param {{
 *   filters?: any[];
 *   appliedFilters?: AppliedFilter[];
 *   colorValues?: ColorValue[];
 *   productTypes?: {label: string; value: string; count?: number}[];
 *   children: React.ReactNode;
 * }}
 */
export function SortFilter({
  appliedFilters = [],
  colorValues = [],
  productTypes = [],
  children,
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="w-full">
      {/* Top bar: filters toggle (mobile) + sort */}
      <div className="flex items-center justify-between border-b border-primary/10 pb-3 mb-6">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 text-sm md:pointer-events-none"
          aria-expanded={isOpen}
        >
          <IconFilters />
          <span>Filtros</span>
        </button>
        <SortMenu />
      </div>

      <div className="flex flex-col md:flex-row md:gap-8">
        {/* Sidebar */}
        <aside
          className={`${
            isOpen ? 'block' : 'hidden'
          } md:block w-full shrink-0 md:w-[230px] mb-6 md:mb-0`}
        >
          <div className="md:sticky md:top-24">
            {appliedFilters.length > 0 && (
              <div className="pb-4 mb-2 border-b border-primary/10">
                <AppliedFilters filters={appliedFilters} />
              </div>
            )}
            <AvailabilityFilter />
            <PriceFilter />
            {colorValues.length > 0 && <ColorFilter colorValues={colorValues} />}
            {productTypes.length > 0 && (
              <ProductTypeFilter productTypes={productTypes} />
            )}
          </div>
        </aside>

        {/* Grid */}
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
}

/** In-stock-only toggle switch. */
function AvailabilityFilter() {
  const [params] = useSearchParams();
  const location = useLocation();
  const active = params.get(`${FILTER_URL_PREFIX}available`) === 'true';

  const p = new URLSearchParams(params);
  if (active) {
    p.delete(`${FILTER_URL_PREFIX}available`);
  } else {
    p.set(`${FILTER_URL_PREFIX}available`, 'true');
  }
  p.delete('cursor');
  p.delete('direction');
  const to = `${location.pathname}?${p.toString()}`;

  return (
    <div className="flex items-center justify-between py-4 border-b border-primary/10">
      <Link to={to} prefetch="intent" className="text-sm">
        Apenas em estoque
      </Link>
      <Link
        to={to}
        prefetch="intent"
        role="switch"
        aria-checked={active}
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
          active ? 'bg-primary' : 'bg-primary/20'
        }`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
            active ? 'translate-x-[1.3rem]' : 'translate-x-[0.2rem]'
          }`}
        />
      </Link>
    </div>
  );
}

/** Collapsible price range (de / até inputs). */
function PriceFilter() {
  return (
    <Disclosure as="div" defaultOpen>
      {({open}) => (
        <>
          <Disclosure.Button className="flex items-center justify-between w-full py-4 border-b border-primary/10 text-sm">
            <span>Preço</span>
            <IconCaret direction={open ? 'up' : 'down'} />
          </Disclosure.Button>
          <Disclosure.Panel className="py-4 border-b border-primary/10">
            <PriceRangeFilter />
          </Disclosure.Panel>
        </>
      )}
    </Disclosure>
  );
}

/** Collapsible color swatch list. */
function ColorFilter({colorValues}) {
  return (
    <Disclosure as="div" defaultOpen>
      {({open}) => (
        <>
          <Disclosure.Button className="flex items-center justify-between w-full py-4 border-b border-primary/10 text-sm">
            <span>Cor</span>
            <IconCaret direction={open ? 'up' : 'down'} />
          </Disclosure.Button>
          <Disclosure.Panel className="py-4 border-b border-primary/10">
            <ul className="space-y-2.5">
              {colorValues.map((cv) => (
                <li key={`${cv.name}-${cv.value}`}>
                  <ColorLink colorValue={cv} />
                </li>
              ))}
            </ul>
          </Disclosure.Panel>
        </>
      )}
    </Disclosure>
  );
}

// Fallback swatch colors when the admin hasn't set option-value swatches.
const COLOR_FALLBACKS = {
  preto: '#111111',
  black: '#111111',
  branco: '#ffffff',
  white: '#ffffff',
  prata: '#c0c0c0',
  silver: '#c0c0c0',
  cinza: '#808080',
  gray: '#808080',
  grey: '#808080',
  laranja: '#ff8a00',
  orange: '#ff8a00',
  azul: '#1e6fd9',
  blue: '#1e6fd9',
  verde: '#2e9e4f',
  green: '#2e9e4f',
  vermelho: '#e02020',
  red: '#e02020',
  vermelha: '#e02020',
  ouro: '#d4af37',
  gold: '#d4af37',
  dourado: '#d4af37',
  roxo: '#7c3aed',
  purple: '#7c3aed',
  rosa: '#ff7bac',
  pink: '#ff7bac',
  bronze: '#a97142',
  ciano: '#00bcd4',
  cyan: '#00bcd4',
  amarelo: '#f5d327',
  yellow: '#f5d327',
  marrom: '#8b5a2b',
  brown: '#8b5a2b',
  titânio: '#8f8f8f',
  titanium: '#8f8f8f',
};

/**
 * @param {{colorValue: ColorValue}}
 */
function swatchColor(colorValue) {
  if (colorValue.swatch) return colorValue.swatch;
  const key = colorValue.label
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[-_\s]?\d+$/, '');
  return COLOR_FALLBACKS[key] ?? 'transparent';
}

/**
 * @param {{colorValue: ColorValue}}
 */
function ColorLink({colorValue}) {
  const [params] = useSearchParams();
  const location = useLocation();
  const active = params
    .getAll(`${FILTER_URL_PREFIX}variantOption`)
    .some((raw) => {
      try {
        const v = JSON.parse(raw);
        return v?.value === colorValue.value;
      } catch {
        return false;
      }
    });

  const p = new URLSearchParams(params);
  const encoded = JSON.stringify({
    name: colorValue.name,
    value: colorValue.value,
  });
  if (active) {
    p.delete(`${FILTER_URL_PREFIX}variantOption`, encoded);
  } else {
    p.append(`${FILTER_URL_PREFIX}variantOption`, encoded);
  }
  p.delete('cursor');
  p.delete('direction');
  const to = `${location.pathname}?${p.toString()}`;

  return (
    <Link
      to={to}
      prefetch="intent"
      className={`flex items-center gap-2.5 text-sm ${active ? 'font-bold' : ''}`}
    >
      <span
        className="h-[18px] w-[18px] rounded-full border border-primary/20 shrink-0"
        style={{backgroundColor: swatchColor(colorValue)}}
      />
      <span className="capitalize">{colorValue.label}</span>
      {active && (
        <span className="text-primary/60">
          <IconCheck />
        </span>
      )}
    </Link>
  );
}

/** Collapsible product-type list (Smartphones / Rugged Phones / Rugged Tablets). */
function ProductTypeFilter({productTypes}) {
  return (
    <Disclosure as="div" defaultOpen>
      {({open}) => (
        <>
          <Disclosure.Button className="flex items-center justify-between w-full py-4 border-b border-primary/10 text-sm">
            <span>Tipo de produto</span>
            <IconCaret direction={open ? 'up' : 'down'} />
          </Disclosure.Button>
          <Disclosure.Panel className="py-4 border-b border-primary/10">
            <ul className="space-y-2.5">
              {productTypes.map((pt) => (
                <li key={pt.value}>
                  <ProductTypeLink productType={pt} />
                </li>
              ))}
            </ul>
          </Disclosure.Panel>
        </>
      )}
    </Disclosure>
  );
}

/**
 * @param {{productType: {label: string; value: string; count?: number}}}
 */
function ProductTypeLink({productType}) {
  const [params] = useSearchParams();
  const location = useLocation();
  const active =
    params.get(`${FILTER_URL_PREFIX}productType`) ===
    JSON.stringify(productType.value);

  const p = new URLSearchParams(params);
  const encoded = JSON.stringify(productType.value);
  if (active) {
    p.delete(`${FILTER_URL_PREFIX}productType`, encoded);
  } else {
    p.set(`${FILTER_URL_PREFIX}productType`, encoded);
  }
  p.delete('cursor');
  p.delete('direction');
  const to = `${location.pathname}?${p.toString()}`;

  return (
    <Link
      to={to}
      prefetch="intent"
      className={`flex items-center justify-between text-sm ${
        active ? 'font-bold' : ''
      }`}
    >
      <span>{productType.label}</span>
      {typeof productType.count === 'number' && (
        <span className="text-primary/40 text-xs">{productType.count}</span>
      )}
    </Link>
  );
}

/**
 * @param {{filters: AppliedFilter[]}}
 */
function AppliedFilters({filters = []}) {
  const [params] = useSearchParams();
  const location = useLocation();
  return (
    <div className="flex flex-wrap gap-2">
      {filters.map((filter) => (
        <Link
          to={getAppliedFilterLink(filter, params, location)}
          className="flex items-center gap-1 px-2.5 py-1 border border-primary/20 rounded-full text-xs"
          key={`${filter.label}-${JSON.stringify(filter.filter)}`}
        >
          <span>{filter.label}</span>
          <span>
            <IconXMark />
          </span>
        </Link>
      ))}
    </div>
  );
}

/**
 * @param {AppliedFilter} filter
 * @param {URLSearchParams} params
 * @param {Location} location
 */
function getAppliedFilterLink(filter, params, location) {
  const paramsClone = new URLSearchParams(params);
  Object.entries(filter.filter).forEach(([key, value]) => {
    const fullKey = FILTER_URL_PREFIX + key;
    if (key === 'variantOption') {
      // multiple color filters may coexist — remove the matching one
      paramsClone.delete(fullKey, JSON.stringify(value));
    } else {
      paramsClone.delete(fullKey);
    }
  });
  paramsClone.delete('cursor');
  paramsClone.delete('direction');
  return `${location.pathname}?${paramsClone.toString()}`;
}

/**
 * @param {SortParam} sort
 * @param {URLSearchParams} params
 * @param {Location} location
 */
function getSortLink(sort, params, location) {
  params.set('sort', sort);
  params.delete('cursor');
  params.delete('direction');
  return `${location.pathname}?${params.toString()}`;
}

const PRICE_RANGE_FILTER_DEBOUNCE = 500;

function PriceRangeFilter() {
  const location = useLocation();
  const params = useMemo(
    () => new URLSearchParams(location.search),
    [location.search],
  );
  const navigate = useNavigate();

  const priceParam = params.get(`${FILTER_URL_PREFIX}price`);
  // Malformed params must never crash the render — ignore and clean up below.
  let price;
  try {
    price = priceParam ? JSON.parse(priceParam) : undefined;
  } catch {
    price = undefined;
  }
  const min = Number.isNaN(Number(price?.min)) ? undefined : Number(price?.min);
  const max = Number.isNaN(Number(price?.max)) ? undefined : Number(price?.max);

  const [minPrice, setMinPrice] = useState(min);
  const [maxPrice, setMaxPrice] = useState(max);

  useDebounce(
    () => {
      if (minPrice === undefined && maxPrice === undefined) {
        params.delete(`${FILTER_URL_PREFIX}price`);
      } else {
        const value = {
          ...(minPrice === undefined ? {} : {min: minPrice}),
          ...(maxPrice === undefined ? {} : {max: maxPrice}),
        };
        params.set(`${FILTER_URL_PREFIX}price`, JSON.stringify(value));
      }
      params.delete('cursor');
      params.delete('direction');
      navigate(`${location.pathname}?${params.toString()}`);
    },
    PRICE_RANGE_FILTER_DEBOUNCE,
    [minPrice, maxPrice],
  );

  const onChangeMax = (event) => {
    const value = event.target.value;
    setMaxPrice(
      Number.isNaN(parseFloat(value)) ? undefined : parseFloat(value),
    );
  };

  const onChangeMin = (event) => {
    const value = event.target.value;
    setMinPrice(
      Number.isNaN(parseFloat(value)) ? undefined : parseFloat(value),
    );
  };

  return (
    <div className="flex items-center gap-2">
      <label className="flex-1">
        <input
          name="minPrice"
          className="w-full px-3 py-2 border border-primary/20 rounded text-sm"
          type="number"
          value={minPrice ?? ''}
          placeholder="R$ mín"
          onChange={onChangeMin}
        />
      </label>
      <span className="text-primary/40">–</span>
      <label className="flex-1">
        <input
          name="maxPrice"
          className="w-full px-3 py-2 border border-primary/20 rounded text-sm"
          type="number"
          value={maxPrice ?? ''}
          placeholder="R$ máx"
          onChange={onChangeMax}
        />
      </label>
    </div>
  );
}

export default function SortMenu() {
  const items = [
    {label: 'Destaques', key: 'featured'},
    {
      label: 'Preço: do menor ao maior',
      key: 'price-low-high',
    },
    {
      label: 'Preço: do maior ao menor',
      key: 'price-high-low',
    },
    {
      label: 'Mais vendidos',
      key: 'best-selling',
    },
    {
      label: 'Mais recentes',
      key: 'newest',
    },
  ];
  const [params] = useSearchParams();
  const location = useLocation();
  const activeItem = items.find((item) => item.key === params.get('sort'));

  return (
    <Menu as="div" className="relative z-40">
      <Menu.Button className="flex items-center text-sm">
        <span className="font-medium">Ordenar por:</span>
        <span className="mx-1.5">{(activeItem || items[0]).label}</span>
        <IconCaret />
      </Menu.Button>

      <Menu.Items
        as="nav"
        className="absolute right-0 flex flex-col p-4 text-right rounded-sm bg-contrast shadow-lg border border-primary/10"
      >
        {items.map((item) => (
          <Menu.Item key={item.label}>
            {() => (
              <Link
                className={`block text-sm pb-2 px-3 whitespace-nowrap ${
                  activeItem?.key === item.key ? 'font-bold' : 'font-normal'
                }`}
                to={getSortLink(item.key, params, location)}
              >
                {item.label}
              </Link>
            )}
          </Menu.Item>
        ))}
      </Menu.Items>
    </Menu>
  );
}

/**
 * @typedef {{
 *   label: string;
 *   filter: ProductFilter;
 * }} AppliedFilter
 */
/**
 * @typedef {{
 *   name: string;
 *   label: string;
 *   value: string;
 *   swatch?: string | null;
 *   count?: number;
 * }} ColorValue
 */
/**
 * @typedef {| 'price-low-high'
 *   | 'price-high-low'
 *   | 'best-selling'
 *   | 'newest'
 *   | 'featured'} SortParam
 */
/** @typedef {import('@shopify/hydrogen/storefront-api-types').ProductFilter} ProductFilter */
/** @typedef {import('@remix-run/react').Location} Location */
