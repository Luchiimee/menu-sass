'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { 
  Loader2, Copy, Check, Plus, Image as ImageIcon, Trash2, Store, Phone, Bike, ExternalLink,
  Save, CreditCard, Palette, Megaphone, MonitorSmartphone, RotateCcw, 
  CheckCircle, Utensils, X, Lock, UploadCloud, Star, Eye, 
} from 'lucide-react';
import Link from 'next/link';

// Componentes
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

const ColorRow = ({ label, value, onChange }: { label: string, value: string, onChange: (val: string) => void }) => (
    <div className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-2xl transition-colors">
        <span className="text-xs font-bold text-gray-700">{label}</span>
        <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono text-gray-400 uppercase">{value}</span>
            <div className="relative w-10 h-10 rounded-full border-2 border-white shadow-md overflow-hidden">
                <input 
                    type="color" 
                    value={value || '#000000'} // <--- FALLBACK AGREGADO
                    onChange={(e) => onChange(e.target.value)} 
                    className="absolute inset-0 scale-150 cursor-pointer bg-transparent border-none"
                />
            </div>
        </div>
    </div>
);

const ColorBubble = ({ label, value, onChange }: { label: string, value: string, onChange: (v: string) => void }) => (
    <div className="flex flex-col items-center gap-2">
        <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full border-4 border-white shadow-lg overflow-hidden transition-transform active:scale-90">
            <input 
                type="color" 
                value={value || '#000000'} // <--- FALLBACK AGREGADO
                onChange={(e) => onChange(e.target.value)} 
                className="absolute inset-0 scale-[2] cursor-pointer bg-transparent border-none"
            />
        </div>
        <span className="text-[8px] font-black uppercase text-gray-400 text-center leading-tight px-1">{label}</span>
    </div>
);

const MARKETPRO_ASSETS = {
  // Un logo circular de comida prolijo
  logo: 'https://images.unsplash.com/photo-1512152272829-e3139592d56f?auto=format&fit=crop&w=100&q=80',
  // Banner de hamburguesas (este ya te funcionaba bien)
  banner: 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=600&q=80',
  // Hamburguesa de producto
  burger: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=150&q=80',
  // PAPAS FRITAS (Link nuevo y verificado que no se rompe)
  fries: 'https://images.unsplash.com/photo-1630384060421-cb20d0e0649d?auto=format&fit=crop&w=150&q=80',
};

// 1. COLORES POR DEFECTO
const TEMPLATE_DEFAULTS: any = {
classic: { 
    theme: '#d32f2f', 
    bg: '#ffffff', 
    text: '#ffffff', 
    desc: '#ffffff', 
    card_name: '#000000', 
    card_desc: '#666666', 
    card_price: '#d32f2f', 
    btn_bg: '#ffffff', 
    btn_text: '#000000', // <--- NEGRO PURO POR DEFECTO
    promo_bg: '#ffebee', 
    promo_text: '#d32f2f', 
    banner: false 
},
urban: { 
    theme: '#ea580c',     // El naranja queda solo para los acentos (como el precio)
    bg: '#121212', 
    text: '#ffffff', 
    desc: '#888888', 
    card_name: '#ffffff', 
    card_desc: '#888888', 
    card_price: '#ea580c', // El precio sigue naranja como en la foto
    btn_bg: '#ffffff',     // <--- CAMBIO: Botón "+" blanco por defecto
    promo_bg: '#1E1E1E', 
    promo_text: '#ffffff', // <--- CAMBIO: Texto de promo blanco por defecto
    banner: false 
},
  minimal: { 
    theme: '#000000', bg: '#ffffff', text: '#222222', desc: '#999999', 
    card_name: '#222222', card_desc: '#999999', card_price: '#000000', 
    btn_bg: '#ffffff', btn_text: '#000000', promo_bg: '#fafafa', promo_text: '#000000', banner: false 
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
    theme: '#FF1493', 
    bg: '#fffbe6', 
    card: '#ffffff', 
    text: '#000000', 
    desc: '#444444', 
    card_name: '#FF1493', 
    card_desc: '#444444', 
    card_price: '#000000', 
    card_shadow_color: '#000000', // <--- IMPORTANTE: Aseguramos que los bordes sean negros por defecto
    btn_bg: '#ffffff', 
    btn_text: '#FF1493', 
    promo_bg: '#FFD700', 
    promo_text: '#000000', 
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
    card: '#222222',       /* <--- CORREGIDO (Antes decía card_color) */
    card_desc: '#999999', 
    card_price: '#e6c87e', 
    btn_bg: '#e6c87e', 
    btn_text: '#222222', 
    promo: '#333333',      /* <--- CORREGIDO (Antes decía promo_bg) */
    promo_text: '#e6c87e', 
    banner: false 
  },
marketpro: { 
    theme: '#000000', 
    bg: '#ffffff', 
    text: '#000000', 
    desc: '#999999', 
    card_name: '#000000', 
    card_desc: '#999999', 
    card_price: '#059669', 
    btn_bg: '#000000', 
    btn_text: '#ffffff', 
    promo_bg: '#f3f4f6', 
    promo_text: '#000000', 
    banner: true,
    // --- VARIABLES DE MARKET PRO ---
    cat_bg_color: '#f3f4f6',
    cat_text_color: '#999999',
    cat_title_color: '#000000',
    cat_active_bg_color: '#000000',   // <--- NUEVO: Fondo Cat Activa
    cat_active_text_color: '#ffffff', // <--- NUEVO: Texto Cat Activa
    search_bg_color: '#f3f4f6',
    search_icon_color: '#9ca3af',
    card_show_bg: true, 
    card_color: '#ffffff'
  },
 'icecream-v1': { 
    theme: '#6366f1',        // Indigo moderno
    bg: '#f8fafc',           // Slate 50 (Blanco azulado muy limpio)
    text: '#0f172a',         // Slate 900 (Casi negro)
    desc: '#64748b',         // Slate 500 (Gris suave)
    card_name: '#0f172a',    
    card_desc: '#64748b', 
    card_price: '#6366f1',   
    btn_bg: '#6366f1', 
    btn_text: '#ffffff', 
    promo_bg: '#eef2ff',     // Indigo muy clarito
    promo_text: '#4f46e5',   // Indigo fuerte
    banner: false
},
// Buscá TEMPLATE_DEFAULTS y reemplazá 'alterna-pro' por esto:
'alterna-pro': { 
    theme: '#ea580c',        // Naranja Eco
    bg: '#fafaf9',           // Crema suave (NO NEGRO)
    text: '#111827',         // Nombre local
    desc: '#94a3b8', 
    card_name: '#111827',    // Texto del producto (Visible)
    card_desc: '#94a3b8', 
    card_price: '#ea580c',   // Botón precio
    btn_bg: '#ea580c', 
    btn_text: '#ffffff', 
    promo_bg: '#ffffff', 
    promo_text: '#ea580c', 
    banner: false,
    cat_bg_color: '#ffffff',
    cat_text_color: '#64748b',
    cat_active_bg_color: '#000000',
    cat_active_text_color: '#ffffff'
},
};

const CUSTOM_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&family=Playfair+Display:wght@700&family=Patrick+Hand&family=Lato:wght@400;900&display=swap');
  .preview-scroll { width: 100%; height: 100%; overflow-y: auto; scrollbar-width: none; padding-top: 35px; position: relative; display: flex; flex-direction: column; }
  .preview-scroll::-webkit-scrollbar { display: none; }
  .status-bar-fixed { position: absolute; top: 0; left: 0; width: 100%; height: 35px; display: flex; justify-content: space-between; align-items: center; padding: 0 20px; font-size: 10px; font-weight: bold; z-index: 50; pointer-events: none; }
  @keyframes popIn { 0% { transform: scale(0.9); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
  .animate-pop-in { animation: popIn 0.2s cubic-bezier(0.16, 1, 0.3, 1); }
`;
// --- ESTE BLOQUE VA ARRIBA DE TODO, FUERA DE EDITORPAGE ---
const PhoneMockup = ({ data, products, categories, previewTemplateId }: any) => {
  const activeId = previewTemplateId || data?.template_id || 'classic';
  const defaults = TEMPLATE_DEFAULTS[activeId] || TEMPLATE_DEFAULTS['classic'];
  
  const displayProds = products.length > 0 ? products : [
    { id: 1, name: 'Mix Frutos Secos', price: 8500, image_url: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400' },
    { id: 2, name: 'Miel Orgánica', price: 4200, image_url: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400' },
    { id: 3, name: 'Granola de Coco', price: 3900, image_url: 'https://images.unsplash.com/photo-1517093602195-b40af9688b46?w=400' }
  ];

  const isPreviewMode = !!previewTemplateId;

  const renderData = isPreviewMode ? {
    ...data,
    theme_color: defaults.theme, 
    bg_color: defaults.bg,
    text_color: defaults.text, 
    description_color: defaults.desc,
    card_name_color: defaults.card_name, 
    card_color: defaults.card || defaults.bg, 
    card_price_color: defaults.card_price,
    card_btn_bg: defaults.btn_bg,             
    card_btn_text: defaults.btn_text, 
    promo_bg_color: defaults.promo,           
    promo_text_color: defaults.promo_text,
    cat_bg_color: data.cat_bg_color,
    cat_text_color: data.cat_text_color,
    cat_active_bg_color: data.cat_active_bg_color,    
    cat_active_text_color: data.cat_active_text_color,
    card_show_bg: data.card_show_bg !== undefined ? data.card_show_bg : true,
  } : data;

  const props = { 
    restaurant: { ...renderData, categories: categories }, 
    products: displayProds 
  };

  return (
    <div className="relative w-full h-full bg-white flex flex-col">
      <div className="status-bar-fixed" style={{ color: 'black' }}><span>9:41</span><span>📶</span></div>
      <div className="preview-scroll" style={{ backgroundColor: renderData.bg_color }}>
        {(() => {
          switch (activeId) {
            case 'urban': return <UrbanoDark {...props} />;
            case 'pop': return <PopVibrant {...props} />;
            case 'visualgrid': return <VisualGrid {...props} />;
            case 'classic': return <ClassicDelivery {...props} />;
            case 'minimal': return <MinimalWhite {...props} />;
            case 'spotlight': return <SpotlightHero {...props} />;
            case 'elegant': return <ElegantSerif {...props} />;
            case 'bistro': return <BistroChalk {...props} />;
            case 'marketpro': return <MarketProTemplate {...props} categories={categories} fetchedExtras={data.fetched_extras || []} onAddToCart={() => { }} />;
case 'alterna-pro':
  return (
    <AlternaPro
      restaurant={{ 
        ...renderData, 
        // Usamos .slice(0, 2) para que en el editor solo se vea "General" y una categoría más
        // Así no se rompe el diseño del mockup aunque tengas 10 categorías reales.
        categories: categories.length > 0 ? categories.slice(0, 2) : [
          {id: 'cat-1', name: 'General'}, 
          {id: 'cat-2', name: 'Pizzas'}
        ] 
      }}
      products={displayProds}
      onAddToCart={() => {}}
      setSelectedProduct={(p: any) => console.log("Click:", p.name)}
      isMockup={true}
    />
  );
 case 'icecream-v1':
              return (
                <HeladeriaSoft 
                  restaurant={renderData} 
                  products={displayProds} 
                  onAddToCart={() => {}} 
                  isMockup={true} 
                />
              );

            default: return <ClassicDelivery {...props} />;
          }
        })()}
      </div>
    </div>
  );
};
export default function EditorPage() {
  const [showMobilePreview, setShowMobilePreview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [previewTemplateId, setPreviewTemplateId] = useState<string | null>(null);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [isLocked, setIsLocked] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
 const templatesSinFoto = ['minimal', 'classic', 'elegant', 'pop', 'bistro', 'icecream'];

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

const [data, setData] = useState<any>({
    id: null, 
    name: '', 
    slug: '',
    description: '', 
    delivery_cost: 0,    
    address: '',        
    instagram: '',     
    facebook: '',       
    tiktok: '',         
    opening_hours: '',  
    google_maps_link: '',
    phone: '',
    promo_message: '', 
    show_promo: true, 
    // COLORES POR DEFECTO (Classic Style)
    theme_color: '#d32f2f',       // Rojo Header
    bg_color: '#ffffff',          // Fondo Blanco
    text_color: '#ffffff',        // Nombre Local (Sobre Rojo)
    description_color: '#ffffff', // Descripción Local (Sobre Rojo)
    promo_bg_color: '#ffebee',    // Rosa suave Promo
    promo_text_color: '#d32f2f',  // Texto Promo Rojo
    card_name_color: '#000000',   // Producto Negro
    card_desc_color: '#666666',   // Descripción Producto Gris
    card_price_color: '#d32f2f',  // Precio Rojo
    card_btn_bg: '#ffffff',       // Botón MAS Blanco
    template_id: 'classic', 
    show_banner: false,  
    hero_badge_text: 'DESTACADO', 
    hero_title: '', 
    hero_price: 0, 
    hero_description: '',
card_shadow_color: '#000000',
    
    // --- NUEVOS CAMPOS PARA EL CONTROL PRO ---
    title_font: 'Inter',
    desc_font: 'Inter',
    desc_size: '10px',
    search_bg_color: '#f3f4f6',
    search_icon_color: '#9ca3af',
    cat_bg_color: '#f3f4f6',
    cat_text_color: '#999999',
    cat_title_color: '#000000',
    card_show_bg: true,
    card_btn_text: '#000000',
    business_type: 'gastronomico',
    card_name_bg: '#ffffff',
  });

  const [products, setProducts] = useState<any[]>([]);
  useEffect(() => {
  const fetchProducts = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // Traemos el ID del restaurante primero
    const { data: rest } = await supabase
      .from('restaurants')
      .select('id')
      .eq('user_id', session.user.id)
      .single();

    if (rest) {
      const { data: prods } = await supabase
        .from('products')
        .select('*')
        .eq('restaurant_id', rest.id);
      
      if (prods) setProducts(prods);
    }
  };
  fetchProducts();
}, []);
  const [newProd, setNewProd] = useState({ name: '', price: '', description: '', image_url: '' });

  // --- LÓGICA DE AUTOGUARDADO ---
 // --- 1. FUNCIÓN DE CARGA INICIAL (SOLUCIONA EL "ENVENENAMIENTO") ---
 useEffect(() => {
    if (unsavedChanges && data.id) {
      const timeout = setTimeout(() => {
        handleSave();
      }, 2000); 
      return () => clearTimeout(timeout);
    }
  }, [data, unsavedChanges]);
    useEffect(() => {
        let mounted = true;
        const loadData = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session?.user) return; 

                const { data: rest } = await supabase.from('restaurants').select('*').eq('user_id', session.user.id).single(); 
                
             if(rest && mounted) {
                    const tId = rest.template_id || 'classic';
                    const defaults = TEMPLATE_DEFAULTS[tId] || TEMPLATE_DEFAULTS['classic'];

                    setData({
                        ...rest,
                        template_id: tId,
                        theme_color: rest.theme_color || defaults.theme,
                        bg_color: rest.bg_color || defaults.bg,
                        text_color: rest.text_color || defaults.text,
                        description_color: rest.description_color || defaults.desc,
                        promo_bg_color: rest.promo_bg_color || defaults.promo,
                        promo_text_color: rest.promo_text_color || (defaults.promo_text || defaults.theme),
                        
                        // Variables de producto
                        card_name_color: rest.card_name_color || defaults.card_name,
                        card_color: rest.card_color || defaults.card || defaults.bg,
                        card_desc_color: rest.card_desc_color || defaults.card_desc,
                        card_price_color: rest.card_price_color || defaults.card_price,
                        card_btn_bg: rest.card_btn_bg || defaults.btn_bg,
                        card_btn_text: rest.card_btn_text || defaults.btn_text,
                        card_show_bg: rest.card_show_bg !== undefined ? rest.card_show_bg : true,

                        // --- NUEVO: CARGAR COLORES DE CATEGORÍAS Y BUSCADOR ---
                        cat_bg_color: rest.cat_bg_color || '#f3f4f6',
                        cat_text_color: rest.cat_text_color || '#999999',
                        cat_active_bg_color: rest.cat_active_bg_color || '#000000',
                        cat_active_text_color: rest.cat_active_text_color || '#ffffff',
                        search_bg_color: rest.search_bg_color || '#f3f4f6',
                        search_icon_color: rest.search_icon_color || '#9ca3af',
                        
                        name: rest.name || 'Mi Restaurante',
                        description: rest.description || 'Disfrutá de los mejores sabores.',
                    });
                    // ... resto de la función igual
                    setIsLocked(!rest.subscription_plan);
                    const { data: prods } = await supabase.from('products').select('*').eq('restaurant_id', rest.id).order('created_at', { ascending: true });
                    if(prods && mounted) setProducts(prods);

                    const { data: cats } = await supabase.from('categories').select('*').eq('restaurant_id', rest.id).order('sort_order', { ascending: true });
                    if(cats && mounted) setCategories(cats);
                }
            } catch (error) { console.error(error); } finally { if(mounted) setLoading(false); }
        };
        loadData();
        return () => { mounted = false; };
    }, []);

    // --- 2. CONFIGURACIÓN DINÁMICA DEL PANEL (QUITA EL BANNER INNECESARIO) ---
 const getTemplateConfig = () => {
        const id = data.template_id || 'classic';
        return { 
          editable: true,
          group: id, 
          showClassicBanner: id === 'classic', 
          showBannerImg: ['spotlight', 'marketpro'].includes(id), 
          // ACÁ AGREGAMOS 'elegant' PARA QUE TE DEJE CAMBIAR EL COLOR DORADO (ACENTO)
          showAccent: ['urban', 'visualgrid', 'marketpro', 'icecream-v1', 'alterna-pro', 'elegant'].includes(id),
          showCard: true,
          showHeroEditor: id === 'spotlight',
          showSearch: id === 'marketpro',
          showFonts: ['marketpro', 'elegant', 'bistro'].includes(id),
          showCategories: ['marketpro', 'alterna-pro', 'icecream-v1'].includes(id) 
        };
    };
    const tConfig = getTemplateConfig();

    // --- 3. CAMBIO DE PLANTILLA (BOTÓN "USAR ESTE DISEÑO") ---
const applyTemplate = (templateId: string) => {
    const defaults = TEMPLATE_DEFAULTS[templateId] || TEMPLATE_DEFAULTS['classic'];
    
    setData({
        ...data, 
        template_id: templateId,
        theme_color: defaults.theme,
        bg_color: defaults.bg,
        text_color: defaults.text,
        description_color: defaults.desc,
        promo_bg_color: defaults.promo || defaults.promo_bg,
        promo_text_color: defaults.promo_text || defaults.theme,
        card_name_color: defaults.card_name,
        card_color: defaults.card || defaults.bg,
        card_desc_color: defaults.card_desc,
        card_price_color: defaults.card_price,
        card_btn_bg: defaults.btn_bg,
        card_btn_text: defaults.btn_text,
        show_banner: defaults.banner,
        // Reset forzado para campos de MarketPro
        cat_bg_color: defaults.cat_bg_color,
        cat_text_color: defaults.cat_text_color,
        cat_title_color: defaults.cat_title_color,
        search_bg_color: defaults.search_bg_color,
        search_icon_color: defaults.search_icon_color,
        cat_active_bg_color: defaults.cat_active_bg_color || '#000000',     // <--- AGREGAR
        cat_active_text_color: defaults.cat_active_text_color || '#ffffff'
    });

    setUnsavedChanges(true);
    setPreviewTemplateId(null);
};
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    if (!e.target.files?.length) return;
    setUploading(true);
    const file = e.target.files[0];
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
    setUploading(true);
    const file = e.target.files[0];
    const fileName = `prod_${Math.random()}.${file.name.split('.').pop()}`;
    try {
        await supabase.storage.from('images').upload(fileName, file);
        const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(fileName);
        setNewProd({ ...newProd, image_url: publicUrl });
    } catch (error) { alert('Error subiendo imagen de producto'); } finally { setUploading(false); }
  };

const handleSave = async () => {
    if (!data.id || !data.slug) return;
    
    try {
      // 1. VERIFICACIÓN DE DOMINIO ÚNICO
      const { data: existingRestaurant, error: checkError } = await supabase
        .from('restaurants')
        .select('id')
        .eq('slug', data.slug)
        .neq('id', data.id) // Que no sea mi propio restaurante
        .maybeSingle();

      if (existingRestaurant) {
        alert(`❌ El nombre "snappy.uno/${data.slug}" ya está en uso. Por favor, elegí otro.`);
        return; // Cortamos el guardado
      }

      // 2. PROCEDER CON EL GUARDADO SI ESTÁ DISPONIBLE
      const { id, created_at, categories, products, fetched_extras, ...updates } = data; 

      const { error } = await supabase
        .from('restaurants')
        .update(updates)
        .eq('id', data.id);

      if (error) { 
        console.error("Error Supabase:", error.message);
        alert("Error al guardar los cambios.");
      } else {
        setUnsavedChanges(false); 
        setShowSuccessModal(true); 
        setTimeout(() => setShowSuccessModal(false), 2000); 
      }
    } catch (err) { 
        console.error("Error crítico:", err);
        setUnsavedChanges(false); 
    }
};
  const handleAddProduct = async () => {
    if (!newProd.name || !newProd.price) return alert("Faltan datos");
    try {
        let categoryId;
        const { data: cats } = await supabase.from('categories').select('id').eq('restaurant_id', data.id).limit(1);
        if (cats && cats.length > 0) categoryId = cats[0].id;
        else {
            const { data: newCat } = await supabase.from('categories').insert({ restaurant_id: data.id, name: 'General', sort_order: 1 }).select().single();
            if(newCat) categoryId = newCat.id;
        }
        await supabase.from('products').insert({
            restaurant_id: data.id, category_id: categoryId, 
            name: newProd.name, description: newProd.description, price: Number(newProd.price), image_url: newProd.image_url
        });
        const { data: refreshed } = await supabase.from('products').select('*').eq('restaurant_id', data.id).order('created_at', { ascending: true });
        if (refreshed) { setProducts(refreshed); setNewProd({ name: '', price: '', description: '', image_url: '' }); }
    } catch (error: any) { alert(error.message); }
  };
 
  const handleDeleteQuick = async (id: string) => {
     if(!confirm("¿Borrar?")) return;
     const { error } = await supabase.from('products').delete().eq('id', id);
     if (!error) setProducts(products.filter(p => p.id !== id));
  };

 const copyLink = () => { 
    navigator.clipboard.writeText(`snappy.uno/${data.slug}`); 
    setCopied(true); 
    setTimeout(() => setCopied(false), 2000); 
  }
  const handleResetClick = () => setShowRestoreModal(true);
  
const confirmReset = () => {
    const tId = data.template_id;
    const defaults = TEMPLATE_DEFAULTS[tId] || TEMPLATE_DEFAULTS['classic'];
    
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
        promo_bg_color: defaults.promo || defaults.promo_bg,
        promo_text_color: defaults.promo_text || defaults.theme,
        hero_badge_bg: defaults.hero_badge_bg,
        hero_badge_color: defaults.hero_badge_color,
        hero_title_color: defaults.hero_title_color,
        hero_price_color: defaults.hero_price_color,
        show_banner: defaults.banner || false, 
        show_promo: true,
        // Reset forzado para campos de MarketPro
        cat_bg_color: defaults.cat_bg_color,
        cat_text_color: defaults.cat_text_color,
        cat_title_color: defaults.cat_title_color,
        search_bg_color: defaults.search_bg_color,
        search_icon_color: defaults.search_icon_color,
        cat_active_bg_color: defaults.cat_active_bg_color || '#000000',     
        cat_active_text_color: defaults.cat_active_text_color || '#ffffff'
    }));
    
    setUnsavedChanges(true); 
    setShowRestoreModal(false);
};




  return (
    <>
    <style>{CUSTOM_STYLES}</style>
    <div className="relative pt-16 xl:pt-6 min-h-screen bg-gray-50/50 px-2 sm:px-6">
      
      {showRestoreModal && <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm animate-pop-in"><div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl"><h3 className="font-bold text-lg text-gray-900 mb-2">¿Restaurar colores?</h3><p className="text-sm text-gray-600 mb-6">Volverás a los colores originales del diseño.</p><div className="flex gap-3"><button onClick={() => setShowRestoreModal(false)} className="flex-1 py-3 rounded-xl font-bold text-sm bg-gray-100 hover:bg-gray-200">Cancelar</button><button onClick={confirmReset} className="flex-1 py-3 rounded-xl font-bold text-sm bg-red-600 text-white hover:bg-red-700">Sí, Restaurar</button></div></div></div>}
      {showSuccessModal && <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[70] animate-pop-in"><div className="bg-gray-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3"><CheckCircle size={20} className="text-green-400"/><span className="font-bold text-sm">¡Guardado!</span></div></div>}

      <div className={`transition-all duration-500 ${isLocked ? 'blur-sm pointer-events-none opacity-60 select-none' : ''}`}>
          <div className="flex flex-col xl:flex-row gap-6 pb-24 xl:pb-0 min-w-0">
            
            {/* PANEL IZQUIERDO */}
          <div className="flex-1 bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-200 space-y-8 animate-in fade-in slide-in-from-bottom-4 min-w-0">
  
  
<div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 border-b border-gray-100 pb-8">
    <div className="space-y-1">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-gray-900 tracking-tighter uppercase italic leading-tight">
            Personalizar tienda
        </h1>
        <div className="flex flex-wrap items-center gap-2">
            <p className="text-[11px] sm:text-xs text-gray-400 font-medium">Diseña la apariencia de tu menú digital.</p>
            {unsavedChanges && (
                <span className="text-[9px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold animate-pulse">
                    Autoguardando...
                </span>
            )}
        </div>
    </div>

    <div className="flex flex-col gap-3 w-full lg:w-auto">
        <div className="flex gap-2">
          <button onClick={() => setShowAdvanced(!showAdvanced)} className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-[11px] font-bold border border-indigo-200 text-indigo-600 hover:bg-indigo-50 transition-all shadow-sm">
            <Palette size={14}/> Estilos
          </button>
          <button onClick={handleSave} disabled={loading} className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-[11px] text-white bg-emerald-600 hover:bg-emerald-700 shadow-md transition-all">
            <Save size={14}/> Guardado
          </button>
        </div>

        {/* BOTÓN OJITO PARA MOBILE */}
        <button 
          onClick={() => setShowMobilePreview(true)} 
          className="xl:hidden flex items-center justify-center gap-2 w-full py-4 bg-black text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-800 transition-all active:scale-95 shadow-xl"
        >
          <Eye size={18} className="text-indigo-400"/> Mirá cómo va quedando
        </button>
    </div>
</div>

             
           {/* SECCIÓN DE ESTILOS DINÁMICA (REESTRUCTURADA) */}
{showAdvanced && tConfig.editable && (
    <div className="bg-gray-50/50 p-6 rounded-[2.5rem] border border-gray-100 shadow-inner animate-in fade-in zoom-in-95 duration-300 space-y-10">
        
        {/* CABECERA PANEL */}
        <div className="flex justify-between items-center px-2">
            <h3 className="font-black text-[10px] uppercase text-gray-400 tracking-[0.2em] italic">Estilos Visuales</h3>
            <div className="flex items-center gap-3">
                <button onClick={handleResetClick} className="p-2 text-gray-400 hover:text-red-500 transition-colors"><RotateCcw size={16}/></button>
                <button onClick={handleSave} className="bg-black text-white px-5 py-2 rounded-xl text-[10px] font-black uppercase shadow-lg active:scale-95 transition-all">Guardar</button>
            </div>
        </div>

        {/* --- SECCIÓN 1: IDENTIDAD DEL LOCAL --- */}
        <div className="space-y-4">
            <div className="text-[10px] font-black text-indigo-600 uppercase tracking-widest ml-2 flex items-center gap-2">
                <div className="w-1 h-3 bg-indigo-600 rounded-full" /> Identidad del Local
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-x-2 gap-y-6 justify-items-center">
                <ColorBubble label="Fondo Web" value={data.bg_color} onChange={(v) => setData({ ...data, bg_color: v })} />
                <ColorBubble label="Nombre Local" value={data.text_color} onChange={(v) => setData({ ...data, text_color: v })} />
                <ColorBubble label="Desc. Local" value={data.description_color} onChange={(v) => setData({ ...data, description_color: v })} />
                
                {/* ACENTO (Solo si la plantilla lo usa) */}
                {tConfig.showAccent && <ColorBubble label="Acento" value={data.theme_color} onChange={(v) => setData({ ...data, theme_color: v })} />}

                {/* CATEGORÍAS (Solo Alterna Pro) */}
               {['alterna-pro', 'marketpro'].includes(data.template_id) && (
                    <>
                        <ColorBubble label="Fondo Cat." value={data.cat_bg_color || '#f3f4f6'} onChange={(v) => setData({ ...data, cat_bg_color: v })} />
                        <ColorBubble label="Texto Cat." value={data.cat_text_color || '#999999'} onChange={(v) => setData({ ...data, cat_text_color: v })} />
                    </>
                )}
                {data.template_id === 'marketpro' && (
                    <>
                        <ColorBubble label="Fondo Buscar" value={data.search_bg_color || '#f3f4f6'} onChange={(v) => setData({ ...data, search_bg_color: v })} />
                        <ColorBubble label="Lupa Buscar" value={data.search_icon_color || '#9ca3af'} onChange={(v) => setData({ ...data, search_icon_color: v })} />
                    </>
                )}
                
                {tConfig.showClassicBanner && <ColorBubble label="Banner Nom" value={data.theme_color} onChange={(v) => setData({ ...data, theme_color: v })} />}
            </div>
        </div>

        {/* --- SECCIÓN 2: CARTA DE PRODUCTOS --- */}
        {/* --- SECCIÓN 2: CARTA DE PRODUCTOS --- */}
        <div className="space-y-4">
            <div className="text-[10px] font-black text-orange-600 uppercase tracking-widest ml-2 flex items-center gap-2">
                <div className="w-1 h-3 bg-orange-600 rounded-full" /> Carta de Productos
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-x-2 gap-y-6 justify-items-center">
                <ColorBubble label="Texto Nombre" value={data.card_name_color} onChange={(v) => setData({ ...data, card_name_color: v })} />
                <ColorBubble label="Fondo Card" value={data.card_color} onChange={(v) => setData({ ...data, card_color: v })} />
                
                {/* --- NUEVO: BOTÓN ON/OFF FONDO (SOLO MARKET PRO) --- */}
                {data.template_id === 'marketpro' && (
                    <div className="flex flex-col items-center gap-2">
                        <div className="relative w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center">
                            <button 
                                onClick={() => { setData({...data, card_show_bg: !data.card_show_bg}); setUnsavedChanges(true); }} 
                                className={`w-10 h-5 rounded-full flex items-center px-0.5 transition-colors ${data.card_show_bg ? 'bg-black' : 'bg-gray-300'}`}
                            >
                                <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${data.card_show_bg ? 'translate-x-5' : 'translate-x-0'}`}></div>
                            </button>
                        </div>
                        <span className="text-[8px] font-black uppercase text-gray-400 text-center leading-tight px-1">
                           Fondo {data.card_show_bg ? 'ON' : 'OFF'}
                        </span>
                    </div>
                )}

                {/* OCULTAMOS DESCRIPCIÓN PARA ALTERNA-PRO SI ES NECESARIO */}
                {data.template_id !== 'alterna-pro' && (
                    <ColorBubble label="Texto Desc." value={data.card_desc_color} onChange={(v) => setData({ ...data, card_desc_color: v })} />
                )}

                <ColorBubble label="Color Precio" value={data.card_price_color} onChange={(v) => setData({ ...data, card_price_color: v })} />
                
                {/* NUEVO BOTÓN PARA POP VIBRANT */}
                {data.template_id === 'pop' && (
                    <ColorBubble label="Color Sombra" value={data.card_shadow_color || '#000000'} onChange={(v) => setData({ ...data, card_shadow_color: v })} />
                )}
                
                <ColorBubble label="Fondo Botón +" value={data.card_btn_bg} onChange={(v) => setData({ ...data, card_btn_bg: v })} />
                <ColorBubble label="Símbolo +" value={data.card_btn_text} onChange={(v) => setData({ ...data, card_btn_text: v })} />
            </div>
        </div>

        {/* --- SECCIÓN 3: OFERTAS Y BANNERS --- */}
        <div className="space-y-4">
            <div className="text-[10px] font-black text-emerald-600 uppercase tracking-widest ml-2 flex items-center gap-2">
                <div className="w-1 h-3 bg-emerald-600 rounded-full"/> Ofertas y Banners
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 justify-items-center">
                <ColorBubble label="Fondo Promo" value={data.promo_bg_color} onChange={(v) => setData({...data, promo_bg_color: v})} />
                <ColorBubble label="Texto Promo" value={data.promo_text_color} onChange={(v) => setData({...data, promo_text_color: v})} />
            </div>
        </div>

       {/* FUENTES */}
        {tConfig.showFonts && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-gray-100">
                <div className="space-y-2">
                    <label className="text-[9px] font-black text-indigo-500 uppercase ml-2">Títulos y Precios</label>
                    <select value={data.title_font || ''} onChange={(e) => { setData({...data, title_font: e.target.value}); setUnsavedChanges(true); }} className="w-full p-4 bg-white border border-gray-200 rounded-2xl text-xs font-bold outline-none shadow-sm focus:ring-2 focus:ring-black">
                        <option value="Inter">Moderna (Inter)</option>
                        <option value="Playfair Display">Elegante (Serif)</option>
                        <option value="Patrick Hand">Manuscrita (Chalk)</option>
                    </select>
                </div>
                <div className="space-y-2">
                    <label className="text-[9px] font-black text-indigo-500 uppercase ml-2">Descripciones</label>
                    <select value={data.desc_font || ''} onChange={(e) => { setData({...data, desc_font: e.target.value}); setUnsavedChanges(true); }} className="w-full p-4 bg-white border border-gray-200 rounded-2xl text-xs font-bold outline-none shadow-sm focus:ring-2 focus:ring-black">
                        <option value="Inter">Moderna (Inter)</option>
                        <option value="Playfair Display">Elegante (Serif)</option>
                        <option value="Patrick Hand">Manuscrita (Chalk)</option>
                    </select>
                </div>
                <div className="space-y-2">
                    <label className="text-[9px] font-black text-indigo-500 uppercase ml-2">Banner Promo</label>
                    <select value={data.promo_font || ''} onChange={(e) => { setData({...data, promo_font: e.target.value}); setUnsavedChanges(true); }} className="w-full p-4 bg-white border border-gray-200 rounded-2xl text-xs font-bold outline-none shadow-sm focus:ring-2 focus:ring-black">
                        <option value="Inter">Moderna (Inter)</option>
                        <option value="Playfair Display">Elegante (Serif)</option>
                        <option value="Patrick Hand">Manuscrita (Chalk)</option>
                    </select>
                </div>
            </div>
        )}
    </div>
)}
  
              <section className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Link de tu Menú</label>
                     <div className="flex bg-white rounded-lg border overflow-hidden shadow-sm">
    {/* Visualmente mostramos solo snappy.uno/ */}
    <div className="bg-gray-100 px-2 py-2 border-r text-gray-500 text-xs flex items-center select-none font-bold">
        snappy.uno/
    </div>
   <input 
    value={data.slug || ''}  // <--- AGREGÁ EL || '' ACÁ
    onChange={(e) => { 
        setData({...data, slug: e.target.value.toLowerCase().replace(/\s+/g, '-')}); 
        setUnsavedChanges(true); 
    }} 
    className="flex-1 p-2 outline-none text-xs font-bold text-gray-800 min-w-0" 
    placeholder="tu-marca"
/>
    
    <button onClick={copyLink} className="px-3 border-l hover:bg-slate-100 flex items-center justify-center text-gray-500 transition-colors">
        {copied ? <div className="flex items-center gap-1 text-green-600"><Check size={14}/> <span className="text-[10px] font-bold">Copiado</span></div> : <Copy size={14}/>}
    </button>

    {/* El href interno sí necesita el protocolo para que el navegador sepa que es un link externo, pero el usuario no lo ve */}
    <a href={`https://snappy.uno/${data.slug}`} target="_blank" rel="noopener noreferrer" className="px-3 border-l hover:bg-slate-100 flex items-center justify-center text-blue-600 transition-colors">
        <ExternalLink size={14}/>
    </a>
</div>
                    </div>
                  </div>
              </section>

        <section className="space-y-4">
    <div className="space-y-3">
        {/* NOMBRE DEL NEGOCIO */}
        <div className="space-y-1">
            <label className="text-xs font-bold text-gray-700">Nombre del Negocio</label>
            <input 
                value={data.name || ''} 
                onChange={(e) => { setData({...data, name: e.target.value}); setUnsavedChanges(true); }} 
                className="w-full p-3 border rounded-xl font-bold outline-none text-sm focus:ring-1 focus:ring-black" 
                placeholder="Ej: Pizzería Los Tíos"
            />
        </div>

        {/* DESCRIPCIÓN CORTA */}
        <div className="space-y-1">
            <label className="text-xs font-bold text-gray-700">Descripción Corta</label>
            <textarea 
                value={data.description || ''} 
                onChange={(e) => { setData({...data, description: e.target.value}); setUnsavedChanges(true); }} 
                className="w-full p-3 border rounded-xl text-xs outline-none focus:ring-1 focus:ring-black resize-none" 
                rows={2} 
                placeholder="La mejor comida de la ciudad..."
            />
        </div>
        
        <div className="space-y-2 pt-2">
   
   
</div>

                      <div className="space-y-1 border p-3 rounded-xl bg-yellow-50/50 border-yellow-100"><div className="flex justify-between items-center mb-2"><label className="text-xs font-bold text-gray-700 flex items-center gap-1"><Megaphone size={12}/> Mensaje Promo (Header)</label><div className="flex items-center gap-2"><label className="text-[10px] text-gray-500 font-bold uppercase cursor-pointer" htmlFor="promo-switch">{data.show_promo ? 'Visible' : 'Oculto'}</label><button onClick={() => { setData({...data, show_promo: !data.show_promo}); setUnsavedChanges(true); }} id="promo-switch" className={`w-8 h-4 rounded-full flex items-center px-0.5 transition-colors ${data.show_promo ? 'bg-black' : 'bg-gray-300'}`}><div className={`w-3 h-3 bg-white rounded-full shadow-sm transition-transform ${data.show_promo ? 'translate-x-4' : 'translate-x-0'}`}></div></button></div></div>{data.show_promo && (<div className="flex gap-2 items-stretch"><input 
  value={data.promo_message || ''} 
  onChange={(e) => { setData({...data, promo_message: e.target.value}); setUnsavedChanges(true); }} 
  className="flex-1 p-2 border border-gray-200 rounded-lg text-xs outline-none bg-white" 
  placeholder="Ej: Envío GRATIS en tu primera compra"
/></div>)}</div>
                  </div>
              </section>

              <section className="space-y-2">
                  <label className="text-xs font-bold text-gray-700 block">Imágenes</label>
                  <div className="flex gap-4">
                    <div className="w-20 flex-shrink-0"><div className="aspect-square border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center relative cursor-pointer hover:bg-gray-50 transition group overflow-hidden bg-white"><input type="file" accept="image/*" onChange={(e) => handleUpload(e, 'logo_url')} className="absolute inset-0 opacity-0 cursor-pointer z-10" />{data.logo_url ? <img src={data.logo_url} className="w-full h-full object-cover" /> : <Store size={20} className="text-gray-300"/>}<div className="absolute inset-0 bg-black/50 text-white text-[8px] font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 transition">LOGO</div></div></div>
                    {tConfig.showBannerImg && (
                        <div className="flex-1 flex gap-2">
                            <div className="flex-1 relative h-20 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition group overflow-hidden bg-white">
                                <input type="file" accept="image/*" onChange={(e) => handleUpload(e, 'banner_url')} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                                {data.banner_url ? (<><img src={data.banner_url} className="w-full h-full object-cover opacity-60" /><div className="absolute inset-0 flex items-center justify-center"><span className="bg-black/60 text-white px-2 py-1 rounded text-[10px] font-bold">Cambiar Portada</span></div></>) : (<div className="flex items-center gap-2 text-gray-400"><ImageIcon size={16}/><span className="text-xs">Subir Portada</span></div>)}
                            </div>
                            <div className="w-20 border rounded-xl flex flex-col items-center justify-center gap-1 bg-gray-50">
                                <span className="text-[8px] font-bold text-gray-500 uppercase">Banner</span>
                                <button onClick={() => { setData({...data, show_banner: !data.show_banner}); setUnsavedChanges(true); }} className={`w-8 h-4 rounded-full flex items-center px-0.5 transition-colors ${data.show_banner ? 'bg-black' : 'bg-gray-300'}`}>
                                    <div className={`w-3 h-3 bg-white rounded-full shadow-sm transition-transform ${data.show_banner ? 'translate-x-4' : 'translate-x-0'}`}></div>
                                </button>
                                <span className="text-[8px] font-bold text-gray-400">{data.show_banner ? 'ON' : 'OFF'}</span>
                            </div>
                        </div>
                    )}
                  </div>
              </section>

          
{/* SECCIÓN PRODUCTO DESTACADO (SOLO PARA SPOTLIGHT) */}
{tConfig.showHeroEditor && (
  <section className="space-y-4 animate-in fade-in slide-in-from-top-2">
    <div className="p-5 bg-indigo-50/50 border border-indigo-100 rounded-2xl">
      <h3 className="text-xs font-black text-indigo-900 uppercase tracking-widest mb-5 flex items-center gap-2">
        <Star size={14} className="fill-indigo-600 text-indigo-600"/> 
        Producto en Banner (Hero)
      </h3>
      
      <div className="space-y-4">
        {/* FILA 1: ETIQUETA + SUS 2 COLORES */}
        <div className="flex flex-wrap md:flex-nowrap gap-3 items-end">
          <div className="flex-1 min-w-[200px] space-y-1">
            <label className="text-[10px] font-bold text-gray-500 uppercase">Texto Etiqueta</label>
            <input value={data.hero_badge_text || ''} onChange={(e) => { setData({...data, hero_badge_text: e.target.value}); setUnsavedChanges(true); }} className="w-full p-2.5 border rounded-xl text-xs font-bold outline-none bg-white" placeholder="Ej: PLATO DEL DÍA"/>
          </div>
          <div className="flex gap-2">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-gray-400 uppercase">Fondo</label>
              <input type="color" value={data.hero_badge_bg || '#FFD700'} onChange={(e) => { setData({...data, hero_badge_bg: e.target.value}); setUnsavedChanges(true); }} className="w-10 h-10 rounded-xl cursor-pointer border-2 border-white shadow-sm p-0 bg-transparent block"/>
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-gray-400 uppercase">Texto</label>
              <input type="color" value={data.hero_badge_color || '#000000'} onChange={(e) => { setData({...data, hero_badge_color: e.target.value}); setUnsavedChanges(true); }} className="w-10 h-10 rounded-xl cursor-pointer border-2 border-white shadow-sm p-0 bg-transparent block"/>
            </div>
          </div>
        </div>

        {/* FILA 2: TÍTULO + SU COLOR */}
        <div className="flex gap-3 items-end">
          <div className="flex-1 space-y-1">
            <label className="text-[10px] font-bold text-gray-500 uppercase">Título del Plato</label>
            <input value={data.hero_title || ''} onChange={(e) => { setData({...data, hero_title: e.target.value}); setUnsavedChanges(true); }} className="w-full p-2.5 border rounded-xl text-xs font-bold outline-none bg-white" placeholder="Ej: Ñoquis caseros"/>
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-black text-gray-400 uppercase">Color</label>
            <input type="color" value={data.hero_title_color || '#ffffff'} onChange={(e) => { setData({...data, hero_title_color: e.target.value}); setUnsavedChanges(true); }} className="w-10 h-10 rounded-xl cursor-pointer border-2 border-white shadow-sm p-0 bg-transparent block"/>
          </div>
        </div>

        {/* FILA 3: PRECIO + SU COLOR */}
        <div className="flex gap-3 items-end">
          <div className="flex-1 space-y-1">
            <label className="text-[10px] font-bold text-gray-500 uppercase">Precio ($)</label>
           <input 
  type="number" 
  value={data.delivery_cost ?? 0} 
  onChange={(e) => { setData({...data, delivery_cost: Number(e.target.value)}); setUnsavedChanges(true); }} 
  className="w-full p-2 text-xs font-bold outline-none" 
  placeholder="0"
/>
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-black text-gray-400 uppercase">Color</label>
            <input type="color" value={data.hero_price_color || '#FFD700'} onChange={(e) => { setData({...data, hero_price_color: e.target.value}); setUnsavedChanges(true); }} className="w-10 h-10 rounded-xl cursor-pointer border-2 border-white shadow-sm p-0 bg-transparent block"/>
          </div>
        </div>

        {/* FILA 4: DESCRIPCIÓN (MODAL) */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-500 uppercase">Descripción Completa (se verá en el Modal)</label>
          <textarea 
            value={data.hero_description || ''} 
            onChange={(e) => { setData({...data, hero_description: e.target.value}); setUnsavedChanges(true); }} 
            className="w-full p-3 border rounded-xl text-xs outline-none focus:ring-1 focus:ring-indigo-300 resize-none bg-white" 
            rows={3} 
            placeholder="Escribe aquí los ingredientes o detalles que el cliente verá al abrir el producto..."
          />
        </div>
      </div>
    </div>
  </section>
)}
 
              <section className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                      <div>
                          <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">WhatsApp</label>
                          <div className="flex items-center border rounded-lg bg-white overflow-hidden"><div className="p-2 bg-green-50 text-green-600 border-r"><Phone size={14}/></div><input value={data.phone || ''} onChange={(e) => { setData({...data, phone: e.target.value}); setUnsavedChanges(true); }} className="w-full p-2 text-xs font-bold outline-none" placeholder="11..."/></div>
                          <p className="text-[10px] text-gray-400 mt-1 leading-tight">Este número recibirá los pedidos.</p>
                      </div>
                      <div>
                          <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Envío ($)</label>
                          <div className="flex items-center border rounded-lg bg-white overflow-hidden"><div className="p-2 bg-gray-50 text-gray-500 border-r"><Bike size={14}/></div><input type="number" value={data.delivery_cost} onChange={(e) => { setData({...data, delivery_cost: Number(e.target.value)}); setUnsavedChanges(true); }} className="w-full p-2 text-xs font-bold outline-none" placeholder="0"/></div>
                          <p className="text-[10px] text-gray-400 mt-1 leading-tight">Costo fijo de envío.</p>
                      </div>
                  </div>
                  <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Alias (Mercado Pago)</label>
                      <div className="flex items-center border rounded-lg bg-white overflow-hidden"><div className="p-2 bg-purple-50 text-purple-500 border-r"><CreditCard size={14}/></div><input value={data.alias_mp || ''} onChange={(e) => { setData({...data, alias_mp: e.target.value}); setUnsavedChanges(true); }} className="w-full p-2 text-xs font-bold outline-none" placeholder="alias.mp"/></div>
                      <p className="text-[10px] text-gray-400 mt-1 leading-tight">Se copiará al confirmar pedido.</p>
                  </div>
              </section>


{/* --- SECCIÓN CONDICIONAL: SOLO PARA MARKET PRO --- */}
{data.template_id === 'marketpro' && (
  <section className="p-5 bg-indigo-50/50 border border-indigo-100 rounded-2xl space-y-4 animate-in fade-in slide-in-from-top-2">
    <h3 className="text-[10px] font-black text-indigo-900 uppercase tracking-widest flex items-center gap-2">
      <Store size={14}/> Información y Redes (Solo Market Pro)
    </h3>
    
    <div className="space-y-4">
      {/* Dirección y Mapa */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-500 uppercase">Dirección (Texto a mostrar)</label>
          <input 
            value={data.address || ''} 
            onChange={(e) => { setData({...data, address: e.target.value}); setUnsavedChanges(true); }}
            className="w-full p-2.5 border rounded-xl text-xs outline-none bg-white font-bold" 
            placeholder="Ej: Av. Santa Fe 1234, CABA"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-gray-400 uppercase italic">Link de Google Maps (Opcional)</label>
          <input 
            value={data.google_maps_link || ''} 
            onChange={(e) => { setData({...data, google_maps_link: e.target.value}); setUnsavedChanges(true); }}
            className="w-full p-2.5 border rounded-xl text-xs outline-none bg-white" 
            placeholder="Pegá el link de maps aquí..."
          />
        </div>
      </div>

      {/* Redes Sociales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="space-y-1">
          <label className="text-[9px] font-bold text-gray-400 uppercase">Instagram (Link)</label>
          <input value={data.instagram || ''} onChange={(e) => { setData({...data, instagram: e.target.value}); setUnsavedChanges(true); }} className="w-full p-2 border rounded-lg text-[10px] outline-none" placeholder="instagram.com/tu-user"/>
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-bold text-gray-400 uppercase">Facebook (Link)</label>
          <input value={data.facebook || ''} onChange={(e) => { setData({...data, facebook: e.target.value}); setUnsavedChanges(true); }} className="w-full p-2 border rounded-lg text-[10px] outline-none" placeholder="facebook.com/tu-página"/>
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-bold text-gray-400 uppercase">TikTok (Link)</label>
          <input value={data.tiktok || ''} onChange={(e) => { setData({...data, tiktok: e.target.value}); setUnsavedChanges(true); }} className="w-full p-2 border rounded-lg text-[10px] outline-none" placeholder="tiktok.com/@tu-user"/>
        </div>
      </div>
{/* WhatsApp de Contacto Directo */}
  <div className="space-y-1">
        <label className="text-[9px] font-bold text-green-600 uppercase flex items-center gap-1">
          <Phone size={10}/> WhatsApp de Contacto
        </label>
        <input 
          value={data.phone || ''} 
          onChange={(e) => { setData({...data, phone: e.target.value}); setUnsavedChanges(true); }} 
          className="w-full p-2.5 border-2 border-green-200 rounded-xl text-xs outline-none bg-green-50 font-bold text-green-900 placeholder:text-green-700/50 shadow-sm" 
          placeholder="Ej: 54911..."
        />
      </div>
      {/* Horarios Visuales */}
      <div className="space-y-1">
        <label className="text-[10px] font-bold text-gray-500 uppercase">Horarios Informativos</label>
        <textarea 
          value={data.opening_hours || ''} 
          onChange={(e) => { setData({...data, opening_hours: e.target.value}); setUnsavedChanges(true); }}
          className="w-full p-2.5 border rounded-xl text-xs outline-none bg-white resize-none" 
          rows={2}
        />
      </div>
    </div>
  </section>
)}
              <section className="pt-4 border-t">
                <h3 className="font-bold flex items-center gap-2 text-sm mb-3">
  <Utensils size={16}/> Carga rápida
</h3>
                  {products.length < 2 ? (
                    <div className="bg-gray-50 border p-3 rounded-xl space-y-2">
                        <div className="flex gap-2">
                            {/* --- CARGA RÁPIDA DE PLATOS CON EXPLICACIÓN --- */}
{!templatesSinFoto.some(t => data.template_id?.toLowerCase().includes(t)) ? (
    // Si la plantilla PERMITE fotos
    <div className="w-12 h-12 bg-white border border-dashed border-gray-200 rounded-lg flex items-center justify-center relative cursor-pointer flex-shrink-0 group">
        <input type="file" accept="image/*" onChange={handleNewProdImage} className="absolute inset-0 opacity-0 cursor-pointer" />
        {newProd.image_url ? (
            <img src={newProd.image_url} className="w-full h-full object-cover rounded-lg"/>
        ) : (
            <Plus size={16} className="text-gray-400 group-hover:text-violet-500 transition-colors"/>
        )}
    </div>
) : (
    // Si la plantilla es BÁSICA (Aviso Naranja)
    <button 
        type="button"
        onClick={() => alert(`El diseño "${data.template_id.toUpperCase()}" es un estilo de carga rápida. No utiliza imágenes de productos para priorizar la velocidad. Si quieres usar fotos, elige una plantilla 'Visual' o 'Urbano' en la galería.`)}
        className="w-12 h-12 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-center flex-shrink-0 hover:bg-amber-100 transition-colors shadow-sm"
        title="¿Por qué no puedo subir fotos?"
    >
        <ImageIcon size={16} className="text-amber-500"/>
    </button>
)}
                           
                            
                            <div className="flex-1 min-w-0 space-y-1">
                                <input value={newProd.name} onChange={(e) => setNewProd({...newProd, name: e.target.value})} placeholder="Nombre del plato" className="w-full p-1.5 border rounded text-xs font-bold"/>
                                <input type="number" value={newProd.price} onChange={(e) => setNewProd({...newProd, price: e.target.value})} placeholder="$ Precio" className="w-full p-1.5 border rounded text-xs"/>
                            </div>
                        </div>
                        <textarea value={newProd.description} onChange={(e) => setNewProd({...newProd, description: e.target.value})} placeholder="Ingredientes..." className="w-full p-2 border rounded text-xs outline-none resize-none" rows={1}/>
                        <button onClick={handleAddProduct} disabled={loading || !newProd.name} className="w-full bg-gray-900 text-white py-2 rounded-lg text-xs font-bold flex justify-center gap-2 items-center hover:bg-black transition-colors">Agregar al Menú</button>
                    </div>
                  ) : (
                    <div className="bg-green-50 border border-green-200 p-3 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-2 text-green-800 text-xs font-bold"><Check size={16}/> {products.length} productos cargados</div>
                        <Link href="/dashboard/products" className="text-xs bg-white border border-green-200 px-3 py-1.5 rounded-lg font-bold text-green-700 hover:bg-green-50">Gestionar Todos</Link>
                    </div>
                  )}
                  <div className="mt-3 space-y-2">{products.slice(0, 3).map(p => (<div key={p.id} className="flex items-center gap-3 p-2 border rounded-lg bg-white"><div className="w-8 h-8 bg-gray-100 rounded overflow-hidden flex-shrink-0">{p.image_url && <img src={p.image_url} className="w-full h-full object-cover"/>}</div><div className="flex-1 min-w-0"><div className="text-xs font-bold truncate">{p.name}</div></div><div className="text-xs text-gray-500">${p.price}</div><button onClick={() => handleDeleteQuick(p.id)} className="text-red-400 hover:text-red-600"><Trash2 size={14}/></button></div>))}</div>
              </section>
            </div>

            <div className="hidden xl:flex flex-1 items-center justify-center bg-gray-100 rounded-3xl border p-8 relative h-[calc(100vh-40px)] min-h-[680px] sticky top-6">
              <div className="absolute top-4 text-gray-400 text-xs font-medium flex items-center gap-2 z-20">
                <MonitorSmartphone size={14}/> Vista Previa en Vivo
              </div>

              <div className="w-[300px] h-[600px] bg-white rounded-[40px] border-[8px] border-gray-900 shadow-2xl overflow-hidden relative z-10 flex flex-col transform-gpu mt-8">
                <PhoneMockup data={data} products={products} categories={categories} previewTemplateId={null} />
              </div>
            </div>

            {previewTemplateId && (
              <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
                <div className="relative w-full max-w-sm h-[80vh] bg-white rounded-3xl overflow-hidden shadow-2xl">
                  <button onClick={() => setPreviewTemplateId(null)} className="absolute top-4 right-4 z-20 bg-black text-white p-2 rounded-full shadow-lg"><X size={20} /></button>
             <PhoneMockup data={data} products={products} categories={categories} previewTemplateId={previewTemplateId} />
                  <div className="absolute bottom-4 left-4 right-4 z-20"><button onClick={() => applyTemplate(previewTemplateId)} className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold shadow-xl hover:bg-emerald-700 transition">Usar este Diseño</button></div>
                </div>
              </div>
            )}
          </div>
      </div>
{/* --- MODAL VISTA PREVIA MOBILE (DENTRO DEL RETURN) --- */}
      {showMobilePreview && (
        <div className="fixed inset-0 z-[200] bg-black/95 flex flex-col items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full max-w-sm h-[85vh] bg-white rounded-[2.5rem] overflow-hidden shadow-2xl relative border-[6px] border-zinc-800">
            <button 
              onClick={() => setShowMobilePreview(false)} 
              className="absolute top-6 right-6 z-[210] bg-black text-white p-3 rounded-full shadow-lg border border-white/20 active:scale-90 transition-transform"
            >
              <X size={24} />
            </button>
            <div className="h-full">
              <PhoneMockup data={data} products={products} categories={categories} previewTemplateId={null} />
            </div>
          </div>
          <p className="mt-6 text-white font-black text-[10px] uppercase tracking-[0.4em] animate-pulse italic">Vista Previa en Vivo</p>
        </div>
      )}


    </div>
    </>
    
  );
  

}