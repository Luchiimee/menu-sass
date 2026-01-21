'use client';

import { useCartStore } from '@/store/cart-store';
import { supabase } from '@/lib/supabase';
import { Send, ChevronUp, Minus, Plus, Bike, Store, MapPin, CreditCard, Banknote, User, Phone, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';

interface Props {
    phone: string;
    deliveryCost?: number;
    restaurantId: string;
}

export default function CartFooter({ phone, deliveryCost = 0, restaurantId }: Props) {
  const { items, addItem, removeItem, total, clearCart } = useCartStore((state: any) => state);
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [sending, setSending] = useState(false);

  // DATOS DEL CLIENTE
  const [paymentMethod, setPaymentMethod] = useState('efectivo');
  const [orderType, setOrderType] = useState('delivery');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');

  useEffect(() => setMounted(true), []);

  if (!mounted || items.length === 0) return null;

  const subtotal = total();
  const finalDeliveryCost = orderType === 'delivery' ? deliveryCost : 0;
  const finalTotal = subtotal + finalDeliveryCost;

  const handleCheckout = async () => {
    if (!clientName.trim()) return alert("Por favor escribe tu nombre.");
    
    setSending(true);

    try {
        const cleanItems = items.map((i: any) => ({
            id: i.id, name: i.name, price: i.price, quantity: i.quantity
        }));

        // 1. GUARDAR EN BD
        const { error } = await supabase.from('orders').insert({
            restaurant_id: restaurantId,
            items: cleanItems,
            total: finalTotal,
            delivery_cost: finalDeliveryCost,
            status: 'pendiente',
            payment_method: paymentMethod,
            order_type: orderType,
            customer_name: clientName,
            customer_phone: clientPhone
        });

        if (error) console.error('Error Supabase:', error);

        // 2. WHATSAPP
        let message = `Hola! Soy *${clientName}*. Nuevo Pedido (${orderType.toUpperCase()}):%0A%0A`;
        items.forEach((item: any) => {
            message += `▪ ${item.quantity}x ${item.name} ($${item.price * item.quantity})%0A`;
        });
        message += `%0ASubtotal: $${subtotal}`;
        if (finalDeliveryCost > 0) message += `%0AEnvío: $${finalDeliveryCost}`;
        message += `%0A*Total: $${finalTotal}*`;
        message += `%0A%0A----------------`;
        message += `%0A💳 Pago: ${paymentMethod.toUpperCase()}`;
        message += `%0A📍 Entrega: ${orderType.toUpperCase()}`;
        if (clientPhone) message += `%0A📞 Mi Tel: ${clientPhone}`;
        
        const targetPhone = phone || '5491100000000'; 
        
        window.open(`https://wa.me/${targetPhone}?text=${message}`, '_blank');

    } catch (err) { console.error(err); } finally {
        setSending(false); setIsOpen(false); 
    }
  };

  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm" onClick={() => setIsOpen(false)} />}

      <div className={`fixed bottom-0 left-0 right-0 z-50 bg-white shadow-[0_-5px_20px_rgba(0,0,0,0.15)] transition-all duration-300 rounded-t-3xl ${isOpen ? 'h-[90vh]' : 'h-auto'}`}>
        
        <div className="p-4 cursor-pointer hover:bg-gray-50 rounded-t-3xl transition" onClick={() => setIsOpen(!isOpen)}>
             <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-4" />
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="bg-black text-white w-10 h-10 rounded-full flex items-center justify-center font-bold shadow-md">
                        {items.reduce((a: number, b: any) => a + b.quantity, 0)}
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 font-medium">Total Estimado</p>
                        <p className="font-bold text-xl text-gray-900">${finalTotal}</p>
                    </div>
                </div>
                <button className="bg-green-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg">
                    {isOpen ? 'Confirmar' : 'Ver Pedido'} {isOpen ? <Send size={18}/> : <ChevronUp size={18}/>}
                </button>
             </div>
        </div>

        {isOpen && (
            <div className="p-4 h-[calc(100%-100px)] overflow-y-auto custom-scrollbar pb-32">
                
                <h3 className="font-bold text-lg mb-3 text-gray-800">Tus Datos</h3>
                <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="border rounded-xl p-2 flex items-center gap-2 bg-gray-50">
                        <User size={18} className="text-gray-400"/>
                        {/* AQUÍ ESTÁ EL CAMBIO: text-gray-900 */}
                        <input 
                            value={clientName} 
                            onChange={e => setClientName(e.target.value)} 
                            placeholder="Tu Nombre *" 
                            className="bg-transparent w-full outline-none text-sm font-bold text-gray-900 placeholder-gray-400"
                        />
                    </div>
                    <div className="border rounded-xl p-2 flex items-center gap-2 bg-gray-50">
                        <Phone size={18} className="text-gray-400"/>
                        {/* AQUÍ ESTÁ EL CAMBIO: text-gray-900 */}
                        <input 
                            value={clientPhone} 
                            onChange={e => setClientPhone(e.target.value)} 
                            placeholder="Tel (Opcional)" 
                            type="tel" 
                            className="bg-transparent w-full outline-none text-sm font-bold text-gray-900 placeholder-gray-400"
                        />
                    </div>
                </div>

                <h3 className="font-bold text-lg mb-3 text-gray-800">Tu Pedido</h3>
                <div className="space-y-3 mb-6">
                    {items.map((item: any) => (
                        <div key={item.id} className="flex justify-between items-center bg-gray-50 p-2 rounded-lg text-sm">
                            <div className="flex-1">
                                <p className="font-bold text-gray-900">{item.name}</p>
                                <p className="text-xs text-gray-500">${item.price}</p>
                            </div>
                            <div className="flex items-center gap-2 bg-white border rounded px-1">
                                <button onClick={(e) => { e.stopPropagation(); removeItem(item.id); }} className="p-1 text-red-500"><Minus size={14}/></button>
                                <span className="font-bold text-xs w-4 text-center text-gray-900">{item.quantity}</span>
                                <button onClick={(e) => { e.stopPropagation(); addItem(item); }} className="p-1 text-green-600"><Plus size={14}/></button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mb-6">
                    <h3 className="font-bold text-sm mb-2 text-gray-500 uppercase">Tipo de Entrega</h3>
                    <div className="grid grid-cols-3 gap-2">
                        <button onClick={() => setOrderType('delivery')} className={`p-3 rounded-xl border flex flex-col items-center gap-1 text-xs font-bold transition ${orderType === 'delivery' ? 'bg-black text-white border-black' : 'bg-white text-gray-500'}`}><Bike size={20}/> Delivery</button>
                        <button onClick={() => setOrderType('retiro')} className={`p-3 rounded-xl border flex flex-col items-center gap-1 text-xs font-bold transition ${orderType === 'retiro' ? 'bg-black text-white border-black' : 'bg-white text-gray-500'}`}><Store size={20}/> Retiro</button>
                        <button onClick={() => setOrderType('local')} className={`p-3 rounded-xl border flex flex-col items-center gap-1 text-xs font-bold transition ${orderType === 'local' ? 'bg-black text-white border-black' : 'bg-white text-gray-500'}`}><MapPin size={20}/> Mesa</button>
                    </div>
                </div>

                <div className="mb-6">
                    <h3 className="font-bold text-sm mb-2 text-gray-500 uppercase">Forma de Pago</h3>
                    <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => setPaymentMethod('efectivo')} className={`p-3 rounded-xl border flex items-center justify-center gap-2 text-sm font-bold transition ${paymentMethod === 'efectivo' ? 'bg-green-100 text-green-800 border-green-500' : 'bg-white text-gray-500'}`}><Banknote size={18}/> Efectivo</button>
                        <button onClick={() => setPaymentMethod('transferencia')} className={`p-3 rounded-xl border flex items-center justify-center gap-2 text-sm font-bold transition ${paymentMethod === 'transferencia' ? 'bg-blue-100 text-blue-800 border-blue-500' : 'bg-white text-gray-500'}`}><CreditCard size={18}/> Transferencia</button>
                    </div>
                </div>

                <button onClick={handleCheckout} disabled={sending} className="w-full bg-green-600 text-white py-4 rounded-xl font-bold text-lg shadow-xl hover:bg-green-700 transition flex items-center justify-center gap-2 disabled:opacity-70">
                    {sending ? <Loader2 className="animate-spin"/> : <><Send size={20}/> Enviar Pedido</>}
                </button>
            </div>
        )}
      </div>
    </>
  );
}