'use client';
import { useState, useEffect } from 'react';
import { useCart } from '@/context/CartContext';
import { Send, ShoppingBag, X, ChevronDown, Plus, Minus, Copy, Check, Wallet, Landmark, MessageSquare } from 'lucide-react';

export default function CartFooter({ phone, deliveryCost, aliasMp }: any) {
    const { cart, updateQuantity, updateExtraQuantity } = useCart();
    const [copied, setCopied] = useState(false);
    const [isVisible, setIsVisible] = useState(false); 
    const [nombre, setNombre] = useState('');
    const [telCliente, setTelCliente] = useState('');
    const [direccion, setDireccion] = useState('');
    const [aclaraciones, setAclaraciones] = useState('');
    const [metodoEnvio, setMetodoEnvio] = useState('delivery'); 
    const [metodoPago, setMetodoPago] = useState('efectivo');

    // Cierre automático si el carrito queda vacío
    useEffect(() => {
        if (cart.length === 0 && isVisible) {
            setIsVisible(false);
        }
    }, [cart.length, isVisible]);

    if (!cart || cart.length === 0 || !isVisible) {
        if (cart.length > 0) {
            return (
                <button onClick={() => setIsVisible(true)} className="fixed bottom-6 right-6 bg-green-500 text-white p-4 rounded-full shadow-2xl z-[110] active:scale-90 transition-transform">
                    <ShoppingBag size={28} />
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-6 h-6 rounded-full flex items-center justify-center font-bold border-2 border-white">
                        {cart.length}
                    </span>
                </button>
            );
        }
        return null;
    }

    const subtotal = cart.reduce((acc, item) => {
        const extrasTotal = (item.extrasList || []).reduce((a, b) => a + (b.price * b.quantity), 0);
        return acc + (item.price + extrasTotal) * item.quantity;
    }, 0);
    const envio = metodoEnvio === 'delivery' ? (Number(deliveryCost) || 0) : 0;
    const totalFinal = subtotal + envio;

    const formatPrice = (price: number) => 
        new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(price);

    const handleCopyAlias = () => {
        if (!aliasMp) return;
        navigator.clipboard.writeText(aliasMp);
        setCopied(true);
        setTimeout(() => setCopied(false), 4000);
    };

    const enviarWhatsApp = () => {
        if (!nombre) return alert("Ingresá tu nombre");
        if (metodoEnvio === 'delivery' && !direccion) return alert("Ingresá tu dirección");

        let mensaje = `*Nuevo Pedido*\n`;
        mensaje += `👤 *Cliente:* ${nombre}\n`;
        if (telCliente) mensaje += `📞 *Tel:* ${telCliente}\n`;
        mensaje += `🛵 *Entrega:* ${metodoEnvio.toUpperCase()}\n`;
        if (metodoEnvio === 'delivery') mensaje += `📍 *Dirección:* ${direccion}\n`;
        mensaje += `💳 *Pago:* ${metodoPago.toUpperCase()}\n\n`;
        
        cart.forEach((item: any) => {
            const itemTotal = (item.price + (item.extrasList || []).reduce((a:any, b:any) => a + (b.price * b.quantity), 0)) * item.quantity;
            mensaje += `✅ *${item.quantity}x ${item.name}*\n`;
            item.extrasList?.forEach((ex: any) => {
                mensaje += `   └─ ${ex.quantity}x Extra ${ex.name}\n`;
            });
            mensaje += `   _Subtotal: ${formatPrice(itemTotal)}_\n\n`;
        });

        if (aclaraciones) mensaje += `📝 *Aclaraciones:* ${aclaraciones}\n\n`;
        if (envio > 0) mensaje += `*Envío:* ${formatPrice(envio)}\n`;
        mensaje += `*TOTAL: ${formatPrice(totalFinal)}*`;

        window.open(`https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(mensaje)}`, '_blank');
    };

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t z-[120] shadow-[0_-10px_40px_rgba(0,0,0,0.2)] rounded-t-[2.5rem] p-4 max-h-[95vh] overflow-y-auto font-sans text-black">
            <div className="max-w-md mx-auto space-y-5 relative">
                
                {/* CABECERA */}
                <div className="flex justify-between items-center">
                    <button onClick={() => setIsVisible(false)} className="flex items-center gap-1 text-gray-400 font-bold text-[10px] uppercase tracking-widest">
                        <ChevronDown size={20} /> Seguir pidiendo
                    </button>
                    <button onClick={() => setIsVisible(false)} className="bg-gray-100 p-2 rounded-full text-gray-500"><X size={20} /></button>
                </div>

                <h2 className="text-xl font-black text-gray-800 px-1">Tu Pedido</h2>

                {/* LISTA DE PRODUCTOS */}
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

                {/* DATOS DE ENTREGA */}
                <div className="space-y-3 bg-gray-50 p-4 rounded-3xl border border-gray-100">
                    <div className="grid grid-cols-2 gap-2">
                        <input type="text" placeholder="Tu nombre" value={nombre} onChange={(e)=>setNombre(e.target.value)} className="w-full p-3 bg-white border border-gray-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-green-500" />
                        <input type="tel" placeholder="WhatsApp" value={telCliente} onChange={(e)=>setTelCliente(e.target.value)} className="w-full p-3 bg-white border border-gray-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-green-500" />
                    </div>

                    <div className="flex bg-gray-200/50 p-1 rounded-2xl gap-1">
                        {['delivery', 'retiro', 'mesa'].map((m) => (
                            <button key={m} onClick={() => setMetodoEnvio(m)} className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${metodoEnvio === m ? 'bg-white shadow-sm text-green-600' : 'text-gray-400'}`}>
                                {m === 'delivery' ? 'Envío' : m === 'retiro' ? 'Retiro' : 'Mesa'}
                            </button>
                        ))}
                    </div>

                    {metodoEnvio === 'delivery' && (
                        <input type="text" placeholder="Dirección completa" value={direccion} onChange={(e)=>setDireccion(e.target.value)} className="w-full p-3 bg-white border border-gray-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-green-500 shadow-inner" />
                    )}
                </div>

                {/* MEDIO DE PAGO */}
                <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Medio de Pago</label>
                    <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => setMetodoPago('efectivo')} className={`p-4 rounded-2xl border-2 flex items-center justify-center gap-2 font-bold text-sm transition-all ${metodoPago === 'efectivo' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-100 text-gray-400'}`}>
                            <Wallet size={18} /> Efectivo
                        </button>
                        <button onClick={() => setMetodoPago('transferencia')} className={`p-4 rounded-2xl border-2 flex items-center justify-center gap-2 font-bold text-sm transition-all ${metodoPago === 'transferencia' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-100 text-gray-400'}`}>
                            <Landmark size={18} /> Transferencia
                        </button>
                    </div>

                    {metodoPago === 'transferencia' && aliasMp && (
                        <div className="space-y-2">
                            <div onClick={handleCopyAlias} className={`p-4 rounded-2xl flex justify-between items-center cursor-pointer transition-all border-2 ${copied ? 'bg-green-500 border-green-500 shadow-lg scale-[1.02]' : 'bg-blue-600 border-blue-600 shadow-blue-200 shadow-lg active:scale-95'}`}>
                                <div className="text-white">
                                    <p className="text-[9px] font-black opacity-80 uppercase leading-none mb-1">{copied ? '¡COPIADO!' : 'TOCA PARA COPIAR ALIAS'}</p>
                                    <p className="text-sm font-black">{aliasMp}</p>
                                </div>
                                {copied ? <Check size={20} className="text-white" /> : <Copy size={20} className="text-white opacity-80" />}
                            </div>
                            
                            {/* MENSAJE FLOTANTE AZUL CLARO */}
                            {copied && (
                                <div className="bg-sky-100 text-sky-700 px-4 py-2 rounded-xl text-[11px] font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-300 border border-sky-200 shadow-sm">
                                    <MessageSquare size={14} />
                                    <span>¡Alias copiado! Enviame el comprobante luego de confirmar.</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* ACLARACIONES */}
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase ml-2">¿Alguna aclaración?</label>
                    <textarea 
                        placeholder="Ej: Sin cebolla, que el delivery llame al timbre..." 
                        value={aclaraciones} 
                        onChange={(e) => setAclaraciones(e.target.value)}
                        className="w-full p-4 bg-gray-50 border border-gray-200 rounded-3xl text-sm outline-none focus:ring-2 focus:ring-green-500 h-24 resize-none"
                    />
                </div>

                {/* TOTAL */}
                <div className="pt-2 border-t border-gray-100">
                    <div className="flex justify-between items-center mb-4 px-2">
                        <span className="text-gray-400 text-xs font-black uppercase tracking-tighter">Total Pedido</span>
                        <span className="text-3xl font-black text-gray-900 tracking-tighter">{formatPrice(totalFinal)}</span>
                    </div>
                    <button onClick={enviarWhatsApp} className="w-full bg-green-500 text-white py-5 rounded-[2rem] font-black flex items-center justify-center gap-3 shadow-xl shadow-green-100 text-xl active:scale-95 transition-all">
                        <Send size={24} /> Enviar Pedido
                    </button>
                </div>
            </div>
        </div>
    );
}