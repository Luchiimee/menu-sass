'use client';

import { useState, useEffect } from 'react';
import { useCart } from '@/context/CartContext';
import { createBrowserClient } from '@supabase/ssr';
import { Send, ShoppingBag, X, ChevronDown, Plus, Minus, Copy, Check, Wallet, Landmark, MessageSquare, Loader2, HelpCircle, CheckCircle2, Zap,User } from 'lucide-react';
import OrderTracker from './OrderTracker';
const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
interface Table {
    id: string;
    name: string;
    status: string;
    restaurant_id: string;
}

export default function CartFooter({ phone, deliveryCost, restaurantId, aliasMp, planType, receiveWhatsapp, businessType, restaurantName }: any) {
   const { cart, updateQuantity, updateExtraQuantity, clearCart, total, activeOrderId, setActiveOrderId } = useCart();

    // --- 2. ESTADOS DE INTERFAZ Y CARGA ---
    const [isVisible, setIsVisible] = useState(false); 
    const [isSending, setIsSending] = useState(false);
    const [aviso, setAviso] = useState<string | null>(null); 
    const [copied, setCopied] = useState(false);
    const [orderStatus, setOrderStatus] = useState('pendiente');

    // --- 3. DATOS DEL CLIENTE Y FORMULARIO ---
    const [nombre, setNombre] = useState('');
    const [telCliente, setTelCliente] = useState('');
    const [direccion, setDireccion] = useState('');
    const [aclaraciones, setAclaraciones] = useState('');
    const [metodoPago, setMetodoPago] = useState('efectivo');

    // --- 4. MÉTODO DE ENVÍO Y MESA (CON MEMORIA PARA EL REFRESCO) ---
   const [metodoEnvio, setMetodoEnvio] = useState('delivery'); 
const [nroMesa, setNroMesa] = useState('')
    const [availableTables, setAvailableTables] = useState<Table[]>([]);

    // --- 5. LÓGICA DE CUPONES ---
    const [couponCode, setCouponCode] = useState("");
    const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
    const [isValidating, setIsValidating] = useState(false);
    const [couponError, setCouponError] = useState("");

    

    const applyCoupon = async () => {
        if (!couponCode) return;
        setIsValidating(true);
        setCouponError("");
        const { data: coupon } = await supabase.from("coupons").select("*").eq("restaurant_id", restaurantId).eq("code", couponCode.toUpperCase()).eq("is_active", true).maybeSingle();
        const now = new Date();
        if (coupon) {
            const startDate = new Date(coupon.starts_at);
            const expiresDate = coupon.expires_at ? new Date(coupon.expires_at) : null;
            if (now < startDate) { setCouponError("Este cupón aún no está activo."); setAppliedCoupon(null); }
            else if (expiresDate && now > expiresDate) { setCouponError("Este cupón ha expirado."); setAppliedCoupon(null); }
            else { setAppliedCoupon(coupon); setCouponError(""); }
        } else { setCouponError("Cupón no válido."); setAppliedCoupon(null); }
        setIsValidating(false);
    };

    useEffect(() => {
        if (cart.length === 0) setIsVisible(false);
    }, [cart.length]);
// 🧠 Recuperar datos de mesa/envio al refrescar si hay un pedido activo
    useEffect(() => {
        if (activeOrderId) {
            const savedEnvio = localStorage.getItem('metodoEnvio');
            const savedMesa = localStorage.getItem('nroMesa');
            
            if (savedEnvio) setMetodoEnvio(savedEnvio);
            if (savedMesa) setNroMesa(savedMesa);
        }
    }, [activeOrderId]);
    useEffect(() => {
       if (activeOrderId && !isVisible) {
           if (planType !== 'go' && planType !== 'plus' && planType !== 'max') {
                const timer = setTimeout(() => { clearCart(); setActiveOrderId(null); }, 15 * 60 * 1000); 
                return () => clearTimeout(timer);
            }
            if (['entregado', 'completado', 'cancelado'].includes(orderStatus)) {
                const timer = setTimeout(() => { clearCart(); setActiveOrderId(null); }, 5 * 60 * 1000);
                return () => clearTimeout(timer);
            }
        }
    }, [activeOrderId, planType, orderStatus]);
 // 🧠 SINCRONIZACIÓN Y LIMPIEZA AUTOMÁTICA
    useEffect(() => {
        if (activeOrderId) {
            const syncStatus = async () => {
                const { data } = await supabase.from('orders').select('status').eq('id', activeOrderId).maybeSingle();
                
                if (data) {
                    // 🚨 SI EL ESTADO ES FINAL (PAGADO O CANCELADO)
                    if (data.status === 'completado' || data.status === 'cancelado') {
                        // Borramos todo de la memoria del celu
                        localStorage.removeItem("activeOrderId");
                        localStorage.removeItem("metodoEnvio");
                        localStorage.removeItem("nroMesa");
                        
                        // Reseteamos los estados de React para que vuelva al menú
                        setActiveOrderId(null);
                        setOrderStatus('pendiente');
                        return; // Salimos de la función
                    }
                    
                    // Si no es final, actualizamos el estado normal
                    setOrderStatus(data.status);
                }
            };
            syncStatus();

            // Escuchar en tiempo real por si el mozo confirma el pago MIENTRAS el cliente mira
            const orderChannel = supabase.channel(`order-update-${activeOrderId}`)
                .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${activeOrderId}` }, 
                (payload) => {
                    const newStatus = payload.new.status;
                    if (newStatus === 'completado' || newStatus === 'cancelado') {
                        localStorage.removeItem("activeOrderId");
                        localStorage.removeItem("metodoEnvio");
                        localStorage.removeItem("nroMesa");
                        setActiveOrderId(null);
                    } else {
                        setOrderStatus(newStatus);
                    }
                })
                .subscribe();

            return () => { supabase.removeChannel(orderChannel); };
        }
    }, [activeOrderId]);
useEffect(() => {
        if (metodoEnvio === 'mesa' && restaurantId) {
            const getTables = async () => {
                // Agregamos un log para ver en la consola si el ID está llegando al celu
                console.log("📡 Buscando mesas para el local:", restaurantId);

                const { data, error } = await supabase
                    .from('tables')
                    .select('*')
                    .eq('restaurant_id', restaurantId)
                    .order('name', { ascending: true });

                if (error) {
                    console.error("❌ Error Supabase:", error.message);
                } else {
                    console.log("✅ Mesas recibidas:", data);
                    setAvailableTables(data || []);
                }
            };
            
            // Le damos 100ms para asegurar que el restaurantId esté cargado
            const timer = setTimeout(() => getTables(), 100);
            return () => clearTimeout(timer);
        }
    }, [metodoEnvio, restaurantId]);
if (activeOrderId && !isVisible) {
    if (planType === 'go' || planType === 'plus' || planType === 'max') {
        const isMesa = metodoEnvio === 'mesa';
        
        const tableStatusText: any = {
            'pendiente': 'El local está revisando tu pedido...',
            'recibido': '¡Pedido Tomado! ✅',
            'en_proceso': 'Tu pedido ya está en la cocina 🔥',
            'listo': 'Tu plato está listo, enseguida te lo alcanzan 🍽️',
            'entregado': '¡Que lo disfrutes! ✨',
            'completado': '¡Que lo disfrutes! ✨',
        };

const handleCallWaiter = async () => {
    if (!nroMesa || !restaurantId) return;

    // Limpiamos el nombre por las dudas (quita espacios y asegura formato)
    const mesaLimpia = nroMesa.trim();

    const { error } = await supabase
        .from('tables')
        .update({ needs_attention: true })
        .eq('restaurant_id', restaurantId)
        .ilike('name', mesaLimpia); // ilike no distingue entre Mayúsculas/Minúsculas

    if (error) {
        console.error("Error al llamar al mozo:", error.message);
    } else {
        setAviso("El mozo fue notificado");
        setTimeout(() => setAviso(null), 3000);
    }
};
        return (
            <div className="fixed inset-0 z-[120] bg-gray-100/50 backdrop-blur-sm flex items-end md:items-center justify-center sm:p-4 text-center">
               {aviso && (
                        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[3000] whitespace-nowrap">
                            <div className="bg-black text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-2 border border-white/10 animate-in fade-in zoom-in duration-300">
                                <Check size={16} className="text-green-500" />
                                <span className="font-bold text-xs uppercase tracking-widest">{aviso}</span>
                            </div>
                        </div>
                    )}
                <div className="w-full h-[90vh] md:h-auto md:max-w-md bg-white rounded-t-[2.5rem] md:rounded-[2.5rem] shadow-2xl relative overflow-hidden flex flex-col animate-in slide-in-from-bottom-10">
                    <button onClick={() => { clearCart(); setActiveOrderId(null); }} className="absolute top-6 right-6 p-2 bg-gray-50 rounded-full hover:bg-gray-100 z-[130] shadow-sm"><X size={20} className="text-gray-400" /></button>
                    
                    <div className="flex-1 overflow-y-auto no-scrollbar p-6 pt-10">
                        {/* 🟦 HEADER AZUL: Solo si es mesa */}
                        {isMesa && (
                            <div className="bg-indigo-600 text-white rounded-3xl p-5 mb-6 text-left shadow-lg animate-in zoom-in">
                                <p className="text-[10px] font-black text-indigo-200 uppercase tracking-widest leading-none mb-1">Mesa {nroMesa}</p>
                                <h4 className="text-base font-black leading-tight">{tableStatusText[orderStatus] || 'Procesando...'}</h4>
                            </div>
                        )}

                        {/* 🔘 TRACKER CENTRAL (IGUAL PARA TODOS) */}
                        <div className="mb-8">
                            <OrderTracker 
                                orderId={activeOrderId} 
                                restaurantPhone={phone} 
                                businessType={isMesa ? "mesa" : (businessType || "gastronomico")} 
                                onStatusChange={(s: string) => setOrderStatus(s)} 
                            />
                        </div>

                        {/* 🔘 BOTONES DE ACCIÓN: SEPARADOS POR TIPO */}
                        <div className="flex flex-col gap-3 mt-auto pb-4">
                            {isMesa ? (
                                // --- BOTONES SOLO PARA MESA ---
                                <>
                                    <button onClick={handleCallWaiter} className="w-full bg-white border-2 border-orange-500 text-orange-600 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all">
                                        <MessageSquare size={18} /> Llamar Mozo
                                    </button>
                                    
                                    {(orderStatus === 'entregado' || orderStatus === 'completado') && (
                                        <button 
                                            onClick={() => window.open(`whatsapp://send?phone=${String(phone).replace(/\D/g, '')}&text=Hola! Pedir cuenta Mesa ${nroMesa}`)}
                                            className="w-full bg-orange-500 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg flex items-center justify-center gap-2 animate-in zoom-in"
                                        >
                                            <Wallet size={18} /> Pagar Cuenta
                                        </button>
                                    )}
                                </>
                            ) : (
                                // --- BOTONES SOLO PARA ENVÍO/RETIRO ---
                                <>
                                    {(orderStatus === 'entregado' || orderStatus === 'completado') ? (
                                        <button 
                                            onClick={() => { clearCart(); setActiveOrderId(null); }}
                                            className="w-full bg-gray-900 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest animate-in fade-in"
                                        >
                                            Finalizar
                                        </button>
                                    ) : (
                                        <button 
                                            onClick={() => window.open(`whatsapp://send?phone=${String(phone).replace(/\D/g, '')}`)}
                                            className="w-full bg-green-600 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2"
                                        >
                                            <MessageSquare size={18} /> Consultar por WhatsApp
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}
    const subtotal = cart.reduce((acc: number, item: any) => {
        const extrasTotal = (item.extrasList || []).reduce((a: number, b: any) => a + (b.price * b.quantity), 0);
        return acc + (item.price + extrasTotal) * item.quantity;
    }, 0);
    const montoDescuento = appliedCoupon ? (subtotal * Number(appliedCoupon.discount_percent) / 100) : 0;
    const envio = metodoEnvio === 'delivery' ? (Number(deliveryCost) || 0) : 0;
    const totalFinal = subtotal - montoDescuento + envio;
    const formatPrice = (price: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(price);

    const handleCopyAlias = async () => {
        if (!aliasMp) return;
        try { await navigator.clipboard.writeText(aliasMp); } catch (err) {
            const textArea = document.createElement("textarea"); textArea.value = aliasMp; document.body.appendChild(textArea); textArea.select(); document.execCommand('copy'); document.body.removeChild(textArea);
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 4000); 
    };

  const handleSendOrder = async () => {
    if (!nombre.trim()) return alert("Por favor, ingresá tu nombre.");
    if (metodoEnvio === 'delivery' && !direccion.trim()) return alert("Ingresá la dirección de envío.");
    if (metodoEnvio === 'mesa' && !nroMesa) return alert("Por favor, seleccioná una mesa.");

    const isPlus = planType === 'plus' || planType === 'max';
    const isLight = planType === 'light';
    setIsSending(true);

    try {
        let orderRef = "WhatsApp";
        
        // 1. GUARDADO EN BASE DE DATOS (Solo si no es Light)
        if (!isLight) {
            const { data: newOrder, error } = await supabase.from('orders').insert({
                restaurant_id: restaurantId, customer_name: nombre, customer_phone: telCliente, address: metodoEnvio === 'delivery' ? direccion : '',
                order_type: metodoEnvio, payment_method: metodoPago, total: totalFinal, status: 'pendiente', delivery_cost: envio, origin_plan: planType,
                items: cart, table_number: metodoEnvio === 'mesa' ? nroMesa : null, description: aclaraciones, coupon_code: appliedCoupon?.code || null, discount_amount: montoDescuento || 0
            }).select().single();

            if (error) throw error;
            if (newOrder) {
                setActiveOrderId(newOrder.id);
                localStorage.setItem("activeOrderId", newOrder.id); // 🚀 Guardamos para persistencia
                localStorage.setItem("metodoEnvio", metodoEnvio);
        localStorage.setItem("nroMesa", nroMesa);
                orderRef = `#${newOrder.id.slice(0, 5)}`;
            }
        } else {
            setActiveOrderId('light-plan-order');
        }

        // 2. CONSTRUCCIÓN DEL MENSAJE (Se arma siempre, por si es delivery)
        let mensaje = `*¡Hola! Nuevo Pedido*\nRef: ${orderRef}\n------------------\n`;
        mensaje += `👤 *Nombre:* ${nombre}\n`;
        if (telCliente) mensaje += `📞 *Tel:* ${telCliente}\n`;
        mensaje += `🛵 *Entrega:* ${metodoEnvio.toUpperCase()}\n`;
        if (metodoEnvio === 'delivery') mensaje += `📍 *Dirección:* ${direccion}\n`;
        if (metodoEnvio === 'mesa') mensaje += `🍽️ *Mesa:* ${nroMesa}\n`;
        mensaje += `💳 *Pago:* ${metodoPago.toUpperCase()}\n\n*Pedido:*\n`;
        
        cart.forEach((item: any) => { 
            mensaje += `✅ *${item.quantity}x ${item.name}*\n`; 
            if (item.extrasList?.length > 0) {
                item.extrasList.forEach((ex: any) => {
                    mensaje += `      _Extra: ${ex.name} (${formatPrice(ex.price)})_\n`; 
                });
            }
        });

        if (aclaraciones) mensaje += `\n📝 *Nota:* ${aclaraciones}\n`;
        mensaje += `\n------------------\n💰 *Subtotal:* ${formatPrice(subtotal)}\n`;
        if (appliedCoupon) { mensaje += `🎟️ *Cupón:* ${appliedCoupon.code} (-${appliedCoupon.discount_percent}%)\n➖ *Descuento:* -${formatPrice(montoDescuento)}\n`; }
        if (envio > 0) mensaje += `🚚 *Envío:* ${formatPrice(envio)}\n`;
        mensaje += `\n🔥 *TOTAL: ${formatPrice(totalFinal)}*`;

        // 🚀 3. PROTOCOLO DE REDIRECCIÓN INTELIGENTE
        setIsVisible(false); // Cerramos el modal del pedido

        // 🛑 CASO MESA: BLOQUEO TOTAL DE WHATSAPP
        if (metodoEnvio === 'mesa') {
            window.onbeforeunload = null; // Limpiamos alertas de salida
            setIsSending(false);
            // No hacemos reload, dejamos que el estado activeOrderId muestre el tracker solo
            return; 
        }

        // 🛵 CASO DELIVERY / RETIRO: FLUJO WHATSAPP
        if (isLight || receiveWhatsapp === true) {
            const cleanPhone = String(phone).replace(/\D/g, ''); 
            const textEncoded = encodeURIComponent(mensaje);
            const protocolUrl = `whatsapp://send?phone=${cleanPhone}&text=${textEncoded}`;

            window.onbeforeunload = null;
            setTimeout(() => {
                window.location.href = protocolUrl;
            }, 100);
        } else {
            console.log("Pedido guardado. Solo panel activado.");
        }
        
        setIsSending(false);
    } catch (err) { 
        console.error("Error:", err); 
        alert("Error al procesar el pedido."); 
        setIsSending(false); 
    }
};
 if (!cart || cart.length === 0 || !isVisible) {
        if (cart.length > 0) return (
            /* Contenedor invisible que centra el área del botón en PC */
            <div className="fixed bottom-6 inset-x-0 z-[110] pointer-events-none flex justify-center">
                <div className="w-full max-w-md relative flex justify-end px-6">
                    {/* El botón ahora es relativo a este contenedor de max-w-md */}
                    <button 
                        onClick={() => setIsVisible(true)} 
                        className="pointer-events-auto bg-green-600 text-white p-4 rounded-full shadow-2xl active:scale-90 transition-transform hover:scale-105 relative"
                    >
                        <ShoppingBag size={28} />
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-6 h-6 rounded-full flex items-center justify-center font-bold border-2 border-white">
                            {cart.length}
                        </span>
                    </button>
                </div>
            </div>
        );
        return null;
    }
return (
    /* 1. OVERLAY: Ahora ocupa toda la pantalla con un fondo oscuro suave. Si tocan arriba del modal, se cierra. */
    <div 
        className="fixed inset-0 z-[120] bg-black/40 backdrop-blur-[2px] flex flex-col justify-end"
        onClick={() => setIsVisible(false)} // FIX: Tocar afuera cierra el pedido
    >
        <div 
            onClick={(e) => e.stopPropagation()} // Evita que al tocar adentro del pedido se cierre
            className="w-full max-w-md mx-auto bg-white shadow-[0_-10px_40px_rgba(0,0,0,0.3)] rounded-t-[2.5rem] h-[85vh] flex flex-col overflow-hidden font-sans text-black animate-in slide-in-from-bottom-full duration-300"
        >
            
            {/* --- CABEZAL FIJO (BOTONES) --- */}
            <div className="bg-white border-b border-gray-100 px-6 py-4 flex justify-between items-center flex-shrink-0">
                <button 
                    onClick={() => setIsVisible(false)} 
                    className="flex items-center gap-1 text-gray-400 font-black text-[11px] uppercase tracking-widest active:opacity-50 cursor-pointer p-2 -ml-2"
                >
                    <ChevronDown size={20} strokeWidth={3} /> Seguir pidiendo
                </button>
                <button 
                    onClick={() => setIsVisible(false)} 
                    className="bg-gray-100 p-2 rounded-full text-gray-500 active:scale-90 transition-transform cursor-pointer"
                >
                    <X size={20} strokeWidth={3} />
                </button>
            </div>

            {/* --- CUERPO SCROLLEABLE --- */}
            <div className="flex-1 overflow-y-auto overscroll-contain no-scrollbar p-4 space-y-5 pb-32">
                <h2 className="text-xl font-black text-gray-800 px-1">Tu Pedido</h2>
                
                <div className="space-y-4">
                    {cart.map((item: any) => (
                        <div key={item.uniqueId} className="bg-gray-50 rounded-3xl p-4 border border-gray-100 shadow-sm">
                            <div className="flex justify-between items-center mb-3">
                                <div className="flex-1">
                                    <span className="text-gray-900 font-black text-base block leading-tight">{item.name}</span>
                                    <span className="text-green-600 font-bold text-sm">{formatPrice(item.price)}</span>
                                </div>
                                <div className="flex items-center gap-4 bg-white shadow-sm rounded-2xl p-1 border border-gray-100">
                                    <button onClick={() => updateQuantity(item.uniqueId, item.quantity - 1)} className="w-10 h-10 flex items-center justify-center text-red-500 active:scale-75"><Minus size={20} strokeWidth={3}/></button>
                                    <span className="font-black text-lg min-w-[20px] text-center">{item.quantity}</span>
                                    <button onClick={() => updateQuantity(item.uniqueId, item.quantity + 1)} className="w-10 h-10 flex items-center justify-center text-green-600 active:scale-75"><Plus size={20} strokeWidth={3}/></button>
                                </div>
                            </div>
                            {item.extrasList?.map((ex: any) => (
                                <div key={ex.id} className="flex justify-between items-center pl-4 py-2 mt-2 bg-white/60 rounded-xl border border-dashed border-gray-200">
                                    <div className="flex flex-col flex-1"><span className="text-xs text-gray-500 font-bold">+ {ex.name}</span><span className="text-[10px] text-green-600 font-bold">{formatPrice(ex.price)}</span></div>
                                    <div className="flex items-center gap-3 mr-1">
                                        <button onClick={() => updateExtraQuantity(item.uniqueId, ex.id, ex.quantity - 1)} className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-lg text-red-500 active:scale-75"><Minus size={16} strokeWidth={3}/></button>
                                        <span className="text-xs font-black">{ex.quantity}</span>
                                        <button onClick={() => updateExtraQuantity(item.uniqueId, ex.id, ex.quantity + 1)} className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-lg text-green-600 active:scale-75"><Plus size={16} strokeWidth={3}/></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>

                <div className="space-y-4 bg-gray-50 p-4 rounded-3xl border border-gray-100 shadow-inner">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1"><label className="text-[10px] font-black text-gray-400 uppercase ml-2">Nombre</label><input type="text" placeholder="Tu nombre" value={nombre} onChange={(e)=>setNombre(e.target.value)} className="w-full p-3 bg-white border border-gray-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-green-500" /></div>
                        <div className="space-y-1"><label className="text-[10px] font-black text-gray-400 uppercase ml-2">Teléfono</label><input type="tel" placeholder="WhatsApp" value={telCliente} onChange={(e)=>setTelCliente(e.target.value)} className="w-full p-3 bg-white border border-gray-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-green-500" /></div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Método de Entrega</label>
                        <div className="flex bg-gray-200/50 p-1 rounded-2xl gap-1">
                            {['delivery', 'retiro', 'mesa'].filter(m => !(m === 'mesa' && planType === 'light')).map((m) => (
                                <button key={m} onClick={() => setMetodoEnvio(m)} className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${metodoEnvio === m ? 'bg-white shadow-sm text-green-600' : 'text-gray-400'}`}>{m === 'delivery' ? 'Envío' : m === 'retiro' ? 'Retiro' : 'Mesa'}</button>
                            ))}
                        </div>
                    </div>
                    {metodoEnvio === 'delivery' && (
                        <div className="space-y-1 animate-in fade-in slide-in-from-top-2">
                            <div className="flex justify-between items-center px-4 py-2 mb-2 bg-green-50 rounded-2xl border border-green-100"><span className="text-[10px] font-black text-green-700 uppercase tracking-widest">Costo de Envío</span><span className="font-black text-green-700">{formatPrice(envio)}</span></div>
                            <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Dirección del Envío</label>
                            <input type="text" placeholder="Calle, número..." value={direccion} onChange={(e)=>setDireccion(e.target.value)} className="w-full p-3 bg-white border border-gray-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-green-500 shadow-inner" />
                        </div>
                    )}
                    {metodoEnvio === 'mesa' && (
                        <div className="space-y-3 animate-in fade-in slide-in-from-top-2 bg-white p-4 rounded-3xl border border-gray-100 shadow-inner">
                            <label className="text-[10px] font-black text-gray-400 uppercase ml-2 tracking-widest">Seleccioná tu mesa</label>
                            {availableTables.length === 0 && (
    <div className="p-4 bg-gray-50 rounded-2xl border border-dashed border-gray-200 mt-2">
        <p className="text-[10px] text-gray-400 text-center italic">Cargando mesas o no hay mesas disponibles...</p>
    </div>
)}
                            <div className="grid grid-cols-3 gap-2">
                                {availableTables.map((mesa: any) => (
                                    <button key={mesa.id} type="button" disabled={mesa.status === 'reservada'} onClick={() => setNroMesa(mesa.name)} className={`p-3 rounded-2xl text-xs font-bold border-2 transition-all flex flex-col items-center gap-1 ${mesa.status === 'reservada' ? 'bg-gray-50 border-gray-50 text-gray-300 cursor-not-allowed' : nroMesa === mesa.name ? 'border-green-600 bg-green-50 text-green-700 shadow-md scale-105' : 'border-gray-100 bg-white text-gray-500 hover:border-gray-200'}`}><span className="text-lg">{mesa.status === 'reservada' ? '🔒' : '🍽️'}</span><span className="truncate w-full text-center">{mesa.name}</span></button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
{metodoEnvio !== 'mesa' && (
    <div className="space-y-3 animate-in fade-in duration-300">
        <label className="text-[10px] font-black text-gray-400 uppercase ml-2">
            Medio de Pago
        </label>
        <div className="grid grid-cols-2 gap-2">
            <button 
                onClick={() => setMetodoPago('efectivo')} 
                className={`p-4 rounded-2xl border-2 flex items-center justify-center gap-2 font-bold text-sm transition-all ${metodoPago === 'efectivo' ? 'border-green-600 bg-green-50 text-green-700' : 'border-gray-100 text-gray-400'}`}
            >
                <Wallet size={18} /> Efectivo
            </button>
            <button 
                onClick={() => setMetodoPago('transferencia')} 
                className={`p-4 rounded-2xl border-2 flex items-center justify-center gap-2 font-bold text-sm transition-all ${metodoPago === 'transferencia' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-100 text-gray-400'}`}
            >
                <Landmark size={18} /> Transferencia
            </button>
        </div>

        {/* Lógica de Alias para Transferencia */}
        {metodoPago === 'transferencia' && aliasMp && (
            <div className="space-y-2">
                <div 
                    onClick={handleCopyAlias} 
                    className={`p-4 rounded-2xl flex justify-between items-center cursor-pointer transition-all border-2 ${copied ? 'bg-blue-600 border-blue-600 shadow-lg scale-[1.02]' : 'bg-blue-50 border-blue-200 shadow-sm active:scale-95'}`}
                >
                    <div className={copied ? 'text-white' : 'text-blue-900'}>
                        <p className="text-[9px] font-black opacity-80 uppercase leading-none mb-1">
                            {copied ? '¡COPIADO!' : 'TOCA PARA COPIAR ALIAS'}
                        </p>
                        <p className="text-sm font-black">{aliasMp}</p>
                    </div>
                    {copied ? <Check size={20} className="text-white" /> : <Copy size={20} className="text-blue-400" />}
                </div>
                
                {copied && (
                    <div className="bg-blue-50 text-blue-800 px-4 py-3 rounded-2xl text-[11px] font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-1 border border-blue-100 shadow-sm">
                        <MessageSquare size={16} className="text-blue-500" />
                        <span>¡Alias copiado! Enviame el comprobante luego de enviar el pedido.</span>
                    </div>
                )}
            </div>
        )}
    </div>
)}

                <div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase ml-2">¿Alguna aclaración?</label><textarea placeholder="Deja aquí alguna nota" value={aclaraciones} onChange={(e) => setAclaraciones(e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-3xl text-sm outline-none focus:ring-2 focus:ring-green-500 h-24 resize-none" /></div>

                <div className="pt-2 border-t border-gray-100 space-y-4">
                    <div className="bg-gray-50 p-4 rounded-[2rem] border border-gray-100 shadow-inner">
                        <label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-2 block tracking-widest">¿Tenés un cupón?</label>
                        {!appliedCoupon ? (
                            <div className="flex gap-2"><input type="text" placeholder="CÓDIGO" value={couponCode} onChange={(e) => setCouponCode(e.target.value)} className="flex-1 p-3 bg-white border border-gray-200 rounded-2xl text-xs font-black uppercase outline-none focus:ring-2 focus:ring-green-500 text-gray-900" /><button onClick={applyCoupon} disabled={isValidating} className="bg-gray-900 text-white px-5 rounded-2xl text-[10px] font-black uppercase active:scale-95 disabled:opacity-50">{isValidating ? <Loader2 className="animate-spin" size={16}/> : 'Aplicar'}</button></div>
                        ) : (
                            <div className="flex justify-between items-center bg-green-100 border border-green-200 p-3 px-5 rounded-2xl animate-in zoom-in"><div className="flex flex-col text-left leading-tight"><span className="text-[9px] font-black text-green-700 uppercase tracking-tighter">Cupón Activado</span><span className="text-sm font-black text-green-800 italic">{appliedCoupon.code} (-{appliedCoupon.discount_percent}%)</span></div><button onClick={() => {setAppliedCoupon(null); setCouponCode("");}} className="text-green-700 p-1 hover:bg-green-200 rounded-full transition-colors"><X size={20} /></button></div>
                        )}
                        {couponError && <p className="text-[10px] text-red-500 font-bold mt-2 ml-2 italic animate-in fade-in">{couponError}</p>}
                    </div>
                    <div className="px-2 space-y-1 pb-4">
                        <div className="flex justify-between items-center text-[10px] font-black uppercase text-gray-400 tracking-tighter"><span>Subtotal</span><span>{formatPrice(subtotal)}</span></div>
                        {appliedCoupon && <div className="flex justify-between items-center text-[11px] font-black uppercase text-green-600 italic"><span>Descuento</span><span>-{formatPrice(montoDescuento)}</span></div>}
                        <div className="flex justify-between items-center text-[10px] font-black uppercase text-gray-400 tracking-tighter"><span>Envío</span><span>{envio > 0 ? formatPrice(envio) : 'Gratis'}</span></div>
                        <div className="flex justify-between items-end pt-2 mt-2 border-t border-dashed border-gray-200"><span className="text-xs font-black uppercase text-gray-900 mb-1">Total Final</span><span className="text-4xl font-black text-gray-900 tracking-tighter leading-none">{formatPrice(totalFinal)}</span></div>
                    </div>
                   <button 
    onClick={handleSendOrder} 
    disabled={isSending} 
    className="w-full bg-green-700 text-white py-5 rounded-[2.5rem] font-black flex items-center justify-center gap-3 shadow-xl text-xl active:scale-95 transition-all disabled:opacity-50 mb-10"
>
    {isSending ? (
        <Loader2 className="animate-spin" size={24} />
    ) : (
        <>
            <Send size={24} /> 
            {metodoEnvio === 'mesa' ? 'Pedir ahora' : 'Enviar Pedido'}
        </>
    )}
</button>
                </div>
            </div>
        </div>
        {aviso && (
                <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[3000] whitespace-nowrap">
                    <div className="bg-black text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-2 border border-white/10 animate-in fade-in zoom-in duration-300">
                        <Check size={16} className="text-green-500" />
                        <span className="font-bold text-xs uppercase tracking-widest">{aviso}</span>
                    </div>
                </div>
            )}
    </div>
  );
}