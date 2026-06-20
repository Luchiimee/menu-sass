'use client';

import { useState, useEffect } from 'react';
import { useCart } from '@/context/CartContext';
import { createBrowserClient } from '@supabase/ssr';
import { Send, ShoppingBag, X, ChevronDown, Plus, Minus, Copy, Check, Wallet, Landmark, MessageSquare, Loader2, HelpCircle, CheckCircle2, Zap,User,CreditCard,Clock } from 'lucide-react';
import OrderTracker from './OrderTracker';
import { displayTableLabel } from '@/lib/tableUtils';
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

export default function CartFooter({
    phone, deliveryCost, restaurantId, aliasMp, planType, receiveWhatsapp,
    businessType, restaurantName,
    scheduled_delivery_enabled,
    scheduled_delivery_slots,
    scheduled_delivery_config,
    isAdmin,
    tableIdFromQR = null,
    mesaLabel = null,
}: any) {
    const { cart, updateQuantity, updateExtraQuantity, clearCart, total, activeOrderId, setActiveOrderId } = useCart();
    
    // --- 1. ESTADOS PRINCIPALES ---
    const [pasoPago, setPasoPago] = useState<'inicio' | 'seleccion' | 'transferencia' | 'espera'>('inicio');
    const [nombreApellidoPago, setNombreApellidoPago] = useState('');
    const [isVisible, setIsVisible] = useState(false); 
    const [isSending, setIsSending] = useState(false);
    const [aviso, setAviso] = useState<string | null>(null); 
    const [copied, setCopied] = useState(false);
    const [orderStatus, setOrderStatus] = useState('pendiente');
    const [showSuccessScreen, setShowSuccessScreen] = useState(false);
    // Reemplazá el estado de entregaTipo por este:
const [entregaTipo, setEntregaTipo] = useState(scheduled_delivery_enabled ? 'programada' : 'inmediata');
    const [selectedSlot, setSelectedSlot] = useState('');

    // --- 2. FUNCIONES AUXILIARES (DEFINIDAS ARRIBA PARA EVITAR ERRORES) ---
    const formatPrice = (price: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(price);

    const handleCopyAlias = async () => {
        if (!aliasMp) return;
        try { 
            await navigator.clipboard.writeText(aliasMp); 
            setCopied(true);
            setTimeout(() => setCopied(false), 4000); 
        } catch (err) {
            const textArea = document.createElement("textarea"); 
            textArea.value = aliasMp; 
            document.body.appendChild(textArea); 
            textArea.select(); 
            document.execCommand('copy'); 
            document.body.removeChild(textArea);
            setCopied(true);
            setTimeout(() => setCopied(false), 4000);
        }
    };
const handleFinalizarTodo = () => {
       window.onbeforeunload = null;
        clearCart(); // Limpia los productos del carrito
        localStorage.clear(); // Borra ID de orden, mesa y todo
        setActiveOrderId(null);
        window.location.reload(); // Refresca para que el sistema empiece de cero
    };
// En CartFooter.tsx -> handleNotificarPagoMesa
const handleNotificarPagoMesa = async (metodo: string) => {
    if (!activeOrderId || isSending) return;
    setIsSending(true);

    try {
        // 🚀 CAMBIO ESTRUCTURAL: No usamos .update(), usamos .rpc()
        const { error } = await supabase.rpc('solicitar_pago_mesa', {
            p_order_id: activeOrderId,
            p_method: metodo,
            p_payer_name: metodo === 'transferencia' ? nombreApellidoPago : nombre
        });

        if (error) throw error;

        setMetodoPago(metodo);
        setPasoPago('espera');

    } catch (error: any) {
        console.error("Error de seguridad/red:", error.message);
        alert("No se pudo procesar la solicitud de pago.");
    } finally {
        setIsSending(false);
    }
};

    // --- 3. DATOS DEL CLIENTE Y FORMULARIO ---
    const [nombre, setNombre] = useState('');
    const [apellido, setApellido] = useState('');
    const [telCliente, setTelCliente] = useState('');
    const [direccion, setDireccion] = useState('');
    const [aclaraciones, setAclaraciones] = useState('');
    const [metodoPago, setMetodoPago] = useState('efectivo');

    // --- 4. MÉTODO DE ENVÍO Y MESA (CON MEMORIA PARA EL REFRESCO) ---
    const [metodoEnvio, setMetodoEnvio] = useState(tableIdFromQR ? 'mesa' : 'delivery');
    const [nroMesa, setNroMesa] = useState(mesaLabel || '')
    const [availableTables, setAvailableTables] = useState<Table[]>([]);

    // 🔄 Si el parámetro ?mesa= llega después del primer render, forzamos metodoEnvio a 'mesa'
    useEffect(() => {
        if (tableIdFromQR) {
            setMetodoEnvio('mesa');
        }
    }, [tableIdFromQR]);

    // 🔄 mesaLabel llega async (query a Supabase); sincronizamos nroMesa cuando resuelve
    useEffect(() => {
        if (mesaLabel) {
            setNroMesa(mesaLabel);
        }
    }, [mesaLabel]);

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
    // El QR (tableIdFromQR) manda siempre: si existe, este efecto no toca nada (lo maneja el efecto de arriba)
    useEffect(() => {
        if (tableIdFromQR) return;
        if (activeOrderId) {
            const savedEnvio = localStorage.getItem('metodoEnvio');
            const savedMesa = localStorage.getItem('nroMesa');

            if (savedEnvio) {
                setMetodoEnvio(savedEnvio === 'mesa' ? 'delivery' : savedEnvio);
            }
            if (savedMesa) setNroMesa(savedMesa);
        }
    }, [activeOrderId, tableIdFromQR]);
   useEffect(() => {
       if (activeOrderId && !isVisible) {
           const isMesa = metodoEnvio === 'mesa';
           
           // Lógica para planes básicos (15 min)
           if (planType !== 'go' && planType !== 'plus' && planType !== 'max') {
                const timer = setTimeout(() => { clearCart(); setActiveOrderId(null); }, 15 * 60 * 1000); 
                return () => clearTimeout(timer);
            }

            // 🚀 LÓGICA DE CIERRE INTELIGENTE
            // Si es mesa: solo habilitamos el timer de 5 min si ya se pagó (completado) o canceló.
            // Si es delivery/retiro: mantenemos tu lógica de "entregado" para limpiar.
            const estadosFinales = isMesa ? ['completado', 'cancelado'] : ['entregado', 'completado', 'cancelado'];

            if (estadosFinales.includes(orderStatus)) {
                const timer = setTimeout(() => { 
                    clearCart(); 
                    setActiveOrderId(null); 
                    localStorage.removeItem("activeOrderId"); // Limpieza total
                }, 5 * 60 * 1000);
                return () => clearTimeout(timer);
            }
        }
    }, [activeOrderId, planType, orderStatus, metodoEnvio]); // Agregamos metodoEnvio aquí

useEffect(() => {
    if (activeOrderId) {
        const syncStatus = async () => {
            // AGREGAR: payment_status a la consulta select
            const { data } = await supabase
                .from('orders')
                .select('status, payment_method, payment_status')
                .eq('id', activeOrderId)
                .maybeSingle();

            if (data) {
                setOrderStatus(data.status);
                setMetodoPago(data.payment_method);
                
                // LÓGICA ESTRUCTURAL: Si la DB dice que está esperando confirmación, 
                // forzamos la UI al paso de espera. Esto sobrevive a F5 (refrescos).
                if (data.payment_status === 'esperando_confirmacion') {
                    setPasoPago('espera');
                }
                if (data.status === 'completado') {
                    setPasoPago('espera');
                }
            }
        };
        syncStatus();

        const orderChannel = supabase.channel(`order-update-${activeOrderId}`)
            .on('postgres_changes', { 
                event: 'UPDATE', 
                schema: 'public', 
                table: 'orders', 
                filter: `id=eq.${activeOrderId}` 
            }, (payload) => {
                const newStatus = payload.new.status;
                const newPayStatus = payload.new.payment_status; // NUEVA LÍNEA

                setOrderStatus(newStatus);
                
                // Si el backend actualizó el estado de pago, la UI reacciona aquí
                if (newPayStatus === 'esperando_confirmacion' || newStatus === 'completado') {
                    setPasoPago('espera');
                }
            })
           
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    console.log("🛰️ Snappy Realtime: Radar de pagos activo");
                }
                
                // 🚨 MECANISMO DE RESILIENCIA PARA MÓVILES
                // Si el sistema detecta que el canal se cerró o hubo un error (común en cambios de 4G/Wi-Fi)
                if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
                    console.warn("⚠️ Snappy Realtime: Canal inestable, ejecutando re-sincronización forzada...");
                    
                    const { data, error } = await supabase
                        .from('orders')
                        .select('payment_status, status')
                        .eq('id', activeOrderId) 
                        .maybeSingle();

                    if (error) {
                        console.error("❌ Fallo en re-sincronización manual:", error.message);
                        return;
                    }

                    // Forzamos el estado de la UI según la realidad de la DB
                    if (data?.payment_status === 'esperando_confirmacion' || data?.status === 'completado') {
                        setPasoPago('espera');
                        if (data.status) setOrderStatus(data.status);
                    }
                }
            });

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
            'pendiente': 'El local está revisando tu pedido',
            'en_proceso': 'Tu pedido está siendo preparado',
            'entregado': 'Tu pedido fue entregado en tu mesa',
            'completado': 'Gracias por tu visita',
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
         { (metodoEnvio !== 'mesa' || ['completado', 'cancelado'].includes(orderStatus)) && (
    <button 
        onClick={() => {
            if (orderStatus === 'completado') {
                handleFinalizarTodo(); // 👈 Si ya pagó, limpia y refresca al cerrar
            } else {
                clearCart(); 
                setActiveOrderId(null); 
                localStorage.removeItem("activeOrderId");
            }
        }} 
        className="absolute top-6 right-6 p-2 bg-gray-50 rounded-full hover:bg-gray-100 z-[130] shadow-sm animate-in fade-in"
    >
        <X size={20} className="text-gray-400" />
    </button>
)}

                    <div className="flex-1 overflow-y-auto no-scrollbar p-6 pt-10">
                        {/* 🟦 HEADER AZUL: Solo si es mesa */}
                        {isMesa && (
                            <div className="bg-indigo-600 text-white rounded-3xl p-5 mb-6 text-left shadow-lg animate-in zoom-in">
                                <p className="text-[10px] font-black text-indigo-200 uppercase tracking-widest leading-none mb-1">{displayTableLabel(nroMesa)}</p>
                                <h4 className="text-base font-black leading-tight">{tableStatusText[orderStatus] || 'Procesando...'}</h4>
                            </div>
                        )}

                        {/* 🔘 TRACKER CENTRAL (IGUAL PARA TODOS) */}
                        <div className="mb-8">
                    <OrderTracker 
    orderId={activeOrderId} 
    restaurantPhone={phone} 
    businessType={metodoEnvio} 
    paymentMethodProp={metodoPago} 
    aliasMpProp={aliasMp} 
    onStatusChange={(s: string) => setOrderStatus(s)} 
/>
                        </div>

                        {/* 🔘 BOTONES DE ACCIÓN: SEPARADOS POR TIPO */}
                        <div className="flex flex-col gap-3 mt-auto pb-4">
                          {isMesa ? (
    <div className="flex flex-col gap-3 mt-auto pb-4">
        {/* PASO 1: BOTONES INICIALES (Solo si no empezó el pago) */}
        {pasoPago === 'inicio' && (
            <>
                <button onClick={handleCallWaiter} className="w-full bg-white border-2 border-orange-500 text-orange-600 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all">
                    <MessageSquare size={18} /> Llamar Mozo
                </button>
                
                {(orderStatus === 'entregado' || orderStatus === 'listo') && (
                    <button 
                        onClick={() => setPasoPago('seleccion')}
                        className="w-full bg-orange-500 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg flex items-center justify-center gap-2 animate-in zoom-in"
                    >
                        <Wallet size={18} /> Pagar Cuenta
                    </button>
                )}
            </>
        )}

        {/* PASO 2: SELECCIÓN DE MÉTODO */}
        {pasoPago === 'seleccion' && (
            <div className="space-y-3 animate-in slide-in-from-bottom-2">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">¿Cómo deseás pagar?</p>
                <div className="grid grid-cols-1 gap-2">
                    <button onClick={() => handleNotificarPagoMesa('efectivo')} className="flex items-center justify-between p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl font-bold text-sm hover:border-green-500 transition-all">
                        <div className="flex items-center gap-3"><Wallet className="text-green-600" /> Efectivo</div>
                        <Check size={16} className="text-gray-300"/>
                    </button>
                    <button onClick={() => handleNotificarPagoMesa('tarjeta')} className="flex items-center justify-between p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl font-bold text-sm hover:border-blue-500 transition-all">
                        <div className="flex items-center gap-3"><CreditCard className="text-blue-600" /> Tarjeta (Débito/Crédito)</div>
                        <Check size={16} className="text-gray-300"/>
                    </button>
                    <button onClick={() => setPasoPago('transferencia')} className="flex items-center justify-between p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl font-bold text-sm hover:border-purple-500 transition-all">
                        <div className="flex items-center gap-3"><Landmark className="text-purple-600" /> Transferencia</div>
                        <Check size={16} className="text-gray-300"/>
                    </button>
                </div>
                <button onClick={() => setPasoPago('inicio')} className="w-full py-2 text-[9px] font-black text-gray-400 uppercase">Volver atrás</button>
            </div>
        )}

        {/* PASO 3: FORMULARIO TRANSFERENCIA */}
        {pasoPago === 'transferencia' && (
            <div className="space-y-4 animate-in zoom-in-95">
                <div className="bg-purple-50 p-4 rounded-2xl border-2 border-purple-200">
                    <p className="text-[9px] font-black text-purple-600 uppercase mb-1">Copiá nuestro Alias</p>
                    <div onClick={handleCopyAlias} className="flex justify-between items-center cursor-pointer">
                        <span className="font-black text-purple-900">{aliasMp || 'Configurá tu Alias'}</span>
                        <Copy size={16} className="text-purple-400" />
                    </div>
                </div>

                <div className="space-y-2 text-left">
                    <label className="text-[10px] font-black text-gray-400 uppercase ml-2">¿Quién transfiere? (Nombre y Apellido)</label>
                    <input 
                        type="text" 
                        value={nombreApellidoPago}
                        onChange={(e) => setNombreApellidoPago(e.target.value)}
                        className="w-full p-4 border-2 border-gray-100 rounded-2xl outline-none focus:border-purple-500 font-bold text-sm"
                        placeholder="Ej: Juan Pérez"
                    />
                </div>

                <button 
                    disabled={!nombreApellidoPago.trim()}
                    onClick={() => handleNotificarPagoMesa('transferencia')}
                    className="w-full bg-purple-600 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg disabled:opacity-50"
                >
                    Ya transferí
                </button>
                <button onClick={() => setPasoPago('seleccion')} className="w-full py-2 text-[9px] font-black text-gray-400 uppercase">Cambiar método</button>
            </div>
        )}

       {/* PASO 4: MENSAJES DE ESPERA SEGÚN EL MÉTODO */}
      {/* PASO 4: MENSAJES DE ESPERA Y ÉXITO */}
        {pasoPago === 'espera' && (
            <div className="animate-in fade-in zoom-in duration-500 min-h-[300px] flex flex-col justify-center">
                {orderStatus === 'completado' ? (
                    /* --- 🎊 PAGO CONFIRMADO (PANTALLA FINAL) --- */
                    <div className="bg-green-600 p-8 rounded-[2.5rem] text-center shadow-2xl">
                        <div className="bg-white/20 p-4 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
                            <CheckCircle2 className="text-white" size={48} strokeWidth={3} />
                        </div>
                        <h4 className="text-2xl font-black text-white uppercase italic tracking-tighter mb-2">¡Pago Recibido!</h4>
                        <p className="text-sm text-green-50 font-medium leading-tight mb-8">
                            {metodoPago === 'transferencia' 
                                ? 'Confirmamos tu transferencia. ¡Muchas gracias por tu visita!' 
                                : '¡Gracias por elegirnos! Ya podés retirarte cuando desees.'}
                        </p>
                        <button 
                            onClick={handleFinalizarTodo}
                            className="w-full bg-white text-green-600 py-5 rounded-[2rem] font-black uppercase text-xs tracking-[0.2em] shadow-xl active:scale-95 transition-all"
                        >
                            Volver al Menú
                        </button>
                    </div>
                ) : (
                    /* --- ⏳ MENSAJES DE AVISO (SEGÚN MÉTODO) --- */
                    <>
                        {metodoPago === 'transferencia' ? (
                            <div className="space-y-4">
                                <div className="bg-white border-2 border-purple-100 p-8 rounded-[2.5rem] text-center shadow-xl">
                                    <Loader2 className="animate-spin text-purple-600 mx-auto mb-4" size={40} />
                                    <h4 className="text-sm font-black text-gray-900 uppercase italic mb-2">Revisando Transferencia</h4>
                                    <p className="text-[11px] text-gray-500 font-medium leading-relaxed px-4">
                                        Ya avisamos al local. Aguardá un momento mientras confirman el ingreso de la transferencia.
                                    </p>
                                </div>
                                {/* Solo mostramos el "Esperando..." en transferencia */}
                                <div className="mt-2 p-3 bg-gray-50 rounded-2xl inline-flex items-center gap-2 mx-auto">
                                    <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Esperando confirmación</span>
                                </div>
                            </div>
                        ) : (
                            /* EFECTIVO O TARJETA */
                            <div className="bg-white border-2 border-emerald-100 p-8 rounded-[2.5rem] text-center shadow-xl">
                                <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Clock className="text-emerald-500 animate-pulse" size={40} />
                                </div>
                                <h4 className="text-sm font-black text-gray-900 uppercase italic mb-2">¡Mozo en camino!</h4>
                                <p className="text-[11px] text-gray-500 font-medium leading-relaxed px-4">
                                    Ya avisamos que pagás con <b>{metodoPago === 'efectivo' ? 'Efectivo' : 'Tarjeta'}</b>. <br/> Enseguida se acercan a la mesa para cobrarte.
                                </p>
                            </div>
                        )}
                    </>
                )}
            </div>
        )}
    </div>
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
   

  const handleSendOrder = async () => {
    if (!nombre.trim()) return alert("Por favor, ingresá tu nombre.");
    if (metodoEnvio !== 'mesa' && !apellido.trim()) return alert("Por favor, ingresá tu apellido.");
    if (metodoEnvio === 'delivery' && !direccion.trim()) return alert("Ingresá la dirección de envío.");
    if (metodoEnvio === 'mesa' && !nroMesa) return alert("Por favor, seleccioná una mesa.");
    const nombreCompleto = metodoEnvio === 'mesa' ? nombre.trim() : `${nombre.trim()} ${apellido.trim()}`;
    // 🚀 VALIDACIÓN: Si eligió programar pero no seleccionó un horario
    if (metodoEnvio !== 'mesa' && entregaTipo === 'programada' && !selectedSlot) {
        return alert("Por favor, seleccioná un horario para tu entrega programada.");
    }

    const isPlus = planType === 'plus' || planType === 'max';
    const isLight = planType === 'light';
    setIsSending(true);

    try {
        let orderRef = "WhatsApp";
        
        // 1. GUARDADO EN BASE DE DATOS (Solo si no es Light)
        if (!isLight) {
            const { data: newOrder, error } = await supabase.from('orders').insert({
                restaurant_id: restaurantId, 
                customer_name: nombreCompleto,
                customer_phone: telCliente, 
                address: metodoEnvio === 'delivery' ? direccion : '',
                order_type: metodoEnvio, 
                payment_method: metodoPago, 
                total: totalFinal, 
                status: 'pendiente', 
                delivery_cost: envio, 
                origin_plan: planType,
                items: cart, 
                table_number: metodoEnvio === 'mesa' ? nroMesa : null, 
                description: aclaraciones, 
                coupon_code: appliedCoupon?.code || null, 
                discount_amount: montoDescuento || 0,
                // 🚀 GUARDAMOS EL HORARIO EN LA DB
                scheduled_delivery_time: entregaTipo === 'programada' ? selectedSlot : 'Inmediato'
            }).select().single();

            if (error) throw error;
            if (newOrder) {
                setActiveOrderId(newOrder.id);
                localStorage.setItem("activeOrderId", newOrder.id); 
                localStorage.setItem("metodoEnvio", metodoEnvio);
                localStorage.setItem("nroMesa", nroMesa);
                orderRef = `#${newOrder.id.slice(0, 5)}`;
            }
        } else {
            setActiveOrderId('light-plan-order');
        }

        // 2. CONSTRUCCIÓN DEL MENSAJE
        // 2. CONSTRUCCIÓN DEL MENSAJE
let mensaje = `*¡Hola! Nuevo Pedido*\nRef: ${orderRef}\n------------------\n`;
mensaje += `👤 *Cliente:* ${nombreCompleto}\n`; // 👈 USAMOS NOMBRE COMPLETO AQUÍ
        
        // 🚀 AGREGAMOS EL HORARIO AL WHATSAPP
      // 🚀 BUSCÁ ESTA PARTE EN handleSendOrder:
    if (metodoEnvio !== 'mesa') {
        const infoHorario = (scheduled_delivery_enabled && selectedSlot) 
            ? `📅 PROGRAMADO (${selectedSlot} hs)` 
            : '🚀 LO ANTES POSIBLE';
        mensaje += `⏰ *Horario:* ${infoHorario}\n`;
    }

        if (metodoEnvio === 'delivery') mensaje += `📍 *Dirección:* ${direccion}\n`;
        if (metodoEnvio === 'mesa') mensaje += `🍽️ *${displayTableLabel(nroMesa)}*\n`;
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
       // --- 🏁 BLOQUE DE TOTALES BLINDADO (UX Superior) ---
        mensaje += `\n------------------\n`;
        mensaje += `💰 *Subtotal (Productos):* ${formatPrice(subtotal)}\n`;
        
        if (appliedCoupon) {
            // Mostramos el código y el porcentaje explícito
            mensaje += `🎟️ *Cupón ${appliedCoupon.code} (-${appliedCoupon.discount_percent}%):* -${formatPrice(montoDescuento)}\n`;
            
            // Calculamos el subtotal de la comida YA con el descuento
            const subtotalNeto = subtotal - montoDescuento;
            mensaje += `✨ *Subtotal c/ Descuento:* ${formatPrice(subtotalNeto)}\n`;
        }

        if (envio > 0) {
            // El signo + es clave para que entiendan que el envío suma después del descuento
            mensaje += `🚚 *Costo de Envío:* +${formatPrice(envio)}\n`;
        }

        mensaje += `------------------\n`;
        mensaje += `🔥 *TOTAL FINAL: ${formatPrice(totalFinal)}*`;
        mensaje += `\n------------------`;

        // 🚀 3. PROTOCOLO DE REDIRECCIÓN INTELIGENTE
        setIsVisible(false);

        if (metodoEnvio === 'mesa') {
            setIsVisible(false);
            window.onbeforeunload = null; 
            setIsSending(false);
            return; 
        }
// 🚀 3. PROTOCOLO DE REDIRECCIÓN INTELIGENTE
        setIsVisible(false);

        // Si es mesa, no hay redirección, solo silenciamos y salimos
        if (metodoEnvio === 'mesa') {
            window.onbeforeunload = null; 
            setIsSending(false);
            return; 
        }

       if (isLight || receiveWhatsapp === true) {
            const cleanPhone = String(phone).replace(/\D/g, ''); 
            const textEncoded = encodeURIComponent(mensaje);
            
            // 🚀 PROTOCOLO DIRECTO: El más estable para saltar a la App sin abrir pestañas web
            const protocolUrl = `whatsapp://send?phone=${cleanPhone}&text=${textEncoded}`;

            // 1. 🛠️ SILENCIAR PROTECCIÓN: Matamos el cartel de "¿Deseas abandonar?"
            // Recuerda: SlugPage debe tener el useEffect con la propiedad directa.
            window.onbeforeunload = null;
            
            // 2. 🚀 LÓGICA DE ÉXITO (Para el flujo visual de Snappy)
            if (isLight) {
                setTimeout(() => setShowSuccessScreen(true), 5000);
            }

            // 3. 🎯 REDIRECCIÓN LIMPIA Y DIRECTA
            // Usamos un pequeño delay y assign para que el navegador procese el comando 
            // sin generar artefactos visuales (cuadraditos negros) en Android.
            setTimeout(() => {
                window.location.assign(protocolUrl); 
            }, 100);

        } else {
            // Si el restaurante tiene el WhatsApp apagado (Solo Panel)
            console.log("Pedido guardado. Solo panel activado.");
        }
        
        setIsSending(false); 
        
    } catch (err) { 
        console.error("Error Snappy Core:", err); 
        alert("Error al procesar el pedido."); 
        setIsSending(false); 
    }
};
 if (!showSuccessScreen && (!cart || cart.length === 0 || !isVisible)) {
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

            {/* --- CUERPO SCROLLEABLE (EL CARRITO NORMAL) --- */}
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
    {/* 🚀 MENSAJE DE AYUDA (Solo envío/retiro) */}
    {metodoEnvio !== 'mesa' && (
        <p className="text-[9px] font-bold text-blue-500 uppercase tracking-tight ml-2 italic leading-tight">
            * Pedimos apellido para identificar tu transferencia más rápido en nuestra cuenta.
        </p>
    )}

    {/* FILA 1: NOMBRE Y APELLIDO (Se adapta si es mesa o no) */}
    <div className={`grid ${metodoEnvio === 'mesa' ? 'grid-cols-1' : 'grid-cols-2'} gap-3`}>
        <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Nombre</label>
            <input type="text" placeholder="Tu nombre" value={nombre} onChange={(e)=>setNombre(e.target.value)} className="w-full p-3 bg-white border border-gray-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-green-500" />
        </div>
        
        {metodoEnvio !== 'mesa' && (
            <div className="space-y-1 animate-in fade-in">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Apellido</label>
                <input type="text" placeholder="Tu apellido" value={apellido} onChange={(e)=>setApellido(e.target.value)} className="w-full p-3 bg-white border border-gray-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-green-500" />
            </div>
        )}
    </div>

    {/* FILA 2: WHATSAPP */}
    <div className="space-y-1">
        <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Teléfono / WhatsApp</label>
        <input type="tel" placeholder="Ej: 1123456789" value={telCliente} onChange={(e)=>setTelCliente(e.target.value)} className="w-full p-3 bg-white border border-gray-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-green-500" />
    </div>
                    {!tableIdFromQR && (
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Método de Entrega</label>
                        <div className="flex bg-gray-200/50 p-1 rounded-2xl gap-1">
                            {['delivery', 'retiro', 'mesa']
                                .filter(m => {
                                    if (m === 'mesa') {
                                        return planType === 'plus' || planType === 'max';
                                    }
                                    return true;
                                })
                                .map((m) => (
                                    <button
                                        key={m}
                                        onClick={() => setMetodoEnvio(m)}
                                        className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${
                                            metodoEnvio === m ? 'bg-white shadow-sm text-green-600' : 'text-gray-400'
                                        }`}
                                    >
                                        {m === 'delivery' ? 'Envío' : m === 'retiro' ? 'Retiro' : 'Mesa'}
                                    </button>
                                ))
                            }
                        </div>
                    </div>
                    )}
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
{/* 📅 SECCIÓN DE TURNOS (SÓLO APARECE SI ESTÁ ACTIVADO) */}
      {metodoEnvio !== 'mesa' && scheduled_delivery_enabled && (planType !== 'light' || isAdmin) && (
        <div className="space-y-4 p-6 bg-indigo-50/40 rounded-[2.5rem] border border-indigo-100/50 mb-6 animate-in slide-in-from-top-4">
            <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-200">
                    <Clock size={16} strokeWidth={2.5} />
                </div>
                <div className="text-left">
                    <label className="text-[10px] font-black text-indigo-950 uppercase tracking-tighter leading-none">
                        {metodoEnvio === 'delivery' ? '¿A qué hora lo enviamos?' : '¿A qué hora lo retirás?'}
                    </label>
                    <p className="text-[8px] text-indigo-400 font-bold uppercase tracking-widest mt-0.5 italic">Seleccioná un horario </p>
                </div>
            </div>

            {/* LISTA DE TURNOS GENERADOS DINÁMICAMENTE */}
            <div className="flex flex-wrap gap-2 mt-2 animate-in fade-in zoom-in duration-300">
                {(() => {
                    const config = scheduled_delivery_config || { interval_minutes: 30, buffer_minutes: 15 };
                    const interval = config.interval_minutes;
                    const buffer = config.buffer_minutes;
                    const now = new Date();
                    const daysMap: any = { 0: 'domingo', 1: 'lunes', 2: 'martes', 3: 'miercoles', 4: 'jueves', 5: 'viernes', 6: 'sabado' };
                    const todayName = daysMap[now.getDay()];
                    const todayRanges = scheduled_delivery_slots?.[todayName] || [];
                    const availableBlocks: string[] = [];

                    todayRanges.forEach((range: any) => {
                        const [startH, startM] = range.from.split(':');
                        const [endH, endM] = range.to.split(':');
                        let blockTime = new Date();
                        blockTime.setHours(parseInt(startH), parseInt(startM), 0, 0);
                        const limitTime = new Date();
                        limitTime.setHours(parseInt(endH), parseInt(endM), 0, 0);

                        while (blockTime < limitTime) {
                            const minAllowedTime = new Date(now.getTime() + buffer * 60000);
                            if (blockTime > minAllowedTime) {
                                const timeString = blockTime.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });
                                availableBlocks.push(timeString);
                            }
                            blockTime = new Date(blockTime.getTime() + interval * 60000);
                        }
                    });

                    if (availableBlocks.length === 0) {
                        return (
                            <div className="w-full py-6 text-center bg-white/40 rounded-2xl border-2 border-dashed border-indigo-100">
                                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest italic text-center">
                                    No hay más turnos <br/> disponibles por hoy
                                </p>
                            </div>
                        );
                    }

                    return availableBlocks.map((time) => (
                        <button 
                            key={time}
                            type="button"
                            onClick={() => setSelectedSlot(time)}
                            className={`px-4 py-2.5 rounded-2xl border-2 text-[11px] font-black transition-all ${
                                selectedSlot === time 
                                ? 'border-indigo-600 bg-white text-indigo-600 shadow-md scale-105' 
                                : 'border-white bg-white/40 text-gray-400'
                            }`}
                        >
                            {time} hs
                        </button>
                    ));
                })()}
            </div>
        </div>
      )}
                {metodoEnvio !== 'mesa' && (
                    <div className="space-y-3 animate-in fade-in duration-300">
                        <label className="text-[10px] font-black text-gray-400 uppercase ml-2">
                            Medio de Pago
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                      

<button 
    onClick={() => setMetodoPago('efectivo')} 
    className={`p-4 rounded-2xl border-2 flex items-center justify-center gap-2 font-bold text-sm transition-all ${
        metodoPago === 'efectivo' 
        ? 'border-green-600 bg-green-50 text-green-700' 
        : 'border-gray-100 text-slate-600' // 👈 Cambiado de gray-400 a slate-600
    }`}
>
    <Wallet size={18} /> Efectivo
</button>

<button 
    onClick={() => setMetodoPago('transferencia')} 
    className={`p-4 rounded-2xl border-2 flex items-center justify-center gap-2 font-bold text-sm transition-all ${
        metodoPago === 'transferencia' 
        ? 'border-blue-500 bg-blue-50 text-blue-700' 
        : 'border-gray-100 text-slate-600' // 👈 Cambiado de gray-400 a slate-600
    }`}
>
    <Landmark size={18} /> Transferencia
</button>
                        </div>

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
                    {tableIdFromQR && mesaLabel && (
                        <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-2xl">
                            <span className="text-sm">🍽️</span>
                            <span className="text-xs font-black text-amber-800 uppercase tracking-tight">Pedido para {mesaLabel}</span>
                        </div>
                    )}
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
        
        {/* --- TOAST DE AVISOS --- */}
        {aviso && (
            <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[3000] whitespace-nowrap">
                <div className="bg-black text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-2 border border-white/10 animate-in fade-in zoom-in duration-300">
                    <Check size={16} className="text-green-500" />
                    <span className="font-bold text-xs uppercase tracking-widest">{aviso}</span>
                </div>
            </div>
        )}

        {/* --- 🚀 PANTALLA INDEPENDIENTE DE ÉXITO (A LOS 5 SEGS) --- */}
      {/* --- 🚀 MODAL INDEPENDIENTE DE ÉXITO (CON TU DISEÑO ORIGINAL) --- */}
        {showSuccessScreen && (
            <div className="fixed inset-0 z-[120] bg-black/40 backdrop-blur-[2px] flex flex-col justify-end animate-in fade-in duration-300">
                <div className="w-full max-w-md mx-auto bg-white shadow-[0_-10px_40px_rgba(0,0,0,0.3)] rounded-t-[2.5rem] h-[85vh] flex flex-col overflow-hidden font-sans text-black animate-in slide-in-from-bottom-full duration-500">
                    
                    {/* CABEZAL FIJO */}
                    <div className="bg-white border-b border-gray-100 px-6 py-4 flex justify-end items-center flex-shrink-0">
                        <button 
                            onClick={() => {
                                setShowSuccessScreen(false);
                                handleFinalizarTodo();
                            }} 
                            className="bg-gray-100 p-2 rounded-full text-gray-500 active:scale-90 transition-transform cursor-pointer"
                        >
                            <X size={20} strokeWidth={3} />
                        </button>
                    </div>

                    {/* CUERPO DEL ÉXITO */}
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                        <div className="bg-green-100 p-4 rounded-full w-24 h-24 flex items-center justify-center mb-6 shadow-inner animate-in zoom-in duration-500 delay-200">
                            <CheckCircle2 className="text-green-600" size={50} strokeWidth={3} />
                        </div>
                        <h2 className="text-2xl font-black uppercase italic tracking-tighter text-gray-900 mb-2">
                            ¡Pedido Enviado!
                        </h2>
                        <p className="text-gray-500 text-xs font-bold leading-relaxed mb-8">
                            Te hemos redirigido a WhatsApp. Si tuviste algún problema, podés volver a intentarlo o avisarnos por acá.
                        </p>
                        
                        <div className="w-full max-w-sm mx-auto space-y-3">
                            <button 
                                onClick={() => window.open(`whatsapp://send?phone=${String(phone).replace(/\D/g, '')}`)}
                                className="w-full bg-green-600 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 shadow-lg mb-4 active:scale-95 transition-all"
                            >
                                <MessageSquare size={18} /> Reenviar WhatsApp
                            </button>
                            
                            <button 
                                onClick={() => {
                                    setShowSuccessScreen(false);
                                    handleFinalizarTodo();
                                }}
                                className="w-full bg-gray-900 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-md active:scale-95 transition-all"
                            >
                                Finalizar y Volver al Menú
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}

    </div>
  );
}