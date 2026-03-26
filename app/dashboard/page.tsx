'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { 
    DollarSign, ShoppingBag, Eye, Copy, ExternalLink, Clock, 
    CheckCircle, XCircle, ChefHat, ArrowRight, Store, Loader2, 
    Zap, Lock, CheckCircle2, Crown, AlertCircle, CreditCard, ShieldCheck,
    QrCode, Plus, Trash2
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export default function DashboardHome() {
  const [isLocked, setIsLocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isNewUser, setIsNewUser] = useState(false);
  const [isPlus, setIsPlus] = useState(false);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
const [couponPendingDelete, setCouponPendingDelete] = useState<string | null>(null);
  
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
    
    // Si no hay sesión, apagamos el loading y salimos para que no quede en blanco
    if (!session) {
      if (mounted) setLoading(false);
      return;
    }

    // 1. SELECT con subscription_status
    const { data: rest } = await supabase
      .from('restaurants')
      .select('id, slug, subscription_plan, subscription_status, promo_message, show_promo, always_open')
      .eq('user_id', session.user.id)
      .maybeSingle();

 if (mounted) {
    // 1. Detectamos si está cancelado DE VERDAD
    const isCancelled = rest?.subscription_status === 'cancelled';

    // 2. ¿Es realmente un usuario nuevo? 
    // SOLO si no hay restaurante o no eligió plan nunca.
    if (!rest || !rest.subscription_plan) {
        setIsNewUser(true); 
        setLoading(false);
        return;
    }

    // 3. Si llegó acá, es un usuario viejo con datos cargados.
    setIsNewUser(false); 
    setIsLocked(isCancelled); // Si está cancelado se activa el "vidrio"

    // 4. Cargamos sus datos normalmente (se verán de fondo tras el vidrio)
    setRestaurantId(rest.id);
    setAlwaysOpen(rest.always_open || false);
    setSlug(rest.slug || '');
    setPromoMessage(rest.promo_message || '');
    setShowPromo(rest.show_promo || false);

    const plan = rest.subscription_plan;
    setHasPlan(!!plan); 
    setIsPlus(plan === 'plus' || plan === 'max');

    const origin = window.location.origin;
    setStoreLink(`${origin}/${rest.slug}`);
    
      // CARGA DE STATS (Solo si es Plus)
      if (plan === 'plus' || plan === 'max') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const { data: todaysOrders } = await supabase
          .from('orders')
          .select('total, status')
          .eq('restaurant_id', rest.id)
          .neq('order_type', 'apertura')
          .gte('created_at', today.toISOString());

        if (todaysOrders) {
          const validOrders = todaysOrders.filter(o => o.status !== 'cancelado');
          const totalRevenue = validOrders.reduce((sum, order) => sum + Number(order.total), 0);
          setStats({
            orders: validOrders.length,
            revenue: totalRevenue,
            views: 0
          });
        }

        const { data: lastOrders } = await supabase
          .from('orders')
          .select('*')
          .eq('restaurant_id', rest.id)
          .neq('order_type', 'apertura')
          .gte('created_at', today.toISOString())
          .order('created_at', { ascending: false })
          .limit(5);

        if (lastOrders) setRecentOrders(lastOrders);
      }

      // Carga de cupones
      const { data: cpns } = await supabase
        .from('coupons')
        .select('*')
        .eq('restaurant_id', rest.id)
        .order('created_at', { ascending: false });

      if (cpns) setCoupons(cpns);
    }
  } catch (error) {
    console.error("Error cargando dashboard:", error);
  } finally {
    if (mounted) setLoading(false);
  }
};
  
    loadDashboardData();
const handleRefresh = () => {
      console.log("📢 Pedido detectado, recargando estadísticas y lista...");
      loadDashboardData(); // Ejecuta de nuevo la carga de datos
    };

    window.addEventListener('order-received', handleRefresh);
   return () => { 
      mounted = false;
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
        case 'en_proceso': return <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-bold flex w-fit items-center gap-1"><ChefHat size={12}/> Cocina</span>;
        case 'completado': return <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-bold flex w-fit items-center gap-1"><CheckCircle size={12}/> Listo</span>;
        case 'cancelado': return <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full font-bold flex w-fit items-center gap-1"><XCircle size={12}/> Cancel</span>;
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
  if (loading) return <div className="h-[60vh] flex items-center justify-center text-gray-400"><Loader2 className="animate-spin mr-2"/> Cargando...</div>;

  // --- PANTALLA DE BIENVENIDA Y PLANES ---
  if (isNewUser) {
    return (
      <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in pb-20 pt-4 md:pt-0">
        
        <div className="text-center space-y-6 mb-10">
            <div className="w-16 h-16 bg-black text-white rounded-2xl flex items-center justify-center mx-auto shadow-xl shadow-purple-900/20 p-3">
                <Image src="/logo.svg" alt="Logo" width={40} height={40} className="w-full h-full object-contain" />
            </div>
            <div>
                <h1 className="text-4xl font-black text-gray-900 tracking-tight">¡Bienvenido a Snappy! 🚀</h1>
                <p className="text-lg text-gray-500 mt-2">Configura tu negocio en segundos. Primero, elige cómo quieres crecer.</p>
            </div>
            <div className="bg-blue-50 border border-blue-100 p-5 rounded-2xl max-w-3xl mx-auto text-left shadow-sm">
                <div className="flex items-start gap-4">
                    <div className="bg-blue-100 p-2 rounded-full text-blue-600 shrink-0"><ShieldCheck size={24}/></div>
                    <div>
                        <h3 className="font-bold text-blue-900 text-lg">Prueba 14 días GRATIS con total tranquilidad</h3>
                        <p className="text-sm text-blue-800 mt-1 mb-2 leading-relaxed">No te cobraremos nada hoy. Tienes dos opciones:</p>
                        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-blue-700">
                            <li className="flex items-center gap-2 bg-white/60 p-2 rounded-lg border border-blue-100"><CreditCard size={16}/> <span><b>Configurar ahora:</b> Se debita en 14 días.</span></li>
                            <li className="flex items-center gap-2 bg-white/60 p-2 rounded-lg border border-blue-100"><Clock size={16}/> <span><b>Esperar:</b> Configura el pago luego.</span></li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto items-end">
    {/* Plan Light - Sincronizado con Landing */}
    <div className="bg-white border border-gray-200 p-8 rounded-3xl hover:shadow-xl transition flex flex-col h-full text-gray-900">
        <div className="mb-4">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Light</h3>
            <p className="text-xs text-gray-400 mb-6 uppercase font-bold tracking-wider">Para empezar</p>
            <div className="flex items-baseline gap-1 mt-2">
                <span className="text-4xl font-black text-gray-900">$7.400</span>
                <span className="text-sm text-gray-400">/mes</span>
            </div>
        </div>
        <hr className="border-gray-100 my-4"/>
        <ul className="space-y-4 text-sm text-gray-600 flex-1 mb-8">
            <li className="flex gap-3"><CheckCircle2 size={18} className="text-green-600 flex-shrink-0"/> <b>Hasta 15 Productos</b></li>
            <li className="flex gap-3"><CheckCircle2 size={18} className="text-green-600 flex-shrink-0"/> Catálogo Digital Interactivo</li>
            <li className="flex gap-3"><CheckCircle2 size={18} className="text-green-600 flex-shrink-0"/> Pedidos directos a WhatsApp</li>
            <li className="flex gap-3"><CheckCircle2 size={18} className="text-green-600 flex-shrink-0"/> Mostrar Alias para Transferencias</li>
            <li className="flex gap-3"><CheckCircle2 size={18} className="text-green-600 flex-shrink-0"/> Dominio Personalizable</li>
        </ul>
        <Link href="/dashboard/settings" className="block w-full py-3 rounded-xl border-2 border-black text-center font-bold hover:bg-black hover:text-white transition text-sm">
            Prueba 14 días gratis
        </Link>
    </div>

    {/* Plan Plus - El "Más Elegido" de la Landing */}
    <div className="bg-gray-900 text-white p-8 rounded-[35px] shadow-2xl transform md:-translate-y-4 flex flex-col relative overflow-hidden border-2 border-gray-900 h-full z-10">
        <div className="absolute top-0 right-0 bg-green-500 text-black text-[10px] font-black px-3 py-1 rounded-bl-xl">MÁS ELEGIDO</div>
        <div className="mb-4">
            <h3 className="text-xl font-bold text-green-400 mb-1 flex items-center gap-2">
                Plus <Zap size={18} fill="currentColor" />
            </h3>
            <p className="text-xs text-gray-400 mb-6 uppercase font-bold tracking-wider">Profesional</p>
            <div className="flex items-baseline gap-1 mt-2">
                <span className="text-4xl font-black text-white">$15.900</span>
                <span className="text-sm text-gray-400">/mes</span>
            </div>
        </div>
        <hr className="border-gray-800 my-4"/>
        <ul className="space-y-4 text-sm text-gray-300 flex-1 font-medium mb-8">
            <li className="flex gap-3"><CheckCircle2 size={18} className="text-green-400 flex-shrink-0"/> <b>Productos Ilimitados</b> ✨</li>
            <li className="flex gap-3"><CheckCircle2 size={18} className="text-green-400 flex-shrink-0"/> Todo lo del plan Light</li>
            <li className="flex gap-3"><CheckCircle2 size={18} className="text-green-400 flex-shrink-0"/> <b>Seguimiento de Pedido en Vivo</b> 🚀</li>
            <li className="flex gap-3"><CheckCircle2 size={18} className="text-green-400 flex-shrink-0"/> <b>QR Inteligente</b></li>
            <li className="flex gap-3"><CheckCircle2 size={18} className="text-green-400 flex-shrink-0"/> Panel de Comandas (Cocina)</li>
            <li className="flex gap-3"><CheckCircle2 size={18} className="text-green-400 flex-shrink-0"/> Acceso a todas las plantillas</li>
        </ul>
        <Link href="/dashboard/settings" className="block w-full py-4 rounded-xl bg-green-500 text-black font-black text-center hover:bg-green-400 transition text-sm">
            Prueba 14 días gratis
        </Link>
    </div>

    {/* Plan Max - Próximamente */}
    <div className="bg-white border border-gray-200 p-8 rounded-3xl flex flex-col h-full opacity-60 grayscale-[0.5]">
        <div className="mb-4">
            <span className="text-[10px] font-black bg-gray-100 text-gray-500 px-2 py-1 rounded-lg mb-4 w-fit inline-block">PRÓXIMAMENTE</span>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Max</h3>
            <p className="text-xs text-gray-400 mb-6 font-bold uppercase">Escalabilidad</p>
            <div className="mb-8 blur-[4px] select-none">
                <span className="text-3xl font-black text-gray-900">$28.600</span>
                <span className="text-gray-400 text-sm">/mes</span>
            </div>
        </div>
        <hr className="border-gray-100 my-4"/>
        <ul className="space-y-4 text-sm text-gray-500 flex-1 mb-8 font-medium">
            <li className="flex gap-3"><CheckCircle2 size={16} className="flex-shrink-0"/> Todo lo del plan Plus</li>
            <li className="flex gap-3"><CheckCircle2 size={16} className="flex-shrink-0"/> Panel Pro para Caja</li>
            <li className="flex gap-3"><CheckCircle2 size={16} className="flex-shrink-0"/> Integración Mercado Pago</li>
            <li className="flex gap-3"><CheckCircle2 size={16} className="flex-shrink-0"/> Gestión de hasta 2 sucursales</li>
        </ul>
        <button disabled className="w-full py-3 rounded-xl bg-gray-100 text-gray-400 font-bold cursor-not-allowed">
            Próximamente
        </button>
    </div>
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
              <button onClick={openStoreInBrowser} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase hover:bg-blue-700 transition">
                <ExternalLink size={16}/> Abrir
              </button>
            </div>
          </div>
        </div>

        {/* 2. GRID OPERATIVO: COLUMNA IZQUIERDA (PROMO + ESTADO) | COLUMNA DERECHA (CUPONES) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
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
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 ${showPromo ? 'bg-green-500' : 'bg-gray-200'}`}
                  >
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

            <div className="bg-white border border-gray-100 rounded-[2.5rem] p-6 shadow-sm overflow-hidden relative group">
              <div className={`absolute top-0 left-0 w-1.5 h-full transition-colors duration-500 ${alwaysOpen ? 'bg-green-500' : 'bg-amber-500'}`} />
              <div className="flex items-center justify-between mb-4">
                 <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl transition-colors ${alwaysOpen ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>
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
                          const nuevoEstado = !alwaysOpen;
                          setAlwaysOpen(nuevoEstado);
                          await supabase.from('restaurants').update({ always_open: nuevoEstado }).eq('id', restaurantId);
                      }}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300 ${alwaysOpen ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.4)]' : 'bg-slate-200'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-300 ${alwaysOpen ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                    <span className={`text-[8px] font-black uppercase ${alwaysOpen ? 'text-green-600' : 'text-amber-600'}`}>
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
          <div className="lg:col-span-8 bg-white border border-gray-100 rounded-[2.5rem] p-6 shadow-sm space-y-6 h-full">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-left">
                <Crown size={20} className="text-purple-500 fill-purple-500" />
                <h3 className="font-black text-xs text-gray-900 uppercase tracking-tighter">Gestión de Cupones</h3>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-[2rem] border border-slate-100">
              <div className="flex flex-col gap-1 min-w-0 text-left">
                <label className="text-[9px] font-black uppercase text-gray-400 ml-1">Código</label>
                <input type="text" placeholder="EJ: VERANO20" value={newCoupon.code} onChange={(e) => setNewCoupon({...newCoupon, code: e.target.value.toUpperCase()})} className="w-full p-3 bg-white border-2 border-slate-100 rounded-xl text-xs font-black uppercase text-gray-900 outline-none focus:border-purple-500" />
              </div>
              <div className="flex flex-col gap-1 min-w-0 text-left">
                <label className="text-[9px] font-black uppercase text-gray-400 ml-1">Dcto %</label>
                <input type="number" placeholder="20" value={newCoupon.discount} onChange={(e) => setNewCoupon({...newCoupon, discount: Number(e.target.value)})} className="w-full p-3 bg-white border-2 border-slate-100 rounded-xl text-xs font-black text-gray-900 outline-none focus:border-purple-500" />
              </div>
              <div className="flex flex-col gap-1 min-w-0 text-left">
                <label className="text-[9px] font-black uppercase text-gray-400 ml-1">Desde</label>
                <input type="date" value={newCoupon.startDate} onChange={(e) => setNewCoupon({...newCoupon, startDate: e.target.value})} className="w-full p-3 bg-white border-2 border-slate-100 rounded-xl text-[10px] font-black text-gray-900 outline-none focus:border-purple-500" />
              </div>
              <div className="flex flex-col gap-1 min-w-0 text-left">
                <label className="text-[9px] font-black uppercase text-gray-400 ml-1">Hasta</label>
                <input type="date" value={newCoupon.endDate} onChange={(e) => setNewCoupon({...newCoupon, endDate: e.target.value})} className="w-full p-3 bg-white border-2 border-slate-100 rounded-xl text-[10px] font-black text-gray-900 outline-none focus:border-purple-500" />
              </div>
              <button onClick={handleCreateCoupon} className="col-span-1 sm:col-span-2 md:col-span-4 w-full py-4 bg-purple-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg hover:bg-purple-700 active:scale-95 flex items-center justify-center gap-2 mt-2 transition-all">
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
                      <td className="py-4 px-2 text-purple-600 font-black text-xs">-{c.discount_percent}%</td>
                      <td className="py-4 px-2 text-[9px] text-gray-500 font-bold uppercase">{new Date(c.starts_at).toLocaleDateString()} al {c.expires_at ? new Date(c.expires_at).toLocaleDateString() : '∞'}</td>
                      <td className="py-4 px-2 text-right">
                        <button onClick={() => handleDeleteClick(c.id)} className="p-2 text-gray-300 hover:text-red-500 transition-colors">
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
          <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
              <div className="flex items-center gap-4 text-left">
                  <div className="bg-blue-50 p-4 rounded-3xl text-blue-600">
                      <Lock size={28}/>
                  </div>
                  <div>
                      <h3 className="font-black text-gray-900 uppercase tracking-tighter">Historial de Pedidos</h3>
                      <p className="text-sm text-gray-500 font-medium">Mejora tu plan para habilitar métricas y pedidos en tiempo real.</p>
                  </div>
              </div>
              <Link href="/dashboard/settings" className="w-full md:w-auto bg-black text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-gray-800 transition-all">
                  Ver Planes ⚡
              </Link>
          </div>
        )}
      </div>

      {/* --- ELEMENTOS FUERA DEL VIDRIO (SIEMPRE VISIBLES Y CLIQUEABLES) --- */}
      
      {/* 1. Modal de Suspensión (isLocked) */}
      {isLocked && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center p-4">
          <div className="bg-white/90 backdrop-blur-xl p-10 rounded-[3.5rem] shadow-2xl border border-red-100 text-center max-w-xs animate-in zoom-in-95 duration-500">
            <div className="w-20 h-20 bg-red-50 text-red-500 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-inner">
              <Lock size={40} />
            </div>
            <h3 className="text-2xl font-black uppercase italic tracking-tighter text-gray-900 leading-none">Panel Suspendido</h3>
            <p className="text-[10px] text-gray-400 font-bold mt-4 uppercase tracking-widest leading-relaxed">
              Tu suscripción está vencida. Podés navegar el menú lateral, pero para gestionar tu local debés regularizar el pago.
            </p>
            <button 
              onClick={() => window.open('https://www.mercadopago.com.ar/subscriptions', '_blank')}
              className="mt-8 w-full py-5 bg-red-600 text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-red-200 active:scale-95 transition-all"
            >
              Pagar con Mercado Pago
            </button>
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
              <div className="bg-red-50 p-4 rounded-full text-red-500"><AlertCircle size={40} /></div>
              <div className="space-y-2">
                <h3 className="text-xl font-black text-gray-900 uppercase tracking-tighter italic">¡Cuidado!</h3>
                <p className="text-sm text-gray-500 font-medium">Este cupón se desactivará inmediatamente para todos los clientes.</p>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <button onClick={confirmDelete} className="w-full py-4 bg-red-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-700 transition-all">Borrar de todas formas</button>
              <button onClick={() => setShowDeleteConfirm(false)} className="w-full py-4 bg-gray-100 text-gray-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-200">Cancelar</button>
            </div>
          </div>
        </div>
   )}
    </div>
  );
}