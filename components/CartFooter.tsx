'use client';

import { useState, useEffect } from 'react';
import { useCart } from '@/context/CartContext';
import { createBrowserClient } from '@supabase/ssr';
import { Send, ShoppingBag, X, ChevronDown, Plus, Minus, Copy, Check, Wallet, Landmark, MessageSquare, Loader2, HelpCircle, CheckCircle2, Zap } from 'lucide-react';
import OrderTracker from './OrderTracker';
interface Table {
    id: string;
    name: string;
    status: string;
    restaurant_id: string;
}

export default function CartFooter({ phone, deliveryCost, restaurantId, aliasMp, planType, receiveWhatsapp }: any) {
    const { cart, updateQuantity, updateExtraQuantity, clearCart, total, activeOrderId, setActiveOrderId } = useCart();
    const [isVisible, setIsVisible] = useState(false); 
    const [isSending, setIsSending] = useState(false);

    // Form states
    const [nombre, setNombre] = useState('');
    const [telCliente, setTelCliente] = useState('');
    const [direccion, setDireccion] = useState('');
    const [aclaraciones, setAclaraciones] = useState('');
    const [metodoEnvio, setMetodoEnvio] = useState('delivery'); 
    const [metodoPago, setMetodoPago] = useState('efectivo');
    const [copied, setCopied] = useState(false);
    const [orderStatus, setOrderStatus] = useState('pendiente');
    
    // --- ACÁ ESTÁ EL CAMBIO CLAVE ---
    const [nroMesa, setNroMesa] = useState(''); 
    const [availableTables, setAvailableTables] = useState<Table[]>([]); // Agregamos <Table[]>

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    useEffect(() => {
        if (cart.length === 0 && isVisible) setIsVisible(false);
    }, [cart.length, isVisible]);

    // LIMPIEZA AUTOMÁTICA - CORREGIDO: Eliminado window.location.reload()
    useEffect(() => {
        if (activeOrderId && (planType !== 'plus' && planType !== 'max')) {
            const timer = setTimeout(() => {
                clearCart();
                setActiveOrderId(null);
                // window.location.reload(); <-- ELIMINADO PARA EVITAR REFRESCO EN MÓVIL
            }, 15 * 60 * 1000); 
            return () => clearTimeout(timer);
        }
      // Lógica para PLUS/MAX: 5 min si terminó o se canceló
if (activeOrderId && (planType === 'plus' || planType === 'max') && (['entregado', 'completado', 'cancelado'].includes(orderStatus))) {
    const timer = setTimeout(() => {
        clearCart();
        setActiveOrderId(null);
    }, 5 * 60 * 1000); // 5 minutos
    return () => clearTimeout(timer);
}
    }, [activeOrderId, planType, orderStatus, clearCart, setActiveOrderId]);

    useEffect(() => {
        if (metodoEnvio === 'mesa') {
            const getTables = async () => {
                const { data } = await supabase
                    .from('tables')
                    .select('*')
                    .eq('restaurant_id', restaurantId)
                    .order('name', { ascending: true });
                setAvailableTables(data || []);
            };
            getTables();
        }
    }, [metodoEnvio, restaurantId, supabase]);

    // --- VISTAS POST-PEDIDO ---
    if (activeOrderId) {
      if (planType === 'plus' || planType === 'max') {
    return (
        <div className="fixed inset-0 z-[120] bg-gray-100/50 backdrop-blur-sm flex items-end md:items-center justify-center sm:p-4">
            <div className="w-full h-[85vh] md:h-auto md:max-w-md bg-white rounded-t-[2.5rem] md:rounded-[2.5rem] shadow-2xl relative overflow-hidden flex flex-col">
                
                {/* BOTÓN CERRAR DENTRO DEL CUADRO */}
                <button 
                    onClick={() => { clearCart(); setActiveOrderId(null); }}
                    className="absolute top-6 right-6 p-2 bg-gray-50 rounded-full hover:bg-gray-100 transition-colors z-[130] shadow-sm"
                >
                    <X size={20} className="text-gray-400" />
                </button>

                <OrderTracker 
                    orderId={activeOrderId} 
                    restaurantPhone={phone}
                    onStatusChange={(status: string) => setOrderStatus(status)}
                />
            </div>
        </div>
    );
}

        return (
            <div className="fixed inset-0 z-[120] bg-gray-900/40 backdrop-blur-sm flex items-end md:items-center justify-center sm:p-4">
                <div className="w-full bg-white rounded-t-[2.5rem] md:rounded-[2.5rem] shadow-2xl border border-green-100 relative animate-in slide-in-from-bottom-10 md:max-w-md overflow-hidden flex flex-col">
                    <button 
                        onClick={() => { clearCart(); setActiveOrderId(null); }} // <-- CORREGIDO: Eliminado reload()
                        className="absolute top-6 right-6 p-2 bg-gray-50 rounded-full hover:bg-gray-100 transition-colors z-10"
                    >
                        <X size={24} className="text-gray-400" />
                    </button>

                    <div className="text-center space-y-6 pt-10 pb-8 px-8 flex-1">
                        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600 mb-4 animate-in zoom-in duration-300 shadow-inner">
                            <CheckCircle2 size={48} />
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-gray-900 tracking-tighter">¡Pedido Enviado!</h2>
                            <p className="text-gray-500 text-sm mt-2 font-medium px-2 leading-relaxed">
                                Seguimos por WhatsApp. No te olvides de enviarnos el comprobante si pagaste con transferencia.
                            </p>
                        </div>
                        <div className="pt-2">
                            <a 
                                href={`https://wa.me/${phone}`} 
                                target="_blank"
                                className="w-full bg-gray-900 text-white py-5 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-black transition-all shadow-xl text-lg active:scale-95"
                            >
                                <HelpCircle size={24} /> Ir al Chat
                            </a>
                        </div>
                    </div>
                    
                    <a 
                        href="https://snappy.uno" 
                        target="_blank" 
                        rel="noreferrer"
                        className="block p-4 text-center bg-gray-900 hover:bg-black transition-colors cursor-pointer border-t border-gray-800 no-underline"
                    >
                        <p className="text-[10px] font-black text-white flex items-center justify-center gap-1 uppercase tracking-[0.2em]">
                            Potenciado por 
                            <Zap size={12} className="text-yellow-400 fill-yellow-400"/> 
                            Snappy
                        </p>
                    </a>
                </div>
            </div>
        );
    }

    // --- VISTA CARRITO ---
    if (!cart || cart.length === 0 || !isVisible) {
        if (cart.length > 0) {
            return (
                <button onClick={() => setIsVisible(true)} className="fixed bottom-6 right-6 bg-green-600 text-white p-4 rounded-full shadow-2xl z-[110] active:scale-90 transition-transform hover:scale-105">
                    <ShoppingBag size={28} />
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-6 h-6 rounded-full flex items-center justify-center font-bold border-2 border-white">
                        {cart.length}
                    </span>
                </button>
            );
        }
        return null;
    }

    const subtotal = cart.reduce((acc: number, item: any) => {
        const extrasTotal = (item.extrasList || []).reduce((a: number, b: any) => a + (b.price * b.quantity), 0);
        return acc + (item.price + extrasTotal) * item.quantity;
    }, 0);
    const envio = metodoEnvio === 'delivery' ? (Number(deliveryCost) || 0) : 0;
    const totalFinal = subtotal + envio;

    const formatPrice = (price: number) => 
        new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(price);

    const handleCopyAlias = async () => {
        if (!aliasMp) return;

        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(aliasMp);
            } else {
                throw new Error('Fallback');
            }
        } catch (err) {
            const textArea = document.createElement("textarea");
            textArea.value = aliasMp;
            textArea.style.position = "fixed";
            textArea.style.left = "-9999px";
            textArea.style.top = "0";
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            try {
                document.execCommand('copy');
            } catch (copyErr) {
                console.error('Error al copiar:', copyErr);
            }
            document.body.removeChild(textArea);
        }

        setCopied(true);
        setTimeout(() => setCopied(false), 3000); 
    };

 const handleSendOrder = async () => {
    if (!nombre.trim()) return alert("Por favor, ingresá tu nombre.");
    if (metodoEnvio === 'delivery' && !direccion.trim()) return alert("Ingresá la dirección de envío.");
    
    // Nueva validación para Mesas
    if (metodoEnvio === 'mesa' && !nroMesa) {
        return alert("Por favor, seleccioná una mesa antes de enviar.");
    }

        setIsSending(true);

        try {
            const { data: newOrder, error } = await supabase.from('orders').insert({
                restaurant_id: restaurantId,
                customer_name: nombre,
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
                description: aclaraciones
            }).select().single();

            if (error) throw error;

            if (newOrder) {
                setActiveOrderId(newOrder.id);
                fetch('/api/push/send', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ restaurantId, customerName: nombre, total: totalFinal, orderType: metodoEnvio }),
                }).catch(() => {});
            }

            let mensaje = `*¡Hola! Nuevo Pedido* 🍔\n`;
            if (newOrder) mensaje += `Ref: #${newOrder.id.slice(0, 5)}\n`;
            mensaje += `------------------\n`;
            mensaje += `👤 *Nombre:* ${nombre}\n`;
            if (telCliente) mensaje += `📞 *Tel:* ${telCliente}\n`;
            mensaje += `🛵 *Entrega:* ${metodoEnvio.toUpperCase()}\n`;
            if (metodoEnvio === 'delivery') mensaje += `📍 *Dirección:* ${direccion}\n`;
            mensaje += `💳 *Pago:* ${metodoPago.toUpperCase()}\n\n`;
            
            mensaje += `*Pedido:*\n`;
            cart.forEach((item: any) => {
                mensaje += `✅ ${item.quantity}x ${item.name}`;
                if (item.extrasList?.length > 0) item.extrasList.forEach((ex: any) => mensaje += ` (+ ${ex.name})`);
                mensaje += `\n`;
            });

            if (aclaraciones) mensaje += `\n📝 *Nota:* ${aclaraciones}\n`;
            if (envio > 0) mensaje += `🚚 *Envío:* ${formatPrice(envio)}\n`;
            mensaje += `\n💰 *TOTAL: ${formatPrice(totalFinal)}*`;

            setIsVisible(false);

            // SOLO ABRIMOS WHATSAPP SI ESTÁ ENCENDIDO
            if (receiveWhatsapp) {
                const textEncoded = encodeURIComponent(mensaje);
                const cleanPhone = phone.toString().replace(/\D/g, ''); 
                window.onbeforeunload = null; // Para evitar el cartel de seguridad
                window.open(`whatsapp://send?phone=${cleanPhone}&text=${textEncoded}`, '_blank');
            } else {
                console.log("WhatsApp desactivado: Pedido enviado solo al panel.");
            }

            setIsSending(false);

        } catch (err) {
            console.error("Error:", err);
            alert("Error al procesar el pedido.");
            setIsSending(false);
        }
    };

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t z-[120] shadow-[0_-10px_40px_rgba(0,0,0,0.2)] rounded-t-[2.5rem] p-4 max-h-[95vh] overflow-y-auto font-sans text-black">
            <div className="max-w-md mx-auto space-y-5 relative">
                
                <div className="flex justify-between items-center">
                    <button onClick={() => setIsVisible(false)} className="flex items-center gap-1 text-gray-400 font-bold text-[10px] uppercase tracking-widest">
                        <ChevronDown size={20} /> Seguir pidiendo
                    </button>
                    <button onClick={() => setIsVisible(false)} className="bg-gray-100 p-2 rounded-full text-gray-500"><X size={20} /></button>
                </div>

                <h2 className="text-xl font-black text-gray-800 px-1">Tu Pedido</h2>

                <div className="space-y-4">
                    {cart.map((item: any) => (
                        <div key={item.uniqueId} className="bg-gray-50 rounded-3xl p-4 border border-gray-100">
                            <div className="flex justify-between items-center mb-3">
                                <div className="flex-1">
                                    <span className="text-gray-900 font-black text-base block leading-tight">{item.name}</span>
                                    <span className="text-green-600 font-bold text-sm">{formatPrice(item.price)} c/u</span>
                                </div>
                                <div className="flex items-center gap-4 bg-white shadow-sm rounded-2xl p-1 border border-gray-100">
                                    <button onClick={() => updateQuantity(item.uniqueId, item.quantity - 1)} className="w-10 h-10 flex items-center justify-center text-red-500 active:scale-90"><Minus size={20} strokeWidth={3}/></button>
                                    <span className="font-black text-lg min-w-[20px] text-center">{item.quantity}</span>
                                    <button onClick={() => updateQuantity(item.uniqueId, item.quantity + 1)} className="w-10 h-10 flex items-center justify-center text-green-600 active:scale-90"><Plus size={20} strokeWidth={3}/></button>
                                </div>
                            </div>
                            {item.extrasList?.map((ex: any) => (
                                <div key={ex.id} className="flex justify-between items-center pl-4 py-2 mt-2 bg-white/60 rounded-xl border border-dashed border-gray-200">
                                    <span className="text-xs text-gray-500 font-bold">+ {ex.name}</span>
                                    <div className="flex items-center gap-3 mr-1">
                                        <button onClick={() => updateExtraQuantity(item.uniqueId, ex.id, ex.quantity - 1)} className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-lg text-red-500 active:scale-90"><Minus size={16} strokeWidth={3}/></button>
                                        <span className="text-xs font-black">{ex.quantity}</span>
                                        <button onClick={() => updateExtraQuantity(item.uniqueId, ex.id, ex.quantity + 1)} className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-lg text-green-600 active:scale-90"><Plus size={16} strokeWidth={3}/></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>

                <div className="space-y-4 bg-gray-50 p-4 rounded-3xl border border-gray-100">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Nombre</label>
                            <input type="text" placeholder="Tu nombre" value={nombre} onChange={(e)=>setNombre(e.target.value)} className="w-full p-3 bg-white border border-gray-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-green-500" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Teléfono</label>
                            <input type="tel" placeholder="WhatsApp" value={telCliente} onChange={(e)=>setTelCliente(e.target.value)} className="w-full p-3 bg-white border border-gray-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-green-500" />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Método de Entrega</label>
                        <div className="flex bg-gray-200/50 p-1 rounded-2xl gap-1">
                            {['delivery', 'retiro', 'mesa'].map((m) => (
                                <button key={m} onClick={() => setMetodoEnvio(m)} className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${metodoEnvio === m ? 'bg-white shadow-sm text-green-600' : 'text-gray-400'}`}>
                                    {m === 'delivery' ? 'Envío' : m === 'retiro' ? 'Retiro' : 'Mesa'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {metodoEnvio === 'delivery' && (
                        <div className="space-y-1 animate-in fade-in slide-in-from-top-2">
                            <div className="flex justify-between items-center px-4 py-2 mb-2 bg-green-50 rounded-2xl border border-green-100">
                                <span className="text-[10px] font-black text-green-700 uppercase tracking-widest">Costo de Envío</span>
                                <span className="font-black text-green-700">{formatPrice(envio)}</span>
                            </div>
                            <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Dirección del Envío</label>
                            <input type="text" placeholder="Calle, número y localidad" value={direccion} onChange={(e)=>setDireccion(e.target.value)} className="w-full p-3 bg-white border border-gray-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-green-500 shadow-inner" />
                        </div>
                    )}
                    {metodoEnvio === 'mesa' && (
        <div className="space-y-3 animate-in fade-in slide-in-from-top-2 bg-white p-4 rounded-3xl border border-gray-100 shadow-inner">
            <label className="text-[10px] font-black text-gray-400 uppercase ml-2 tracking-widest">
                Seleccioná tu mesa
            </label>
            <div className="grid grid-cols-3 gap-2">
                {availableTables.map((mesa: any) => (
                    <button
                        key={mesa.id}
                        type="button"
                        disabled={mesa.status === 'reservada'}
                        onClick={() => setNroMesa(mesa.name)}
                        className={`p-3 rounded-2xl text-xs font-bold border-2 transition-all flex flex-col items-center gap-1
                            ${mesa.status === 'reservada' 
                                ? 'bg-gray-50 border-gray-50 text-gray-300 cursor-not-allowed' 
                                : nroMesa === mesa.name 
                                    ? 'border-green-600 bg-green-50 text-green-700 shadow-md scale-105' 
                                    : 'border-gray-100 bg-white text-gray-500 hover:border-gray-200'
                            }`}
                    >
                        <span className="text-lg">{mesa.status === 'reservada' ? '🔒' : '🍽️'}</span>
                        <span className="truncate w-full text-center">{mesa.name}</span>
                    </button>
                ))}
            </div>
            {availableTables.length === 0 && (
                <p className="text-[10px] text-orange-500 font-bold text-center py-2">
                    No hay mesas configuradas.
                </p>
            )}
        </div>
    )}
                </div>

                <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Medio de Pago</label>
                    <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => setMetodoPago('efectivo')} className={`p-4 rounded-2xl border-2 flex items-center justify-center gap-2 font-bold text-sm transition-all ${metodoPago === 'efectivo' ? 'border-green-600 bg-green-50 text-green-700' : 'border-gray-100 text-gray-400'}`}>
                            <Wallet size={18} /> Efectivo
                        </button>
                        <button onClick={() => setMetodoPago('transferencia')} className={`p-4 rounded-2xl border-2 flex items-center justify-center gap-2 font-bold text-sm transition-all ${metodoPago === 'transferencia' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-100 text-gray-400'}`}>
                            <Landmark size={18} /> Transferencia
                        </button>
                    </div>

                    {metodoPago === 'transferencia' && aliasMp && (
                        <div className="space-y-2">
                            <div onClick={handleCopyAlias} className={`p-4 rounded-2xl flex justify-between items-center cursor-pointer transition-all border-2 ${copied ? 'bg-blue-600 border-blue-600 shadow-lg scale-[1.02]' : 'bg-blue-50 border-blue-200 shadow-sm active:scale-95'}`}>
                                <div className={copied ? 'text-white' : 'text-blue-900'}>
                                    <p className="text-[9px] font-black opacity-80 uppercase leading-none mb-1">{copied ? '¡COPIADO!' : 'TOCA PARA COPIAR ALIAS'}</p>
                                    <p className="text-sm font-black">{aliasMp}</p>
                                </div>
                                {copied ? <Check size={20} className="text-white" /> : <Copy size={20} className="text-blue-400" />}
                            </div>
                            
                            {copied && (
                                <div className="bg-blue-50 text-blue-800 px-4 py-3 rounded-2xl text-[11px] font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-300 border border-blue-100 shadow-sm">
                                    <MessageSquare size={16} className="text-blue-500" />
                                    <span>¡Alias copiado! Enviame el comprobante luego de enviar el pedido.</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase ml-2">¿Alguna aclaración?</label>
                    <textarea placeholder="Ej: Sin cebolla, que el delivery llame al timbre..." value={aclaraciones} onChange={(e) => setAclaraciones(e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-3xl text-sm outline-none focus:ring-2 focus:ring-green-500 h-24 resize-none" />
                </div>

                <div className="pt-2 border-t border-gray-100">
                    <div className="flex justify-between items-center mb-4 px-2">
                        <span className="text-gray-400 text-xs font-black uppercase tracking-tighter">Total Pedido</span>
                        <span className="text-3xl font-black text-gray-900 tracking-tighter">{formatPrice(totalFinal)}</span>
                    </div>
                    <button onClick={handleSendOrder} disabled={isSending} className="w-full bg-green-700 text-white py-5 rounded-[2rem] font-black flex items-center justify-center gap-3 shadow-xl text-xl active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                        {isSending ? <Loader2 className="animate-spin" size={24} /> : <><Send size={24} /> Enviar Pedido</>}
                    </button>
                </div>
            </div>
        </div>
    );
}