'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { 
    DollarSign, ShoppingBag, Eye, Copy, ExternalLink, Clock, 
    CheckCircle, XCircle, ChefHat, ArrowRight, Store, Loader2, 
    Zap, Lock, CheckCircle2, Crown, AlertCircle, CreditCard, ShieldCheck,
    QrCode, Plus, Trash2, Layers
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export default function DashboardHome() {
  const [isLocked, setIsLocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isNewUser, setIsNewUser] = useState(false);
  const [isPlus, setIsPlus] = useState(false);
  const [isLight, setIsLight] = useState(false);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
const [couponPendingDelete, setCouponPendingDelete] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
const [upgradeModalInfo, setUpgradeModalInfo] = useState({ title: '', desc: '', plan: '' });
  const [hasPlan, setHasPlan] = useState(false);

  const [stats, setStats] = useState({ orders: 0, revenue: 0, views: 0 });
  const [storeLink, setStoreLink] = useState('');
  const [slug, setSlug] = useState('');
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [promoMessage, setPromoMessage] = useState('');
const [showPromo, setShowPromo] = useState(false);
const [isSavingPromo, setIsSavingPromo] = useState(false);
const [coupons, setCoupons] = useState<any[]>([]);
const [alwaysOpen, setAlwaysOpen] = useState(false);
const [phone, setPhone] = useState<string | null>(null);
const [isCheckingPhone, setIsCheckingPhone] = useState(true);
const [newCoupon, setNewCoupon] = useState({ 
    code: '', 
    discount: 10, 
    startDate: '', // <--- Nuevo
    endDate: ''    // <---  'expiry'
});
  

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

useEffect(() => {
    let mounted = true;
    
  const loadDashboardData = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // 1. Traer Perfil
    const { data: profileData } = await supabase
      .from('profiles')
      .select('phone')
      .eq('id', session.user.id)
      .maybeSingle();

    if (mounted) {
      const metadata = session.user.user_metadata;
      setPhone(profileData?.phone || metadata?.phone || metadata?.whatsapp || null);
    }

    // 2. Traer Restaurante
    const { data: rest } = await supabase
      .from('restaurants')
      .select('*')
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (mounted && rest) {
        // A. Verificamos suspensión
        const adminEmails = ['luchiimee2@gmail.com', 'snappyuno25@gmail.com'];
        const isAdminUser = adminEmails.includes(session.user.email?.toLowerCase() ?? '');
        const isSubscriptionInactive = rest.subscription_status === 'cancelled' || rest.subscription_status === 'unpaid';
        setIsLocked(isSubscriptionInactive && !isAdminUser);

        setRestaurantId(rest.id);
        const currentSlug = rest.slug || `local-${rest.id.substring(0, 5)}`;
        setSlug(currentSlug);
        setStoreLink(`${window.location.origin}/${currentSlug}`);

        if (rest.subscription_plan) {
            setIsNewUser(false);
            setHasPlan(true);
            setPromoMessage(rest.promo_message || '');
            setShowPromo(rest.show_promo || false);
            const plan = rest.subscription_plan;
            setIsPlus(plan === 'go' || plan === 'plus' || plan === 'max');
            setIsLight(plan === 'light');
            setAlwaysOpen(plan === 'light' ? false : (rest.always_open || false));
            
            // 🔥 AQUÍ ESTÁ LA REPARACIÓN: Traer los cupones guardados
            const { data: couponsData } = await supabase
                .from('coupons')
                .select('*')
                .eq('restaurant_id', rest.id)
                .order('created_at', { ascending: false });

            if (mounted) {
                setCoupons(couponsData || []);
            }
        } else {
            setIsNewUser(true);
        }
    } else if (mounted) {
        setIsNewUser(true);
        setIsLocked(false);
    }
    if (mounted) setLoading(false);
  } catch (error) {
    console.error("Error cargando dashboard:", error);
  }
};
    loadDashboardData();

    const handleRefresh = () => {
      console.log("📢 Actualización detectada, recargando Inicio...");
      loadDashboardData();
    };

    window.addEventListener('profile-updated', handleRefresh);
    window.addEventListener('order-received', handleRefresh);

    return () => { 
      mounted = false;
      window.removeEventListener('profile-updated', handleRefresh);
      window.removeEventListener('order-received', handleRefresh);
    };
}, []);

 const copyToClipboard = () => {
  
    navigator.clipboard.writeText(`snappy.uno/${slug}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openStoreInBrowser = () => {
    const url = `https://snappy.uno/${slug}`; 
    setTimeout(() => {
        const newWindow = window.open(url, '_blank');
        if (!newWindow) {
            window.location.assign(url);
        }
    }, 100);
  };

  const handleDownloadQrPdf = async () => {
    try {
        setGeneratingPdf(true);
        const QRCode = (await import('qrcode')).default; 
        const { jsPDF } = await import('jspdf');

        const qrDataUrl = await QRCode.toDataURL(storeLink, {
            width: 400,
            margin: 2,
            color: { dark: '#000000', light: '#ffffff' }
        });

        const doc = new jsPDF();
        doc.setFontSize(22);
        doc.text(`Escanea para ver el Menú`, 105, 40, { align: 'center' });
        doc.setFontSize(16);
        doc.setTextColor(100);
       doc.text(`snappy.uno/${slug}`, 105, 50, { align: 'center' });
        const qrSize = 100;
        const xPos = (210 - qrSize) / 2;
        doc.addImage(qrDataUrl, 'PNG', xPos, 60, qrSize, qrSize);
        doc.setFontSize(10);
        doc.setTextColor(150);
        doc.text("Powered by Snappy", 105, 180, { align: 'center' });
        doc.save(`qr-menu-${slug}.pdf`);

    } catch (error) {
        console.error("Error generando PDF", error);
        alert("Hubo un error al generar el PDF. Intenta nuevamente.");
    } finally {
        setGeneratingPdf(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
        case 'pendiente': return <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full font-bold flex w-fit items-center gap-1"><Clock size={12}/> Pendiente</span>;
        case 'en_proceso': return <span className="bg-[#E8F7F1] text-ink text-xs px-2 py-1 rounded-full font-bold flex w-fit items-center gap-1"><ChefHat size={12}/> Cocina</span>;
        case 'completado': return <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-bold flex w-fit items-center gap-1"><CheckCircle size={12}/> Listo</span>;
        case 'cancelado': return <span className="bg-alert/10 text-ink text-xs px-2 py-1 rounded-full font-bold flex w-fit items-center gap-1"><XCircle size={12}/> Cancel</span>;
        default: return null;
    }
  };
  const handleTogglePromo = async () => {
    const nuevoEstado = !showPromo;
    setShowPromo(nuevoEstado);
    await supabase.from('restaurants')
        .update({ show_promo: nuevoEstado })
        .eq('slug', slug);
  };

  const savePromoMessage = async () => {
    setIsSavingPromo(true);
    await supabase.from('restaurants')
        .update({ promo_message: promoMessage })
        .eq('slug', slug);
    setIsSavingPromo(false);
  };
const handleCreateCoupon = async () => {
    if (!newCoupon.code || !restaurantId) return;

    const { data, error } = await supabase
        .from('coupons')
        .insert({
            restaurant_id: restaurantId,
            code: newCoupon.code.toUpperCase(),
            discount_percent: newCoupon.discount,
            starts_at: newCoupon.startDate ? `${newCoupon.startDate}T00:00:00` : new Date().toISOString(),
            expires_at: newCoupon.endDate ? `${newCoupon.endDate}T23:59:59` : null,
            is_active: true
        })
        .select()
        .single();

    if (!error && data) {
        setCoupons([data, ...coupons]);
        setNewCoupon({ code: '', discount: 10, startDate: '', endDate: '' });
        
        // ACTIVAR NOTIFICACIÓN VISUAL
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 3000); // Se va en 3 segundos
    }
};

const deleteCoupon = async (id: string) => {
    if (!confirm("¿Seguro que quieres eliminar este cupón?")) return;

    const { error } = await supabase
        .from('coupons')
        .delete()
        .eq('id', id);

    if (!error) {
        setCoupons(coupons.filter(c => c.id !== id));
    } else {
        alert("Error al eliminar el cupón");
    }
};
const handleDeleteClick = (id: string) => {
    setCouponPendingDelete(id);
    setShowDeleteConfirm(true);
};

// 2. Ejecuta el borrado final
const confirmDelete = async () => {
    if (!couponPendingDelete) return;

    const { error } = await supabase
        .from('coupons')
        .delete()
        .eq('id', couponPendingDelete);

    if (!error) {
        // Actualizamos la lista local para que desaparezca al instante
        setCoupons(coupons.filter(c => c.id !== couponPendingDelete));
        // Cerramos el modal de advertencia
        setShowDeleteConfirm(false);
        setCouponPendingDelete(null);
    }
};
const PhoneWarningBanner = () => {
    if (phone) return null; // Si hay teléfono, no se muestra

    return (
      <div className="max-w-4xl mx-auto mb-6 animate-in slide-in-from-top-4 duration-500">
        <div className="bg-brasa/10 border-2 border-dashed border-brasa/20 p-4 rounded-[2rem] flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-left">
            <div className="bg-brasa text-white p-2 rounded-xl shadow-lg shadow-brasa/20">
              <AlertCircle size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-ink tracking-tight">Falta información de contacto</p>
              <p className="text-[9px] text-brasa font-bold uppercase tracking-widest">Completá tu número de WhatsApp para terminar tu registro y recibir novedades.</p>
            </div>
          </div>
          <Link 
            href="/dashboard/plan?requirePhone=true" 
            className="bg-brasa text-white px-5 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-brasa transition-all shadow-md active:scale-95"
          >
            Cargar Teléfono
          </Link>
        </div>
      </div>
    );
  };
  if (loading) return <div className="h-[60vh] flex items-center justify-center text-gray-400"><Loader2 className="animate-spin mr-2"/> Cargando...</div>;

  // --- PANTALLA DE BIENVENIDA Y PLANES (REDiseño informativo) ---
  if (isNewUser) {
    return (
      <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in pb-20 pt-4 md:pt-0">
        <PhoneWarningBanner />
        
        {/* 1. HEADER DE BIENVENIDA */}
        <div className="text-center space-y-4 mb-6">
            <div className="w-16 h-16 bg-black text-white rounded-2xl flex items-center justify-center mx-auto shadow-xl p-3">
                <Image src="/logo.svg" alt="Logo" width={40} height={40} className="w-full h-full object-contain" />
            </div>
            <div>
                <h1 className="text-4xl font-black text-gray-900 tracking-tight italic uppercase leading-none">¡Bienvenido a Snappy! 🚀</h1>
                <p className="text-sm text-gray-500 mt-2 font-bold uppercase tracking-widest">Elegí tu plan para empezar a vender</p>
            </div>
        </div>

        {/* 2. BLOQUE DE SEGURIDAD (LO QUE HABÍAMOS SACADO) */}
        <div className="bg-[#F0FAF6] border border-[#E8F7F1] p-5 rounded-[2rem] max-w-4xl mx-auto shadow-sm">
            <div className="flex flex-col md:flex-row items-center gap-6 text-left">
                <div className="bg-fresco text-white p-3 rounded-2xl shadow-lg shadow-[#B8E8D4] shrink-0">
                    <ShieldCheck size={28}/>
                </div>
                <div className="space-y-1">
                    <h3 className="font-black text-ink text-lg leading-tight">Probá gratis por 14 días con total tranquilidad</h3>
                    <p className="text-xs text-ink font-medium leading-relaxed">
                        Podés configurar tu pago ahora y el primer débito se hará **recién en 14 días**. 
                        Si decidís no seguir, podés dar de baja el plan en **cualquier momento** desde configuración sin cargos.
                    </p>
                </div>
            </div>
        </div>

        {/* 3. GRILLA DE PLANES (Cards Chicas + Info Detallada) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-6xl mx-auto px-4 mt-8">
            
            {/* PLAN LIGHT: Inicial */}
            <Link href={!phone ? "/dashboard/plan?requirePhone=true" : "/dashboard/plan"} className="group bg-white border-2 border-gray-100 p-6 rounded-[2.5rem] hover:border-black transition-all flex flex-col text-center shadow-sm hover:shadow-xl no-underline">
                <div className="w-10 h-10 bg-gray-50 text-gray-400 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-black group-hover:text-white transition-colors">
                    <ShoppingBag size={20} />
                </div>
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-1">Para Empezar</h3>
                <p className="text-2xl font-black text-gray-900">Light</p>
                <div className="my-3 py-2 border-y border-gray-50">
                    <span className="line-through text-gray-400 text-xs font-medium block">$19.500</span>
                    <p className="text-xl font-black text-gray-800">$15.000 <span className="text-[10px] text-gray-400">/mes</span></p>
                </div>
                <p className="text-[10px] text-gray-500 font-medium leading-relaxed flex-1">
                   <b>Ideal para:</b> Emprendimientos pequeños. <br/> 
                   20 productos, fotos y pedidos directos a tu WhatsApp.
                </p>
                <span className="mt-4 text-[9px] font-black uppercase text-fresco group-hover:underline">Elegir este plan →</span>
            </Link>

            {/* PLAN GO: El Profesional */}
            <Link href={!phone ? "/dashboard/plan?requirePhone=true" : "/dashboard/plan"} className="group bg-[#F0FAF6] border-2 border-fresco p-6 rounded-[2.5rem] hover:border-fresco transition-all flex flex-col text-center shadow-md hover:shadow-2xl relative overflow-hidden no-underline">
                <div className="absolute top-0 right-0 bg-fresco text-white text-[7px] font-black px-3 py-1 rounded-bl-xl uppercase tracking-tighter">EL MÁS ELEGIDO</div>
                <div className="w-10 h-10 bg-fresco text-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[#B8E8D4]">
                    <Zap size={20} fill="currentColor" />
                </div>
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-fresco mb-1">Profesional</h3>
                <p className="text-2xl font-black text-gray-900">Plan GO</p>
                <div className="my-3 py-2 border-y border-[#E8F7F1]">
                    <span className="line-through text-gray-400 text-xs font-medium block">$28.600</span>
                    <p className="text-xl font-black text-fresco">$22.000 <span className="text-[10px] text-gray-400">/mes</span></p>
                </div>
                <p className="text-[10px] text-ink font-medium leading-relaxed flex-1">
                   <b>Ideal para:</b> Negocios que crecen. <br/> 
                   60 productos, **videos animado**, cupones y monitor de pedidos.
                </p>
                <span className="mt-4 text-[9px] font-black uppercase text-fresco group-hover:underline">Elegir este plan →</span>
            </Link>

            {/* PLAN PLUS: Gestión Física */}
            <Link href={!phone ? "/dashboard/plan?requirePhone=true" : "/dashboard/plan"}className="group bg-white border-2 border-gray-100 p-6 rounded-[2.5rem] hover:border-fresco transition-all flex flex-col text-center shadow-sm hover:shadow-xl no-underline">
                <div className="w-10 h-10 bg-fresco/10 text-fresco rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-fresco group-hover:text-white transition-colors">
                    <Crown size={20} />
                </div>
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-fresco mb-1">Locales Físicos</h3>
                <p className="text-2xl font-black text-gray-900">Plus</p>
                <div className="my-3 py-2 border-y border-gray-50">
                    <span className="line-through text-gray-400 text-xs font-medium block">$45.500</span>
                    <p className="text-xl font-black text-gray-800">$35.000 <span className="text-[10px] text-gray-400">/mes</span></p>
                </div>
                <p className="text-[10px] text-gray-500 font-medium leading-relaxed flex-1">
                   <b>Ideal para:</b> Salones y locales. <br/> 
                   Productos ilimitados, impresión de tickets y gestión de mesas.
                </p>
                <span className="mt-4 text-[9px] font-black uppercase text-fresco group-hover:underline">Elegir este plan →</span>
            </Link>

            {/* PLAN MAX: Premium */}
            <div className="bg-gray-50 border-2 border-dashed border-gray-200 p-6 rounded-[2.5rem] flex flex-col text-center opacity-60 grayscale relative overflow-hidden">
                <div className="absolute top-3 -right-8 bg-gray-100 text-gray-400 text-[7px] font-black px-10 py-1 rotate-45 uppercase tracking-widest border-b">PRÓXIMAMENTE</div>
                <div className="w-10 h-10 bg-gray-200 text-gray-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Layers size={20} />
                </div>
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-1">Escalabilidad</h3>
                <p className="text-2xl font-black text-gray-400 italic">Max</p>
                <div className="my-3 py-2 border-y border-gray-100">
                    <p className="text-xl font-black text-gray-300">$38.000 <span className="text-[10px]">/mes</span></p>
                </div>
                <p className="text-[10px] text-gray-400 font-medium leading-relaxed flex-1">
                   <b>Ideal para:</b> Cadenas y franquicias. <br/> 
                   Control de sucursales, inventario avanzado e integración Mercado Pago.
                </p>
                <button disabled className="mt-4 text-[9px] font-black uppercase text-gray-400 cursor-not-allowed">No disponible</button>
            </div>
        </div>

        <div className="text-center pt-6">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">
                Sin contratos de largo plazo ● Da de baja cuando quieras
            </p>
        </div>
      </div>
    );
  }
 // --- DASHBOARD REAL (CUANDO YA TIENE PLAN) ---
  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in pb-20 pt-6 md:pt-0 relative">
     
      {/* --- ESTE DIV ENVUELVE TODO EL CONTENIDO Y APLICA EL BLOQUEO SI ES NECESARIO --- */}
      <div className={`transition-all duration-700 ${isLocked ? 'blur-md pointer-events-none opacity-50 select-none grayscale' : ''}`}>
        
        {/* 1. BLOQUE: TIENDA ACTIVA */}
        <div className="bg-gray-900 text-white p-6 md:p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4 blur-3xl" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 text-left">
              <h2 className="text-xl font-black flex items-center gap-2 italic uppercase tracking-tighter text-white">
                ¡Tu tienda está activa! <span className="animate-pulse text-green-500 text-sm">●</span>
              </h2>
              <div className="flex items-center mt-4 bg-white/10 p-2 rounded-2xl w-full border border-white/5">
                <span className="text-green-400 text-xs font-black pl-1">snappy.uno/</span>
                <span className="font-black text-white pr-1 text-sm italic">{slug || '...'}</span>
              </div>
            </div>
            
            <div className="relative z-10 flex flex-wrap gap-2">
              <button onClick={copyToClipboard} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white text-black px-6 py-3 rounded-2xl text-xs font-black uppercase hover:bg-gray-100 transition shadow-lg active:scale-95">
                {copied ? '¡Copiado!' : <><Copy size={16}/> Copiar</>}
              </button>
              <button onClick={handleDownloadQrPdf} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white/10 text-white border border-white/10 px-6 py-3 rounded-2xl text-xs font-black uppercase hover:bg-white/20 transition">
                <QrCode size={16}/> QR PDF
              </button>
              <button onClick={openStoreInBrowser} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-fresco text-white px-6 py-3 rounded-2xl text-xs font-black uppercase hover:bg-[#17A06D] transition">
                <ExternalLink size={16}/> Abrir
              </button>
            </div>
          </div>
        </div>

        {/* 2. GRID OPERATIVO: COLUMNA IZQUIERDA (PROMO + ESTADO) | COLUMNA DERECHA (CUPONES) */}
       <div className="mt-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* --- COLUMNA IZQUIERDA (PROMO Y ESTADO) --- */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white border border-gray-100 rounded-[2.5rem] p-6 shadow-sm flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap size={20} className="text-orange-500 fill-orange-500" />
                  <h3 className="font-black text-xs text-gray-900 uppercase tracking-tighter">Mensaje Promo</h3>
                </div>
             <div className="flex flex-col items-end gap-1">
  <button 
    onClick={handleTogglePromo}
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 ${showPromo ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)]' : 'bg-gray-200'}`}
  >
    {/* LA BOLITA BLANCA */}
    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-300 ${showPromo ? 'translate-x-6' : 'translate-x-1'}`} />
  </button>
  
  <span className={`text-[8px] font-black uppercase ${showPromo ? 'text-green-600' : 'text-gray-400'}`}>
    {showPromo ? 'Visible' : 'Oculto'}
  </span>
</div>
              </div>
              <div className="space-y-4">
                <textarea 
                  value={promoMessage}
                  onChange={(e) => setPromoMessage(e.target.value)}
                  onBlur={savePromoMessage}
                  placeholder="Ej: ¡2x1 en burgers!"
                  className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl text-xs font-bold focus:border-orange-500 outline-none transition-all resize-none h-24 text-gray-900"
                />
                <button onClick={savePromoMessage} className="w-full py-3 bg-gray-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center gap-2">
                  {isSavingPromo ? <Loader2 className="animate-spin" size={14}/> : 'Guardar Texto'}
                </button>
              </div>
            </div>

            {/* --- CARD: ESTADO DEL LOCAL (FIXED) --- */}
            <div className="bg-white border border-gray-100 rounded-[2.5rem] p-6 shadow-sm overflow-hidden relative group">
              <div className={`absolute top-0 left-0 w-1.5 h-full transition-colors duration-500 ${alwaysOpen ? 'bg-green-500' : 'bg-brasa'}`} />
              <div className="flex items-center justify-between mb-4">
                 <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl transition-colors ${alwaysOpen ? 'bg-green-50 text-green-600' : 'bg-brasa/10 text-brasa'}`}>
                      <Clock size={20} />
                    </div>
                    <div className="text-left">
                      <h3 className="font-black text-xs text-gray-900 uppercase tracking-tighter">Estado del Local</h3>
                      <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest leading-none mt-1">Control de apertura</p>
                    </div>
                 </div>
                 <div className="flex flex-col items-end gap-1">
                 <button 
  onClick={async () => {
    if (isLight) {
      setUpgradeModalInfo({
        title: "Apertura Manual",
        desc: "El Plan Light solo permite apertura automática. Subí a GO para abrir o cerrar fuera de hora.",
        plan: "GO"
      });
      setShowUpgradeModal(true);
      return;
    }
    const nuevoEstado = !alwaysOpen;
    setAlwaysOpen(nuevoEstado);
    await supabase.from('restaurants').update({ always_open: nuevoEstado }).eq('id', restaurantId);
  }}
  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all ${alwaysOpen && !isLight ? 'bg-green-500' : 'bg-slate-200'} ${isLight ? 'opacity-50 cursor-not-allowed' : ''}`}
>
  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform ${alwaysOpen && !isLight ? 'translate-x-6' : 'translate-x-1'}`} />
  {isLight && <div className="absolute right-1.5 text-gray-500"><Lock size={10} strokeWidth={3} /></div>}
</button>
                    <span className={`text-[8px] font-black uppercase ${alwaysOpen ? 'text-green-600' : 'text-brasa'}`}>
                      {alwaysOpen ? 'Manual' : 'Automático'}
                    </span>
                 </div>
              </div>
              <div className={`p-4 rounded-2xl border transition-all ${alwaysOpen ? 'bg-green-50/50 border-green-100' : 'bg-slate-50 border-slate-100'}`}>
                 <p className="text-[10px] font-bold text-gray-700 leading-relaxed text-left">
                    {alwaysOpen ? (
                      <span className="flex items-center gap-2 text-green-700">
                         <CheckCircle size={14} className="shrink-0" /> <b>LOCAL ABIERTO:</b> Se ignoran los horarios configurados.
                      </span>
                    ) : (
                      <span className="flex items-center gap-2 text-slate-500">
                         <Zap size={14} className="shrink-0 fill-slate-400 text-slate-400" /> <b>CONTROL AUTO:</b> Abre y cierra según tus horarios.
                      </span>
                    )}
                 </p>
              </div>
            </div>
          </div>

          {/* --- COLUMNA DERECHA (GESTIÓN DE CUPONES) --- */}
          <div className="lg:col-span-8 bg-white border border-gray-100 rounded-[2.5rem] p-6 shadow-sm space-y-6 h-full relative overflow-hidden">
            {isLight && (
    <div 
     onClick={() => {
    setUpgradeModalInfo({
        title: "Gestión de Cupones",
        desc: "Creá códigos de descuento personalizados para fidelizar a tus clientes y aumentar tus ventas.",
        plan: "GO"
    });
    setShowUpgradeModal(true);
}}
      className="absolute inset-0 z-20 bg-white/40 backdrop-blur-[2px] cursor-pointer flex flex-col items-center justify-center gap-2 animate-in fade-in duration-500"
    >
      <div className="bg-gray-900 text-white p-3 rounded-2xl shadow-xl">
        <Lock size={24} />
      </div>
      <p className="text-[10px] font-black uppercase tracking-widest text-gray-900 bg-white px-3 py-1 rounded-full shadow-sm border">
        Disponible en Plan GO
      </p>
    </div>
  )}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-left">
                <Crown size={20} className="text-brasa fill-brasa" />
                <h3 className="font-black text-xs text-gray-900 uppercase tracking-tighter">Gestión de Cupones</h3>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-[2rem] border border-slate-100">
              <div className="flex flex-col gap-1 min-w-0 text-left">
                <label className="text-[9px] font-black uppercase text-gray-400 ml-1">Código</label>
                <input type="text" placeholder="EJ: VERANO20" value={newCoupon.code} onChange={(e) => setNewCoupon({...newCoupon, code: e.target.value.toUpperCase()})} className="w-full p-3 bg-white border-2 border-slate-100 rounded-xl text-xs font-black uppercase text-gray-900 outline-none focus:border-brasa" />
              </div>
              <div className="flex flex-col gap-1 min-w-0 text-left">
                <label className="text-[9px] font-black uppercase text-gray-400 ml-1">Dcto %</label>
                <input type="number" placeholder="20" value={newCoupon.discount} onChange={(e) => setNewCoupon({...newCoupon, discount: Number(e.target.value)})} className="w-full p-3 bg-white border-2 border-slate-100 rounded-xl text-xs font-black text-gray-900 outline-none focus:border-brasa" />
              </div>
              <div className="flex flex-col gap-1 min-w-0 text-left">
                <label className="text-[9px] font-black uppercase text-gray-400 ml-1">Desde</label>
                <input type="date" value={newCoupon.startDate} onChange={(e) => setNewCoupon({...newCoupon, startDate: e.target.value})} className="w-full p-3 bg-white border-2 border-slate-100 rounded-xl text-[10px] font-black text-gray-900 outline-none focus:border-brasa" />
              </div>
              <div className="flex flex-col gap-1 min-w-0 text-left">
                <label className="text-[9px] font-black uppercase text-gray-400 ml-1">Hasta</label>
                <input type="date" value={newCoupon.endDate} onChange={(e) => setNewCoupon({...newCoupon, endDate: e.target.value})} className="w-full p-3 bg-white border-2 border-slate-100 rounded-xl text-[10px] font-black text-gray-900 outline-none focus:border-brasa" />
              </div>
              <button onClick={handleCreateCoupon} className="col-span-1 sm:col-span-2 md:col-span-4 w-full py-4 bg-brasa text-white rounded-2xl font-black text-[10px] uppercase shadow-lg hover:bg-brasa active:scale-95 flex items-center justify-center gap-2 mt-2 transition-all">
                <Plus size={16} /> Crear Cupón
              </button>
            </div>
            <div className="overflow-x-auto scrollbar-hide">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] text-gray-400 font-black uppercase border-b border-gray-50">
                    <th className="pb-3 px-2">Código</th>
                    <th className="pb-3 px-2">Dcto.</th>
                    <th className="pb-3 px-2">Validez</th>
                    <th className="pb-3 px-2 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {coupons.map((c) => (
                    <tr key={c.id} className="group hover:bg-gray-50/50 transition-colors">
                      <td className="py-4 px-2 font-black text-xs text-gray-900 italic">{c.code}</td>
                      <td className="py-4 px-2 text-brasa font-black text-xs">-{c.discount_percent}%</td>
                      <td className="py-4 px-2 text-[9px] text-gray-500 font-bold uppercase">{new Date(c.starts_at).toLocaleDateString()} al {c.expires_at ? new Date(c.expires_at).toLocaleDateString() : '∞'}</td>
                      <td className="py-4 px-2 text-right">
                        <button onClick={() => handleDeleteClick(c.id)} className="p-2 text-gray-300 hover:text-alert transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {coupons.length === 0 && (
                <p className="text-center py-8 text-[10px] font-bold text-gray-400 uppercase italic">No hay cupones generados</p>
              )}
            </div>
          </div>
        </div>

        {/* 3. BLOQUE: ACTIVIDAD RECIENTE */}
        {isPlus ? (
          
         <div className="mt-12 bg-white border border-gray-100 rounded-[2.5rem] shadow-sm overflow-hidden p-8 text-gray-900">
            <h2 className="text-lg font-black uppercase tracking-tighter mb-6 italic text-left">Actividad Reciente de Hoy</h2>
            <div className="space-y-4">
              {recentOrders.length > 0 ? (
                recentOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 animate-in fade-in slide-in-from-left-2">
                    <div className="flex items-center gap-4 text-left">
                      <div className="bg-black text-white p-2 rounded-xl">
                        <ShoppingBag size={16} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-tighter">Pedido #{order.id.slice(0,5)}</p>
                        <p className="text-[9px] text-gray-400 font-bold">
                          {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}hs
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-black text-xs">${Number(order.total).toLocaleString()}</span>
                      {getStatusBadge(order.status)}
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-10 text-center">
                  <p className="text-[10px] text-gray-400 font-bold uppercase italic tracking-widest">No hay pedidos recientes aún</p>
                </div>
              )}
            </div>
            {recentOrders.length > 0 && (
              <Link href="/dashboard/orders" className="mt-6 flex items-center justify-center gap-2 text-[9px] font-black uppercase text-gray-400 hover:text-black transition-all">
                Ver todos los pedidos <ArrowRight size={14} />
              </Link>
            )}
          </div>
        ) : ( 
        <div className="mt-10 bg-white border border-gray-100 rounded-[2.5rem] p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
              <div className="flex items-center gap-4 text-left">
                  <div className="bg-[#F0FAF6] p-4 rounded-3xl text-fresco">
                      <Lock size={28}/>
                  </div>
                 <div>
    <h3 className="font-black text-gray-900 uppercase tracking-tighter">Historial de Pedidos</h3>
    <p className="text-sm text-gray-500 font-medium">Subí al Plan GO para habilitar métricas y pedidos en tiempo real.</p>
</div>
              </div>
              <Link href="/dashboard/plan" className="w-full md:w-auto bg-black text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-gray-800 transition-all">
                  Ver Planes ⚡
              </Link>
          </div>
        )}
      </div>

      {/* --- ELEMENTOS FUERA DEL VIDRIO (SIEMPRE VISIBLES Y CLIQUEABLES) --- */}
      
      {/* 1. Modal de Suspensión (isLocked) */}
      {isLocked && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center p-4">
          <div className="bg-white/90 backdrop-blur-xl p-10 rounded-[3.5rem] shadow-2xl border border-alert/10 text-center max-w-xs animate-in zoom-in-95 duration-500">
            <div className="w-20 h-20 bg-alert/10 text-alert rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-inner">
              <Lock size={40} />
            </div>
            <h3 className="text-2xl font-black uppercase italic tracking-tighter text-gray-900 leading-none">Panel Suspendido</h3>
            <p className="text-[10px] text-gray-400 font-bold mt-4 uppercase tracking-widest leading-relaxed">
              Tu suscripción está cancelada. Cargá una tarjeta para reactivar tu plan y seguir usando Snappy.
            </p>
            <Link
              href="/dashboard/plan"
              className="mt-8 block w-full py-5 bg-alert text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-alert/20 active:scale-95 transition-all text-center"
            >
              Ir a mi Plan
            </Link>
          </div>
        </div>
      )}

      {/* 2. Toasts y Modales de Confirmación */}
      {showSuccessToast && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[200] animate-in slide-in-from-bottom-10">
          <div className="bg-gray-900 text-white px-6 py-4 rounded-3xl shadow-2xl border border-white/10 flex items-center gap-3">
            <div className="bg-green-500 rounded-full p-1"><CheckCircle2 size={16} className="text-white" /></div>
            <span className="text-sm font-black uppercase tracking-tighter">¡Cupón creado con éxito!</span>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl border border-gray-100 space-y-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="bg-alert/10 p-4 rounded-full text-alert"><AlertCircle size={40} /></div>
              <div className="space-y-2">
                <h3 className="text-xl font-black text-gray-900 uppercase tracking-tighter italic">¡Cuidado!</h3>
                <p className="text-sm text-gray-500 font-medium">Este cupón se desactivará inmediatamente para todos los clientes.</p>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <button onClick={confirmDelete} className="w-full py-4 bg-alert text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-alert transition-all">Borrar de todas formas</button>
              <button onClick={() => setShowDeleteConfirm(false)} className="w-full py-4 bg-gray-100 text-gray-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-200">Cancelar</button>
            </div>
          </div>
        </div>
   )}
   {/* --- MODAL DE UPGRADE PRO REUTILIZABLE --- */}
{showUpgradeModal && (
  <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
    <div className="bg-white rounded-[3rem] p-8 max-w-sm w-full shadow-2xl text-center relative overflow-hidden animate-in zoom-in-95 duration-300">
      
      {/* Decoración de fondo */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#F0FAF6] rounded-full opacity-50 blur-3xl"></div>
      
      <div className="relative z-10">
        <div className="w-16 h-16 bg-gray-900 text-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
          <Lock size={30} />
        </div>
        
        <h3 className="text-2xl font-black text-gray-900 mb-2 uppercase italic tracking-tighter">
          {upgradeModalInfo.title}
        </h3>
        
        <p className="text-gray-500 text-xs mb-8 font-medium leading-relaxed px-2">
          {upgradeModalInfo.desc} <br/><br/>
          Subí al <span className="text-fresco font-black">Plan {upgradeModalInfo.plan}</span> para desbloquear esta y muchas funciones más.
        </p>

        <div className="flex flex-col gap-3">
          <Link 
            href="/dashboard/plan"
            className="w-full bg-fresco text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-[#B8E8D4] hover:bg-[#17A06D] transition-all flex items-center justify-center gap-2"
          >
            Ver Planes <Zap size={14} fill="currentColor" />
          </Link>
          
          <button 
            onClick={() => setShowUpgradeModal(false)}
            className="w-full py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-colors"
          >
            Tal vez más tarde
          </button>
        </div>
      </div>
    </div>
  </div>
)}
    </div>
  );
}