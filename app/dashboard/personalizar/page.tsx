'use client';

export const dynamic = 'force-dynamic';
import { CartProvider } from "@/context/CartContext";
import { useState, useEffect, useRef } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { toast } from 'sonner';
import { 
  Loader2, Copy, Check, Plus, Image as ImageIcon, Trash2, Store, Phone, Bike, ExternalLink,
  Save, CreditCard, Palette, Megaphone, MonitorSmartphone, RotateCcw, 
  CheckCircle, Utensils, X, Lock, UploadCloud, Star, Eye, Zap, Layers, ChevronDown,Music2, Facebook, Instagram,Globe,MessageCircle,Clock,MapPin,HelpCircle, CalendarIcon, Sparkles
} from 'lucide-react';
import Link from 'next/link';
import BioModern from '../../../components/templates/bio/BioModern';

import UrbanoDark from '../../../components/templates/UrbanoDark';
import PopVibrant from '../../../components/templates/PopVibrant';
import VisualGrid from '../../../components/templates/VisualGrid';
import ClassicDelivery from '../../../components/templates/ClassicDelivery';
import MinimalWhite from '../../../components/templates/MinimalWhite';
import SpotlightHero from '../../../components/templates/SpotlightHero';
import ElegantSerif from '../../../components/templates/ElegantSerif';
import BistroChalk from '../../../components/templates/BistroChalk';
import MarketProTemplate from '../../../components/templates/MarketProTemplate';
import AlternaPro from '../../../components/templates/AlternaPro';
import HeladeriaSoft from '../../../components/templates/HeladeriaSoft';
import Carta from '../../../components/templates/Carta';
import { getOptimizedImageUrl } from '@/lib/imageUtils';

const ColorBubble = ({ label, value, onChange }: { label: string, value: string, onChange: (v: string) => void }) => (
  <div className="flex flex-col items-center gap-2">
    <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full border-4 border-white shadow-lg overflow-hidden transition-transform active:scale-90">
      <input type="color" value={value || '#000000'} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 scale-[2] cursor-pointer bg-transparent border-none" />
    </div>
    <span className="text-[8px] font-black uppercase text-gray-400 text-center leading-tight px-1">{label}</span>
  </div>
);

const TEMPLATE_DEFAULTS: any = {
classic: {
    theme: '#1a1a2e',
    bg: '#f8f9fa',
    text: '#ffffff',
    desc: '#94a3b8',
    card_name: '#111827',
    card_desc: '#6b7280',
    card_price: '#1a1a2e',
    btn_bg: '#1a1a2e',
    btn_text: '#ffffff',
    promo_bg_color: '#fff8e7',
    promo_text_color: '#92620a',
    banner: false,
    search_bg_color: '#ffffff',
    search_icon_color: '#1a1a2e',
    cat_bg_color: '#ffffff',
    cat_text_color: '#1a1a2e',
    cat_active_bg_color: '#1a1a2e',
    cat_active_text_color: '#ffffff'
  },

 urban: { 
    theme: '#ea580c', bg: '#121212', text: '#ffffff', desc: '#888888', 
    card_name: '#ffffff', card_desc: '#888888', card_price: '#ea580c', 
    btn_bg: '#ffffff', promo_bg: '#1E1E1E', promo_text: '#ffffff', banner: false,
    cat_bg_color: '#000000', cat_text_color: '#ffffff', 
    cat_active_bg_color: '#ffffff', cat_active_text_color: '#000000',
    search_bg_color: '#1E1E1E', // 🚀 NEGRO POR DEFECTO
    search_icon_color: '#888888' // 🚀 GRIS SUAVE
  },
  minimal: { theme: '#000000', bg: '#ffffff', text: '#222222', desc: '#999999', card_name: '#222222', card_desc: '#999999', card_price: '#000000', btn_bg: '#ffffff', btn_text: '#000000', promo_bg: '#fafafa', promo_text: '#000000', banner: false, cat_bg_color: '#f3f4f6',
    cat_text_color: '#999999',
    cat_active_bg_color: '#000000',
    cat_active_text_color: '#ffffff',search_bg_color: '#f3f4f6', 
    search_icon_color: '#9ca3af',},

visualgrid: { 
    theme: '#ea580c', 
    bg: '#121212', 
    card: '#1E1E1E', 
    text: '#ffffff', 
    desc: '#888888', 
    card_name: '#ffffff', 
    card_desc: '#888888', 
    card_price: '#ea580c', 
    btn_bg: '#ea580c',  // Color del botón +
    btn_text: '#ffffff', // Color del símbolo +
    promo_bg_color: '#1E1E1E', 
    promo_text_color: '#ffffff', 
    banner: false,
    search_bg_color: '#111111', 
    search_icon_color: '#ea580c'
},
  pop: { theme: '#FF1493', bg: '#fffbe6', card: '#ffffff', text: '#000000', desc: '#444444', card_name: '#FF1493', card_desc: '#444444', card_price: '#000000', card_shadow_color: '#000000', btn_bg: '#ffffff', btn_text: '#FF1493', promo_bg: '#FFD700', promo_text: '#000000', banner: false },
  spotlight: { 
    theme: '#FFD700', 
    bg: '#ffffff', 
    card: '#ffffff', 
    text: '#000000', 
    desc: '#666666',         // Color para la descripción del local
    card_desc: '#666666',    // Color para la descripción del producto
    card_name: '#000000', 
    card_price: '#000000', 
    btn_bg: '#000000', 
    btn_text: '#ffffff', 
    promo: '#fff3e0', 
    promo_text: '#000000', 
    banner: true, 
    // --- 🚀 AGREGAMOS ESTO PARA EL RESET ---
    search_bg_color: '#f3f4f6', 
    search_icon_color: '#9ca3af',
    cat_bg_color: '#f3f4f6',
    cat_text_color: '#9ca3af',
    cat_active_bg_color: '#000000',
    cat_active_text_color: '#ffffff',
    // ----------------------------------------
    hero_badge_bg: '#FFD700', 
    hero_badge_color: '#000000', 
    hero_title_color: '#ffffff', 
    hero_price_color: '#FFD700' 
  },
  elegant: { theme: '#D4AF37', bg: '#f9f5f0', text: '#333333', desc: '#777777', card_name: '#333333', card_color: '#f9f5f0', card_desc: '#888888', card_price: '#D4AF37', btn_bg: '#D4AF37', btn_text: '#ffffff', promo_bg: '#f0e8dc', promo_text: '#5c4b30', banner: false },
  bistro: { theme: '#e6c87e', bg: '#222222', text: '#eeeeee', desc: '#aaaaaa', card_name: '#ffffff', card: '#222222', card_desc: '#999999', card_price: '#e6c87e', btn_bg: '#e6c87e', btn_text: '#222222', promo: '#333333', promo_text: '#e6c87e', banner: false },
  marketpro: { theme: '#000000', bg: '#ffffff', text: '#000000', desc: '#999999', card_name: '#000000', card_desc: '#999999', card_price: '#059669', btn_bg: '#000000', btn_text: '#ffffff', promo_bg: '#f3f4f6', promo_text: '#000000', banner: true, cat_bg_color: '#f3f4f6', cat_text_color: '#999999', cat_title_color: '#000000', cat_active_bg_color: '#000000', cat_active_text_color: '#ffffff', search_bg_color: '#f3f4f6', search_icon_color: '#9ca3af', card_show_bg: true, card_color: '#ffffff' },
  'icecream-v1': { theme: '#6366f1', bg: '#f8fafc', text: '#0f172a', desc: '#64748b', card_name: '#0f172a', card_desc: '#64748b', card_price: '#6366f1', btn_bg: '#6366f1', btn_text: '#ffffff', promo_bg: '#eef2ff', promo_text: '#4f46e5', banner: false },
  'alterna-pro': { theme: '#ea580c', bg: '#fafaf9', text: '#111827', desc: '#94a3b8', card_name: '#111827', card_desc: '#94a3b8', card_price: '#ea580c', btn_bg: '#ea580c', btn_text: '#ffffff', promo_bg: '#ffffff', promo_text: '#ea580c', banner: false, cat_bg_color: '#ffffff', cat_text_color: '#64748b', cat_active_bg_color: '#000000', cat_active_text_color: '#ffffff' },
  carta: {
    theme: '#B5863A', bg: '#F7F3EE', text: '#1C1A18', desc: '#8a8278',
    card_name: '#1C1A18', card_desc: '#9a948c', card_price: '#B5863A',
    card: '#ffffff', btn_bg: '#B5863A', btn_text: '#ffffff',
    promo_bg_color: '#EFE7DB', promo_text_color: '#B5863A', banner: false,
    cat_bg_color: '#F7F3EE', cat_text_color: '#9a948c',
    cat_active_bg_color: '#1C1A18', cat_active_text_color: '#F7F3EE',
    search_bg_color: '#ffffff', search_icon_color: '#B5863A'
  },
};

const CUSTOM_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&family=Playfair+Display:wght@700&family=Patrick+Hand&family=Lato:wght@400;900&display=swap');
  .preview-scroll { width: 100%; height: 100%; overflow-y: auto; scrollbar-width: none; padding-top: 35px; position: relative; display: flex; flex-direction: column; }
  .preview-scroll::-webkit-scrollbar { display: none; }
 .preview-scroll > div { width: 100%; display: flex; flex-direction: column; gap: 0px; }
  .preview-scroll { padding-bottom: 80px !important; }
  .status-bar-fixed { position: absolute; top: 0; left: 0; width: 100%; height: 35px; display: flex; justify-content: space-between; align-items: center; padding: 0 20px; font-size: 10px; font-weight: bold; z-index: 50; pointer-events: none; }
  @keyframes popIn { 0% { transform: scale(0.9); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
  .animate-pop-in { animation: popIn 0.2s cubic-bezier(0.16, 1, 0.3, 1); }
`;

// ── PhoneMockup: acepta activeTab para mostrar vista SnappyLinks ──────────────
const PhoneMockup = ({ data, products, categories, previewTemplateId, activeTab, isMockup = true }: any) => {
  const [showInfoMock, setShowInfoMock] = useState(false);
  const activeId = previewTemplateId || data?.template_id || 'classic';
  const defaults = TEMPLATE_DEFAULTS[activeId] || TEMPLATE_DEFAULTS['classic'];
  
  // --- LÓGICA DE PRODUCTOS POR DEFECTO RECUPERADA ---
  const displayProds = (products && products.length > 0) 
   ? (categories.length > 0 
        // Si hay categorías, recorremos cada una y tomamos máximo 5 productos de cada una
        ? categories.flatMap((cat: any) => 
            products
              .filter((p: any) => String(p.category_id) === String(cat.id))
              .slice(0, 5)
          )
        // Si no hay categorías, simplemente tomamos los primeros 5 del total
        : products.slice(0, 5)
      )
    : [
        { id: 1, name: 'Mix Frutos Secos', price: 8500, image_url: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400' },
        { id: 2, name: 'Miel Orgánica', price: 4200, image_url: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400' },
        { id: 3, name: 'Granola de Coco', price: 3900, image_url: 'https://images.unsplash.com/photo-1517093602195-b40af9688b46?w=400' }
      ];

  const renderData = {
    ...data,
    theme_color: data.theme_color || defaults.theme,
    bg_color: data.bg_color || defaults.bg,
    text_color: data.text_color || defaults.text,
    description_color: data.description_color || defaults.desc,
  };
  
 

  
// ── VISTA SNAPPYLINKS (DENTRO DE PhoneMockup) ──────────────
if (activeTab === 'snappylinks') {
    // 🛡️ LIMITAMOS LOS LINKS SEGÚN EL PLAN PARA LA VISTA PREVIA
    // Calculamos el límite de nuevo aquí dentro para seguridad
    const plan = data?.subscription_plan?.toLowerCase() || 'light';
    const limit = plan === 'light' ? 2 : plan === 'go' ? 4 : 100;
    
    // Filtramos los links: solo se pasan al diseño los primeros N según el plan
    const visibleLinks = (data.snappylink_links || []).slice(0, limit);

    // Creamos un clon de la data para no modificar el estado original, pero con los links filtrados
    const dataForPreview = { ...data, snappylink_links: visibleLinks };

    const bioStyles = {
        backgroundColor: data.snappylink_bg_color || '#ffffff',
        backgroundImage: data.snappylink_bg_img ? `url(${data.snappylink_bg_img})` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        color: data.snappylink_text_color || '#000000'
    };

    return (
      <div className="h-full w-full flex flex-col items-center pt-14 px-6 space-y-6 animate-in fade-in duration-500 overflow-y-auto no-scrollbar" 
           style={bioStyles}>
        
        {/* LOGO */}
        <div className="w-20 h-20 rounded-full border-2 shadow-xl overflow-hidden shrink-0" 
             style={{ borderColor: data.snappylink_btn_color || data.theme_color }}>
          <img src={getOptimizedImageUrl(data.snappylink_logo_url || data.logo_url || '/placeholder.png', 150, 75) as string} className="w-full h-full object-cover" alt="logo" />
        </div>

        {/* TEXTOS */}
        <div className="text-center space-y-2">
          <h2 className="font-black text-lg uppercase italic tracking-tighter leading-none" 
              style={{ color: data.snappylink_title_color || '#000000' }}>
            {data.snappylink_title || data.name}
          </h2>
          <p className="text-[10px] font-medium leading-relaxed" 
             style={{ color: data.snappylink_desc_color || '#666666' }}>
            {data.snappylink_bio || 'Tu bio aparecerá aquí.'}
          </p>
        </div>

        {/* BOTONES DINÁMICOS (Usando la data filtrada) */}
        <div className="w-full pt-4 pb-10">
          <BioModern data={dataForPreview} />
        </div>

        <div className="mt-auto pb-6">
          <p className="text-[8px] font-black text-gray-400 uppercase tracking-[0.3em]">Potenciado por Snappy</p>
        </div>
      </div>
    );
}

  // ── VISTA MENÚ ─────────────────────────────────────────────────────────────
  const isPreviewMode = !!previewTemplateId;
  const finalRenderData = isPreviewMode ? {
    ...data,
    theme_color: defaults.theme, bg_color: defaults.bg, text_color: defaults.text, description_color: defaults.desc,
    card_name_color: defaults.card_name, card_color: defaults.card || defaults.bg, card_price_color: defaults.card_price,
    card_btn_bg: defaults.btn_bg, promo_bg_color: defaults.promo_bg_color || defaults.promo,
    promo_text_color: defaults.promo_text_color || defaults.promo_text, card_btn_text: defaults.btn_text,
    cat_bg_color: data.cat_bg_color, cat_text_color: data.cat_text_color,
    cat_active_bg_color: data.cat_active_bg_color, cat_active_text_color: data.cat_active_text_color,
    card_show_bg: data.card_show_bg !== undefined ? data.card_show_bg : true,
    search_bg_color: defaults.search_bg_color, 
    search_icon_color: defaults.search_icon_color
  } : data;

// Carta tiene su propio set de placeholders (estilo brasserie) y los activa con products.length === 0,
// así que le pasamos los datos reales (sin el fallback genérico "Mix Frutos Secos") para no pisar esa lógica.
const props = {
  restaurant: { ...finalRenderData, categories, reservations_enabled: data.reservations_enabled },
  products: activeId === 'carta' ? (products || []) : (displayProds || []),
  categories: categories || [],
  
  fetchedExtras: [], 
  isOpen: true, 
  onAddToCart: () => {}, 
isMockup: isMockup,
  setShowInfo: setShowInfoMock
};

  return (
    <CartProvider> {/* 🚀 ENVOLVEMOS TODO AQUÍ */}
      <div className="relative w-full h-full bg-white flex flex-col">
        <div className="status-bar-fixed" style={{ color: 'black' }}><span>9:41</span><span>📶</span></div>
        <div className="preview-scroll" style={{ backgroundColor: finalRenderData.bg_color }}>
          {(() => {
            switch (activeId) {
              case 'urban': return <UrbanoDark {...props} />;
              case 'pop': return <PopVibrant {...props} />;
              case 'visualgrid': return <div className="flex flex-col gap-4"><VisualGrid {...props} isMockup={true} /></div>;
              case 'classic': return <ClassicDelivery {...props} />;
              case 'minimal': return <MinimalWhite {...props} />;
              case 'spotlight': return <SpotlightHero {...props} />;
              case 'elegant': return <ElegantSerif {...props} />;
              case 'bistro': return <BistroChalk {...props} />;
              case 'marketpro': return <MarketProTemplate {...props} categories={categories} fetchedExtras={data.fetched_extras || []} onAddToCart={() => {}} />;
              case 'alterna-pro': 
  return (
    <AlternaPro 
      /* Pasamos todos los datos del restaurante */
      restaurant={{ ...finalRenderData, categories: categories.length > 0 ? categories.slice(0,2) : [{id:'cat-1',name:'General'},{id:'cat-2',name:'Pizzas'}] }} 
      products={displayProds} 
      onAddToCart={() => {}} 
      setSelectedProduct={() => {}} 
      isMockup={true} 
      isOpen={true}
      setShowInfo={setShowInfoMock} // 🚀 ESTO ARREGLA EL ERROR EN EL EDITOR
    />
  );
              case 'icecream-v1': return <HeladeriaSoft restaurant={finalRenderData} products={displayProds} onAddToCart={() => {}} isMockup={true} />;
              case 'carta': return <Carta {...props} />;
              default: return <ClassicDelivery {...props} />;
            }
          })()}
        </div>
    
    {/* 🚀 VISTA PREVIA DEL MODAL (CON BOTONES DE RESERVA) */}
        {showInfoMock && (
          <div className="absolute inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
            <div className="bg-[#18181b] border border-white/10 w-full rounded-[2.5rem] p-6 shadow-2xl relative text-center">
              <button onClick={() => setShowInfoMock(false)} className="absolute top-4 right-4 text-gray-400"><X size={16}/></button>
              
              <div className="flex items-center justify-center gap-2 mb-6">
                <Store size={14} className="text-white opacity-60"/>
                <h3 className="text-[10px] font-black uppercase text-white italic tracking-tighter">Información</h3>
              </div>

              <div className="space-y-4 text-left mb-6">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-white/5 text-white/50 border border-white/5"><MapPin size={14} strokeWidth={1.5}/></div>
                  <div>
                    <p className="text-[8px] font-black uppercase text-white/20 tracking-widest">Ubicación</p>
                    <p className="text-[10px] text-gray-200 font-bold leading-tight">{data.address || 'Sin dirección'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-white/5 text-white/50 border border-white/5"><Clock size={14} strokeWidth={1.5}/></div>
                  <div>
                    <p className="text-[8px] font-black uppercase text-white/20 tracking-widest">Horarios</p>
                    <p className="text-[10px] text-gray-200 font-bold leading-tight">{data.opening_hours || 'Sin horario'}</p>
                  </div>
                </div>

                {/* 🎫 BOTONES DE RESERVA (Aparecen si el switch está en ON) */}
                {data.reservations_enabled && (
                    <div className="space-y-3 pt-4 border-t border-white/5 animate-in slide-in-from-top-2">
                        <p className="text-[8px] font-black text-gray-500 uppercase tracking-[0.2em] text-center mb-1">
                            ¿Querés venir al local?
                        </p>
                        <div className="flex flex-col gap-2">
                            <div className="w-full py-3 bg-amber-500 text-white rounded-2xl font-black uppercase text-[9px] tracking-widest flex items-center justify-center gap-2 shadow-lg">
                                <CalendarIcon size={14} strokeWidth={3} /> Reservar Mesa
                            </div>
                            <div className="w-full py-2 bg-white/5 text-gray-400 border border-white/10 rounded-2xl font-black uppercase text-[8px] tracking-widest flex items-center justify-center gap-2">
                                <Eye size={12} /> Ver mi reserva
                            </div>
                        </div>
                    </div>
                )}

 <div className="flex justify-center gap-5 pt-4 border-t border-white/5">
  {data.instagram && (
    <a href={data.instagram.startsWith("http") ? data.instagram : data.instagram.includes(".") ? `https://${data.instagram}` : `https://instagram.com/${data.instagram.replace("@", "")}`} target="_blank">
      <Instagram size={18} strokeWidth={1.5} className="text-white opacity-60" />
    </a>
  )}
  {data.facebook && (
    <a href={data.facebook.startsWith("http") ? data.facebook : data.facebook.includes(".") ? `https://${data.facebook}` : `https://facebook.com/${data.facebook}`} target="_blank">
      <Facebook size={18} strokeWidth={1.5} className="text-white opacity-60" />
    </a>
  )}
  {data.tiktok && (
    <a href={data.tiktok.startsWith("http") ? data.tiktok : data.tiktok.includes(".") ? `https://${data.tiktok}` : `https://tiktok.com/@${data.tiktok.replace("@", "")}`} target="_blank">
      <Music2 size={18} strokeWidth={1.5} className="text-white opacity-60" />
    </a>
  )}
</div>
              </div>
              <button onClick={() => setShowInfoMock(false)} className="w-full py-3 bg-white text-black rounded-xl font-black uppercase text-[9px]">Cerrar</button>
            </div>
          </div>
        )}

      </div>
    
    </CartProvider>
  );
};

// ── EDITORPAGE ────────────────────────────────────────────────────────────────
export default function EditorPage() {
  const [showMobilePreview, setShowMobilePreview] = useState(false);
  const [activeTab, setActiveTab] = useState<'menu' | 'snappylinks'>('menu');
  const [errorModal, setErrorModal] = useState({ show: false, title: '', msg: '' });
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [previewTemplateId, setPreviewTemplateId] = useState<string | null>(null);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [isLocked, setIsLocked] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showBioContent, setShowBioContent] = useState(true);
  const [categories, setCategories] = useState<any[]>([]);
  const templatesSinFoto = ['minimal', 'classic', 'elegant', 'pop', 'bistro', 'icecream'];
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [activeFrom, setActiveFrom] = useState('');
const [activeTo, setActiveTo] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
const [showBioDesigns, setShowBioDesigns] = useState(false);
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
const [businessType, setBusinessType] = useState<string | null>(null);
const [daysToRepeat, setDaysToRepeat] = useState<string[]>(['lunes', 'martes', 'miercoles', 'jueves', 'viernes']);
 const [data, setData] = useState<any>({
  id: null, name: '', slug: '', description: '', delivery_cost: 0, address: '', instagram: '',
  facebook: '', tiktok: '', opening_hours: '', google_maps_link: '', phone: '', contact_phone: '', whatsapp: '',
  promo_message: '', show_promo: true, theme_color: '#d32f2f', bg_color: '#ffffff',
  text_color: '#ffffff', description_color: '#ffffff', promo_bg_color: '#ffebee',
  promo_text_color: '#d32f2f', card_name_color: '#000000', card_desc_color: '#666666',
  card_price_color: '#d32f2f', card_btn_bg: '#ffffff', template_id: 'classic',
  show_banner: false, hero_badge_text: 'DESTACADO', hero_title: '', hero_price: 0,
  hero_description: '', card_shadow_color: '#000000', title_font: 'Inter', desc_font: 'Inter',
  desc_size: '10px', search_bg_color: '#f3f4f6', search_icon_color: '#9ca3af',
  cat_bg_color: '#f3f4f6', cat_text_color: '#999999', cat_title_color: '#000000',
  card_show_bg: true, card_btn_text: '#000000', business_type: 'gastronomico', pricing_type: 'unit',
  card_name_bg: '#ffffff', snappylink_slug: '', 
  snappylink_bio: '', hero_dessert_id: null,
  hero_drink_id: null,
  secondary_menu_name: '',
  secondary_menu_entrance_id: null,
  secondary_menu_dessert_id: null,
  secondary_menu_drink_id: null,
  secondary_menu_price: 0, 
  secondary_menu_drink_options:'',
  secondary_menu_description: '',
  hero_drink_size: '500cc',
  snappylink_links: [],
  is_bio_active: true,
  snappylink_template_id: 'bio-modern',

  // 🚀 NUEVOS CAMPOS DE DISEÑO BIO (Agregalos acá abajo)
snappylink_title: '', 
  snappylink_bg_color: '#ffffff', 
  snappylink_bg_img: '', 
  snappylink_btn_color: '#000000', 
  snappylink_btn_text_color: '#ffffff', 
  snappylink_shadow_color: '#000000',
  snappylink_title_color: '#000000', 
  snappylink_desc_color: '#666666',
  snappylink_social_links: [], 
  snappylink_social_pos: 'bottom',
  // 🚀 CAMPOS DE PROGRAMACIÓN UNIFICADOS Y CORREGIDOS:
  scheduled_delivery_enabled: false,
  scheduled_delivery_slots: {} as { [key: string]: { from: string, to: string }[] },
  scheduled_delivery_config: {
    interval_minutes: 30, // Duración de cada bloque
    buffer_minutes: 15    // Tiempo de margen
  },
  reservations_enabled: false
});
const getLinksLimit = () => {
    const plan = data?.subscription_plan?.toLowerCase() || 'light';
    if (plan === 'light') return 2;
    if (plan === 'go') return 4;
    return 100; // Ilimitado para Plus y Max
  };

  const linkLimit = getLinksLimit();
  const currentLinksCount = data.snappylink_links?.length || 0;
  const isLimitReached = currentLinksCount >= linkLimit;

  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    const fetchProducts = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: rest } = await supabase.from('restaurants').select('id').eq('user_id', session.user.id).single();
      if (rest) {
        const { data: prods } = await supabase.from('products').select('*').eq('restaurant_id', rest.id);
        if (prods) setProducts(prods);
      }
    };
    fetchProducts();
  }, []);

  const [newProd, setNewProd] = useState({ name: '', price: '', description: '', image_url: '' });

  useEffect(() => {
    if (unsavedChanges && data.id) {
      const timeout = setTimeout(() => { handleSave(); }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [data, unsavedChanges]);

  useEffect(() => {
    let mounted = true;
  const loadData = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    // 1. 🚀 DETECTAMOS SI ES ADMIN (Para el bypass de planes)
    const isSuperAdmin = session.user.email === 'luchiimee2@gmail.com';
    setIsAdmin(isSuperAdmin);

    const { data: rest } = await supabase.from('restaurants').select('*').eq('user_id', session.user.id).single();

    if (rest && mounted) {
      // 2. 🚀 ACTUALIZAMOS ESTADOS INDIVIDUALES (Para que el resto del código los vea)
      setRestaurantId(rest.id);
      setBusinessType(rest.business_type);
      setCurrentPlan(rest.subscription_plan); // Esto evita el error de "currentPlan is not defined"

      const { data: bioData } = await supabase
        .from('snappylinks')
        .select('*')
        .eq('restaurant_id', rest.id)
        .maybeSingle();

      const tId = rest.template_id || 'classic';
      const defaults = TEMPLATE_DEFAULTS[tId] || TEMPLATE_DEFAULTS['classic'];

      // 3. 🚀 CARGAMOS TODO EL OBJETO DATA
      setData({
        ...rest,
        template_id: tId,
        theme_color: rest.theme_color || defaults.theme,
        bg_color: rest.bg_color || defaults.bg,
        text_color: rest.text_color || defaults.text,
        description_color: rest.description_color || defaults.desc,
        promo_bg_color: rest.promo_bg_color || defaults.promo,
        promo_text_color: rest.promo_text_color || (defaults.promo_text || defaults.theme),
        card_name_color: rest.card_name_color || defaults.card_name,
        card_color: rest.card_color || defaults.card || defaults.bg,
        card_desc_color: rest.card_desc_color || defaults.card_desc,
        card_price_color: rest.card_price_color || defaults.card_price,
        card_btn_bg: rest.card_btn_bg || defaults.btn_bg,
        card_btn_text: rest.card_btn_text || defaults.btn_text,
        card_show_bg: rest.card_show_bg !== undefined ? rest.card_show_bg : true,
        cat_bg_color: rest.cat_bg_color || '#f3f4f6',
        cat_text_color: rest.cat_text_color || '#999999',
        cat_active_bg_color: rest.cat_active_bg_color || '#000000',
        cat_active_text_color: rest.cat_active_text_color || '#ffffff',
        search_bg_color: (tId === 'urban' && (rest.search_bg_color === '#ffffff' || rest.search_bg_color === '#f3f4f6'))
          ? '#1E1E1E'
          : (rest.search_bg_color || defaults.search_bg_color || '#ffffff'),

        search_icon_color: (tId === 'urban' && (rest.search_icon_color === '#9ca3af' || !rest.search_icon_color))
          ? '#888888'
          : (rest.search_icon_color || defaults.search_icon_color || '#9ca3af'),
        
        // ... (restantes campos de bio que ya tenías) ...
        snappylink_slug: bioData?.slug || rest.slug + 'bio',
        snappylink_bio: bioData?.bio || '',
        snappylink_links: bioData?.links || [],
        is_bio_active: bioData?.is_active !== undefined ? bioData.is_active : true,
        snappylink_template_id: bioData?.template_id || 'bio-modern',
        
     scheduled_delivery_enabled: rest.scheduled_delivery_enabled ?? false,
  scheduled_delivery_slots: rest.scheduled_delivery_slots ?? {},
  scheduled_delivery_config: rest.scheduled_delivery_config ?? { interval_minutes: 30, buffer_minutes: 15 },
  reservations_enabled: rest.reservations_enabled ?? false,
  hero_dessert_id: rest.hero_dessert_id || null,
        hero_drink_id: rest.hero_drink_id || null,
        secondary_menu_name: rest.secondary_menu_name || '',
        secondary_menu_entrance_id: rest.secondary_menu_entrance_id || null,
        secondary_menu_dessert_id: rest.secondary_menu_dessert_id || null,
        secondary_menu_drink_id: rest.secondary_menu_drink_id || null,
        secondary_menu_price: rest.secondary_menu_price || 0, 
  secondary_menu_drink_options: rest.secondary_menu_drink_options || '',
        secondary_menu_description: rest.secondary_menu_description || '',
hero_drink_size: rest.hero_drink_size || '500cc',
      });

      // Modal de bienvenida (primera vez en Personalizar)
      if (!rest.personalizar_intro_seen) setShowWelcomeModal(true);

      // Carga de productos y categorías (lo que ya tenías abajo)
      setIsLocked(!rest.subscription_plan && !isSuperAdmin);
      const { data: prods } = await supabase.from('products').select('*').eq('restaurant_id', rest.id).order('created_at', { ascending: true });
      if (prods && mounted) setProducts(prods);
      const { data: cats } = await supabase.from('categories').select('*').eq('restaurant_id', rest.id).order('sort_order', { ascending: true });
      if (cats && mounted) setCategories(cats);
    }
  } catch (error) { console.error(error); } finally { if (mounted) setLoading(false); }
};
    loadData();
    return () => { mounted = false; };
  }, []);

  const handleCloseWelcomeModal = async () => {
    setShowWelcomeModal(false);
    if (!restaurantId) return;
    await supabase.from('restaurants').update({ personalizar_intro_seen: true }).eq('id', restaurantId);
  };

const getTemplateConfig = () => {
    const id = data.template_id || 'classic';
    return {
      editable: true, group: id,
      showClassicBanner: id === 'classic',
      showBannerImg: ['spotlight', 'marketpro', 'carta'].includes(id),
      promoMessageDisabled: id === 'carta',

      showAccent: ['urban', 'visualgrid', 'marketpro', 'icecream-v1', 'alterna-pro', 'elegant', 'classic', 'minimal'].includes(id),
      showCard: true,
      showHeroEditor: ['spotlight', 'carta'].includes(id),
      
      showSearch: ['marketpro', 'classic', 'urban', 'minimal', 'spotlight'].includes(id),
      showFonts: ['marketpro', 'elegant', 'bistro'].includes(id),
     
      showCategories: ['marketpro', 'alterna-pro', 'icecream-v1', 'urban', 'classic', 'minimal'].includes(id),
    };
  };


  const tConfig = getTemplateConfig();
  const applyTemplate = (templateId: string) => {
    const defaults = TEMPLATE_DEFAULTS[templateId] || TEMPLATE_DEFAULTS['classic'];
    
    setData({ 
      ...data, 
      template_id: templateId, 
      theme_color: defaults.theme, 
      bg_color: defaults.bg, 
      text_color: defaults.text, 
      description_color: defaults.desc, 
      promo_bg_color: defaults.promo_bg_color || defaults.promo || '#ffebee', 
      promo_text_color: defaults.promo_text_color || defaults.theme || '#d32f2f', 
      card_name_color: defaults.card_name, 
      card_color: defaults.card || defaults.bg, 
      card_desc_color: defaults.card_desc, 
      card_price_color: defaults.card_price, 
      card_btn_bg: defaults.btn_bg, 
      card_btn_text: defaults.btn_text, 
      show_banner: defaults.banner, 
      cat_bg_color: defaults.cat_bg_color || '#f3f4f6', 
      cat_text_color: defaults.cat_text_color || '#999999', 
      cat_active_bg_color: defaults.cat_active_bg_color || '#000000', 
      cat_active_text_color: defaults.cat_active_text_color || '#ffffff',
      // 🚀 ESTO ARREGLA LA BARRA BLANCA:
    search_bg_color: defaults.search_bg_color,
      search_icon_color: defaults.search_icon_color
   
    }); 

    setUnsavedChanges(true); 
    setPreviewTemplateId(null); 
    // Guardamos automáticamente para que el cambio impacte
    setTimeout(() => handleSave(), 500);
  };

const confirmReset = () => {
    const defaults = TEMPLATE_DEFAULTS[data.template_id] || TEMPLATE_DEFAULTS['classic'];
    setData((prev: any) => ({ 
      ...prev, 
      theme_color: defaults.theme, 
      bg_color: defaults.bg, 
      text_color: defaults.text, 
      description_color: defaults.desc, 
      card_name_color: defaults.card_name, 
      card_color: defaults.card || defaults.bg, 
      card_desc_color: defaults.card_desc, 
      card_price_color: defaults.card_price, 
      card_btn_bg: defaults.btn_bg, 
      card_btn_text: defaults.btn_text, 
      promo_bg_color: defaults.promo_bg_color || defaults.promo, 
      promo_text_color: defaults.promo_text_color || defaults.promo_text, 
      search_bg_color: defaults.search_bg_color, 
      search_icon_color: defaults.search_icon_color,
      // 🚀 AGREGAMOS ESTO PARA QUE SE RESTAUREN LAS CATEGORÍAS TAMBIÉN
      cat_bg_color: defaults.cat_bg_color,
      cat_text_color: defaults.cat_text_color,
      cat_active_bg_color: defaults.cat_active_bg_color,
      cat_active_text_color: defaults.cat_active_text_color,
      show_banner: defaults.banner || false,
    }));
    setUnsavedChanges(true);
    setShowRestoreModal(false);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    if (!e.target.files?.length) return;
    const file = e.target.files[0];

    // --- VALIDAR PESO DE IMAGEN (Máx 5MB) ---
    if (file.size > 5 * 1024 * 1024) {
      toast.error("❌ La imagen es muy pesada. Máximo 5MB.");
      return;
    }

    setUploading(true);
    const fileName = `${Math.random()}.${file.name.split('.').pop()}`;
    try {
      await supabase.storage.from('images').upload(fileName, file);
      const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(fileName);
      setData({ ...data, [field]: publicUrl });
      setUnsavedChanges(true);
    } catch (error) { alert('Error subiendo imagen'); } finally { setUploading(false); }
  };

  const handleNewProdImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const file = e.target.files[0];

    // --- VALIDAR PESO DE IMAGEN (Máx 5MB) ---
    if (file.size > 5 * 1024 * 1024) {
      toast.error("❌ La imagen es muy pesada. Máximo 5MB.");
      return;
    }

    setUploading(true);
    const fileName = `prod_${Math.random()}.${file.name.split('.').pop()}`;
    try {
      await supabase.storage.from('images').upload(fileName, file);
      const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(fileName);
      setNewProd({ ...newProd, image_url: publicUrl });
    } catch (error) { alert('Error subiendo imagen de producto'); } finally { setUploading(false); }
  };

 const handleSave = async () => {
  if (!data.id || !data.slug) return;

  // 1. Validar que el link del menú y la bio no sean iguales
  if (data.is_bio_active && data.slug === data.snappylink_slug) {
    setErrorModal({
      show: true,
      title: "Links Iguales",
      msg: "El link del Menú y el de SnappyLinks no pueden ser iguales. Por favor, cambiá uno de los dos."
    });
    return;
  }

  setLoading(true);
  try {
    const { id, created_at, categories, products, fetched_extras, ...updates } = data;
    const restaurantUpdates = { ...updates };
    
    Object.keys(restaurantUpdates).forEach(key => {
      if (key.startsWith('snappylink_') || key === 'is_bio_active') {
        delete (restaurantUpdates as any)[key];
      }
    });

    // 2. Intentar guardar Menú
  const { error: restError } = await supabase.from('restaurants').update({
    ...restaurantUpdates,
    contact_phone: data.contact_phone // 🚀 Agregamos esto para que se guarde en la DB
}).eq('id', data.id);
    
    // Si la DB dice que el SLUG está duplicado:
    if (restError?.code === '23505') {
       throw new Error("Ese link de Menú ya lo está usando otro negocio. Elegí uno diferente.");
    }
    if (restError) throw restError;

    // 3. Intentar guardar Bio
    const { error: bioError } = await supabase.from('snappylinks').upsert({
      restaurant_id: data.id,
      slug: data.snappylink_slug || (data.slug + 'bio'),
      bio: data.snappylink_bio,
      links: data.snappylink_links,
      template_id: data.snappylink_template_id,
      is_active: data.is_bio_active,
      title: data.snappylink_title,
      title_color: data.snappylink_title_color, 
      desc_color: data.snappylink_desc_color,   
      bg_color: data.snappylink_bg_color,
      bg_img: data.snappylink_bg_img,
      btn_color: data.snappylink_btn_color,
      btn_text_color: data.snappylink_btn_text_color,
      shadow_color: data.snappylink_shadow_color,
      logo_url: data.snappylink_logo_url,
      social_links: data.snappylink_social_links || [], 
      social_pos: data.snappylink_social_pos || 'bottom'
    }, { onConflict: 'restaurant_id' });

    // Si la DB dice que el SLUG de la bio está duplicado:
    if (bioError?.code === '23505') {
       throw new Error("Ese link de SnappyLinks ya está en uso. Probá con otro nombre.");
    }
    if (bioError) throw bioError;

 setUnsavedChanges(false);
    setShowSuccessModal(true);
    setTimeout(() => setShowSuccessModal(false), 2000);
    
  } catch (err: any) {
    console.error('Error al guardar:', err.message);
    setErrorModal({
      show: true,
      title: "Hubo un problema",
      msg: err.message
    });
  } finally {
    // 🚀 IMPORTANTE: Esto asegura que el botón vuelva a la normalidad 
    // aunque haya habido un error de duplicado.
    setLoading(false); 
  }
};
  const handleAddProduct = async () => {
    if (!newProd.name || !newProd.price) return alert('Faltan datos');
    try {
      let categoryId;
      const { data: cats } = await supabase.from('categories').select('id').eq('restaurant_id', data.id).limit(1);
      if (cats && cats.length > 0) categoryId = cats[0].id;
      else {
        const { data: newCat } = await supabase.from('categories').insert({ restaurant_id: data.id, name: 'General', sort_order: 1 }).select().single();
        if (newCat) categoryId = newCat.id;
      }
      await supabase.from('products').insert({ restaurant_id: data.id, category_id: categoryId, name: newProd.name, description: newProd.description, price: Number(newProd.price), image_url: newProd.image_url });
      const { data: refreshed } = await supabase.from('products').select('*').eq('restaurant_id', data.id).order('created_at', { ascending: true });
      if (refreshed) { setProducts(refreshed); setNewProd({ name: '', price: '', description: '', image_url: '' }); }
    } catch (error: any) { alert(error.message); }
  };

  const handleDeleteQuick = async (id: string) => {
    if (!confirm('¿Borrar?')) return;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (!error) setProducts(products.filter(p => p.id !== id));
  };

  const copyLink = () => { navigator.clipboard.writeText(`snappy.uno/${data.slug}`); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const handleResetClick = () => setShowRestoreModal(true);



  return (
    <>
      <style>{CUSTOM_STYLES}</style>
      <div className="relative pt-16 xl:pt-6 min-h-screen bg-gray-50/50 px-2 sm:px-6">

        {showWelcomeModal && (
          <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm animate-pop-in">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center mb-3">
                <Sparkles size={22} className="text-indigo-600" />
              </div>
              <h3 className="font-bold text-lg text-gray-900 mb-2">¡Bienvenido a Personalizar!</h3>
              <p className="text-sm text-gray-600 mb-3">
                Acá podés personalizar tu menú: cambiar el banner, el logo, los textos de tu local.
              </p>
              <p className="text-sm text-gray-600 mb-6">
                En la pestaña <span className="font-bold text-indigo-600">ESTILOS</span> podés cambiar todos los colores de tu menú (fondo, textos, botones, etc.)
              </p>
              <button onClick={handleCloseWelcomeModal} className="w-full py-3 rounded-xl font-bold text-sm bg-indigo-600 text-white hover:bg-indigo-700 transition-colors">
                Entendido
              </button>
            </div>
          </div>
        )}
        {showRestoreModal && (
          <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm animate-pop-in">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
              <h3 className="font-bold text-lg text-gray-900 mb-2">¿Restaurar colores?</h3>
              <p className="text-sm text-gray-600 mb-6">Volverás a los colores originales del diseño.</p>
              <div className="flex gap-3">
                <button onClick={() => setShowRestoreModal(false)} className="flex-1 py-3 rounded-xl font-bold text-sm bg-gray-100 hover:bg-gray-200">Cancelar</button>
                <button onClick={confirmReset} className="flex-1 py-3 rounded-xl font-bold text-sm bg-red-600 text-white hover:bg-red-700">Sí, Restaurar</button>
              </div>
            </div>
          </div>
        )}
        {showSuccessModal && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[70] animate-pop-in">
            <div className="bg-gray-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3">
              <CheckCircle size={20} className="text-green-400" /><span className="font-bold text-sm">¡Guardado!</span>
            </div>
          </div>
        )}

        <div className={`transition-all duration-500 ${isLocked ? 'blur-sm pointer-events-none opacity-60 select-none' : ''}`}>
          <div className="flex flex-col xl:flex-row gap-6 pb-24 xl:pb-0 min-w-0">

            {/* ── PANEL IZQUIERDO ── */}
            <div className="flex-1 bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-200 space-y-8 animate-in fade-in slide-in-from-bottom-4 min-w-0">

              {/* TAB SWITCHER */}
              <div className="flex bg-gray-100 p-1.5 rounded-[2rem] border border-gray-200 shadow-sm">
                <button onClick={() => setActiveTab('menu')} className={`flex-1 py-3 rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeTab === 'menu' ? 'bg-white text-black shadow-md scale-[1.02]' : 'text-gray-400 hover:text-gray-600'}`}>
                  <Utensils size={14} /> Editor Menú
                </button>
                <button onClick={() => setActiveTab('snappylinks')} className={`flex-1 py-3 rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeTab === 'snappylinks' ? 'bg-white text-black shadow-md scale-[1.02]' : 'text-gray-400 hover:text-gray-600'}`}>
                  <Zap size={14} className="text-yellow-500 fill-yellow-500" /> SnappyLinks
                </button>
              </div>

              {/* ── CONTENIDO POR TAB ── */}
              {activeTab === 'menu' ? (
                <>
                  {/* HEADER */}
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 border-b border-gray-100 pb-8">
                    <div className="space-y-1">
                      <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-gray-900 tracking-tighter uppercase italic leading-tight">Personalizar tienda</h1>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[11px] sm:text-xs text-gray-400 font-medium">Diseña la apariencia de tu menú digital.</p>
                        {unsavedChanges && <span className="text-[9px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold animate-pulse">Autoguardando...</span>}
                      </div>
                    </div>
                    <div className="flex flex-col gap-3 w-full lg:w-auto">
                      <div className="flex gap-2">
                        <button onClick={() => setShowAdvanced(!showAdvanced)} className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-[11px] font-bold border border-indigo-200 text-indigo-600 hover:bg-indigo-50 transition-all shadow-sm"><Palette size={14} /> Estilos</button>
                        <button onClick={handleSave} disabled={loading} className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-[11px] text-white bg-emerald-600 hover:bg-emerald-700 shadow-md transition-all"><Save size={14} /> Guardado</button>
                      </div>
                      <button onClick={() => setShowMobilePreview(true)} className="xl:hidden flex items-center justify-center gap-2 w-full py-4 bg-black text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-800 transition-all active:scale-95 shadow-xl">
                        <Eye size={18} className="text-indigo-400" /> Mirá cómo va quedando
                      </button>
                    </div>
                  </div>

                  {/* ESTILOS AVANZADOS */}
                  {showAdvanced && tConfig.editable && (
                    <div className="bg-gray-50/50 p-6 rounded-[2.5rem] border border-gray-100 shadow-inner animate-in fade-in zoom-in-95 duration-300 space-y-10">
                      <div className="flex justify-between items-center px-2">
                        <h3 className="font-black text-[10px] uppercase text-gray-400 tracking-[0.2em] italic">Estilos Visuales</h3>
                        <div className="flex items-center gap-3">
                          <button onClick={handleResetClick} className="p-2 text-gray-400 hover:text-red-500 transition-colors"><RotateCcw size={16} /></button>
                          <button onClick={handleSave} className="bg-black text-white px-5 py-2 rounded-xl text-[10px] font-black uppercase shadow-lg active:scale-95 transition-all">Guardar</button>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="text-[10px] font-black text-indigo-600 uppercase tracking-widest ml-2 flex items-center gap-2"><div className="w-1 h-3 bg-indigo-600 rounded-full" /> Identidad del Local</div>
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-x-2 gap-y-6 justify-items-center">
                          <ColorBubble label="Fondo Web" value={data.bg_color} onChange={(v) => setData({ ...data, bg_color: v })} />
                          <ColorBubble label="Nombre Local" value={data.text_color} onChange={(v) => setData({ ...data, text_color: v })} />
                          <ColorBubble label="Desc. Local" value={data.description_color} onChange={(v) => setData({ ...data, description_color: v })} />
                          {tConfig.showAccent && <ColorBubble label="Acento" value={data.theme_color} onChange={(v) => setData({ ...data, theme_color: v })} />}
                     {['alterna-pro', 'marketpro', 'urban', 'classic', 'minimal'].includes(data.template_id) && (<><ColorBubble label="Fondo Cat." value={data.cat_bg_color || '#f3f4f6'} onChange={(v) => setData({ ...data, cat_bg_color: v })} /><ColorBubble label="Texto Cat." value={data.cat_text_color || '#999999'} onChange={(v) => setData({ ...data, cat_text_color: v })} /></>)}
                        {['marketpro', 'urban', 'classic', 'minimal', 'visualgrid', 'spotlight'].includes(data.template_id) && (<><ColorBubble label="Fondo Buscar" value={data.search_bg_color || '#f3f4f6'} onChange={(v) => setData({ ...data, search_bg_color: v })} /><ColorBubble label="Lupa Buscar" value={data.search_icon_color || '#9ca3af'} onChange={(v) => setData({ ...data, search_icon_color: v })} /></>)}
                          {tConfig.showClassicBanner && <ColorBubble 
  label="Banner Nom" 
  value={data.theme_color} 
  onChange={(v) => setData({ ...data, theme_color: v })} />}
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="text-[10px] font-black text-orange-600 uppercase tracking-widest ml-2 flex items-center gap-2"><div className="w-1 h-3 bg-orange-600 rounded-full" /> Carta de Productos</div>
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-x-2 gap-y-6 justify-items-center">
                          <ColorBubble label="Texto Nombre" value={data.card_name_color} onChange={(v) => setData({ ...data, card_name_color: v })} />
                          <ColorBubble label="Fondo Card" value={data.card_color} onChange={(v) => setData({ ...data, card_color: v })} />
                          {data.template_id === 'marketpro' && (<div className="flex flex-col items-center gap-2"><div className="relative w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center"><button onClick={() => { setData({ ...data, card_show_bg: !data.card_show_bg }); setUnsavedChanges(true); }} className={`w-10 h-5 rounded-full flex items-center px-0.5 transition-colors ${data.card_show_bg ? 'bg-black' : 'bg-gray-300'}`}><div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${data.card_show_bg ? 'translate-x-5' : 'translate-x-0'}`} /></button></div><span className="text-[8px] font-black uppercase text-gray-400 text-center leading-tight px-1">Fondo {data.card_show_bg ? 'ON' : 'OFF'}</span></div>)}
                          {data.template_id !== 'alterna-pro' && <ColorBubble label="Texto Desc." value={data.card_desc_color} onChange={(v) => setData({ ...data, card_desc_color: v })} />}
                          <ColorBubble label="Color Precio" value={data.card_price_color} onChange={(v) => setData({ ...data, card_price_color: v })} />
                          {data.template_id === 'pop' && <ColorBubble label="Color Sombra" value={data.card_shadow_color || '#000000'} onChange={(v) => setData({ ...data, card_shadow_color: v })} />}
                          <ColorBubble label="Fondo Botón +" value={data.card_btn_bg} onChange={(v) => setData({ ...data, card_btn_bg: v })} />
                          <ColorBubble label="Símbolo +" value={data.card_btn_text} onChange={(v) => setData({ ...data, card_btn_text: v })} />
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="text-[10px] font-black text-emerald-600 uppercase tracking-widest ml-2 flex items-center gap-2"><div className="w-1 h-3 bg-emerald-600 rounded-full" /> Ofertas y Banners</div>
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 justify-items-center">
                          <ColorBubble label="Fondo Promo" value={data.promo_bg_color} onChange={(v) => setData({ ...data, promo_bg_color: v })} />
                          <ColorBubble label="Texto Promo" value={data.promo_text_color} onChange={(v) => setData({ ...data, promo_text_color: v })} />
                        </div>
                      </div>
                      {tConfig.showFonts && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-gray-100">
                          {[{ label: 'Títulos y Precios', field: 'title_font' }, { label: 'Descripciones', field: 'desc_font' }, { label: 'Banner Promo', field: 'promo_font' }].map(({ label, field }) => (
                            <div key={field} className="space-y-2">
                              <label className="text-[9px] font-black text-indigo-500 uppercase ml-2">{label}</label>
                              <select value={(data as any)[field] || ''} onChange={(e) => { setData({ ...data, [field]: e.target.value }); setUnsavedChanges(true); }} className="w-full p-4 bg-white border border-gray-200 rounded-2xl text-xs font-bold outline-none shadow-sm focus:ring-2 focus:ring-black">
                                <option value="Inter">Moderna (Inter)</option>
                                <option value="Playfair Display">Elegante (Serif)</option>
                                <option value="Patrick Hand">Manuscrita (Chalk)</option>
                              </select>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* LINK */}
                  <section className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Link de tu Menú</label>
                    <div className="flex bg-white rounded-lg border overflow-hidden shadow-sm">
                      <div className="bg-gray-100 px-2 py-2 border-r text-gray-500 text-xs flex items-center select-none font-bold">snappy.uno/</div>
                      <input value={data.slug || ''} onChange={(e) => { setData({ ...data, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') }); setUnsavedChanges(true); }} className="flex-1 p-2 outline-none text-xs font-bold text-gray-800 min-w-0" placeholder="tu-marca" />
                      <button onClick={copyLink} className="px-3 border-l hover:bg-slate-100 flex items-center justify-center text-gray-500 transition-colors">
                        {copied ? <div className="flex items-center gap-1 text-green-600"><Check size={14} /><span className="text-[10px] font-bold">Copiado</span></div> : <Copy size={14} />}
                      </button>
                      <a href={`https://snappy.uno/${data.slug}`} target="_blank" rel="noopener noreferrer" className="px-3 border-l hover:bg-slate-100 flex items-center justify-center text-blue-600 transition-colors"><ExternalLink size={14} /></a>
                    </div>
                  </section>

                  {/* DATOS DEL LOCAL */}
                  <section className="space-y-4">
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-700">Nombre del Negocio</label>
                        <input value={data.name || ''} onChange={(e) => { setData({ ...data, name: e.target.value }); setUnsavedChanges(true); }} className="w-full p-3 border rounded-xl font-bold outline-none text-sm focus:ring-1 focus:ring-black" placeholder="Ej: Pizzería Los Tíos" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-700">Descripción Corta</label>
                        <textarea value={data.description || ''} onChange={(e) => { setData({ ...data, description: e.target.value }); setUnsavedChanges(true); }} className="w-full p-3 border rounded-xl text-xs outline-none focus:ring-1 focus:ring-black resize-none" rows={2} placeholder="La mejor comida de la ciudad..." />
                      </div>
                      <div className={`space-y-1 border p-3 rounded-xl bg-yellow-50/50 border-yellow-100 ${tConfig.promoMessageDisabled ? 'opacity-50' : ''}`}>
                        <div className="flex justify-between items-center mb-2">
                          <label className="text-xs font-bold text-gray-700 flex items-center gap-1"><Megaphone size={12} /> Mensaje Promo (Header)</label>
                          <div className="flex items-center gap-2">
                            <label className={`text-[10px] text-gray-500 font-bold uppercase ${tConfig.promoMessageDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}`} htmlFor="promo-switch">{data.show_promo ? 'Visible' : 'Oculto'}</label>
                            <button disabled={tConfig.promoMessageDisabled} onClick={() => { setData({ ...data, show_promo: !data.show_promo }); setUnsavedChanges(true); }} id="promo-switch" className={`w-8 h-4 rounded-full flex items-center px-0.5 transition-colors ${data.show_promo ? 'bg-black' : 'bg-gray-300'} ${tConfig.promoMessageDisabled ? 'cursor-not-allowed' : ''}`}><div className={`w-3 h-3 bg-white rounded-full shadow-sm transition-transform ${data.show_promo ? 'translate-x-4' : 'translate-x-0'}`} /></button>
                          </div>
                        </div>
                        {tConfig.promoMessageDisabled ? (
                          <p className="text-[10px] text-gray-400 italic">No disponible para este diseño</p>
                        ) : (
                          data.show_promo && <input value={data.promo_message || ''} onChange={(e) => { setData({ ...data, promo_message: e.target.value }); setUnsavedChanges(true); }} className="w-full p-2 border border-gray-200 rounded-lg text-xs outline-none bg-white" placeholder="Ej: Envío GRATIS en tu primera compra" />
                        )}
                      </div>
                    </div>
                  </section>

                  {/* IMÁGENES */}
                  <section className="space-y-2">
                    <label className="text-xs font-bold text-gray-700 block">Imágenes</label>
                    <div className="flex gap-4">
                      <div className="w-20 flex-shrink-0">
                        <div className="aspect-square border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center relative cursor-pointer hover:bg-gray-50 transition group overflow-hidden bg-gray-100">
                          <input type="file" accept="image/*" onChange={(e) => handleUpload(e, 'logo_url')} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                          {data.logo_url ? <img src={getOptimizedImageUrl(data.logo_url, 150, 70, 150, 'cover')} className="w-full h-full object-contain" /> : <Store size={20} className="text-gray-300" />}
                          <div className="absolute inset-0 bg-black/50 text-white text-[8px] font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 transition">LOGO</div>
                        </div>
                      </div>
                      {tConfig.showBannerImg && (
                        <div className="flex-1 flex gap-2">
                          <div className="flex-1 relative h-20 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition group overflow-hidden bg-white">
                            <input type="file" accept="image/*" onChange={(e) => handleUpload(e, 'banner_url')} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                            {data.banner_url ? (<><img src={getOptimizedImageUrl(data.banner_url, 200, 70)} className="w-full h-full object-cover opacity-60" /><div className="absolute inset-0 flex items-center justify-center"><span className="bg-black/60 text-white px-2 py-1 rounded text-[10px] font-bold">Cambiar Portada</span></div></>) : (<div className="flex items-center gap-2 text-gray-400"><ImageIcon size={16} /><span className="text-xs">Subir Portada</span></div>)}
                          </div>
                          <div className="w-20 border rounded-xl flex flex-col items-center justify-center gap-1 bg-gray-50">
                            <span className="text-[8px] font-bold text-gray-500 uppercase">Banner</span>
                            <button onClick={() => { setData({ ...data, show_banner: !data.show_banner }); setUnsavedChanges(true); }} className={`w-8 h-4 rounded-full flex items-center px-0.5 transition-colors ${data.show_banner ? 'bg-black' : 'bg-gray-300'}`}><div className={`w-3 h-3 bg-white rounded-full shadow-sm transition-transform ${data.show_banner ? 'translate-x-4' : 'translate-x-0'}`} /></button>
                            <span className="text-[8px] font-bold text-gray-400">{data.show_banner ? 'ON' : 'OFF'}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </section>

                {/* 🚀 CONFIGURACIÓN DE BANNER Y MENÚS ESPECIALES */}
{tConfig.showHeroEditor && (
  <section className="space-y-6 animate-in fade-in slide-in-from-top-2">
    <div className="p-6 bg-indigo-50/50 border border-indigo-100 rounded-[2.5rem] space-y-6">
      <h3 className="text-xs font-black text-indigo-900 uppercase tracking-widest flex items-center gap-2">
        <Star size={14} className="fill-indigo-600 text-indigo-600" /> Producto en Banner (Hero)
      </h3>
      
      {/* 1. Datos Básicos del Plato Principal */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5 text-left">
            <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Texto Etiqueta</label>
            <input value={data.hero_badge_text || ''} onChange={(e) => { setData({ ...data, hero_badge_text: e.target.value }); setUnsavedChanges(true); }} className="w-full p-3 border rounded-xl text-xs font-bold outline-none bg-white" placeholder="Ej: DESTACADO" />
          </div>
          <div className="space-y-1.5 text-left">
            <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Título del Plato</label>
            <input value={data.hero_title || ''} onChange={(e) => { setData({ ...data, hero_title: e.target.value }); setUnsavedChanges(true); }} className="w-full p-3 border rounded-xl text-xs font-bold outline-none bg-white" placeholder="Ej: Ñoquis caseros" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5 text-left">
            <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Precio ($)</label>
            <input type="number" value={data.hero_price ?? 0} onChange={(e) => { setData({ ...data, hero_price: Number(e.target.value) }); setUnsavedChanges(true); }} className="w-full p-3 text-xs font-bold outline-none border rounded-xl" />
          </div>
          <div className="space-y-1.5 text-left">
            <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Postre Incluido</label>
            <select value={data.hero_dessert_id || ''} onChange={(e) => { setData({ ...data, hero_dessert_id: e.target.value || null }); setUnsavedChanges(true); }} className="w-full p-3 border rounded-xl text-xs font-bold bg-white">
              <option value="">Ninguno</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </div>

        <div className="space-y-1.5 text-left">
          <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Opciones de Bebida y Tamaño</label>
          <div className="flex gap-2">
            <input value={data.hero_drink_options || ''} onChange={(e) => { setData({ ...data, hero_drink_options: e.target.value }); setUnsavedChanges(true); }} className="flex-[2] p-3 border rounded-xl text-xs font-bold outline-none" placeholder="Coca, Sprite, Fanta..." />
            <select value={data.hero_drink_size || '500cc'} onChange={(e) => { setData({ ...data, hero_drink_size: e.target.value }); setUnsavedChanges(true); }} className="flex-1 p-3 border rounded-xl text-[10px] font-black bg-indigo-50 text-indigo-600">
              <option value="250cc">250cc</option>
              <option value="500cc">500cc</option>
              <option value="1lts">1lts</option>
            </select>
          </div>
        </div>

        <div className="space-y-1.5 text-left">
          <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Descripción (se verá en el Modal)</label>
          <textarea value={data.hero_description || ''} onChange={(e) => { setData({ ...data, hero_description: e.target.value }); setUnsavedChanges(true); }} className="w-full p-3 border rounded-xl text-xs outline-none bg-white resize-none" rows={2} />
        </div>
      </div>

      {/* 🍱 SECCIÓN: MENÚ SECUNDARIO / EJECUTIVO */}
      <div className="mt-8 p-6 bg-white border-2 border-dashed border-indigo-200 rounded-[2.5rem] space-y-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600 rounded-2xl text-white shadow-lg"><Layers size={18} /></div>
          <div className="text-left">
            <h4 className="text-[12px] font-black text-indigo-950 uppercase tracking-tighter italic leading-none">Configurar Menú Secundario</h4>
            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-1">Armá un combo fijo (Ej: Menú Ejecutivo)</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5 text-left">
            <label className="text-[10px] font-black text-gray-500 uppercase ml-2">Nombre del Menú</label>
            <input value={data.secondary_menu_name || ''} onChange={(e) => { setData({ ...data, secondary_menu_name: e.target.value }); setUnsavedChanges(true); }} className="w-full p-3 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-bold outline-none" placeholder="Ej: Menú Ejecutivo" />
          </div>
          <div className="space-y-1.5 text-left">
            <label className="text-[10px] font-black text-gray-500 uppercase ml-2">Precio ($)</label>
            <input type="number" value={data.secondary_menu_price || 0} onChange={(e) => { setData({ ...data, secondary_menu_price: Number(e.target.value) }); setUnsavedChanges(true); }} className="w-full p-3 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-bold outline-none" />
          </div>
        </div>

        <div className="space-y-1.5 text-left">
          <label className="text-[10px] font-black text-gray-500 uppercase ml-2">Descripción del combo</label>
          <textarea value={data.secondary_menu_description || ''} onChange={(e) => { setData({ ...data, secondary_menu_description: e.target.value }); setUnsavedChanges(true); }} className="w-full p-3 bg-gray-50 border border-gray-100 rounded-2xl text-xs outline-none resize-none" rows={2} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-gray-50">
          <div className="space-y-1.5 text-left">
            <label className="text-[10px] font-black text-indigo-600 uppercase italic ml-1">1. Plato Principal</label>
            <select value={data.secondary_menu_entrance_id || ''} onChange={(e) => { setData({ ...data, secondary_menu_entrance_id: e.target.value || null }); setUnsavedChanges(true); }} className="w-full p-3 bg-white border border-gray-200 rounded-xl text-xs font-bold outline-none">
              <option value="">Elegir principal...</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5 text-left">
            <label className="text-[10px] font-black text-indigo-600 uppercase italic ml-1">2. Postre Incluido</label>
            <select value={data.secondary_menu_dessert_id || ''} onChange={(e) => { setData({ ...data, secondary_menu_dessert_id: e.target.value || null }); setUnsavedChanges(true); }} className="w-full p-3 bg-white border border-gray-200 rounded-xl text-xs font-bold outline-none">
              <option value="">Elegir postre...</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </div>

        <div className="space-y-1.5 text-left p-4 bg-indigo-50/50 rounded-3xl border border-indigo-100">
          <label className="text-[10px] font-black text-indigo-600 uppercase italic ml-1">3. Bebidas y Tamaño</label>
          <div className="flex gap-2">
            <input value={data.secondary_menu_drink_options || ''} onChange={(e) => { setData({ ...data, secondary_menu_drink_options: e.target.value }); setUnsavedChanges(true); }} className="flex-[2] p-3 bg-white border border-gray-200 rounded-xl text-xs font-bold outline-none" placeholder="Coca, Sprite, Agua..." />
            <select value={data.secondary_menu_drink_size || '500cc'} onChange={(e) => { setData({ ...data, secondary_menu_drink_size: e.target.value }); setUnsavedChanges(true); }} className="flex-1 p-3 bg-white border border-dashed border-indigo-200 rounded-xl text-[10px] font-black text-indigo-600">
              <option value="250cc">250cc</option>
              <option value="500cc">500cc</option>
              <option value="1lts">1 Litro</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  </section>
)}

                  {/* WHATSAPP / ENVÍO / MP */}
                  <section className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">WhatsApp</label>
                        <div className="flex items-center border rounded-lg bg-white overflow-hidden">
    <div className="p-2 bg-green-50 text-green-600 border-r"><Phone size={14} /></div>
    <input 
  value={data.phone || ''} 
  onChange={(e) => { 
    setData({ ...data, phone: e.target.value }); // Guarda en 'phone'
    setUnsavedChanges(true); 
  }} 
  className="w-full p-2 text-xs font-bold outline-none"
      placeholder="11..." 
    />
  </div>
                        <p className="text-[10px] text-gray-400 mt-1 leading-tight">Este número recibirá los pedidos.</p>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Envío ($)</label>
                        <div className="flex items-center border rounded-lg bg-white overflow-hidden"><div className="p-2 bg-gray-50 text-gray-500 border-r"><Bike size={14} /></div><input type="number" value={data.delivery_cost} onChange={(e) => { setData({ ...data, delivery_cost: Number(e.target.value) }); setUnsavedChanges(true); }} className="w-full p-2 text-xs font-bold outline-none" placeholder="0" /></div>
                        <p className="text-[10px] text-gray-400 mt-1 leading-tight">Costo fijo de envío.</p>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Alias (Mercado Pago)</label>
                      <div className="flex items-center border rounded-lg bg-white overflow-hidden"><div className="p-2 bg-purple-50 text-purple-500 border-r"><CreditCard size={14} /></div><input value={data.alias_mp || ''} onChange={(e) => { setData({ ...data, alias_mp: e.target.value }); setUnsavedChanges(true); }} className="w-full p-2 text-xs font-bold outline-none" placeholder="alias.mp" /></div>
                      <p className="text-[10px] text-gray-400 mt-1 leading-tight">Se copiará al confirmar pedido.</p>
                    </div>
                  </section>

       
                
                    <section className="p-5 bg-indigo-50/50 border border-indigo-100 rounded-2xl space-y-4 animate-in fade-in slide-in-from-top-2">
                      <h3 className="text-[10px] font-black text-indigo-900 uppercase tracking-widest flex items-center gap-2"><Store size={14} /> Información y Redes</h3>
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1"><label className="text-[10px] font-bold text-gray-500 uppercase">Dirección</label><input value={data.address || ''} onChange={(e) => { setData({ ...data, address: e.target.value }); setUnsavedChanges(true); }} className="w-full p-2.5 border rounded-xl text-xs outline-none bg-white font-bold" placeholder="Ej: Av. Santa Fe 1234, CABA" /></div>
                          <div className="space-y-1"><label className="text-[10px] font-bold text-gray-400 uppercase italic">Link Google Maps (Opcional)</label><input value={data.google_maps_link || ''} onChange={(e) => { setData({ ...data, google_maps_link: e.target.value }); setUnsavedChanges(true); }} className="w-full p-2.5 border rounded-xl text-xs outline-none bg-white" placeholder="Pegá el link..." /></div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {[{ label: 'Instagram', field: 'instagram', ph: 'instagram.com/tu-user' }, { label: 'Facebook', field: 'facebook', ph: 'facebook.com/tu-página' }, { label: 'TikTok', field: 'tiktok', ph: 'tiktok.com/@tu-user' }].map(({ label, field, ph }) => (
                            <div key={field} className="space-y-1"><label className="text-[9px] font-bold text-gray-400 uppercase">{label}</label><input value={(data as any)[field] || ''} onChange={(e) => { setData({ ...data, [field]: e.target.value }); setUnsavedChanges(true); }} className="w-full p-2 border rounded-lg text-[10px] outline-none" placeholder={ph} /></div>
                          ))}
                        </div>
     <div className="space-y-1">
  <label className="text-[9px] font-bold text-green-600 uppercase flex items-center gap-1">
    <Phone size={10} /> WhatsApp Contacto (Público)
  </label>
  <input 
    value={data.contact_phone || ''} 
    onChange={(e) => { 
      setData({ ...data, contact_phone: e.target.value }); // 🚀 AHORA SÍ: Guarda en 'contact_phone'
      setUnsavedChanges(true); 
    }} 
    className="w-full p-2.5 border-2 border-green-200 rounded-xl text-xs outline-none bg-green-50 font-bold text-green-900"
    placeholder="Ej: 54911..." 
  />
</div>
                        <div className="space-y-1"><label className="text-[10px] font-bold text-gray-500 uppercase">Horarios</label><textarea value={data.opening_hours || ''} onChange={(e) => { setData({ ...data, opening_hours: e.target.value }); setUnsavedChanges(true); }} className="w-full p-2.5 border rounded-xl text-xs outline-none bg-white resize-none" rows={2} /></div>
                      </div>
                    </section>
         

{/* 🎫 GESTIÓN DE RESERVAS (BLOQUEO POR PLAN) */}
{(() => {
    // 🛡️ LÓGICA DE ACCESO ESTRICTA POR PLAN
    // Quitamos "|| isAdmin" para que vos puedas testear el bloqueo al cambiar de plan
    const plan = currentPlan?.toLowerCase();
    const hasAccess = plan === 'plus' || plan === 'max';
    
    // Si no tiene acceso, forzamos que el switch se vea desactivado visualmente
    const isEnabled = hasAccess ? data.reservations_enabled : false;
    
    return (
        <section className={`p-6 border-2 rounded-[2.5rem] space-y-4 shadow-sm mb-6 transition-all ${hasAccess ? 'bg-white border-amber-100' : 'bg-gray-50 border-gray-200 opacity-80'}`}>
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-2xl text-white shadow-lg ${hasAccess ? 'bg-amber-500 shadow-amber-100' : 'bg-gray-400'}`}>
                        <CalendarIcon size={20} />
                    </div>
                    <div className="text-left">
                        <h3 className="font-black text-xs uppercase tracking-tighter italic text-gray-900 leading-none flex items-center gap-2">
                            Reservas de Mesa {!hasAccess && <Lock size={10} className="text-gray-400" />}
                        </h3>
                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-1">Habilitar reservas en el Menú</p>
                    </div>
                </div>
                
                {hasAccess ? (
                    // ✅ SWITCH ACTIVO (Solo para PLUS/MAX)
                    <button 
                        type="button"
                        onClick={() => { setData({...data, reservations_enabled: !data.reservations_enabled}); setUnsavedChanges(true); }}
                        className={`w-12 h-6 rounded-full flex items-center px-1 transition-all ${isEnabled ? 'bg-emerald-500' : 'bg-gray-200'}`}
                    >
                        <div className={`w-4 h-4 bg-white rounded-full shadow-md transition-transform ${isEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                    </button>
                ) : (
                    // ❌ BOTÓN DE UPGRADE (Para LIGHT/GO y Admin testeando)
                    <Link href="/dashboard/plan" className="bg-gray-900 text-white px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest flex items-center gap-1 shadow-md hover:bg-black transition-all active:scale-95">
                        <Zap size={10} className="text-yellow-400 fill-yellow-400"/> Subir a Plus
                    </Link>
                )}
            </div>
            
            <div className={`p-4 rounded-2xl border transition-all ${hasAccess ? (isEnabled ? 'bg-amber-50 border-amber-100' : 'bg-gray-50 border-gray-100') : 'bg-white/50 border-gray-100'}`}>
                <p className="text-[10px] font-bold text-gray-600 leading-tight text-left">
                    {!hasAccess 
                        ? "💎 Esta función es exclusiva del Plan Plus. Permite que tus clientes reserven mesa directamente desde tu menú digital."
                        : isEnabled 
                            ? "✅ El botón de reservas es visible para tus clientes en la sección de información." 
                            : "❌ El botón de reservas está oculto. Tus clientes no verán la opción en el Menú."
                    }
                </p>
            </div>
        </section>
    );
})()}

{/* 📅 GESTIÓN DE TURNOS Y BLOQUES HORARIOS */}
<section className="p-6 bg-white border-2 border-indigo-100 rounded-[2.5rem] space-y-6 shadow-sm">
    <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 rounded-2xl text-white shadow-lg">
                <Clock size={20} />
            </div>
            
            <div className="text-left">
                <h3 className="font-black text-xs uppercase tracking-tighter italic text-gray-900 leading-none">Turnos de Entrega</h3>
                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-1">Configurá tus franjas horarias</p>
            </div>
        </div>
        
        <button 
            type="button"
            onClick={() => { setData({...data, scheduled_delivery_enabled: !data.scheduled_delivery_enabled}); setUnsavedChanges(true); }}
            className={`w-12 h-6 rounded-full flex items-center px-1 transition-all ${data.scheduled_delivery_enabled ? 'bg-emerald-500' : 'bg-gray-200'}`}
        >
            <div className={`w-4 h-4 bg-white rounded-full shadow-md transition-transform ${data.scheduled_delivery_enabled ? 'translate-x-6' : 'translate-x-0'}`} />
        </button>
    </div>
{/* 🚀 LÍNEA 934: TEXTO INFORMATIVO DE FUNCIONAMIENTO */}
<div className={`p-4 rounded-[1.5rem] border-2 transition-all duration-500 ${data.scheduled_delivery_enabled ? 'bg-indigo-50 border-indigo-100' : 'bg-gray-50 border-gray-100'}`}>
    <div className="flex gap-3 text-left">
        <div className={`p-1.5 rounded-full h-fit flex-shrink-0 ${data.scheduled_delivery_enabled ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-400'}`}>
            <HelpCircle size={14} />
        </div>
        <div>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 mb-1">Información del sistema</p>
            <p className="text-[11px] font-bold text-gray-600 leading-snug">
                {data.scheduled_delivery_enabled ? (
                    <span className="animate-in fade-in">
                        <strong className="text-indigo-600 uppercase italic">Modo Agenda Activo:</strong> Tus clientes deberán elegir un turno específico para recibir o retirar su pedido.
                    </span>
                ) : (
                    <span className="animate-in fade-in">
                        <strong className="text-gray-900 uppercase italic">Modo Estándar:</strong> El cliente no verá horarios. Se entiende que el pedido se despacha <span className="underline decoration-indigo-300">lo antes posible</span> apenas esté listo.
                    </span>
                )}
            </p>
        </div>
    </div>
</div>
    {data.scheduled_delivery_enabled && (
        <div className="space-y-6 animate-in fade-in duration-300">
         
         {/* --- CONFIGURACIÓN TÉCNICA REBAUTIZADA --- */}
<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50 p-5 rounded-[2rem] border border-gray-100 shadow-inner">
    
    {/* 1. TURNOS CADA (INTERVALO) */}
    <div className="space-y-1.5 text-left">
        <label className="text-[10px] font-black text-indigo-600 uppercase ml-2 tracking-widest">Pedidos cada:</label>
        <select 
            value={data.scheduled_delivery_config.interval_minutes}
            onChange={(e) => {
                setData({ ...data, scheduled_delivery_config: { ...data.scheduled_delivery_config, interval_minutes: Number(e.target.value) } });
                setUnsavedChanges(true);
            }}
            className="w-full p-3 bg-white border-none rounded-xl text-xs font-bold outline-none shadow-sm focus:ring-2 focus:ring-indigo-500"
        >
            <option value={15}>15 minutos</option>
            <option value={30}>30 minutos</option>
            <option value={60}>1 hora</option>
        </select>
        <p className="text-[8px] text-gray-400 font-bold px-2 leading-tight uppercase tracking-tighter">
            Define la frecuencia de horarios que verá el cliente (Ej: 20:00, 20:30, 21:00).
        </p>
    </div>

    {/* 2. PREPARACIÓN MÍNIMA (BUFFER) */}
    <div className="space-y-1.5 text-left">
        <label className="text-[10px] font-black text-indigo-600 uppercase ml-2 tracking-widest">Preparación mínima:</label>
        <select 
            value={data.scheduled_delivery_config.buffer_minutes}
            onChange={(e) => {
                setData({ ...data, scheduled_delivery_config: { ...data.scheduled_delivery_config, buffer_minutes: Number(e.target.value) } });
                setUnsavedChanges(true);
            }}
            className="w-full p-3 bg-white border-none rounded-xl text-xs font-bold outline-none shadow-sm focus:ring-2 focus:ring-indigo-500"
        >
            <option value={0}>Sin tiempo de espera</option>
            <option value={15}>15 min de aviso</option>
            <option value={30}>30 min de aviso</option>
            <option value={60}>1 hora de aviso</option>
        </select>
        <p className="text-[8px] text-gray-400 font-bold px-2 leading-tight uppercase tracking-tighter">
            Evita pedidos inmediatos. El cliente solo verá turnos disponibles después de este tiempo.
        </p>
    </div>
</div>
           

{/* 📅 GENERADOR DE TURNOS DINÁMICO */}
<div className="bg-indigo-50/50 p-6 rounded-[2.5rem] border border-indigo-100 space-y-6">
    
    {/* 1. SELECCIÓN DE HORARIO (Manda sobre los días) */}
    <div className="space-y-3">
        <label className="text-[10px] font-black text-indigo-600 uppercase ml-2 tracking-widest">1. Definí el horario:</label>
        <div className="flex gap-3">
            <div className="flex-1 space-y-1">
                <span className="text-[8px] font-black text-gray-400 uppercase ml-2">Desde</span>
                <input 
                    type="time" 
                    value={activeFrom}
                    onChange={(e) => setActiveFrom(e.target.value)}
                    className="w-full p-3 bg-white border rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm" 
                />
            </div>
            <div className="flex-1 space-y-1">
                <span className="text-[8px] font-black text-gray-400 uppercase ml-2">Hasta</span>
                <input 
                    type="time" 
                    value={activeTo}
                    onChange={(e) => setActiveTo(e.target.value)}
                    className="w-full p-3 bg-white border rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm" 
                />
            </div>
        </div>
    </div>

    {/* 2. SELECTOR DE DÍAS (Al tocar, se agrega) */}
    <div className="space-y-3">
        <label className="text-[10px] font-black text-indigo-600 uppercase ml-2 tracking-widest">2. Tocá los días para asignar:</label>
        <div className="flex flex-wrap gap-2">
            {['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'].map((dia) => (
                <button
                    key={dia}
                    type="button"
                    onClick={() => {
                        if (!activeFrom || !activeTo) return toast.error("Elegí un horario primero");
                        
                        const currentSlots = data.scheduled_delivery_slots || {};
                        const daySlots = currentSlots[dia] || [];
                        
                        // Evitamos duplicados exactos
                        if (daySlots.some((s: any) => s.from === activeFrom && s.to === activeTo)) {
                            return toast.error("Este horario ya existe para este día");
                        }

                        setData({
                            ...data,
                            scheduled_delivery_slots: {
                                ...currentSlots,
                                [dia]: [...daySlots, { from: activeFrom, to: activeTo }]
                            }
                        });
                        setUnsavedChanges(true);
                        toast.success(`Asignado al ${dia}`);
                    }}
                    className="flex-1 min-w-[80px] py-3 bg-white border-2 border-gray-100 rounded-2xl font-black text-[10px] uppercase text-gray-400 hover:border-indigo-400 hover:text-indigo-600 transition-all active:scale-95 shadow-sm"
                >
                    {dia.slice(0, 3)}
                </button>
            ))}
        </div>
    </div>

    {/* 3. BOTÓN PARA REINICIAR */}
    <button 
        type="button"
        onClick={() => { setActiveFrom(''); setActiveTo(''); }}
        className="w-full py-3 bg-white border-2 border-dashed border-indigo-200 text-indigo-400 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-indigo-50 transition-all"
    >
        Limpiar para nuevo horario
    </button>
</div>

{/* AGENDA VISUAL (BLOQUES LADO A LADO) */}
<div className="space-y-3 mt-6">
    {['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'].map((dia) => (
        <div key={dia} className="flex items-center gap-3 p-3 bg-white border border-gray-100 rounded-[1.5rem] shadow-sm">
            <div className="w-16 flex-shrink-0 border-r border-gray-100">
                <span className="text-[9px] font-black uppercase text-indigo-950 italic">{dia.slice(0, 3)}</span>
            </div>
            <div className="flex flex-wrap gap-2 flex-1">
                {data.scheduled_delivery_slots?.[dia]?.length > 0 ? (
                    data.scheduled_delivery_slots[dia].map((range: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-2 bg-indigo-600 text-white px-3 py-1.5 rounded-full shadow-md animate-in zoom-in">
                            <span className="text-[9px] font-black tracking-tighter">{range.from} - {range.to}</span>
                            <button 
                                type="button" 
                                onClick={() => {
                                    const newSlots = { ...data.scheduled_delivery_slots };
                                    newSlots[dia] = newSlots[dia].filter((_: any, i: number) => i !== idx);
                                    setData({ ...data, scheduled_delivery_slots: newSlots });
                                    setUnsavedChanges(true);
                                }}
                                className="text-white/50 hover:text-white"
                            >
                                <X size={12} strokeWidth={3} />
                            </button>
                        </div>
                    ))
                ) : (
                    <span className="text-[8px] font-bold text-gray-300 uppercase tracking-widest italic">Cerrado</span>
                )}
            </div>
        </div>
    ))}
</div>
        </div>
    )}
</section>

                  {/* CARGA RÁPIDA */}
                  <section className="pt-4 border-t">
                    <h3 className="font-bold flex items-center gap-2 text-sm mb-3"><Utensils size={16} /> Carga rápida</h3>
                    {products.length < 2 ? (
                      <div className="bg-gray-50 border p-3 rounded-xl space-y-2">
                        <div className="flex gap-2">
                          {!templatesSinFoto.some(t => data.template_id?.toLowerCase().includes(t)) ? (
                            <div className="w-12 h-12 bg-white border border-dashed border-gray-200 rounded-lg flex items-center justify-center relative cursor-pointer flex-shrink-0 group">
                              <input type="file" accept="image/*" onChange={handleNewProdImage} className="absolute inset-0 opacity-0 cursor-pointer" />
                              {newProd.image_url ? <img src={getOptimizedImageUrl(newProd.image_url, 150, 70)} className="w-full h-full object-cover rounded-lg" /> : <Plus size={16} className="text-gray-400 group-hover:text-violet-500 transition-colors" />}
                            </div>
                          ) : (
                            <button type="button" onClick={() => alert(`El diseño "${data.template_id.toUpperCase()}" no usa imágenes de productos.`)} className="w-12 h-12 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-center flex-shrink-0 hover:bg-amber-100 transition-colors shadow-sm" title="¿Por qué no puedo subir fotos?">
                              <ImageIcon size={16} className="text-amber-500" />
                            </button>
                          )}
                          <div className="flex-1 min-w-0 space-y-1">
                            <input value={newProd.name} onChange={(e) => setNewProd({ ...newProd, name: e.target.value })} placeholder="Nombre del plato" className="w-full p-1.5 border rounded text-xs font-bold" />
                            <input type="number" value={newProd.price} onChange={(e) => setNewProd({ ...newProd, price: e.target.value })} placeholder="$ Precio" className="w-full p-1.5 border rounded text-xs" />
                          </div>
                        </div>
                        <textarea value={newProd.description} onChange={(e) => setNewProd({ ...newProd, description: e.target.value })} placeholder="Ingredientes..." className="w-full p-2 border rounded text-xs outline-none resize-none" rows={1} />
                        <button onClick={handleAddProduct} disabled={loading || !newProd.name} className="w-full bg-gray-900 text-white py-2 rounded-lg text-xs font-bold flex justify-center gap-2 items-center hover:bg-black transition-colors">Agregar al Menú</button>
                      </div>
                    ) : (
                      <div className="bg-green-50 border border-green-200 p-3 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-2 text-green-800 text-xs font-bold"><Check size={16} /> {products.length} productos cargados</div>
                        <Link href="/dashboard/products" className="text-xs bg-white border border-green-200 px-3 py-1.5 rounded-lg font-bold text-green-700 hover:bg-green-50">Gestionar Todos</Link>
                      </div>
                    )}
                 <div className="mt-3 space-y-2">
      {products.slice(0, 3).map((p: any) => (
        <div key={p.id} className="flex items-center gap-3 p-2 border rounded-lg bg-white">
          <div className="w-8 h-8 bg-gray-100 rounded overflow-hidden flex-shrink-0">
            {p.image_url && <img src={getOptimizedImageUrl(p.image_url, 100, 70)} className="w-full h-full object-cover" alt={p.name} />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold truncate text-left">{p.name}</div>
          </div>
          <div className="text-xs text-gray-500">${p.price}</div>
          <button onClick={() => handleDeleteQuick(p.id)} className="text-red-400 hover:text-red-600">
            <Trash2 size={14} />
          </button>
        </div>
      ))}
      
      {/* AVISO SI ESTÁ VACÍO */}
      {products.length === 0 && (
        <p className="text-[10px] text-gray-400 italic text-center py-2">
          Todavía no cargaste productos reales.
        </p>
      )}
    </div>
                  </section>
                </>
              ) : (
              // ── EDITOR SNAPPYLINKS (LÓGICA: EL QR NO SE TOCA) ──────────────────
               <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300 text-left">
    
   {/* --- 🚀 EXPLICACIÓN PROFESIONAL PARA EL CLIENTE --- */}
<section className="bg-white border-2 border-indigo-100 p-6 rounded-[2.5rem] space-y-5 shadow-sm animate-in fade-in zoom-in-95 duration-300">
    <div className="flex items-center gap-3">
        <div className="p-2.5 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-100">
            <Zap size={22} fill="white"/>
        </div>
        <div>
            <h3 className="font-black text-sm uppercase tracking-tighter italic text-gray-900">Potenciá tu presencia online</h3>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Página de enlaces profesional</p>
        </div>
    </div>
    
    <div className="space-y-4">
        <p className="text-[11px] text-gray-600 leading-relaxed font-medium">
            SnappyLinks es tu propia página de enlaces personalizada. Ideal para que tus clientes encuentren todo lo que necesitan con un solo clic desde tu biografía.
        </p>
        
        <div className="grid grid-cols-1 gap-2">
            <div className="flex items-center gap-2 text-[10px] font-bold text-indigo-900">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"/>
                Centralizá WhatsApp, redes y tu menú en un solo lugar.
            </div>
            <div className="flex items-center gap-2 text-[10px] font-bold text-indigo-900">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"/>
                Mantené el diseño y los colores de tu marca.
            </div>
            <div className="flex items-center gap-2 text-[10px] font-bold text-indigo-900">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"/>
                Sin necesidad de crear cuentas en aplicaciones externas.
            </div>
        </div>
    </div>

    {/* GUÍA DE LINKS RÁPIDA */}
    <div className="space-y-3 pt-2">
        <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
            <span className="text-[8px] font-black uppercase text-emerald-600 block mb-1">Para tus mesas (QR)</span>
            <p className="text-[11px] font-bold text-emerald-900 leading-tight">
                Seguí usando <span className="underline italic">snappy.uno/{data.slug}</span>
                <br/><span className="text-[9px] opacity-70">Lleva directo a tu carta digital. No tenés que cambiar tus QR.</span>
            </p>
        </div>
        
       
    </div>
</section>

   {/* 2. SWITCH DE ACTIVACIÓN: CREA EL BOTÓN AUTOMÁTICAMENTE */}
<section className="bg-indigo-600 p-6 rounded-[2.5rem] text-white shadow-xl shadow-indigo-100 flex justify-between items-center transition-all">
    <div className="space-y-1">
        <h3 className="font-black text-xs uppercase tracking-widest italic text-indigo-50">Activar SnappyLinks</h3>
        <p className="text-[10px] opacity-80 font-bold uppercase">
            {data.is_bio_active ? 'Página Online' : 'Página Pausada'}
        </p>
    </div>
    <button 
    onClick={() => { 
        const nextActive = !data.is_bio_active;
        
        // 1. Forzamos la creación del slug si está vacío
        // Si no tiene uno, le ponemos el nombre del local + 'bio'
        const finalBioSlug = data.snappylink_slug || (data.slug + 'bio');
        
        let nextLinks = [...(data.snappylink_links || [])];
        
        // 2. Agregamos el botón del menú si es la primera vez que activa
        const hasMenu = nextLinks.some(l => l.label.includes("Menú"));
        if (nextActive && !hasMenu) {
            const menuBtn = { label: '📖 Ver Menú Digital', url: `https://snappy.uno/${data.slug}` };
            nextLinks = [menuBtn, ...nextLinks];
        }
        
        // 3. ACTUALIZAMOS EL ESTADO COMPLETO
        // Al setear el slug acá, el "Autoguardado" detecta el cambio y lo manda a Supabase
        setData({ 
            ...data, 
            is_bio_active: nextActive, 
            snappylink_slug: finalBioSlug, 
            snappylink_links: nextLinks 
        }); 
        
        // 4. Disparamos el guardado
        setUnsavedChanges(true); 
    }}
    className={`w-14 h-7 rounded-full flex items-center px-1 transition-all duration-300 ${data.is_bio_active ? 'bg-emerald-400' : 'bg-white/20'}`}
>
    <div className={`w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-300 ${data.is_bio_active ? 'translate-x-7' : 'translate-x-0'}`} />
</button>
</section>

  {/* 3. EDITOR DE LINK Y CONTENIDO */}
    {data.is_bio_active ? (
      <div className="space-y-8 animate-in slide-in-from-top-4 duration-500">
        
        {/* EDITOR DE LINK PARA REDES (Siempre visible) */}
        <section className="space-y-3">
            <h3 className="font-black text-[10px] uppercase text-gray-400 tracking-widest italic flex items-center gap-2 ml-2">
                <ExternalLink size={14} /> Link para tus Redes Sociales
            </h3>
          <div className="flex bg-white rounded-2xl border-2 border-indigo-500 overflow-hidden shadow-lg shadow-indigo-50">
    <div className="bg-indigo-50 px-3 py-3 border-r border-indigo-100 text-indigo-600 text-xs flex items-center select-none font-black italic shrink-0">
        snappy.uno/
    </div>
    <input 
        value={data.snappylink_slug || (data.slug ? data.slug + 'bio' : '')} 
        onChange={(e) => { 
            setData({...data, snappylink_slug: e.target.value.toLowerCase().replace(/\s+/g, '-')}); 
            setUnsavedChanges(true); 
        }}
        className="flex-1 p-3 outline-none text-xs font-black text-gray-800 min-w-0" // 🚀 Agregamos min-w-0
        placeholder="nombre-bio"
    />
    <button 
        onClick={() => {
            const link = `snappy.uno/${data.snappylink_slug || data.slug + 'bio'}`;
            navigator.clipboard.writeText(link);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }}
        className="px-4 border-l bg-gray-50 hover:bg-indigo-50 text-indigo-600 transition-colors flex items-center gap-2 shrink-0" // 🚀 Agregamos shrink-0
    >
        {copied ? <Check size={16} className="text-emerald-500"/> : <Copy size={16}/>}
        <span className="text-[10px] font-black uppercase">{copied ? 'Copiado' : 'Copiar'}</span>
    </button>
</div>
        </section>

        {/* 🖼️ SECCIÓN 1: IMAGEN DE PERFIL (Siempre visible) */}
        <section className="space-y-4">
            <h3 className="font-black text-[10px] uppercase text-gray-400 tracking-widest italic flex items-center gap-2 ml-2">
                <ImageIcon size={14} /> Imagen de Perfil
            </h3>
            <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm flex items-center gap-6">
                <div className="relative group">
                    <div className="w-20 h-20 rounded-full border-4 border-indigo-50 shadow-xl overflow-hidden bg-gray-50 flex items-center justify-center">
                        <img
                            src={getOptimizedImageUrl(data.snappylink_logo_url || data.logo_url || '/placeholder.png', 150, 75) as string}
                            className="w-full h-full object-cover"
                        />
                    </div>
                    <label className="absolute inset-0 flex items-center justify-center bg-black/40 text-white rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                        <UploadCloud size={20} />
                        <input 
                            type="file" 
                            accept="image/*" 
                            onChange={(e) => handleUpload(e, 'snappylink_logo_url')} 
                            className="hidden" 
                        />
                    </label>
                </div>
                <div className="flex-1 space-y-1 text-left">
                    <p className="text-xs font-black text-gray-800 uppercase italic leading-none">Logo Personalizado</p>
                    <p className="text-[10px] text-gray-400 font-medium leading-tight">
                        {data.snappylink_logo_url 
                            ? "Estás usando un logo exclusivo para tu Bio." 
                            : "Usando por defecto el logo de tu menú."}
                    </p>
                    {data.snappylink_logo_url && (
                        <button 
                            onClick={() => { setData({...data, snappylink_logo_url: null}); setUnsavedChanges(true); }}
                            className="text-[9px] font-black text-red-400 uppercase underline hover:text-red-600 transition-colors block mt-1"
                        >
                            Restaurar original
                        </button>
                    )}
                </div>
            </div>
        </section>
{/* 🎨 SECCIÓN: ESTILO VISUAL DE BIO (NUEVO) */}
<section className="space-y-4">
    <button 
        onClick={() => setShowBioDesigns(!showBioDesigns)} // Reutilizamos o creamos un state para este toggle
        className="w-full flex justify-between items-center p-5 bg-indigo-50 border-2 border-indigo-100 rounded-[2.5rem] group shadow-sm hover:bg-indigo-100 transition-all"
    >
        <h3 className="font-black text-xs uppercase text-indigo-950 tracking-tighter italic flex items-center gap-3">
            <Palette size={18} className="text-indigo-600"/> Diseño y Colores
        </h3>
        <div className={`transition-transform duration-300 ${showBioDesigns ? 'rotate-180' : 'rotate-0'}`}>
            <ChevronDown size={20} className="text-indigo-400 group-hover:text-indigo-600" />
        </div>
    </button>
{showBioDesigns && (
    <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-10 animate-in fade-in slide-in-from-top-2">
        
        
        {/* 1️⃣ GRILLA DE DISEÑOS (Plantillas) */}
        <div className="space-y-4">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Elegí una plantilla</p>
            <div className="grid grid-cols-3 gap-4 px-2">
                {[
                    { id: 'bio-modern', name: 'Modern', status: 'active' },
                    { id: 'bio-glass', name: 'Glass', status: 'soon' },
                    { id: 'bio-dark', name: 'Dark', status: 'soon' }
                ].map((temp) => (
                    <button
                        key={temp.id}
                        disabled={temp.status === 'soon'}
                        onClick={() => {
                            if (temp.status === 'active') {
                                setData({ ...data, snappylink_template_id: temp.id });
                                setUnsavedChanges(true);
                            }
                        }}
                        className={`relative flex flex-col items-center gap-2.5 group transition-all ${temp.status === 'active' ? 'active:scale-95' : 'cursor-default'}`}
                    >
                        {/* Mockup de Celular Fiel al Diseño */}
                        <div className={`w-full aspect-[9/16] rounded-[1.5rem] border-2 transition-all overflow-hidden flex flex-col p-2.5 gap-1.5 shadow-sm relative ${
                            data.snappylink_template_id === temp.id 
                            ? 'border-indigo-600 ring-4 ring-indigo-50 shadow-indigo-100' 
                            : 'border-gray-100 bg-white hover:border-indigo-300'
                        } ${temp.status === 'soon' ? 'opacity-40 grayscale' : ''}`}>
                            
                            {/* Pantalla Interna */}
                            <div className={`w-full h-full rounded-[1rem] flex flex-col items-center pt-4 gap-3 ${temp.id === 'bio-dark' ? 'bg-zinc-950' : 'bg-zinc-50'}`}>
                                
                                {/* Foto de Perfil Mini */}
                                <div className={`w-6 h-6 rounded-full shrink-0 ${
                                    temp.id === 'bio-dark' ? 'bg-zinc-800' : 'bg-white'
                                } shadow-sm border border-gray-100`}></div>
                                
                                {/* Líneas de Texto (Nombre y Bio) */}
                                <div className="space-y-1 w-full flex flex-col items-center px-2">
                                    <div className={`w-10 h-1 rounded-full ${temp.id === 'bio-dark' ? 'bg-zinc-700' : 'bg-gray-300'}`}></div>
                                    <div className={`w-14 h-0.5 rounded-full ${temp.id === 'bio-dark' ? 'bg-zinc-800' : 'bg-gray-200'}`}></div>
                                </div>

                                {/* BOTONES MOCKUP (Estilo BioModern: rounded-full + sombra sólida) */}
                                <div className="w-full px-2 space-y-2 mt-1">
                                    {[1, 2, 3].map((b) => (
                                        <div 
                                            key={b} 
                                            className={`w-full h-2.5 rounded-full border-2 transition-all ${
                                                temp.id === 'bio-modern' 
                                                    ? 'bg-white border-indigo-600/20 shadow-[2px_2px_0px_rgba(79,70,229,0.2)]' 
                                                    : temp.id === 'bio-glass' 
                                                        ? 'bg-white/30 border-white shadow-sm' 
                                                        : 'bg-zinc-900 border-zinc-700 shadow-[2px_2px_0px_rgba(0,0,0,1)]'
                                            }`}
                                        ></div>
                                    ))}
                                </div>

                                {/* Iconos de redes abajo mini */}
                                <div className="flex gap-1.5 mt-auto pb-3">
                                    <div className="w-3 h-3 rounded-full bg-gray-200/50"></div>
                                    <div className="w-3 h-3 rounded-full bg-gray-200/50"></div>
                                    <div className="w-3 h-3 rounded-full bg-gray-200/50"></div>
                                </div>
                            </div>

                            {/* Banner "Próximamente" para las bloqueadas */}
                            {temp.status === 'soon' && (
                                <div className="absolute inset-0 flex items-center justify-center bg-white/20 backdrop-blur-[1px] z-10">
                                    <div className="bg-indigo-600 text-white text-[6px] font-black uppercase tracking-tighter px-2 py-1 rounded-md shadow-xl transform -rotate-12 border border-white/20">
                                        Soon
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Nombre del diseño */}
                        <div className="text-center">
                            <p className={`text-[9px] font-black uppercase tracking-tighter leading-none ${
                                data.snappylink_template_id === temp.id ? 'text-indigo-600' : 'text-gray-400'
                            }`}>
                                {temp.name}
                            </p>
                        </div>
                    </button>
                ))}
            </div>
        </div>
        <div className="h-px bg-gray-100 w-full" />

        {/* 2️⃣ FONDO: COLOR O IMAGEN */}
        <div className="space-y-4">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Personalizá el fondo</p>
            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between px-2">
                    <span className="text-xs font-bold text-gray-700 italic uppercase tracking-tighter">Color sólido</span>
                    <ColorBubble label="Fondo" value={data.snappylink_bg_color} onChange={(v) => { setData({...data, snappylink_bg_color: v}); setUnsavedChanges(true); }} />
                </div>
                
                <div className="relative h-24 border-2 border-dashed border-gray-200 rounded-3xl flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer group overflow-hidden">
                    {!data.snappylink_bg_img ? (
                        <>
                            <input type="file" accept="image/*" onChange={(e) => handleUpload(e, 'snappylink_bg_img')} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                            <div className="flex flex-col items-center gap-1 text-gray-400">
                                <UploadCloud size={20} />
                                <span className="text-[9px] font-black uppercase tracking-tighter">Subir imagen de fondo</span>
                            </div>
                        </>
                    ) : (
                        <div className="relative w-full h-full">
                            <img src={getOptimizedImageUrl(data.snappylink_bg_img, 400, 70)} className="w-full h-full object-cover opacity-60" />
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setData({ ...data, snappylink_bg_img: '' });
                                    setUnsavedChanges(true);
                                }}
                                className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-all active:scale-90 z-20"
                            >
                                <Trash2 size={14} />
                            </button>
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="bg-black/50 backdrop-blur-sm px-3 py-1 rounded-full border border-white/20">
                                   <span className="text-[8px] font-black text-white uppercase tracking-widest text-center">Imagen activa</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>


        {/* 4️⃣ BOTONES: COLORES Y SOMBRAS */}
        <div className="space-y-4 pt-4 border-t border-gray-50">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Estilo de Botones</p>
            <div className="grid grid-cols-3 gap-2 justify-items-center">
                <ColorBubble label="Cuerpo" value={data.snappylink_btn_color} onChange={(v) => { setData({...data, snappylink_btn_color: v}); setUnsavedChanges(true); }} />
                <ColorBubble label="Texto" value={data.snappylink_btn_text_color} onChange={(v) => { setData({...data, snappylink_btn_text_color: v}); setUnsavedChanges(true); }} />
                <ColorBubble label="Sombra" value={data.snappylink_shadow_color} onChange={(v) => { setData({...data, snappylink_shadow_color: v}); setUnsavedChanges(true); }} />
            </div>
        </div>
    </div>
)}
</section>


        {/* 📝 SECCIÓN 2: TEXTO DE PRESENTACIÓN Y BOTONES (CON TOGGLE) */}
      <section className="space-y-4">
   {/* Botón principal del Toggle: Coloreado y prominente */}
   <button 
    onClick={() => setShowBioContent(!showBioContent)}
    className="w-full flex justify-between items-center p-5 bg-indigo-50 border-2 border-indigo-100 rounded-[2.5rem] group shadow-sm hover:bg-indigo-100 transition-all animate-in fade-in"
   >
    <h3 className="font-black text-xs uppercase text-indigo-950 tracking-tighter italic flex items-center gap-3">
        {/* Icono de Store coloreado */}
        <Store size={18} className="text-indigo-600"/> Contenido de tu Bio
    </h3>
    {/* Cambiado icono de PLUS a CHEVRON y coloreado/rotado */}
    <div className={`transition-transform duration-300 ${showBioContent ? 'rotate-180' : 'rotate-0'}`}>
        <ChevronDown size={20} className="text-indigo-400 group-hover:text-indigo-600" />
    </div>
   </button>

   {/* --- INICIO DEL CONTENIDO QUE SE OCULTA --- */}
 {showBioContent && (
  <div className="space-y-8 animate-in fade-in slide-in-from-top-2 duration-300">
    <div className="xl:hidden mb-4">
        <button 
            onClick={() => setShowMobilePreview(true)} 
            className="flex items-center justify-center gap-2 w-full py-4 bg-indigo-600 text-white rounded-[2rem] text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all active:scale-95 shadow-xl shadow-indigo-100"
        >
            <Eye size={18} className="text-white" /> Mirá cómo va quedando
        </button>
    </div>
    <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-8">
      
      {/* --- SECCIÓN TÍTULO + COLOR --- */}
      <div className="flex items-center gap-4">
        <div className="flex-1 space-y-1.5 text-left">
          <label className="text-[10px] font-black text-indigo-500 uppercase ml-2 tracking-widest">
            Título de Bienvenida
          </label>
          <input 
            type="text"
            value={data.snappylink_title || ''} 
            onChange={(e) => { setData({ ...data, snappylink_title: e.target.value }); setUnsavedChanges(true); }}
            className="w-full p-4 border border-gray-100 rounded-2xl text-xs font-bold outline-none bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all shadow-inner"
            placeholder="Ej: Bienvenidos a nuestras redes"
          />
        </div>
        {/* 🎨 Selector de Color del Título */}
        <div className="shrink-0 pt-4">
          <ColorBubble 
            label="Color" 
            value={data.snappylink_title_color} 
            onChange={(v) => { setData({...data, snappylink_title_color: v}); setUnsavedChanges(true); }} 
          />
        </div>
      </div>

      {/* --- SECCIÓN BIO + COLOR --- */}
      <div className="flex items-start gap-4">
        <div className="flex-1 space-y-1.5 text-left">
          <label className="text-[10px] font-black text-gray-400 uppercase ml-2 tracking-widest">
            Descripción / Bio corta
          </label>
          <textarea
            value={data.snappylink_bio || ''}
            onChange={(e) => { setData({ ...data, snappylink_bio: e.target.value }); setUnsavedChanges(true); }}
            className="w-full p-4 border border-gray-100 rounded-2xl text-xs outline-none bg-gray-50 shadow-inner resize-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
            placeholder="Ej: Las mejores burgers. Pedí online acá 👇"
            rows={3}
          />
        </div>
        {/* 🎨 Selector de Color de la Bio */}
        <div className="shrink-0 pt-4">
          <ColorBubble 
            label="Color" 
            value={data.snappylink_desc_color} 
            onChange={(v) => { setData({...data, snappylink_desc_color: v}); setUnsavedChanges(true); }} 
          />
        </div>
      </div>
    </div>

  
    {/* --- SECCIÓN DE BOTONES (A continuación de la card de texto) --- */}
    <section className="space-y-4">
      <div className="flex justify-between items-center px-2">
    <h3 className="font-black text-[10px] uppercase text-gray-400 tracking-widest italic flex items-center gap-2">
        <Layers size={14} /> Tus Botones 
        <span className={`ml-2 px-2 py-0.5 rounded-full text-[9px] ${isLimitReached ? 'bg-red-100 text-red-600' : 'bg-indigo-100 text-indigo-600'}`}>
            {currentLinksCount} / {linkLimit === 100 ? '∞' : linkLimit}
        </span>
    </h3>
    {!isLimitReached && (
        <button
            onClick={() => {
                const newLinks = [...(data.snappylink_links || []), { label: 'Nuevo Enlace', url: '' }];
                setData({ ...data, snappylink_links: newLinks });
                setUnsavedChanges(true);
            }}
            className="p-2 bg-emerald-500 text-white rounded-full shadow-lg hover:bg-emerald-600 active:scale-90 transition-all"
        >
            <Plus size={18} strokeWidth={3} />
        </button>
    )}
</div>

      <div className="space-y-3">
    {(data.snappylink_links || []).map((link: any, idx: number) => {
        // 🚀 Detectamos si este botón está por fuera del límite del plan actual
        const isExcess = idx >= linkLimit;

        return (
            <div 
                key={idx} 
                className={`bg-white p-4 rounded-3xl border shadow-sm flex flex-col gap-3 group animate-in zoom-in-95 transition-all
                    ${isExcess ? 'opacity-40 grayscale border-red-100 bg-red-50/10' : 'border-gray-100'}`}
            >
                <div className="flex gap-2">
                    <div className="flex-1 relative">
                        <input
                            value={link.label}
                            onChange={(e) => {
                                const nextLinks = [...data.snappylink_links];
                                nextLinks[idx].label = e.target.value;
                                setData({ ...data, snappylink_links: nextLinks });
                                setUnsavedChanges(true);
                            }}
                            className="w-full p-2 bg-gray-50 rounded-xl text-[11px] font-black uppercase outline-none focus:bg-white transition-all"
                            placeholder="Nombre del botón"
                        />
                        {/* ⚠️ Aviso de excedente */}
                        {isExcess && (
                            <span className="absolute -top-2 -right-1 bg-red-500 text-[7px] text-white font-black px-2 py-0.5 rounded-full uppercase tracking-tighter shadow-sm">
                                Fuera de Plan
                            </span>
                        )}
                    </div>
                    <button onClick={() => {
                        const nextLinks = data.snappylink_links.filter((_: any, i: number) => i !== idx);
                        setData({ ...data, snappylink_links: nextLinks });
                        setUnsavedChanges(true);
                    }} className="p-2 text-red-300 hover:text-red-500 transition-colors">
                        <Trash2 size={16} />
                    </button>
                </div>
                <input
                    value={link.url}
                    onChange={(e) => {
                        const nextLinks = [...data.snappylink_links];
                        nextLinks[idx].url = e.target.value;
                        setData({ ...data, snappylink_links: nextLinks });
                        setUnsavedChanges(true);
                    }}
                    className="w-full p-2 border-b border-gray-100 text-[10px] text-blue-500 outline-none font-medium"
                    placeholder="Pegá el link aquí"
                />
            </div>
        );
    })}
</div>
    </section>
  </div>
)}
   {/* --- FIN DEL CONTENIDO QUE SE OCULTA --- */}
</section>
      </div>
    ) : (
      /* ESTADO DESACTIVADO: DISEÑO VACÍO */
      <div className="py-10 text-center border-2 border-dashed border-gray-100 rounded-[2.5rem]">
         <MonitorSmartphone className="mx-auto text-gray-200 mb-3" size={40}/>
         <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Activá SnappyLinks para empezar</p>
      </div>
    )}
  </div>
              )}
            </div>

        {/* ── PANEL DERECHO: VISTA PREVIA ── */}
            <div className="hidden xl:flex flex-1 items-center justify-center bg-gray-100 rounded-3xl border p-8 relative h-[calc(100vh-40px)] min-h-[680px] sticky top-6">
              
              <div className="absolute top-4 text-gray-400 text-xs font-medium flex items-center gap-2 z-20">
                <MonitorSmartphone size={14} /> Vista Previa en Vivo
              </div>

              {/* 🚀 NUEVO BOTÓN: Mira cómo lo ven tus clientes (Versión PC) */}
              <button 
                onClick={() => setShowMobilePreview(true)} 
                className="absolute top-14 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all active:scale-95 shadow-xl shadow-indigo-100 border-2 border-white/10"
              >
                <Eye size={16} /> Mira cómo lo ven tus clientes
              </button>

              <div className="w-[300px] h-[600px] bg-white rounded-[40px] border-[8px] border-gray-900 shadow-2xl overflow-hidden relative z-10 flex flex-col transform-gpu mt-20">
                {/* 🚀 ACÁ VA TRUE: para que se vea chiquito en la barra lateral */}
                <PhoneMockup activeTab={activeTab} data={data} products={products} categories={categories} previewTemplateId={null} isMockup={true} />
              </div>
            </div>

            {/* MODAL DE PLANTILLAS */}
            {previewTemplateId && (
              <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
                <div className="relative w-full max-w-sm h-[80vh] bg-white rounded-3xl overflow-hidden shadow-2xl">
                  <button onClick={() => setPreviewTemplateId(null)} className="absolute top-4 right-4 z-20 bg-black text-white p-2 rounded-full shadow-lg"><X size={20} /></button>
                  <PhoneMockup activeTab={activeTab} data={data} products={products} categories={categories} previewTemplateId={previewTemplateId} />
                  <div className="absolute bottom-4 left-4 right-4 z-20">
                    <button onClick={() => applyTemplate(previewTemplateId)} className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold shadow-xl hover:bg-emerald-700 transition">Usar este Diseño</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

      {/* MODAL VISTA PREVIA MOBILE (VERSIÓN REAL) */}
        {showMobilePreview && (
          <div className="fixed inset-0 z-[200] bg-black/95 flex flex-col items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-300">
            <div className="w-full max-w-sm h-[85vh] bg-white rounded-[2.5rem] overflow-hidden shadow-2xl relative border-[6px] border-zinc-800">
              <button onClick={() => setShowMobilePreview(false)} className="absolute top-6 right-6 z-[210] bg-black text-white p-3 rounded-full shadow-lg border border-white/20 active:scale-90 transition-transform">
                <X size={24} />
              </button>
              <div className="h-full">
                {/* 🚀 ACÁ VA: Ponemos isMockup={false} para que se vea GRANDE como en slugpage */}
                <PhoneMockup activeTab={activeTab} data={data} products={products} categories={categories} previewTemplateId={null} isMockup={false} />
              </div>
            </div>
            <p className="mt-6 text-white font-black text-[10px] uppercase tracking-[0.4em] animate-pulse italic">Vista Previa Real</p>
          </div>
        )}
      </div>
      {errorModal.show && (
  <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
    <div className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl border border-red-100 text-center animate-in zoom-in-95 duration-200">
      <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
        <X size={40} strokeWidth={3} />
      </div>
      <h3 className="text-xl font-black uppercase italic tracking-tighter text-gray-900 mb-2">{errorModal.title}</h3>
      <p className="text-sm text-gray-500 font-medium leading-relaxed mb-8">{errorModal.msg}</p>
      <button 
        onClick={() => setErrorModal({ ...errorModal, show: false })}
        className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black uppercase text-[11px] tracking-[0.2em] shadow-xl active:scale-95 transition-all"
      >
        Entendido
      </button>
    </div>
  </div>
)}
    </>
  );
}