'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { 
  Loader2, Copy, Check, Plus, Image as ImageIcon, Trash2, Store, Phone, Bike, ExternalLink,
  Save, CreditCard, Palette, Megaphone, MonitorSmartphone, RotateCcw, 
  CheckCircle, Utensils, X, Lock, UploadCloud, Star, Eye
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

// 1. COLORES POR DEFECTO
const TEMPLATE_DEFAULTS: any = {
  classic: { theme: '#d32f2f', bg: '#ffffff', card: '#ffffff', text: '#000000', desc: '#666666', promo: '#ffebee', banner: false },
  urban:   { theme: '#ea580c', bg: '#121212', card: '#1E1E1E', text: '#ffffff', desc: '#888888', promo: '#1E1E1E', banner: false },
  minimal: { theme: '#000000', bg: '#ffffff', card: '#ffffff', text: '#222222', desc: '#999999', promo: '#fafafa', banner: false },
  visualgrid: { theme: '#ea580c', bg: '#1a1a1a', card: '#2a2a2a', text: '#ffffff', desc: '#bbbbbb', promo: '#1a1a1a', banner: false },
  pop:     { theme: '#FF1493', bg: '#fffbe6', card: '#ffffff', text: '#000000', desc: '#444444', promo: '#FFD700', banner: false },
  spotlight:{ theme: '#FFD700', bg: '#ffffff', card: '#ffffff', text: '#000000', desc: '#666666', promo: '#fff3e0', banner: true },
  elegant: { theme: '#D4AF37', bg: '#f9f5f0', card: '#f9f5f0', text: '#333333', desc: '#777777', promo: '#f0e8dc', banner: false },
  bistro:  { theme: '#e6c87e', bg: '#222222', card: '#222222', text: '#eeeeee', desc: '#aaaaaa', promo: '#333333', banner: false },
  marketpro: { theme: '#000000', bg: '#ffffff', card: '#ffffff', text: '#000000', desc: '#999999', promo: '#f3f4f6', banner: true },
};

const CUSTOM_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&family=Playfair+Display:wght@700&family=Patrick+Hand&family=Lato:wght@400;900&display=swap');
  .preview-scroll { width: 100%; height: 100%; overflow-y: auto; scrollbar-width: none; padding-top: 35px; position: relative; display: flex; flex-direction: column; }
  .preview-scroll::-webkit-scrollbar { display: none; }
  .status-bar-fixed { position: absolute; top: 0; left: 0; width: 100%; height: 35px; display: flex; justify-content: space-between; align-items: center; padding: 0 20px; font-size: 10px; font-weight: bold; z-index: 50; pointer-events: none; }
  @keyframes popIn { 0% { transform: scale(0.9); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
  .animate-pop-in { animation: popIn 0.2s cubic-bezier(0.16, 1, 0.3, 1); }
`;

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

  const templatesSinFoto = ['minimal', 'classic', 'elegant', 'pop', 'bistro'];

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [data, setData] = useState<any>({
    id: null, name: '', description: '', 
    promo_message: '', show_promo: true, promo_bg_color: '',
    phone: '', delivery_cost: 0, 
    theme_color: '', bg_color: '', card_color: '', 
    text_color: '', description_color: '',
    slug: '', alias_mp: '', logo_url: '', banner_url: '', 
    template_id: 'classic', show_banner: true,
    hero_badge_text: 'DESTACADO', 
  hero_title: '', 
  hero_price: 0, 
  hero_description: ''
  });

  const [products, setProducts] = useState<any[]>([]);
  const [newProd, setNewProd] = useState({ name: '', price: '', description: '', image_url: '' });

  // --- LÓGICA DE AUTOGUARDADO ---
  useEffect(() => {
    if (unsavedChanges && data.id) {
      const timeout = setTimeout(() => {
        handleSave();
      }, 2000); // Guarda después de 2 segundos de inactividad
      return () => clearTimeout(timeout);
    }
  }, [data]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => { if (unsavedChanges) { e.preventDefault(); e.returnValue = ''; return ''; } };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [unsavedChanges]);

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

          let bg = rest.bg_color;
          let theme = rest.theme_color;
          
          if ((tId === 'urban' || tId === 'visualgrid' || tId === 'bistro') && bg === '#ffffff') {
             bg = defaults.bg;
             rest.card_color = defaults.card;
             rest.text_color = defaults.text;
             rest.description_color = defaults.desc;
             rest.promo_bg_color = defaults.promo;
             theme = defaults.theme;
          }
          if ((tId === 'classic' || tId === 'spotlight' || tId === 'pop') && theme === '#000000') {
             theme = defaults.theme;
             if(tId === 'pop') bg = defaults.bg;
          }

          setData({
              ...rest,
              name: rest.name || '', description: rest.description || '', 
              promo_message: rest.promo_message || '', show_promo: rest.show_promo !== false, 
              promo_bg_color: rest.promo_bg_color || defaults.promo,
              theme_color: theme || defaults.theme, 
              bg_color: bg || defaults.bg, 
              card_color: rest.card_color || defaults.card, 
              text_color: rest.text_color || defaults.text,
              description_color: rest.description_color || defaults.desc,
              template_id: tId, delivery_cost: rest.delivery_cost || 0,
              show_banner: rest.show_banner 
          });
          setIsLocked(!rest.subscription_plan);
          const { data: prods } = await supabase.from('products').select('*').eq('restaurant_id', rest.id).order('created_at', { ascending: true });
          if(prods && mounted) setProducts(prods);
        } else if(mounted) setIsLocked(true);
      } catch (error) { console.error(error); } finally { if(mounted) setLoading(false); }
    };
    loadData();
    return () => { mounted = false; };
  }, []);

const getTemplateConfig = () => {
    const id = data.template_id || 'classic';
    let config = { 
      editable: true, 
      showCard: false, 
      showBannerImg: false,
      showHeroEditor: false, // 1. Agregamos el flag apagado por defecto
      labels: { theme: 'Color Principal', bg: 'Fondo Web', card: 'Fondo Tarjeta', text: 'Títulos', desc: 'Descripciones' } 
    };

    if (id === 'elegant' || id === 'bistro') { config.editable = false; return config; }

    if (id === 'classic' || id === 'minimal') {
        config.labels.theme = id === 'classic' ? 'Banner Header' : 'Acento / Íconos';
    } 
    else if (id === 'urban' || id === 'visualgrid') {
        config.showCard = true;
        config.labels.theme = 'Acento / Precio';
        config.labels.bg = 'Fondo Pantalla';
        config.labels.card = 'Fondo Tarjeta';
    } 
    else if (id === 'pop') {
        config.showCard = true;
        config.labels.theme = 'Sombra / Acento';
    }
    else if (id === 'spotlight') {
        config.showCard = true;
        config.showBannerImg = true;
        config.showHeroEditor = true; // 2. Lo activamos solo para Spotlight
        config.labels.theme = 'Acento';
    }
    else if (id === 'marketpro') {
        config.showBannerImg = true;
        config.labels.theme = 'Botones / Acento';
    }
    return config;
};

  const tConfig = getTemplateConfig();

  const applyTemplate = (templateId: string) => {
      const defaults = TEMPLATE_DEFAULTS[templateId] || TEMPLATE_DEFAULTS['classic'];
      setData((prev: any) => ({
          ...prev, 
          template_id: templateId,
          theme_color: defaults.theme,
          bg_color: defaults.bg,
          card_color: defaults.card,
          text_color: defaults.text,
          description_color: defaults.desc,
          promo_bg_color: defaults.promo,
          show_banner: defaults.banner
      }));
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
    const { id, created_at, ...updates } = data; 
    const { error } = await supabase.from('restaurants').update(updates).eq('id', data.id);
    if (error) console.error("Error al guardar: " + error.message);
    else { 
      setUnsavedChanges(false); 
      setShowSuccessModal(true); 
      setTimeout(() => setShowSuccessModal(false), 2000); 
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

  const copyLink = () => { navigator.clipboard.writeText(`https://snappy.uno/${data.slug}`); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const handleResetClick = () => setShowRestoreModal(true);
  
  const confirmReset = () => {
      const defaults = TEMPLATE_DEFAULTS[data.template_id] || TEMPLATE_DEFAULTS['classic'];
      setData((prev: any) => ({ 
          ...prev, theme_color: defaults.theme, bg_color: defaults.bg, card_color: defaults.card, 
          text_color: defaults.text, description_color: defaults.desc, promo_bg_color: defaults.promo, 
          show_banner: defaults.banner, show_promo: true 
      }));
      setUnsavedChanges(true); setShowRestoreModal(false);
  };

  const PhoneMockup = ({ templateId }: { templateId: string }) => {
      const activeId = templateId || 'classic';
      const displayProds = products.length > 0 ? products : [
          { id: 1, name: 'Hamburguesa Doble', description: 'Con cheddar y bacon.', price: 8500, image_url: '' },
          { id: 2, name: 'Papas Fritas', description: 'Porción abundante.', price: 4000, image_url: '' }
      ];
      
      const isPreviewMode = !!previewTemplateId;
      const defaults = TEMPLATE_DEFAULTS[activeId] || TEMPLATE_DEFAULTS['classic'];
      
      const renderData = isPreviewMode ? {
          ...data,
          theme_color: defaults.theme, bg_color: defaults.bg, card_color: defaults.card,
          text_color: defaults.text, description_color: defaults.desc, promo_bg_color: defaults.promo,
          show_banner: defaults.banner
      } : data;

      const props = { restaurant: renderData, products: displayProds };
      const isDarkTheme = ['urban', 'fresh', 'bistro'].includes(activeId);
      const statusColor = isDarkTheme ? 'white' : 'black';

      return (
        <div className="relative w-full h-full bg-white flex flex-col">
            <div className="status-bar-fixed" style={{ color: statusColor }}><span>9:41</span><span>📶</span></div>
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
                      default: return <ClassicDelivery {...props} />;
                      case 'marketpro': return <MarketProTemplate {...props} categories={[]} onAddToCart={() => {}} />;
                  }
               })()}
            </div>
        </div>
      );
  };

  if (loading) return <div className="p-10 text-center flex items-center justify-center h-[80vh]"><Loader2 className="animate-spin mr-2"/> Cargando editor...</div>;

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

              {/* SECCIÓN DE ESTILOS DINÁMICA */}
              {showAdvanced && (
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 animate-in slide-in-from-top-2 relative">
                      <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-xs uppercase text-gray-500">Colores del Diseño</h3><button onClick={handleResetClick} className="text-xs font-bold text-red-500 flex items-center gap-1"><RotateCcw size={12}/> Reset</button></div>
                      {!tConfig.editable ? (
                          <div className="flex flex-col items-center justify-center p-4 bg-gray-100 rounded-lg text-gray-500 text-xs text-center"><Lock size={20} className="mb-2 opacity-50"/><p>Esta plantilla tiene un diseño fijo.</p></div>
                      ) : (
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                              <div><label className="text-[10px] font-bold text-gray-700 mb-1 block">{tConfig.labels.theme}</label><div className="flex items-center gap-2 bg-white p-1 rounded-lg border w-full"><input type="color" value={data.theme_color} onChange={(e) => { setData({...data, theme_color: e.target.value}); setUnsavedChanges(true); }} className="w-8 h-8 rounded cursor-pointer border-none bg-transparent p-0 flex-shrink-0"/><span className="text-[10px] font-mono text-gray-500 truncate">{data.theme_color}</span></div></div>
                              <div><label className="text-[10px] font-bold text-gray-700 mb-1 block">{tConfig.labels.bg}</label><div className="flex items-center gap-2 bg-white p-1 rounded-lg border w-full"><input type="color" value={data.bg_color} onChange={(e) => { setData({...data, bg_color: e.target.value}); setUnsavedChanges(true); }} className="w-8 h-8 rounded cursor-pointer border-none bg-transparent p-0 flex-shrink-0"/><span className="text-[10px] font-mono text-gray-500 truncate">{data.bg_color}</span></div></div>
                              {tConfig.showCard && (<div><label className="text-[10px] font-bold text-gray-700 mb-1 block">{tConfig.labels.card}</label><div className="flex items-center gap-2 bg-white p-1 rounded-lg border w-full"><input type="color" value={data.card_color} onChange={(e) => { setData({...data, card_color: e.target.value}); setUnsavedChanges(true); }} className="w-8 h-8 rounded cursor-pointer border-none bg-transparent p-0 flex-shrink-0"/><span className="text-[10px] font-mono text-gray-500 truncate">{data.card_color}</span></div></div>)}
                              <div><label className="text-[10px] font-bold text-gray-700 mb-1 block">{tConfig.labels.text}</label><div className="flex items-center gap-2 bg-white p-1 rounded-lg border w-full"><input type="color" value={data.text_color} onChange={(e) => { setData({...data, text_color: e.target.value}); setUnsavedChanges(true); }} className="w-8 h-8 rounded cursor-pointer border-none bg-transparent p-0 flex-shrink-0"/><span className="text-[10px] font-mono text-gray-500 truncate">{data.text_color}</span></div></div>
                              <div><label className="text-[10px] font-bold text-gray-700 mb-1 block">{tConfig.labels.desc}</label><div className="flex items-center gap-2 bg-white p-1 rounded-lg border w-full"><input type="color" value={data.description_color} onChange={(e) => { setData({...data, description_color: e.target.value}); setUnsavedChanges(true); }} className="w-8 h-8 rounded cursor-pointer border-none bg-transparent p-0 flex-shrink-0"/><span className="text-[10px] font-mono text-gray-500 truncate">{data.description_color}</span></div></div>
                              <div><label className="text-[10px] font-bold text-gray-700 mb-1 block">Fondo Promo</label><div className="flex items-center gap-2 bg-white p-1 rounded-lg border w-full"><input type="color" value={data.promo_bg_color} onChange={(e) => { setData({...data, promo_bg_color: e.target.value}); setUnsavedChanges(true); }} className="w-8 h-8 rounded cursor-pointer border-none bg-transparent p-0 flex-shrink-0"/><span className="text-[10px] font-mono text-gray-500 truncate">{data.promo_bg_color}</span></div></div>
                          </div>
                      )}
                  </div>
              )}

              <section className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Link de tu Menú</label>
                      <div className="flex bg-white rounded-lg border overflow-hidden shadow-sm">
                        <div className="bg-gray-100 px-2 py-2 border-r text-gray-500 text-xs flex items-center select-none">snappy.uno/</div>
                        <input value={data.slug} onChange={(e) => { setData({...data, slug: e.target.value}); setUnsavedChanges(true); }} className="flex-1 p-2 outline-none text-xs font-bold text-gray-800 min-w-0" placeholder="tu-marca"/>
                        
                        <button onClick={copyLink} className="px-3 border-l hover:bg-slate-100 flex items-center justify-center text-gray-500 transition-colors" title="Copiar enlace">
                          {copied ? <div className="flex items-center gap-1 text-green-600"><Check size={14}/> <span className="text-[10px] font-bold">Copiado</span></div> : <Copy size={14}/>}
                        </button>
                        <a href={`https://snappy.uno/${data.slug}`} target="_blank" rel="noopener noreferrer" className="px-3 border-l hover:bg-slate-100 flex items-center justify-center text-blue-600 transition-colors" title="Ver mi menú en vivo">
                          <ExternalLink size={14}/>
                        </a>
                      </div>
                    </div>
                  </div>
              </section>

              <section className="space-y-4">
                  <div className="space-y-3">
                      <div className="space-y-1"><label className="text-xs font-bold text-gray-700">Nombre del Negocio</label><input value={data.name} onChange={(e) => { setData({...data, name: e.target.value}); setUnsavedChanges(true); }} className="w-full p-3 border rounded-xl font-bold outline-none text-sm focus:ring-1 focus:ring-black" placeholder="Ej: Burger King"/></div>
                      <div className="space-y-1"><label className="text-xs font-bold text-gray-700">Descripción Corta</label><textarea value={data.description} onChange={(e) => { setData({...data, description: e.target.value}); setUnsavedChanges(true); }} className="w-full p-3 border rounded-xl text-xs outline-none focus:ring-1 focus:ring-black resize-none" rows={2} placeholder="La mejor comida de la ciudad..."/></div>
                      <div className="space-y-1 border p-3 rounded-xl bg-yellow-50/50 border-yellow-100"><div className="flex justify-between items-center mb-2"><label className="text-xs font-bold text-gray-700 flex items-center gap-1"><Megaphone size={12}/> Mensaje Promo (Header)</label><div className="flex items-center gap-2"><label className="text-[10px] text-gray-500 font-bold uppercase cursor-pointer" htmlFor="promo-switch">{data.show_promo ? 'Visible' : 'Oculto'}</label><button onClick={() => { setData({...data, show_promo: !data.show_promo}); setUnsavedChanges(true); }} id="promo-switch" className={`w-8 h-4 rounded-full flex items-center px-0.5 transition-colors ${data.show_promo ? 'bg-black' : 'bg-gray-300'}`}><div className={`w-3 h-3 bg-white rounded-full shadow-sm transition-transform ${data.show_promo ? 'translate-x-4' : 'translate-x-0'}`}></div></button></div></div>{data.show_promo && (<div className="flex gap-2 items-stretch"><input value={data.promo_message} onChange={(e) => { setData({...data, promo_message: e.target.value}); setUnsavedChanges(true); }} className="flex-1 p-2 border border-gray-200 rounded-lg text-xs outline-none bg-white" placeholder="Ej: Envío GRATIS en tu primera compra"/></div>)}</div>
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
            <input type="number" value={data.hero_price || ''} onChange={(e) => { setData({...data, hero_price: Number(e.target.value)}); setUnsavedChanges(true); }} className="w-full p-2.5 border rounded-xl text-xs font-bold outline-none bg-white" placeholder="0"/>
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

              <section className="pt-4 border-t">
                  <h3 className="font-bold flex items-center gap-2 text-sm mb-3"><Utensils size={16}/> Carga Rápida de Platos</h3>
                  {products.length < 2 ? (
                    <div className="bg-gray-50 border p-3 rounded-xl space-y-2">
                        <div className="flex gap-2">
                            {/* --- CARGA RÁPIDA DE PLATOS CON EXPLICACIÓN --- */}
{!templatesSinFoto.some(t => data.template_id?.toLowerCase().includes(t)) ? (
    // Si la plantilla permite fotos, mostramos el cargador de siempre
    <div className="w-12 h-12 bg-white border border-dashed border-gray-200 rounded-lg flex items-center justify-center relative cursor-pointer flex-shrink-0 group">
        <input type="file" accept="image/*" onChange={handleNewProdImage} className="absolute inset-0 opacity-0 cursor-pointer" />
        {newProd.image_url ? (
            <img src={newProd.image_url} className="w-full h-full object-cover rounded-lg"/>
        ) : (
            <Plus size={16} className="text-gray-400 group-hover:text-violet-500 transition-colors"/>
        )}
    </div>
) : (
    // Si NO permite fotos (Bistro, Minimal, etc.), mostramos el aviso al hacer click
    <button 
        type="button"
        onClick={() => alert(`El diseño "${data.template_id.toUpperCase()}" es un estilo minimalista enfocado en la velocidad y el texto. Por eso, no utiliza imágenes de productos. Si prefieres mostrar fotos, elige una plantilla de tipo 'Visual' o 'Urbano' en la galería.`)}
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
                  <PhoneMockup templateId={data.template_id} />
              </div>
            </div>

            {previewTemplateId && (
              <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
                <div className="relative w-full max-w-sm h-[80vh] bg-white rounded-3xl overflow-hidden shadow-2xl">
                  <button onClick={() => setPreviewTemplateId(null)} className="absolute top-4 right-4 z-20 bg-black text-white p-2 rounded-full shadow-lg"><X size={20} /></button>
                  <PhoneMockup templateId={previewTemplateId} />
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
               <PhoneMockup templateId={data.template_id} />
            </div>
          </div>
          <p className="mt-6 text-white font-black text-[10px] uppercase tracking-[0.4em] animate-pulse italic">Vista Previa en Vivo</p>
        </div>
      )}


    </div>
    </>
    
  );
  

}