'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { 
    DollarSign, ShoppingBag, Eye, Copy, ExternalLink, Clock, 
    CheckCircle, XCircle, ChefHat, ArrowRight, Store, Loader2, 
    Zap, Lock, CheckCircle2, Crown, AlertCircle, CreditCard, ShieldCheck,
    QrCode, Plus, Trash2, X
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
      startDate: '', 
      endDate: '' 
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
        if (!session) {
          if (mounted) setLoading(false);
          return;
        }

        const { data: rest } = await supabase
          .from('restaurants')
          .select('id, slug, subscription_plan, subscription_status, promo_message, show_promo, always_open')
          .eq('user_id', session.user.id)
          .maybeSingle();

        if (mounted) {
          // LÓGICA DE BLOQUEO: Solo 'cancelled' activa el isLocked
          const isBlocked = rest?.subscription_status === 'cancelled';

          // Si no tiene plan o no hay restaurante, pantalla de bienvenida
          if (!rest || !rest.subscription_plan) {
            setIsNewUser(true); 
            setLoading(false);
            return;
          }

          setIsLocked(isBlocked); 
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
                setStats({ orders: validOrders.length, revenue: totalRevenue, views: 0 });
            }

            const { data: lastOrders } = await supabase
                .from('orders')
                .select('*')
                .eq('restaurant_id', rest.id)
                .neq('order_type', 'apertura')
                .order('created_at', { ascending: false })
                .limit(5);

            if (lastOrders) setRecentOrders(lastOrders);
          }

          const { data: cpns } = await supabase
            .from('coupons')
            .select('*')
            .eq('restaurant_id', rest.id)
            .order('created_at', { ascending: false });

          if (cpns) setCoupons(cpns);
        }
      } catch (error) {
        console.error("Error:", error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadDashboardData();

    const handleRefresh = () => loadDashboardData();
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
    window.open(url, '_blank');
  };

  const handleDownloadQrPdf = async () => {
    try {
        setGeneratingPdf(true);
        const QRCode = (await import('qrcode')).default; 
        const { jsPDF } = await import('jspdf');
        const qrDataUrl = await QRCode.toDataURL(storeLink, { width: 400 });
        const doc = new jsPDF();
        doc.text(`snappy.uno/${slug}`, 105, 50, { align: 'center' });
        doc.addImage(qrDataUrl, 'PNG', 55, 60, 100, 100);
        doc.save(`qr-menu-${slug}.pdf`);
    } catch (error) {
        console.error(error);
    } finally {
        setGeneratingPdf(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
        case 'pendiente': return <span className="bg-yellow-100 text-yellow-800 text-[10px] px-2 py-1 rounded-full font-bold flex items-center gap-1"><Clock size={12}/> Pendiente</span>;
        case 'en_proceso': return <span className="bg-blue-100 text-blue-800 text-[10px] px-2 py-1 rounded-full font-bold flex items-center gap-1"><ChefHat size={12}/> Cocina</span>;
        case 'completado': return <span className="bg-green-100 text-green-800 text-[10px] px-2 py-1 rounded-full font-bold flex items-center gap-1"><CheckCircle size={12}/> Listo</span>;
        case 'cancelado': return <span className="bg-red-100 text-red-800 text-[10px] px-2 py-1 rounded-full font-bold flex items-center gap-1"><XCircle size={12}/> Cancel</span>;
        default: return null;
    }
  };

  const handleTogglePromo = async () => {
    const nuevoEstado = !showPromo;
    setShowPromo(nuevoEstado);
    await supabase.from('restaurants').update({ show_promo: nuevoEstado }).eq('slug', slug);
  };

  const savePromoMessage = async () => {
    setIsSavingPromo(true);
    await supabase.from('restaurants').update({ promo_message: promoMessage }).eq('slug', slug);
    setIsSavingPromo(false);
  };

  const handleCreateCoupon = async () => {
    if (!newCoupon.code || !restaurantId) return;
    const { data, error } = await supabase.from('coupons').insert({
        restaurant_id: restaurantId,
        code: newCoupon.code.toUpperCase(),
        discount_percent: newCoupon.discount,
        starts_at: newCoupon.startDate ? `${newCoupon.startDate}T00:00:00` : new Date().toISOString(),
        expires_at: newCoupon.endDate ? `${newCoupon.endDate}T23:59:59` : null,
        is_active: true
    }).select().single();
    if (!error && data) {
        setCoupons([data, ...coupons]);
        setNewCoupon({ code: '', discount: 10, startDate: '', endDate: '' });
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 3000);
    }
  };

  const handleDeleteClick = (id: string) => {
    setCouponPendingDelete(id);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!couponPendingDelete) return;
    const { error } = await supabase.from('coupons').delete().eq('id', couponPendingDelete);
    if (!error) {
        setCoupons(coupons.filter(c => c.id !== couponPendingDelete));
        setShowDeleteConfirm(false);
    }
  };

  if (loading) return <div className="h-[60vh] flex items-center justify-center text-gray-400"><Loader2 className="animate-spin mr-2"/> Cargando...</div>;

  // --- PANTALLA DE BIENVENIDA (Sin Sidebar bloqueado porque es un return diferente) ---
  if (isNewUser) {
    return (
      <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in pb-20 pt-4 md:pt-0">
         <div className="text-center space-y-6 mb-10">
            <div className="w-16 h-16 bg-black text-white rounded-2xl flex items-center justify-center mx-auto p-3">
                <img src="/logo.svg" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-4xl font-black text-gray-900 tracking-tight">¡Bienvenido! 🚀</h1>
            <p className="text-gray-500">Configura tu negocio para empezar.</p>
         </div>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* ... Aquí irían tus tarjetas de planes simplificadas ... */}
            <Link href="/dashboard/settings" className="p-8 bg-black text-white rounded-[2.5rem] text-center font-bold">Activar mi Menú ahora</Link>
         </div>
      </div>
    );
  }

  // --- DASHBOARD REAL ---
  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in pb-20 pt-6 md:pt-0 relative">
      
      {/* CONTENEDOR CON VIDRIO (Solo contenido derecho) */}
      <div className={`transition-all duration-700 ${isLocked ? 'blur-md pointer-events-none opacity-50 grayscale' : ''}`}>
        
        {/* 1. TIENDA ACTIVA */}
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
              <button onClick={copyToClipboard} className="bg-white text-black px-6 py-3 rounded-2xl text-xs font-black uppercase shadow-lg active:scale-95">{copied ? '¡Copiado!' : 'Copiar'}</button>
              <button onClick={openStoreInBrowser} className="bg-blue-600 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase shadow-lg">Abrir Menú</button>
            </div>
          </div>
        </div>

        {/* 2. GRID OPERATIVO */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 space-y-6 text-left">
            <div className="bg-white border border-gray-100 rounded-[2.5rem] p-6 shadow-sm">
                <h3 className="font-black text-xs uppercase text-gray-900 mb-4 flex items-center gap-2"><Zap size={16} className="text-orange-500"/> Mensaje Promo</h3>
                <textarea value={promoMessage} onChange={(e) => setPromoMessage(e.target.value)} onBlur={savePromoMessage} className="w-full p-4 bg-gray-50 rounded-2xl text-xs font-bold outline-none h-24 text-gray-900" />
            </div>
            <div className="bg-white border border-gray-100 rounded-[2.5rem] p-6 shadow-sm">
                <h3 className="font-black text-xs uppercase text-gray-900 mb-2 flex items-center gap-2"><Clock size={16} className="text-blue-500"/> Estado Manual</h3>
                <button onClick={async () => {
                    const next = !alwaysOpen; setAlwaysOpen(next);
                    await supabase.from('restaurants').update({ always_open: next }).eq('id', restaurantId);
                }} className={`w-11 h-6 rounded-full relative transition-colors ${alwaysOpen ? 'bg-green-500' : 'bg-gray-200'}`}>
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${alwaysOpen ? 'left-6' : 'left-1'}`} />
                </button>
            </div>
          </div>

          <div className="lg:col-span-8 bg-white border border-gray-100 rounded-[2.5rem] p-6 shadow-sm">
             <h3 className="font-black text-xs uppercase text-gray-900 mb-4 flex items-center gap-2"><Crown size={16} className="text-purple-500"/> Cupones</h3>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <input type="text" placeholder="CÓDIGO" value={newCoupon.code} onChange={(e) => setNewCoupon({...newCoupon, code: e.target.value.toUpperCase()})} className="p-3 bg-gray-50 rounded-xl text-xs font-black uppercase text-gray-900 outline-none" />
                <button onClick={handleCreateCoupon} className="bg-purple-600 text-white rounded-xl font-black text-[10px] uppercase py-3">Crear Cupón</button>
             </div>
             <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-bold">
                   <tbody className="divide-y divide-gray-50 text-gray-900">
                      {coupons.map(c => (
                        <tr key={c.id}>
                          <td className="py-3">{c.code}</td>
                          <td className="py-3">-{c.discount_percent}%</td>
                          <td className="py-3 text-right"><button onClick={() => handleDeleteClick(c.id)} className="text-red-400"><Trash2 size={16}/></button></td>
                        </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </div>
        </div>

        {/* 3. ACTIVIDAD RECIENTE */}
        <div className="mt-6">
          {isPlus ? (
            <div className="bg-white border border-gray-100 rounded-[2.5rem] shadow-sm p-8 text-gray-900 text-left">
              <h2 className="text-lg font-black uppercase italic mb-6">Actividad Reciente</h2>
              <div className="space-y-4">
                {recentOrders.length > 0 ? recentOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <div className="flex items-center gap-4">
                      <div className="bg-black text-white p-2 rounded-xl"><ShoppingBag size={16} /></div>
                      <div>
                        <p className="text-[10px] font-black uppercase">Pedido #{order.id.slice(0,5)}</p>
                        <p className="text-[9px] text-gray-400 font-bold">{new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}hs</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-black text-xs">${Number(order.total).toLocaleString()}</span>
                      {getStatusBadge(order.status)}
                    </div>
                  </div>
                )) : <p className="text-center py-10 text-gray-400 italic">Sin pedidos recientes</p>}
              </div>
            </div>
          ) : (
            <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
              <div className="flex items-center gap-4 text-left">
                <div className="bg-blue-50 p-4 rounded-3xl text-blue-600"><Lock size={28}/></div>
                <div>
                  <h3 className="font-black text-gray-900 uppercase">Historial Bloqueado</h3>
                  <p className="text-sm text-gray-500">Mejora tu plan para ver tus ventas.</p>
                </div>
              </div>
              <Link href="/dashboard/settings" className="bg-black text-white px-8 py-4 rounded-2xl font-black text-xs uppercase shadow-xl">Ver Planes ⚡</Link>
            </div>
          )}
        </div>
      </div>

      {/* ELEMENTOS FUERA DEL VIDRIO */}
      {isLocked && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center p-4">
          <div className="bg-white/90 backdrop-blur-xl p-10 rounded-[3.5rem] shadow-2xl border border-red-100 text-center max-w-xs animate-in zoom-in-95">
            <div className="w-20 h-20 bg-red-50 text-red-500 rounded-[2rem] flex items-center justify-center mx-auto mb-6"><Lock size={40} /></div>
            <h3 className="text-2xl font-black uppercase italic tracking-tighter text-gray-900 leading-none">Panel Suspendido</h3>
            <p className="text-[11px] text-gray-400 font-bold mt-4 uppercase tracking-widest leading-relaxed">Suscripción vencida. Regulariza el pago para gestionar tu local.</p>
            <button onClick={() => window.open('https://www.mercadopago.com.ar/subscriptions', '_blank')} className="mt-8 w-full py-5 bg-red-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all">Revisar Pago</button>
          </div>
        </div>
      )}

      {showSuccessToast && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[200] animate-in slide-in-from-bottom-10">
          <div className="bg-gray-900 text-white px-6 py-4 rounded-3xl shadow-2xl flex items-center gap-3">
            <div className="bg-green-500 rounded-full p-1"><CheckCircle2 size={16} className="text-white" /></div>
            <span className="text-sm font-black uppercase tracking-tighter">¡Cupón creado!</span>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl border border-gray-100 space-y-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="bg-red-50 p-4 rounded-full text-red-500"><AlertCircle size={40} /></div>
              <h3 className="text-xl font-black text-gray-900 uppercase tracking-tighter italic">¿Borrar cupón?</h3>
              <p className="text-sm text-gray-500 font-medium">Esta acción desactivará el descuento inmediatamente.</p>
            </div>
            <div className="flex flex-col gap-2">
              <button onClick={confirmDelete} className="w-full py-4 bg-red-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest">Eliminar</button>
              <button onClick={() => setShowDeleteConfirm(false)} className="w-full py-4 bg-gray-100 text-gray-500 rounded-2xl font-black text-xs uppercase tracking-widest">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}