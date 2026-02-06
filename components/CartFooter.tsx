'use client';
import { useState } from 'react';
import { useCart } from '@/context/CartContext';
import { Copy, Check, Send, MapPin, ShoppingBag, Utensils, Wallet, Landmark, X, ChevronDown } from 'lucide-react';

export default function CartFooter({ phone, deliveryCost, aliasMp }: any) {
    const { cart, updateQuantity } = useCart();
    const [copied, setCopied] = useState(false);
    const [isVisible, setIsVisible] = useState(true); 
    
    const [nombre, setNombre] = useState('');
    const [telCliente, setTelCliente] = useState('');
    const [direccion, setDireccion] = useState('');
    const [metodoEnvio, setMetodoEnvio] = useState('delivery'); 
    const [metodoPago, setMetodoPago] = useState('efectivo');

    if (!cart || cart.length === 0 || !isVisible) {
        if (cart.length > 0) {
            return (
                <button 
                    onClick={() => setIsVisible(true)}
                    className="fixed bottom-6 right-6 bg-green-500 text-white p-4 rounded-full shadow-2xl z-[110]"
                >
                    <ShoppingBag size={24} />
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold">
                        {cart.length}
                    </span>
                </button>
            );
        }
        return null;
    }

    const subtotal = cart.reduce((acc: number, item: any) => acc + (item.price * item.quantity), 0);
    const envio = metodoEnvio === 'delivery' ? (Number(deliveryCost) || 0) : 0;
    const totalFinal = subtotal + envio;

    const handleCopyAlias = () => {
        if (!aliasMp) return;
        navigator.clipboard.writeText(aliasMp);
        setCopied(true);
        alert("Alias copiado: " + aliasMp + "\n\n¡Enviame el comprobante después de enviarme el pedido!");
        setTimeout(() => setCopied(false), 2000);
    };

    const formatPrice = (price: number) => 
        new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(price);

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
            mensaje += `${item.quantity}x ${item.name} ${item.selectedExtrasName ? `(${item.selectedExtrasName})` : ''} - ${formatPrice(item.price * item.quantity)}\n`;
        });

        if (envio > 0) mensaje += `\n*Envío:* ${formatPrice(envio)}`;
        mensaje += `\n*TOTAL: ${formatPrice(totalFinal)}*`;

        const url = `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(mensaje)}`;
        window.open(url, '_blank');
    };

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t z-[120] shadow-[0_-10px_40px_rgba(0,0,0,0.2)] rounded-t-[2.5rem] p-4 max-h-[92vh] overflow-y-auto font-sans">
            <div className="max-w-md mx-auto space-y-4 relative">
                
                {/* BOTÓN DE CIERRE (CRUZ) */}
                <div className="flex justify-between items-center pb-2">
                    <button onClick={() => setIsVisible(false)} className="flex items-center gap-1 text-gray-400 hover:text-gray-600 transition-all">
                        <ChevronDown size={20} />
                        <span className="text-[10px] font-bold uppercase tracking-tighter">Seguir pidiendo</span>
                    </button>
                    <button 
                        onClick={() => setIsVisible(false)}
                        className="bg-gray-100 p-2 rounded-full text-gray-500 hover:bg-gray-200 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* 1. PRODUCTOS DETALLADOS */}
                <div className="bg-gray-50 rounded-2xl p-3 border border-gray-100">
                    {cart.map((item: any) => (
                        <div key={item.uniqueId || item.id} className="flex justify-between items-start text-[13px] py-1.5 border-b border-gray-200/50 last:border-0">
                            <div className="flex-1">
                                <span className="text-gray-800 font-bold">{item.quantity}x {item.name}</span>
                                {item.selectedExtrasName && <p className="text-[10px] text-gray-400 italic">+{item.selectedExtrasName}</p>}
                            </div>
                            <div className="flex items-center gap-3 ml-2">
                                <span className="text-gray-600 font-semibold">{formatPrice(item.price * item.quantity)}</span>
                                <button onClick={() => updateQuantity(item.uniqueId || item.id, 0)} className="text-gray-300 hover:text-red-500"><X size={16}/></button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* 2. DATOS PERSONALES */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Nombre</label>
                        <input type="text" placeholder="Tu nombre" value={nombre} onChange={(e)=>setNombre(e.target.value)} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-green-500 transition-all" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase ml-1">WhatsApp</label>
                        <input type="tel" placeholder="Tu celular" value={telCliente} onChange={(e)=>setTelCliente(e.target.value)} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-green-500 transition-all" />
                    </div>
                </div>

                {/* 3. MÉTODOS DE ENTREGA */}
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Método de entrega</label>
                    <div className="flex bg-gray-100 p-1 rounded-xl gap-1">
                        {['delivery', 'retiro', 'mesa'].map((m) => (
                            <button key={m} onClick={() => setMetodoEnvio(m)} className={`flex-1 py-2.5 rounded-lg text-[10px] font-black transition-all uppercase ${metodoEnvio === m ? 'bg-white shadow-md text-green-600' : 'text-gray-400'}`}>
                                {m === 'delivery' ? 'Envío' : m === 'retiro' ? 'Retiro' : 'Mesa'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* 4. SECCIÓN DINÁMICA DE ENVÍO */}
                {metodoEnvio === 'delivery' && (
                    <div className="p-3 bg-green-50 border border-green-100 rounded-2xl space-y-2">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-green-600 uppercase ml-1">Dirección de entrega</label>
                            <input type="text" placeholder="Calle y número" value={direccion} onChange={(e)=>setDireccion(e.target.value)} className="w-full p-2.5 bg-white border border-green-200 rounded-xl text-sm outline-none focus:border-green-500 shadow-sm" />
                        </div>
                        <div className="flex justify-between items-center px-1 pt-1">
                            <span className="text-[11px] text-green-700 font-bold italic">Costo de envío:</span>
                            <span className="text-sm font-black text-green-700">{formatPrice(envio)}</span>
                        </div>
                    </div>
                )}

                {/* 5. MÉTODO DE PAGO */}
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Método de Pago</label>
                    <div className="flex gap-2">
                        <button onClick={() => setMetodoPago('efectivo')} className={`flex-1 p-3 rounded-xl border-2 text-xs font-black transition-all ${metodoPago === 'efectivo' ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-gray-100 text-gray-400'}`}>
                            Efectivo
                        </button>
                        <button onClick={() => setMetodoPago('transferencia')} className={`flex-1 p-3 rounded-xl border-2 text-xs font-black transition-all ${metodoPago === 'transferencia' ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-gray-100 text-gray-400'}`}>
                            Transferencia
                        </button>
                    </div>
                </div>

                {/* ALIAS MP */}
                {metodoPago === 'transferencia' && aliasMp && (
                    <div onClick={handleCopyAlias} className="bg-gradient-to-r from-blue-500 to-blue-600 p-3.5 rounded-2xl flex justify-between items-center cursor-pointer active:scale-95 transition-all shadow-lg border border-blue-400">
                        <div className="text-white">
                            <p className="text-[9px] font-bold opacity-80 uppercase">Toca para copiar Alias</p>
                            <p className="text-sm font-black tracking-tight">{aliasMp}</p>
                        </div>
                        <Copy size={18} className="text-white opacity-80" />
                    </div>
                )}

                {/* 6. TOTAL Y BOTÓN FINAL */}
                <div className="pt-2 border-t border-gray-100">
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-gray-400 text-xs font-black uppercase tracking-widest">Total a pagar</span>
                        <span className="text-2xl font-black text-gray-900 tracking-tighter">{formatPrice(totalFinal)}</span>
                    </div>
                    <button onClick={enviarWhatsApp} className="w-full bg-green-500 hover:bg-green-600 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-3 active:scale-95 shadow-xl shadow-green-200 text-lg">
                        <Send size={20} />
                        Enviar Pedido
                    </button>
                </div>
            </div>
        </div>
    );
}