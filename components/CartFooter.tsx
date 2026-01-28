'use client';

import { useState } from 'react';
import { useCart } from '@/context/CartContext';
import { createBrowserClient } from '@supabase/ssr';
import { ShoppingBag, X, Send, CreditCard, Banknote, Bike, Store, MapPin, Copy, Check, Loader2 } from 'lucide-react';
import OrderTracker from './OrderTracker';

interface CartFooterProps {
  phone: string; 
  deliveryCost: number;
  restaurantId: string;
  aliasMp?: string;
  planType: 'light' | 'plus' | 'max' | null;
}

export default function CartFooter({ phone: restaurantPhone, deliveryCost, restaurantId, aliasMp, planType }: CartFooterProps) {
  const { cart, total, removeFromCart, clearCart, activeOrderId, setActiveOrderId } = useCart();
  const [isOpen, setIsOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryType, setDeliveryType] = useState<'delivery' | 'retiro' | 'mesa'>('delivery');
  const [paymentMethod, setPaymentMethod] = useState<'efectivo' | 'transferencia'>('efectivo');
  const [address, setAddress] = useState('');
  
  const [copiedAlias, setCopiedAlias] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  if (activeOrderId && (planType === 'plus' || planType === 'max')) {
      return (
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t z-50 animate-in slide-in-from-bottom-2">
              <div className="max-w-md mx-auto text-gray-900">
                  <OrderTracker orderId={activeOrderId} />
                  <button onClick={() => setIsOpen(true)} className="text-xs text-gray-400 underline w-full text-center mt-2">
                      Ver detalle del pedido
                  </button>
              </div>
          </div>
      );
  }

  if (cart.length === 0) return null;

  const finalTotal = deliveryType === 'delivery' ? total + deliveryCost : total;

  const copyAlias = () => {
      if (aliasMp) {
          navigator.clipboard.writeText(aliasMp);
          setCopiedAlias(true);
          setTimeout(() => setCopiedAlias(false), 2000);
      }
  };

  const handleSendOrder = async () => {
      if (!customerName.trim()) return alert("Por favor, escribe tu nombre.");
      if (!customerPhone.trim()) return alert("El teléfono es obligatorio.");
      if (deliveryType === 'delivery' && !address.trim()) return alert("Escribe tu dirección de envío.");

      setIsSending(true);

      try {
          let orderIdCreated = null;

          if (planType === 'plus' || planType === 'max') {
              const { data: newOrder, error } = await supabase.from('orders').insert({
                  restaurant_id: restaurantId,
                  customer_name: customerName,
                  customer_phone: customerPhone,
                  address: address,
                  order_type: deliveryType,
                  payment_method: paymentMethod,
                  total: finalTotal,
                  status: 'pendiente',
                  delivery_cost: deliveryType === 'delivery' ? deliveryCost : 0,
                  items: cart 
              }).select().single();

              if (!error && newOrder) {
                  orderIdCreated = newOrder.id;
                  setActiveOrderId(newOrder.id);
              }
          }

          let msg = `*¡Hola! Nuevo Pedido* 🍔\n`;
          if (orderIdCreated) msg += `Ref: #${orderIdCreated.slice(0,5)}\n`;
          msg += `------------------\n`;
          msg += `*Nombre:* ${customerName}\n`;
          msg += `*Tel:* ${customerPhone}\n`;
          msg += `*Entrega:* ${deliveryType.toUpperCase()} ${deliveryType === 'delivery' ? `(${address})` : ''}\n`;
          msg += `*Pago:* ${paymentMethod.toUpperCase()}\n\n`;
          
          msg += `*Pedido:*\n`;
          cart.forEach(item => {
              msg += `• ${item.quantity}x ${item.name} ($${item.price * item.quantity})\n`;
          });

          if (deliveryType === 'delivery') {
              msg += `• Envío: $${deliveryCost}\n`;
          }

          msg += `\n*TOTAL: $${finalTotal}*`;

          setIsOpen(false);
          if (orderIdCreated) clearCart(); 

          setTimeout(() => {
              const textEncoded = encodeURIComponent(msg);
              const isDesktopScreen = window.innerWidth > 768; 

              if (isDesktopScreen) {
                  window.location.href = `whatsapp://send?phone=${restaurantPhone}&text=${textEncoded}`;
              } else {
                  window.location.href = `https://wa.me/${restaurantPhone}?text=${textEncoded}`;
              }
              
              setIsSending(false);
          }, 500);

      } catch (err) {
          console.error(err);
          alert("Error al procesar.");
          setIsSending(false);
      }
  };

  return (
    <>
      {!isOpen && (
        <div className="fixed bottom-4 left-4 right-4 z-50 animate-in slide-in-from-bottom-4">
          <button 
            onClick={() => setIsOpen(true)}
            className="w-full bg-black text-white p-4 rounded-2xl shadow-2xl flex items-center justify-between font-bold text-lg hover:scale-[1.02] transition-transform"
          >
            <div className="flex items-center gap-3">
                <span className="bg-white text-black w-8 h-8 rounded-full flex items-center justify-center text-sm">{cart.reduce((a,b)=>a+b.quantity,0)}</span>
                <span>Ver Pedido</span>
            </div>
            <span>${total.toLocaleString()}</span>
          </button>
        </div>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center sm:items-center p-0 sm:p-4 animate-in fade-in">
            <div className="bg-white w-full max-w-lg sm:rounded-3xl rounded-t-3xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col text-gray-900">
                
                <div className="p-5 border-b flex justify-between items-center sticky top-0 bg-white z-10">
                    <h2 className="text-xl font-bold flex items-center gap-2 text-gray-900"><ShoppingBag/> Tu Pedido</h2>
                    <button onClick={() => setIsOpen(false)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 text-gray-600"><X size={20}/></button>
                </div>

                <div className="p-5 space-y-6">
                    <div className="space-y-4">
                        {cart.map((item) => (
                            <div key={item.id} className="flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="font-bold text-gray-900">{item.quantity}x</div>
                                    <div>
                                        <p className="font-medium text-sm text-gray-800">{item.name}</p>
                                        <p className="text-xs text-gray-500">${item.price}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="font-bold text-sm text-gray-900">${item.price * item.quantity}</span>
                                    <button onClick={() => removeFromCart(item.id)} className="text-red-400 hover:text-red-600"><X size={16}/></button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <hr className="border-dashed border-gray-200"/>

                    <div className="space-y-3">
                        <h3 className="font-bold text-sm text-gray-500 uppercase">Tus Datos</h3>
                        {/* INPUTS CORREGIDOS: bg-gray-50 y text-gray-900 forzado */}
                        <input 
                          placeholder="Tu Nombre *" 
                          value={customerName} 
                          onChange={(e) => setCustomerName(e.target.value)} 
                          className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-900 outline-none focus:ring-2 ring-black/5"
                        />
                        <input 
                          placeholder="Tu Teléfono (Obligatorio) *" 
                          value={customerPhone} 
                          onChange={(e) => setCustomerPhone(e.target.value)} 
                          type="tel" 
                          className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-900 outline-none focus:ring-2 ring-black/5"
                        />
                    </div>

                    <div className="space-y-3">
                        <h3 className="font-bold text-sm text-gray-500 uppercase">Entrega</h3>
                        <div className="grid grid-cols-3 gap-2">
                            <button onClick={() => setDeliveryType('delivery')} className={`p-3 rounded-xl border flex flex-col items-center gap-1 text-xs font-bold transition ${deliveryType === 'delivery' ? 'bg-black text-white border-black' : 'bg-white text-gray-500 hover:bg-gray-50 border-gray-200'}`}><Bike size={20}/> Delivery</button>
                            <button onClick={() => setDeliveryType('retiro')} className={`p-3 rounded-xl border flex flex-col items-center gap-1 text-xs font-bold transition ${deliveryType === 'retiro' ? 'bg-black text-white border-black' : 'bg-white text-gray-500 hover:bg-gray-50 border-gray-200'}`}><Store size={20}/> Retiro</button>
                            <button onClick={() => setDeliveryType('mesa')} className={`p-3 rounded-xl border flex flex-col items-center gap-1 text-xs font-bold transition ${deliveryType === 'mesa' ? 'bg-black text-white border-black' : 'bg-white text-gray-500 hover:bg-gray-50 border-gray-200'}`}><MapPin size={20}/> Mesa</button>
                        </div>
                        {deliveryType === 'delivery' && (
                            <div className="animate-in fade-in space-y-2">
                                <input 
                                  placeholder="Dirección exacta (Calle, Altura, Piso)..." 
                                  value={address} 
                                  onChange={(e) => setAddress(e.target.value)} 
                                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 outline-none focus:ring-2 ring-black/5"
                                />
                                {deliveryCost > 0 && (<div className="flex justify-between items-center bg-blue-50 text-blue-700 px-4 py-2 rounded-lg text-sm font-bold"><span>Costo de envío:</span><span>+${deliveryCost}</span></div>)}
                            </div>
                        )}
                    </div>

                    <div className="space-y-3">
                        <h3 className="font-bold text-sm text-gray-500 uppercase">Pago</h3>
                        <div className="grid grid-cols-2 gap-2">
                            <button onClick={() => setPaymentMethod('efectivo')} className={`p-3 rounded-xl border flex items-center justify-center gap-2 text-sm font-bold transition ${paymentMethod === 'efectivo' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-white text-gray-500 hover:bg-gray-50 border-gray-200'}`}><Banknote size={18}/> Efectivo</button>
                            <button onClick={() => setPaymentMethod('transferencia')} className={`p-3 rounded-xl border flex items-center justify-center gap-2 text-sm font-bold transition ${paymentMethod === 'transferencia' ? 'bg-purple-100 text-purple-800 border-purple-200' : 'bg-white text-gray-500 hover:bg-gray-50 border-gray-200'}`}><CreditCard size={18}/> Transferencia</button>
                        </div>
                        {paymentMethod === 'transferencia' && aliasMp && (
                            <div className="bg-purple-50 border border-purple-100 p-4 rounded-xl flex items-center justify-between animate-in fade-in slide-in-from-top-2">
                                <div><p className="text-[10px] uppercase font-bold text-purple-400 mb-1">Alias para transferir:</p><p className="text-lg font-black text-purple-900 select-all">{aliasMp}</p></div>
                                <button onClick={copyAlias} className="bg-white border border-purple-200 text-purple-600 p-2 rounded-lg hover:bg-purple-100 transition shadow-sm">{copiedAlias ? <Check size={20}/> : <Copy size={20}/>}</button>
                            </div>
                        )}
                    </div>

                </div>

                <div className="p-5 border-t bg-gray-50 sticky bottom-0 z-10">
                    <div className="flex justify-between items-end mb-4">
                        <span className="text-gray-500 font-medium">Total a Pagar:</span>
                        <span className="text-3xl font-black text-gray-900">${finalTotal.toLocaleString()}</span>
                    </div>
                    <button 
                        onClick={handleSendOrder}
                        disabled={isSending}
                        className="w-full bg-green-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-green-700 transition shadow-lg flex items-center justify-center gap-2 active:scale-[0.98]"
                    >
                        {isSending ? <Loader2 className="animate-spin" size={24}/> : <><Send size={20}/> Confirmar Pedido</>}
                    </button>
                </div>

            </div>
        </div>
      )}
    </>
  );
}