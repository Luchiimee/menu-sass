'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { 
  Loader2, Copy, Check, Plus, Image as ImageIcon, Trash2, Store, Phone, Bike, ExternalLink,
  Save, CreditCard, Palette, Megaphone, MonitorSmartphone, RotateCcw, 
  CheckCircle, Utensils, X, Lock
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

// 1. COLORES POR DEFECTO
const TEMPLATE_DEFAULTS: any = {
  classic: { theme: '#d32f2f', bg: '#ffffff', card: '#ffffff', text: '#000000', desc: '#666666', promo: '#ffebee', banner: false },
  urban:   { theme: '#ea580c', bg: '#121212', card: '#1E1E1E', text: '#ffffff', desc: '#888888', promo: '#1E1E1E', banner: false },
  minimal: { theme: '#000000', bg: '#ffffff', card: '#ffffff', text: '#222222', desc: '#999999', promo: '#fafafa', banner: false },
  visualgrid: { theme: '#ea580c', bg: '#1a1a1a', card: '#2a2a2a', text: '#ffffff', desc: '#bbbbbb', promo: '#1a1a1a', banner: false },
  pop:     { theme: '#FF1493', bg: '#fffbe6', card: '#ffffff', text: '#000000', desc: '#444444', promo: '#FFD700', banner: false },
  spotlight:{ theme: '#FFD700', bg: '#ffffff', card: '#ffffff', text: '#000000', desc: '#666666', promo: '#fff3e0', banner: true },
  elegant: { theme: '#D4AF37', bg: '#f9f5f0', card: '#f9f5f0', text: '#333333', desc: '#777777', promo: '#f0e8dc', banner: false },
  bistro:  { theme: '#e6c87e', bg: '#222222', card: '#222222', text: '#eeeeee', desc: '#aaaaaa', promo: '#333333', banner: false }
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
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [previewTemplateId, setPreviewTemplateId] = useState<string | null>(null);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [isLocked, setIsLocked] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [copied, setCopied] = useState(false);

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
    template_id: 'classic', show_banner: true
  });

  const [products, setProducts] = useState<any[]>([]);
  const [newProd, setNewProd] = useState({ name: '', price: '', description: '', image_url: '' });

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
      editable: true, showCard: false, showBannerImg: false,
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
       config.labels.theme = 'Acento';
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
    if (isLocked) return alert("Debes elegir un plan.");
    setLoading(true);
    const { id, created_at, ...updates } = data; 
    const { error } = await supabase.from('restaurants').update(updates).eq('id', data.id);
    setLoading(false);
    if (error) alert("Error al guardar: " + error.message);
    else { setUnsavedChanges(false); setShowSuccessModal(true); setTimeout(() => setShowSuccessModal(false), 3000); }
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
    <div className="relative pt-20 min-h-[85vh] bg-gray-50/50">
      
      {showRestoreModal && <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm animate-pop-in"><div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl"><h3 className="font-bold text-lg text-gray-900 mb-2">¿Restaurar colores?</h3><p className="text-sm text-gray-600 mb-6">Volverás a los colores originales del diseño.</p><div className="flex gap-3"><button onClick={() => setShowRestoreModal(false)} className="flex-1 py-3 rounded-xl font-bold text-sm bg-gray-100 hover:bg-gray-200">Cancelar</button><button onClick={confirmReset} className="flex-1 py-3 rounded-xl font-bold text-sm bg-red-600 text-white hover:bg-red-700">Sí, Restaurar</button></div></div></div>}
      {showSuccessModal && <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[70] animate-pop-in"><div className="bg-gray-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3"><CheckCircle size={20} className="text-green-400"/><span className="font-bold text-sm">¡Guardado!</span></div></div>}

      <div className={`transition-all duration-500 ${isLocked ? 'blur-sm pointer-events-none opacity-60 select-none' : ''}`}>
          <div className="flex flex-col xl:flex-row gap-6 pb-24 xl:pb-0 min-w-0">
            
            {/* PANEL IZQUIERDO */}
            <div className="flex-1 bg-white p-6 rounded-2xl shadow-sm border border-gray-200 space-y-8 animate-in fade-in slide-in-from-bottom-4 min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 pb-4">
                  <div><h1 className="text-xl font-bold whitespace-nowrap text-gray-900">Personalizar Tienda</h1><div className="flex items-center gap-2 mt-1"><p className="text-xs text-gray-500">Diseña la apariencia de tu menú digital.</p>{unsavedChanges && <span className="text-[10px] bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-bold">Sin guardar</span>}</div></div>
                  <div className="flex gap-2">
                    <button onClick={() => setShowAdvanced(!showAdvanced)} className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold border border-indigo-200 text-indigo-600 hover:bg-indigo-50 transition-colors">
                      <Palette size={14}/> Estilos
                    </button>
                    <button onClick={handleSave} disabled={loading} className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs text-white bg-emerald-600 hover:bg-emerald-700 shadow-md transition-colors">
                      {loading ? <Loader2 className="animate-spin" size={14}/> : <Save size={14}/>} Guardar
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
                        
                        {/* Botones de Link con Hover Color */}
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

              <section className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                      <div>
                          <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">WhatsApp</label>
                          <div className="flex items-center border rounded-lg bg-white overflow-hidden"><div className="p-2 bg-green-50 text-green-600 border-r"><Phone size={14}/></div><input value={data.phone} onChange={(e) => { setData({...data, phone: e.target.value}); setUnsavedChanges(true); }} className="w-full p-2 text-xs font-bold outline-none" placeholder="11..."/></div>
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
                      <div className="flex items-center border rounded-lg bg-white overflow-hidden"><div className="p-2 bg-purple-50 text-purple-500 border-r"><CreditCard size={14}/></div><input value={data.alias_mp} onChange={(e) => { setData({...data, alias_mp: e.target.value}); setUnsavedChanges(true); }} className="w-full p-2 text-xs font-bold outline-none" placeholder="alias.mp"/></div>
                      <p className="text-[10px] text-gray-400 mt-1 leading-tight">Se copiará al confirmar pedido.</p>
                  </div>
              </section>

              <section className="pt-4 border-t">
                  <h3 className="font-bold flex items-center gap-2 text-sm mb-3"><Utensils size={16}/> Carga Rápida de Platos</h3>
                  {products.length < 2 ? (<div className="bg-gray-50 border p-3 rounded-xl space-y-2"><div className="flex gap-2"><div className="w-12 h-12 bg-white border border-dashed border-gray-300 rounded-lg flex items-center justify-center relative cursor-pointer flex-shrink-0"><input type="file" accept="image/*" onChange={handleNewProdImage} className="absolute inset-0 opacity-0 cursor-pointer" />{newProd.image_url ? <img src={newProd.image_url} className="w-full h-full object-cover rounded-lg"/> : <Plus size={16} className="text-gray-400"/>}</div><div className="flex-1 min-w-0 space-y-1"><input value={newProd.name} onChange={(e) => setNewProd({...newProd, name: e.target.value})} placeholder="Nombre del plato" className="w-full p-1.5 border rounded text-xs font-bold"/><input type="number" value={newProd.price} onChange={(e) => setNewProd({...newProd, price: e.target.value})} placeholder="$ Precio" className="w-full p-1.5 border rounded text-xs"/></div></div><textarea value={newProd.description} onChange={(e) => setNewProd({...newProd, description: e.target.value})} placeholder="Ingredientes..." className="w-full p-2 border rounded text-xs outline-none resize-none" rows={1}/><button onClick={handleAddProduct} disabled={loading || !newProd.name} className="w-full bg-gray-900 text-white py-2 rounded-lg text-xs font-bold flex justify-center gap-2 items-center hover:bg-black transition-colors">Agregar al Menú</button></div>) : (<div className="bg-green-50 border border-green-200 p-3 rounded-xl flex items-center justify-between"><div className="flex items-center gap-2 text-green-800 text-xs font-bold"><Check size={16}/> {products.length} productos cargados</div><Link href="/dashboard/products" className="text-xs bg-white border border-green-200 px-3 py-1.5 rounded-lg font-bold text-green-700 hover:bg-green-50">Gestionar Todos</Link></div>)}
                  <div className="mt-3 space-y-2">{products.slice(0, 3).map(p => (<div key={p.id} className="flex items-center gap-3 p-2 border rounded-lg bg-white"><div className="w-8 h-8 bg-gray-100 rounded overflow-hidden flex-shrink-0">{p.image_url && <img src={p.image_url} className="w-full h-full object-cover"/>}</div><div className="flex-1 min-w-0"><div className="text-xs font-bold truncate">{p.name}</div></div><div className="text-xs text-gray-500">${p.price}</div><button onClick={() => handleDeleteQuick(p.id)} className="text-red-400 hover:text-red-600"><Trash2 size={14}/></button></div>))}</div>
              </section>
            </div>

            <div className="hidden xl:flex flex-1 items-center justify-center bg-gray-100 rounded-3xl border p-8 relative h-[calc(100vh-40px)] min-h-[680px] sticky top-6">
              {/* TEXTO DE VISTA PREVIA (MOVIDO ARRIBA) */}
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
    </div>
    </>
  );
}