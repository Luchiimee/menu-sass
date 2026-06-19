'use client';

import { useState, useEffect, Suspense } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Loader2, Lock, Check, Crown, Coffee, Utensils, Search, ShoppingBag, Zap, X, Heart, Sparkles, ArrowRight, Store, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { CartProvider } from '@/context/CartContext';
import ClassicDelivery from '@/components/templates/ClassicDelivery';
import UrbanoDark from '@/components/templates/UrbanoDark';
import MinimalWhite from '@/components/templates/MinimalWhite';
import VisualGrid from '@/components/templates/VisualGrid';
import SpotlightHero from '@/components/templates/SpotlightHero';
import HeladeriaSoft from '@/components/templates/HeladeriaSoft';
import MarketProTemplate from '@/components/templates/MarketProTemplate';
import AlternaPro from '@/components/templates/AlternaPro';
import Carta from '@/components/templates/Carta';

// --- 1. AGREGAMOS ESTO: COLORES POR DEFECTO PARA EL RESET ---
const TEMPLATE_DEFAULTS: any = {
classic: { 
    theme: '#d32f2f', 
    bg: '#ffffff', 
    card: '#ffffff', 
    text: '#ffffff', 
    desc: '#ffffff', 
    card_name: '#000000',
    card_desc: '#666666',
    card_price: '#d32f2f',
    btn_bg: '#ffffff',
    btn_text: '#000000',
    promo: '#ffebee', 
    promo_text: '#d32f2f',
    banner: false 
  },
 
  urban: { 
    theme: '#ea580c', 
    bg: '#121212', 
    card: '#1E1E1E', 
    text: '#ffffff', 
    desc: '#888888', 
    card_name: '#ffffff',
    card_desc: '#888888',
    card_price: '#ea580c',
    btn_bg: '#ffffff',
    btn_text: '#121212',
    promo: '#1E1E1E', 
    promo_text: '#ffffff',
    banner: false 
  },

minimal: { 
    theme: '#000000', 
    bg: '#ffffff', 
    card: '#ffffff', 
    text: '#111111', 
    desc: '#777777', 
    card_name: '#111111',
    card_desc: '#999999',
    card_price: '#111111',
    btn_bg: '#111111',
    btn_text: '#ffffff',
    promo: '#fafafa', 
    promo_text: '#111111',
    banner: false 
},
visualgrid: { 
    theme: '#ea580c', 
    bg: '#1a1a1a', 
    card: '#2a2a2a', 
    text: '#ffffff', 
    desc: '#bbbbbb', 
    card_name: '#ffffff',
    card_desc: '#bbbbbb',
    card_price: '#ea580c',
    btn_bg: '#ea580c',
    btn_text: '#ffffff',
    promo: '#1a1a1a', 
    promo_text: '#ea580c',
    banner: false 
  },
pop: { 
    theme: '#FF1493',      // El rosa de las sombras y nombres
    bg: '#fffbe6',         // Fondo crema de la web
    card: '#ffffff',       // Fondo blanco de las tarjetas
    text: '#000000',       // Color de los bordes y nombre local
    desc: '#444444',       // Descripción local
    card_name: '#FF1493',  // Nombre del producto en rosa
    card_desc: '#444444', 
    card_price: '#000000', // Fondo negro de la etiqueta de precio
    card_shadow_color: '#000000', // Bordes negros rígidos
    btn_bg: '#ffffff',     // Fondo del botón agregar
    btn_text: '#FF1493',   // Texto del botón agregar
    promo: '#FFD700',      // Fondo amarillo de la promo
    promo_text: '#000000', // Texto negro de la promo
    banner: false 
  },
  spotlight: { 
    theme: '#FFD700',      // Dorado para acentos
    bg: '#ffffff', 
    card: '#ffffff', 
    text: '#000000', 
    desc: '#666666', 
    card_name: '#000000', 
    card_desc: '#666666', 
    card_price: '#000000', 
    btn_bg: '#000000',     // Botones negros
    btn_text: '#ffffff', 
    promo: '#fff3e0',      // Fondo naranja muy suave para promo
    promo_text: '#000000',
    banner: true,
    // --- NUEVOS CAMPOS HERO ---
    hero_badge_bg: '#FFD700',
    hero_badge_color: '#000000',
    hero_title_color: '#ffffff',
    hero_price_color: '#FFD700'
  },
  elegant: { 
    theme: '#D4AF37',        // Dorado característico
    bg: '#f9f5f0',           // Crema suave de fondo
    text: '#333333',         // Texto oscuro para el nombre
    desc: '#777777',         // Gris para la descripción
    card_name: '#333333',    // Nombre del producto
    card_color: '#f9f5f0',   // Mismo crema para que se funda
    card_desc: '#888888',    // Descripción del producto
    card_price: '#D4AF37',   // Precio en dorado
    btn_bg: '#D4AF37',       // Botón + en dorado
    btn_text: '#ffffff',     // Cruz del botón en blanco
    promo_bg: '#f0e8dc',     // Crema más oscuro para la promo
    promo_text: '#5c4b30',   // Texto marrón oscuro para promo
    banner: false 
  },
  bistro: { 
    theme: '#e6c87e', 
    bg: '#222222', 
    text: '#eeeeee', 
    desc: '#aaaaaa', 
    card_name: '#ffffff', 
    card_color: '#222222',
    card_desc: '#999999', 
    card_price: '#e6c87e', 
    btn_bg: '#e6c87e', 
    btn_text: '#222222', 
    promo_bg: '#333333', 
    promo_text: '#e6c87e', 
    banner: false 
  },
  marketpro: { 
    theme: '#000000', 
    bg: '#ffffff', 
    text: '#000000', 
    desc: '#999999', 
    card_name: '#000000', 
    card: '#ffffff', 
    card_desc: '#999999', 
    card_price: '#059669', 
    btn_bg: '#000000', 
    btn_text: '#ffffff', 
    promo: '#f3f4f6', 
    promo_text: '#000000', 
    banner: true,
    // --- ESTO ES LO QUE LE FALTABA A LA GALERÍA ---
    cat_bg_color: '#f3f4f6',
    cat_text_color: '#999999',
    cat_title_color: '#000000',
    search_bg_color: '#f3f4f6',
    search_icon_color: '#9ca3af'
  },
  'icecream-v1': { 
    theme: '#6366f1',        // Indigo moderno
    bg: '#f8fafc',           // Blanco Slate muy limpio
    text: '#0f172a',         // Texto casi negro
    desc: '#64748b',         // Gris Slate
    card_name: '#0f172a',    
    card_desc: '#64748b', 
    card_price: '#6366f1',   
    btn_bg: '#6366f1', 
    btn_text: '#ffffff', 
    promo: '#eef2ff',     
    promo_text: '#4f46e5',   
    banner: false
  },
 'alterna-pro': {
    theme: '#ea580c',
    bg: '#fafaf9',  // <--- CAMBIADO DE NEGRO A CREMA
    card: '#ffffff',
    text: '#111827',
    desc: '#94a3b8',
    promo: '#ffffff',
    banner: false
},
  carta: {
    theme: '#B5863A',
    bg: '#F7F3EE',
    text: '#ffffff',
    desc: '#94a3b8',
    card: '#ffffff',
    card_name: '#1C1A18',
    card_desc: '#8A877F',
    card_price: '#B5863A',
    btn_bg: '#1C1A18',
    btn_text: '#ffffff',
    promo: '#F0E6D3',
    promo_text: '#92620a',
    banner: false,
    cat_bg_color: '#ffffff',
    cat_text_color: '#1C1A18',
    cat_active_bg_color: '#B5863A',
    cat_active_text_color: '#ffffff',
    search_bg_color: '#ffffff',
    search_icon_color: '#B5863A',
  }
};

// --- CSS del marco del selector (sin CSS de templates --- ya son self-contained) ---
const SELECTOR_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Lato:wght@400;700;900&display=swap');

  /* Grid — auto-fill mantiene columnas fantasma (no estira la ultima card);
     max-width 1400px evita expansion infinita; justify-content centra cuando sobra espacio */
  .templates-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 20px; padding: 10px 0; align-items: start; justify-content: center; max-width: 1400px; margin: 0 auto; box-sizing: border-box; }
  @media (max-width: 580px) { .templates-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; } }

  /* Card contenedora */
  .sel-card { background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 2px 8px rgba(0,0,0,0.06); overflow: hidden; display: flex; flex-direction: column; transition: box-shadow 0.2s; max-width: 340px; width: 100%; margin: 0 auto; }
  .sel-card:hover { box-shadow: 0 6px 20px rgba(0,0,0,0.1); }
  .sel-card--featured { border: 2px solid #22c55e; }
  .sel-featured-banner { background: #22c55e; color: #ffffff; text-align: center; font-size: 9px; font-weight: 900; letter-spacing: 0.15em; text-transform: uppercase; padding: 5px 0; }
  .sel-preview-area { background: #f1f5f9; overflow: hidden; }
  .sel-info { padding: 10px 12px 12px; display: flex; flex-direction: column; gap: 3px; }
  .sel-name { font-size: 14px; font-weight: 700; color: #0f172a; margin: 0; line-height: 1.2; }
  .sel-ideal { font-size: 12px; color: #475569; font-weight: 500; margin: 0; line-height: 1.35; }
  .sel-btn { width: 100%; margin-top: 10px; padding: 9px 12px; border-radius: 9px; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 6px; cursor: pointer; border: none; transition: opacity 0.15s; }
  .sel-btn--default { background: #f1f5f9; color: #0f172a; }
  .sel-btn--default:hover { background: #e2e8f0; }
  .sel-btn--featured { background: #111111; color: #ffffff; }
  .sel-btn--featured:hover { background: #333333; }
  .sel-btn--selected { background: #4f46e5; color: #ffffff; }
  .sel-btn--selected:hover { background: #4338ca; }

  /* Marco del celular */
  .phone-preview { width: 100%; height: 260px; background: white; position: relative; overflow: hidden; }
  @media (max-width: 768px) { .phone-preview { max-width: 140px; border-radius: 18px; } }
  .preview-content { width: 100%; height: 100%; overflow: hidden; position: relative; }
`;

// --- MOCK DATA PARA PREVIEWS DEL SELECTOR (no afecta menus reales) ---
const PREVIEW_NOOP = () => {};

const PREVIEW_MOCK: Record<string, any> = {
  classic: {
    restaurant: { name: 'Pizzería Los Tíos', description: 'Pizza a la piedra', theme_color: '#d32f2f', bg_color: '#f8f9fa', text_color: '#ffffff', show_promo: true, promo_message: 'Envío GRATIS primera compra' },
    products: [
      { id: 'c1', name: 'Muzzarella', description: 'Salsa, muzza y orégano.', price: 8500, category_id: 'pc1' },
      { id: 'c2', name: 'Napolitana', description: 'Con ajo y perejil.', price: 10200, category_id: 'pc1' },
      { id: 'c3', name: 'Fainá', description: 'Porción individual.', price: 1500, category_id: 'pc2' },
      { id: 'c4', name: 'Coca Cola 1.5L', price: 3000, category_id: 'pc2' },
    ],
    categories: [{ id: 'pc1', name: 'Pizzas' }, { id: 'pc2', name: 'Extras' }],
  },
  urban: {
    restaurant: { name: 'Burger Joint', description: 'La mejor hamburguesa', theme_color: '#ea580c', bg_color: '#121212', text_color: '#ffffff', show_promo: true, promo_message: 'PROMO: Envío gratis > $15.000' },
    products: [
      { id: 'u1', name: 'Doble Black', description: 'Medallón de carne 180g.', price: 8500, image_url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300&q=80', category_id: 'pu1' },
      { id: 'u2', name: 'Papas Cheddar', description: 'Con abundante queso.', price: 4200, image_url: 'https://images.unsplash.com/photo-1573080496987-a199f8cd4054?w=300&q=80', category_id: 'pu2' },
    ],
    categories: [{ id: 'pu1', name: 'Hamburguesas' }, { id: 'pu2', name: 'Extras' }],
  },
  minimal: {
    restaurant: { name: 'CAFE CENTRAL', description: 'Specialty Coffee', theme_color: '#000000', bg_color: '#ffffff', text_color: '#111111', show_promo: true, promo_message: 'TAKE AWAY: 10% OFF EFECTIVO' },
    products: [
      { id: 'm1', name: 'Avocado Toast', description: 'Masa madre.', price: 5500, category_id: 'pm1' },
      { id: 'm2', name: 'Flat White', description: 'Doble shot.', price: 2800, category_id: 'pm2' },
      { id: 'm3', name: 'Croissant', description: 'Jamón y queso.', price: 1800, category_id: 'pm1' },
    ],
    categories: [{ id: 'pm1', name: 'Comida' }, { id: 'pm2', name: 'Bebidas' }],
  },
  visualgrid: {
    restaurant: { name: 'Osaka Sushi', description: 'Cocina Nikkei', theme_color: '#ea580c', bg_color: '#1a1a1a', text_color: '#ffffff', show_promo: false },
    products: [
      { id: 'v1', name: 'Niguiri', price: 12500, image_url: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=300&q=80', category_id: 'pv1' },
      { id: 'v2', name: 'California Roll', price: 14000, image_url: 'https://images.unsplash.com/photo-1611143669185-af224c5e3252?w=300&q=80', category_id: 'pv1' },
      { id: 'v3', name: 'Spicy Tuna', price: 15000, image_url: 'https://images.unsplash.com/photo-1617196034183-421b4040ed20?w=300&q=80', category_id: 'pv1' },
    ],
    categories: [{ id: 'pv1', name: 'Rolls' }],
  },
  spotlight: {
    restaurant: { name: 'Club Mercedes', description: 'Restaurante', theme_color: '#FFD700', bg_color: '#ffffff', text_color: '#000000', show_banner: true, show_promo: true, hero_title: 'Estofado de Chef', hero_price: 28000, hero_badge_text: 'PLATO DEL DÍA', hero_badge_bg: '#FFD700', hero_badge_color: '#000000', banner_url: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=600&q=80', promo_message: 'Envíos gratis todos los jueves' },
    products: [
      { id: 's1', name: 'Milanesa Napolitana', description: 'Con fritas y ensalada.', price: 16000, image_url: 'https://images.unsplash.com/photo-1606471191009-63994c53433b?w=300&q=80', category_id: 'ps1' },
      { id: 's2', name: 'Matambre Pizza', description: 'Muzzarella y jamón.', price: 25000, image_url: 'https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?w=300&q=80', category_id: 'ps1' },
    ],
    categories: [{ id: 'ps1', name: 'Platos' }],
  },
  icecream: {
    restaurant: { name: 'Frozen Dreams', description: 'Heladería Artesanal', theme_color: '#06b6d4', bg_color: '#f0faff', show_promo: true, promo_message: 'PROMO: 1/4kg de regalo comprando 1kg' },
    products: [
      { id: 'h1', name: 'Pote de Helado', description: 'Hasta 3 sabores.', price: 12500, sale_type: 'peso', variations: [{ label: '1/4 KG', price: 3500 }, { label: '1/2 KG', price: 6500 }, { label: '1 KG', price: 12500 }] },
      { id: 'h2', name: 'Granizado', description: 'Limón, menta o naranja.', price: 4500 },
    ],
  },
  marketpro: {
    restaurant: { name: 'Super Barrio', description: 'Kiosco y despensa', theme_color: '#000000', bg_color: '#ffffff', text_color: '#000000', show_promo: false },
    products: [
      { id: 'mk1', name: 'Coca Cola 600ml', price: 1800, image_url: 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=200&q=80', category_id: 'pmk1' },
      { id: 'mk2', name: 'Alfajor Milka', price: 2200, image_url: 'https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=200&q=80', category_id: 'pmk2' },
      { id: 'mk3', name: 'Agua 500ml', price: 900, image_url: 'https://images.unsplash.com/photo-1548943487-a2e4e43b4853?w=200&q=80', category_id: 'pmk1' },
      { id: 'mk4', name: 'Papas Fritas', price: 1500, image_url: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=200&q=80', category_id: 'pmk2' },
      { id: 'mk5', name: 'Bizcochos', price: 800, image_url: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=200&q=80', category_id: 'pmk2' },
      { id: 'mk6', name: 'Jugo Cepita', price: 1200, image_url: 'https://images.unsplash.com/photo-1534353436294-0dbd4bdac845?w=200&q=80', category_id: 'pmk1' },
    ],
    categories: [{ id: 'pmk1', name: 'Bebidas' }, { id: 'pmk2', name: 'Golosinas' }],
  },
  'alterna-pro': {
    restaurant: { name: 'Eco Nature', description: 'Productos Orgánicos', theme_color: '#ea580c', bg_color: '#fafaf9', text_color: '#111827', description_color: '#94a3b8', card_name_color: '#111827', card_price_color: '#ea580c', show_promo: true, promo_message: 'Envío Gratis — Compras +$20.000', categories: [{ id: 'pa1', name: 'Mixes' }, { id: 'pa2', name: 'Mieles' }, { id: 'pa3', name: 'Harinas' }] },
    products: [
      { id: 'a1', name: 'Mix Frutos Secos', price: 8500, image_url: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=300&q=80', category_id: 'pa1' },
      { id: 'a2', name: 'Miel Orgánica', price: 4200, image_url: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=300&q=80', category_id: 'pa2' },
      { id: 'a3', name: 'Harina Integral', price: 2800, category_id: 'pa3' },
    ],
  },
  carta: {
    restaurant: { name: 'La Bourgogne', description: 'Restaurante de Autor', theme_color: '#B5863A' },
    products: [],
    categories: [],
  },
};

function renderRealTemplate(id: string, isOpen: boolean) {
  const m = PREVIEW_MOCK;
  switch (id) {
    case 'classic':     return <ClassicDelivery    restaurant={m.classic.restaurant}     products={m.classic.products}     categories={m.classic.categories}     fetchedExtras={[]} isOpen={isOpen} onAddToCart={PREVIEW_NOOP} setShowInfo={PREVIEW_NOOP} isMockup={true} />;
    case 'urban':       return <UrbanoDark         restaurant={m.urban.restaurant}       products={m.urban.products}       categories={m.urban.categories}       fetchedExtras={[]} isOpen={isOpen} onAddToCart={PREVIEW_NOOP} setShowInfo={PREVIEW_NOOP} isMockup={true} />;
    case 'minimal':     return <MinimalWhite       restaurant={m.minimal.restaurant}     products={m.minimal.products}     categories={m.minimal.categories}     fetchedExtras={[]} isOpen={isOpen} onAddToCart={PREVIEW_NOOP} setShowInfo={PREVIEW_NOOP} isMockup={true} />;
    case 'visualgrid':  return <VisualGrid         restaurant={m.visualgrid.restaurant}  products={m.visualgrid.products}  categories={m.visualgrid.categories}  fetchedExtras={[]} isOpen={isOpen} onAddToCart={PREVIEW_NOOP} setShowInfo={PREVIEW_NOOP} isMockup={true} />;
    case 'spotlight':   return <SpotlightHero      restaurant={m.spotlight.restaurant}   products={m.spotlight.products}   categories={m.spotlight.categories}   fetchedExtras={[]} isOpen={isOpen} onAddToCart={PREVIEW_NOOP} setShowInfo={PREVIEW_NOOP} isMockup={true} />;
    case 'icecream-v1':    return <HeladeriaSoft      restaurant={m.icecream.restaurant}    products={m.icecream.products}                                           isOpen={isOpen} onAddToCart={PREVIEW_NOOP} isMockup={true} />;
    case 'marketpro':   return <MarketProTemplate  restaurant={m.marketpro.restaurant}   products={m.marketpro.products}   categories={m.marketpro.categories}   fetchedExtras={[]} isOpen={isOpen} onAddToCart={PREVIEW_NOOP} setShowInfo={PREVIEW_NOOP} isMockup={true} />;
    case 'alterna-pro': return <AlternaPro         restaurant={m['alterna-pro'].restaurant} products={m['alterna-pro'].products}                                  isOpen={isOpen} onAddToCart={PREVIEW_NOOP} setShowInfo={PREVIEW_NOOP} setSelectedProduct={PREVIEW_NOOP} isMockup={true} />;
    case 'carta':       return <Carta              restaurant={m.carta.restaurant}       products={m.carta.products}       categories={m.carta.categories}       fetchedExtras={[]} isOpen={isOpen} onAddToCart={PREVIEW_NOOP} setShowInfo={PREVIEW_NOOP} isMockup={true} />;
    default: return null;
  }
}


// --- DATA ---
const TEMPLATES = [
  { id: 'classic',     name: 'Classic Delivery', type: 'classic',     category: 'basicas',   sale_type: 'unidad',           hasPhotos: false, businessCategory: 'delivery',     idealFor: 'Ideal para pizzería y delivery' },
  { id: 'urban',       name: 'Urbano Dark',       type: 'urban',       category: 'basicas',   sale_type: 'unidad',           hasPhotos: true,  businessCategory: 'delivery',     idealFor: 'Ideal para hamburguesería y street food' },
  { id: 'minimal',     name: 'Minimalista',       type: 'minimal',     category: 'basicas',   sale_type: 'unidad',           hasPhotos: false, businessCategory: 'elegante',     idealFor: 'Ideal para cafetería y panadería' },
  { id: 'visualgrid',  name: 'Visual Grid',       type: 'visualgrid',  category: 'basicas',   sale_type: 'unidad',           hasPhotos: true,  premium: true, businessCategory: 'heladeria',    idealFor: 'Ideal para heladería y negocios visuales' },
  { id: 'spotlight',   name: 'Spotlight Hero',    type: 'spotlight',   category: 'basicas',   sale_type: 'unidad',           hasPhotos: true,  premium: true, businessCategory: 'restaurante',  idealFor: 'Ideal para restaurante con menú destacado' },
  { id: 'icecream-v1', name: 'Soft Premium',      type: 'icecream',    category: 'basicas',   sale_type: 'peso',             hasPhotos: false, premium: true, businessCategory: 'heladeria',    idealFor: 'Ideal para heladería y dietética' },
  { id: 'marketpro',   name: 'Market Pro',        type: 'marketpro',   category: 'completas', sale_type: 'unidad',           hasPhotos: true,  premium: true, businessCategory: 'kiosco',       idealFor: 'Ideal para kiosco y despensa' },
  { id: 'alterna-pro', name: 'Alterna Pro',       type: 'alterna-pro', category: 'completas', sale_type: ['unidad', 'peso'], hasPhotos: true,  premium: true, businessCategory: 'elegante',     idealFor: 'Ideal para carta compleja y mercado', featured: true },
  { id: 'carta',       name: 'Carta',             type: 'carta',       category: 'completas', sale_type: 'unidad',           hasPhotos: true,  premium: true, businessCategory: 'restaurante',  idealFor: 'Ideal para restaurante con menú destacado' },
];

function GalleryContent() {
  const [businessFilter, setBusinessFilter] = useState<'todas' | 'restaurante' | 'delivery' | 'kiosco' | 'heladeria' | 'elegante'>('todas');
  const [isOpen, setIsOpen] = useState(true);
  const searchParams = useSearchParams();
  const isNewlyActivated = searchParams.get('activated')
  const [showUpcomingModal, setShowUpcomingModal] = useState(false);
  const [currentTemplate, setCurrentTemplate] = useState('classic');
  const [userPlan, setUserPlan] = useState('free');
  const [savingId, setSavingId] = useState<string | null>(null);
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

useEffect(() => {
   const loadAllData = async () => {
        const { data: { session } } = await supabase.auth.getSession();

        if(session) {
            const { data: restaurantData } = await supabase
                .from('restaurants')
                .select('template_id, subscription_plan, is_open')
                .eq('user_id', session.user.id)
                .maybeSingle();

            if(restaurantData) {
                setCurrentTemplate(restaurantData.template_id || 'classic');
                setUserPlan(restaurantData.subscription_plan ? 'paid' : 'free');
                setIsOpen(restaurantData.is_open ?? true);
            }
        }
    };
    loadAllData();
}, [supabase]);
  // --- LOGICA DE SELECCI�"N CORREGIDA (HARD RESET) ---
 const handleSelect = async (id: string, premium: boolean) => {
    if (premium && userPlan === 'free') return alert("Esta es una plantilla Premium. Actualizá tu plan para usarla.");
    
    setSavingId(id);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const defaults = TEMPLATE_DEFAULTS[id] || TEMPLATE_DEFAULTS['classic'];

      // HARD RESET: Mandamos todos los colores por defecto de la galería a la DB
    // HARD RESET: Mandamos todos los colores por defecto de la galería a la DB
      await supabase.from('restaurants').update({ 
          template_id: id,
          theme_color: defaults.theme,
          bg_color: defaults.bg,
          text_color: defaults.text,
          description_color: defaults.desc,
          card_color: defaults.card || defaults.bg,
          card_name_color: defaults.card_name,
          card_desc_color: defaults.card_desc,
          card_price_color: defaults.card_price,
          card_btn_bg: defaults.btn_bg,
          card_btn_text: defaults.btn_text,
          promo_bg_color: defaults.promo || defaults.promo_bg,
          promo_text_color: defaults.promo_text || defaults.theme,
          show_banner: defaults.banner || false,
          // --- AQUÍ LA GALERÍA GUARDA LOS COLORES DE MARKETPRO ---
          cat_bg_color: defaults.cat_bg_color || '#f3f4f6',
          cat_text_color: defaults.cat_text_color || '#999999',
          cat_title_color: defaults.cat_title_color || '#000000',
          search_bg_color: defaults.search_bg_color || '#f3f4f6',
          search_icon_color: defaults.search_icon_color || '#9ca3af'
      }).eq('user_id', user.id);
      
      setCurrentTemplate(id);
      toast.success(`¡Diseño ${id.toUpperCase()} activado con sus colores originales!`);
    }
    setSavingId(null);
  };

// --- L�"GICA DE RENDERIZADO ---

const finalTemplates = TEMPLATES.filter(t =>
    businessFilter === 'todas' || t.businessCategory === businessFilter
  );
 return (
    <div className="relative px-4 pt-0 lg:px-8 min-h-[85vh] bg-gray-50/50 pb-20 overflow-x-hidden">
      <style>{SELECTOR_CSS}</style>
      
      {/* 1. HEADER CON TÍTULO */}
      <header className="mb-10 pt-20 lg:pt-0 text-left relative z-10">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl sm:text-4xl font-black text-gray-900 uppercase italic tracking-tighter leading-none">
            Galería de Diseños
          </h1>
          <p className="text-gray-500 text-xs sm:text-sm font-medium leading-tight">
            Elige el diseño perfecto para el link digital de tu negocio
          </p>
        </div>
      </header>

      {/* FILTRO POR TIPO DE NEGOCIO */}
      <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
        {([
          { key: 'todas',       label: 'Todas' },
          { key: 'restaurante', label: 'Restaurante con menu destacado' },
          { key: 'delivery',    label: 'Delivery y comida rapida' },
          { key: 'kiosco',      label: 'Kiosco y despensa' },
          { key: 'heladeria',   label: 'Heladeria y dietetica' },
          { key: 'elegante',    label: 'Elegante y minimalista' },
        ] as const).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setBusinessFilter(key)}
            className={`px-5 py-2 rounded-full text-[9px] font-black uppercase tracking-widest transition-all border ${businessFilter === key ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'}`}
          >
            {label}
          </button>
        ))}
      </div>
    
  
{/* GRILLA DE MOCKUPS �?" CartProvider necesario para los 5 templates que usan useCart() */}
      <CartProvider>
      <div className="templates-grid animate-in fade-in duration-500 pb-20">
        {finalTemplates.map((t) => {
          const isSelected = currentTemplate === t.id;
          const isLocked = t.premium && userPlan === 'free';
          const isUpcoming = false;

          // Escalas confirmadas visualmente �?" cada una muestra header + al menos 1 elemento de contenido
          const desktopScale =
            t.id === 'classic'     ? 0.68 :
            t.id === 'urban'       ? 0.72 :
            t.id === 'minimal'     ? 0.68 :
            t.id === 'visualgrid'  ? 0.62 :
            t.id === 'spotlight'   ? 0.80 :
            t.id === 'icecream-v1' ? 0.76 :
            t.id === 'marketpro'   ? 0.63 :
            t.id === 'alterna-pro' ? 0.75 :
            t.id === 'carta'       ? 0.77 :
            0.75;
          const mobileScale = t.id === 'alterna-pro' ? 0.45 : 0.52;
          const previewScale = typeof window !== 'undefined' && window.innerWidth < 768
            ? mobileScale
            : desktopScale;

          const isFeatured = !!(t as any).featured;
          return (
            <article key={t.id}>
              <div className={`sel-card${isFeatured ? ' sel-card--featured' : ''}`}>
                {isFeatured && <div className="sel-featured-banner">MAS ELEGIDA</div>}

                {/* Zona preview */}
                <div className="sel-preview-area">
                  <div className="phone-preview">
                    <div className="preview-content">
                      <div style={{ width: `${Math.round(100 / previewScale)}%`, transform: `scale(${previewScale})`, transformOrigin: 'top left', display: 'flex', flexDirection: 'column' }}>
                        {renderRealTemplate(t.id, isOpen)}
                      </div>
                    </div>
                    {/* Store overlay: icecream-v1 (sin setShowInfo nativo) y alterna-pro (boton nativo ocultado en isMockup) */}
                    {(t.id === 'icecream-v1' || t.id === 'alterna-pro') && (
                      <div className="absolute top-2 left-2 z-20 w-7 h-7 bg-white/70 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm pointer-events-none">
                        <Store size={13} className="text-gray-700" />
                      </div>
                    )}
                    {isLocked && (
                      <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white backdrop-blur-sm z-30">
                        <Lock size={20} className="mb-1 opacity-80" />
                        <span className="font-bold text-[10px]">PREMIUM</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Zona info */}
                <div className="sel-info">
                  <h3 className="sel-name">{t.name}</h3>
                  <p className="sel-ideal">{t.idealFor}</p>
                  {isSelected ? (
                    <Link href="/dashboard/personalizar" className="sel-btn sel-btn--selected">
                      <Check size={13} strokeWidth={3} /> Diseno en uso
                    </Link>
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleSelect(t.id, t.premium ?? false); }}
                      disabled={savingId === t.id}
                      className={`sel-btn ${isFeatured ? 'sel-btn--featured' : 'sel-btn--default'}`}
                    >
                      {savingId === t.id
                        ? <><Loader2 size={12} className="animate-spin"/> Activando...</>
                        : <><CheckCircle2 size={13} /> Elegir esta plantilla</>
                      }
                    </button>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
      </CartProvider>

</div>
  );
}

export default function GalleryPage() {
  return (
    <Suspense fallback={
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-white z-[300]">
        <Loader2 className="animate-spin text-indigo-600 mb-4" size={40}/>
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 animate-pulse">Preparando diseños...</p>
      </div>
    }>
      <GalleryContent />
    </Suspense>
  );
}
