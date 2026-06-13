'use client';

import { useEffect, useState, useCallback } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Check, ChefHat, Bike, Clock, XCircle, Zap, ShoppingBag, CalendarCheck,MessageCircle,CreditCard,Copy } from 'lucide-react';

interface OrderTrackerProps {
    orderId: string;
    restaurantPhone: string;
    businessType?: string;
    paymentMethodProp?: string; 
    aliasMpProp?: string;
    onStatusChange?: (status: string) => void;
}

const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function OrderTracker({ orderId, restaurantPhone, businessType = 'gastronomico', paymentMethodProp, aliasMpProp, onStatusChange }: OrderTrackerProps) {
    const [status, setStatus] = useState('pendiente');
    const [scheduledTime, setScheduledTime] = useState<string | null>(null);
    const [orderType, setOrderType] = useState(businessType); 
    const [paymentMethod, setPaymentMethod] = useState(paymentMethodProp); 
    const [copied, setCopied] = useState(false); 

  const fetchOrderData = useCallback(async () => {
    if (!orderId) return;
    const { data } = await supabase
        .from('orders')
        .select('status, scheduled_delivery_time, order_type, payment_method')
        .eq('id', orderId)
        .single();

    if (data) {
        // 1. Sincronizar el estado (solo si cambió)
        if (data.status !== status) {
            setStatus(data.status);
            if(onStatusChange) onStatusChange(data.status);
        }
        
        // 🚀 2. ESTO DEBE ESTAR AFUERA (Para que se cargue apenas abre el tracker)
        if (data.payment_method) setPaymentMethod(data.payment_method);
        if (data.order_type) setOrderType(data.order_type);
        
        if (data.scheduled_delivery_time && data.scheduled_delivery_time !== 'Inmediato') {
            setScheduledTime(data.scheduled_delivery_time);
        }
    }
}, [orderId, onStatusChange, status]);

useEffect(() => {
    if (paymentMethodProp) setPaymentMethod(paymentMethodProp);
}, [paymentMethodProp]);

    useEffect(() => {
        fetchOrderData();
        const channel = supabase
            .channel(`order_${orderId}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` }, 
            (payload) => {
                const newStatus = payload.new.status;
                setStatus(newStatus);
                if(onStatusChange) onStatusChange(newStatus);
            }).subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [orderId, fetchOrderData]);

    const stepsConfig: any = {
        gastronomico: [
            { id: 'pendiente', label: 'Confirmando...', subLabel: 'El local está revisando tu pedido', icon: Clock, color: 'bg-yellow-500', textColor: 'text-yellow-600' },
            { id: 'recibido', label: '¡Pedido Tomado! ✅', subLabel: 'Enseguida lo preparamos', icon: Check, color: 'bg-indigo-500', textColor: 'text-indigo-600' },
            { id: 'en_proceso', label: 'Cocinando 🔥', subLabel: '¡El fuego está prendido!', icon: ChefHat, color: 'bg-orange-500', textColor: 'text-orange-600' },
            { id: 'en_camino', label: 'En Camino 🛵', subLabel: 'Tu pedido está llegando', icon: Bike, color: 'bg-blue-600', textColor: 'text-blue-600' },
            { id: 'completado', label: '¡Disfrutalo! 🎉', subLabel: 'Pedido entregado con éxito', icon: Check, color: 'bg-green-600', textColor: 'text-green-600' },
        ],
        mesa: [
            { id: 'pendiente', label: 'Enviado', subLabel: 'El local está revisando tu pedido', icon: Clock, color: 'bg-yellow-500', textColor: 'text-yellow-600' },
            { id: 'en_proceso', label: 'En cocina', subLabel: 'Tu pedido está siendo preparado', icon: ChefHat, color: 'bg-orange-500', textColor: 'text-orange-600' },
            { id: 'entregado', label: 'Entregado', subLabel: 'Tu pedido fue entregado en tu mesa', icon: Zap, color: 'bg-blue-500', textColor: 'text-blue-600' },
            { id: 'completado', label: 'Gracias por tu visita', subLabel: 'Gracias por tu visita', icon: Check, color: 'bg-green-600', textColor: 'text-green-600' },
        ],
      retiro: [
            { id: 'pendiente', label: 'Confirmando...', subLabel: 'El local está revisando tu pedido', icon: Clock, color: 'bg-yellow-500', textColor: 'text-yellow-600' },
            { id: 'recibido', label: '¡Pedido Tomado! ✅', subLabel: 'Enseguida lo preparamos', icon: Check, color: 'bg-indigo-500', textColor: 'text-indigo-600' },
            { id: 'en_proceso', label: 'Cocinando 🔥', subLabel: '¡El fuego está prendido!', icon: ChefHat, color: 'bg-orange-500', textColor: 'text-orange-600' },
            // 🚀 CAMBIO AQUÍ: Texto específico para retiro
            { id: 'en_camino', label: '¡Pedido Listo! 🛍️', subLabel: 'Tu pedido está listo para retirar', icon: ShoppingBag, color: 'bg-blue-600', textColor: 'text-blue-600' },
            { id: 'completado', label: '¡Entregado! ✨', subLabel: 'Gracias por tu visita', icon: Check, color: 'bg-green-600', textColor: 'text-green-600' },
        ]
    };

    const mappedType = orderType === 'delivery' ? 'gastronomico' : orderType;
    const steps = stepsConfig[mappedType] || stepsConfig.gastronomico;
    // Para delivery/retiro 'entregado' es estado final (=completado). Para mesa son estados distintos: entregado=plato en la mesa, completado=pago cerrado. Por eso solo normalizamos cuando NO es mesa.
    const normalizedStatus = (status === 'entregado' && mappedType !== 'mesa') ? 'completado' : status;
    const currentIndex = steps.findIndex((s: any) => s.id === normalizedStatus);
    const currentStep = steps[currentIndex] || steps[0];

    // Lógica para saber si mostrar el aviso de agenda
    const showAgendaNotice = scheduledTime && (status === 'pendiente' || status === 'recibido');

    if (status === 'cancelado') {
        return (
            <div className="bg-white rounded-3xl p-8 text-center border border-red-100 h-full flex flex-col justify-center items-center">
                <XCircle size={60} className="text-red-500 mb-4"/>
                <h3 className="text-2xl font-black text-red-600 uppercase tracking-tighter">Pedido Cancelado</h3>
                <p className="text-gray-500 mt-2 text-sm font-bold">Ponete en contacto con nosotros por WhatsApp.</p>
            </div>
        );
    }

    const Icon = currentStep.icon;
const isTransfer = paymentMethod === 'transferencia';
    const showPaymentCard = isTransfer && status === 'pendiente';


    return (
        <div className="relative h-full flex flex-col justify-between py-4">
            <div className="flex-1 flex flex-col justify-center items-center">
                {showPaymentCard && (
    <div className="mb-6 w-full px-4 animate-in slide-in-from-top-4 duration-500">
        <div className="bg-purple-50 border-2 border-purple-200 p-5 rounded-[2.5rem] shadow-xl">
            <div className="flex flex-col items-center text-center gap-3">
                <div className="bg-purple-600 text-white p-2.5 rounded-2xl shadow-lg">
                    <CreditCard size={20} strokeWidth={2.5} />
                </div>
                <div className="space-y-1">
                    <h4 className="text-sm font-black uppercase italic tracking-tighter text-purple-950">Pendiente de Pago</h4>
                    <p className="text-[11px] font-bold text-purple-700/80 leading-tight">Transferí al Alias y envianos el comprobante para que comencemos a cocinar.</p>
                </div>

                <button onClick={() => { navigator.clipboard.writeText(aliasMpProp || ''); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="w-full bg-white border-2 border-purple-100 p-3 rounded-2xl flex justify-between items-center active:scale-95 transition-all">
                    <div className="text-left">
                        <p className="text-[8px] font-black text-gray-400 uppercase">Copiar Alias</p>
                        <p className="text-xs font-black text-purple-900">{aliasMpProp || 'Configurá tu Alias'}</p>
                    </div>
                    {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} className="text-purple-300" />}
                </button>

                <button onClick={() => { const msg = encodeURIComponent(`Hola! mi pedido es ${orderId.slice(0,5)}, te adjunto el comprobante.`); window.open(`whatsapp://send?phone=${restaurantPhone.replace(/\D/g, '')}&text=${msg}`); }} className="w-full bg-green-600 text-white py-3.5 rounded-2xl font-black uppercase text-[10px] flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all">
                    <MessageCircle size={16} fill="white" /> Enviar Comprobante
                </button>
                <p className="text-[9px] font-bold text-purple-400 uppercase italic mt-1 leading-tight">Sino, esperá a que confirmemos <br/> el ingreso manualmente.</p>
            </div>
        </div>
    </div>
)}
                
                {/* 🚀 CARTEL DE AGUENDA (Solo si es programado y está en espera) */}
                {showAgendaNotice && (
                    <div className="mb-6 w-full px-4 animate-in fade-in zoom-in duration-500">
                        <div className="bg-indigo-50 border-2 border-indigo-100 p-4 rounded-[2rem] flex flex-col items-center gap-2 shadow-sm">
                            <div className="bg-indigo-600 text-white p-2 rounded-full shadow-lg">
                                <CalendarCheck size={18} strokeWidth={2.5} />
                            </div>
                            <div className="text-center">
    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.1em] italic">
    {showPaymentCard ? 'Pedido en Espera' : 'Pedido Agendado'}
</p>
    <p className="text-[11px] font-bold text-indigo-950 leading-tight">
        {showPaymentCard 
            ? `Prepararemos tu pedido para las ${scheduledTime} apenas se confirme el pago.` // 🚀 Texto si falta pagar
            : `¡Recibimos tu pedido! Lo prepararemos para el horario seleccionado: ${scheduledTime}`      // Texto si es efectivo o ya pagó
        }
    </p>
</div>
                        </div>
                    </div>
                )}

                <div className={`mx-auto w-24 h-24 mb-6 relative`}>
                    <div className={`absolute inset-0 rounded-full ${currentStep.color} opacity-20 animate-ping`}></div>
                    <div className="relative w-full h-full bg-white rounded-full flex items-center justify-center shadow-xl border-4 border-white text-center">
                        <Icon size={40} className={`${currentStep.textColor}`} />
                    </div>
                </div>
                
          <h3 className="text-3xl font-black text-gray-900 tracking-tighter leading-none mb-2 text-center italic uppercase">
    {/* 🚀 LÓGICA DINÁMICA: Si es transferencia y está pendiente, cambiamos el título */}
    {showPaymentCard ? 'Esperando Pago' : currentStep.label}
</h3>
                
         <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest text-center px-4">
    {/* 🚀 CAMBIO DE TEXTO: Menos presión, más servicio */}
    {showPaymentCard ? 'Si tenés preguntas o dudas sobre tu pedido, envianos un msj' : currentStep.subLabel}
</p>
                
                <div className="flex gap-1.5 h-1.5 mt-8 px-8 w-full max-w-[280px]">
                    {steps.map((step: any, i: number) => (
                        <div 
                            key={step.id} 
                            className={`flex-1 rounded-full transition-all duration-700 ${i <= currentIndex ? step.color : 'bg-gray-100'}`}
                        ></div>
                    ))}
                </div>
            </div>

            <div className="mt-8 pt-4 border-t border-gray-50/50">
                <a href="https://snappy.uno" target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1 group no-underline">
                    <p className="text-[10px] font-black text-gray-300 group-hover:text-gray-400 transition-colors uppercase tracking-[0.2em]">
                        Potenciado por 
                        <Zap size={12} className="inline ml-1 text-yellow-400/50 fill-yellow-400/50 group-hover:scale-110 transition-transform" /> 
                        <span className="ml-0.5">Snappy</span>
                    </p>
                </a>
            </div>
        </div>
    );
}