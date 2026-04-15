'use client';

import { useEffect, useState, useCallback } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Check, ChefHat, Bike, Clock, XCircle, Zap, Package, Truck, ShoppingBag } from 'lucide-react';

interface OrderTrackerProps {
    orderId: string;
    restaurantPhone: string;
    businessType?: string;
    onStatusChange?: (status: string) => void;
}

const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function OrderTracker({ orderId, restaurantPhone, businessType = 'gastronomico', onStatusChange }: OrderTrackerProps) {
    const [status, setStatus] = useState('pendiente');

    const fetchStatus = useCallback(async () => {
        if (!orderId) return;
        const { data } = await supabase.from('orders').select('status').eq('id', orderId).single();
        if (data && data.status !== status) {
            setStatus(data.status);
            if(onStatusChange) onStatusChange(data.status);
        }
    }, [orderId, onStatusChange, status]);

    useEffect(() => {
        fetchStatus();
        const channel = supabase
            .channel(`order_${orderId}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` }, 
            (payload) => {
                const newStatus = payload.new.status;
                setStatus(newStatus);
                if(onStatusChange) onStatusChange(newStatus);
            }).subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [orderId, fetchStatus]);

    const stepsConfig: any = {
        gastronomico: [
            { id: 'pendiente', label: 'Confirmando...', subLabel: 'El local está revisando tu pedido', icon: Clock, color: 'bg-yellow-500', lightColor: 'bg-yellow-50/50', textColor: 'text-yellow-600' },
            { id: 'recibido', label: '¡Pedido Tomado! ✅', subLabel: 'Enseguida lo preparamos', icon: Check, color: 'bg-indigo-500', lightColor: 'bg-indigo-50/50', textColor: 'text-indigo-600' },
            { id: 'en_proceso', label: 'Cocinando 🔥', subLabel: '¡El fuego está prendido!', icon: ChefHat, color: 'bg-orange-500', lightColor: 'bg-orange-50/50', textColor: 'text-orange-600' },
            { id: 'en_camino', label: 'En Camino 🛵', subLabel: 'Tu pedido está llegando', icon: Bike, color: 'bg-blue-600', lightColor: 'bg-blue-50/50', textColor: 'text-blue-600' },
            { id: 'completado', label: '¡Disfrutalo! 🎉', subLabel: 'Pedido entregado con éxito', icon: Check, color: 'bg-green-600', lightColor: 'bg-green-50/50', textColor: 'text-green-600' },
        ],
        mesa: [
            { id: 'pendiente', label: 'Enviado 📩', subLabel: 'El local está revisando tu pedido', icon: Clock, color: 'bg-yellow-500', lightColor: 'bg-yellow-50/50', textColor: 'text-yellow-600' },
            { id: 'recibido', label: '¡Pedido Tomado! ✅', subLabel: 'Enseguida lo mandamos a cocina', icon: Check, color: 'bg-indigo-500', lightColor: 'bg-indigo-50/50', textColor: 'text-indigo-600' },
            { id: 'en_proceso', label: 'En Cocina 🔥', subLabel: 'Tu pedido se está preparando', icon: ChefHat, color: 'bg-orange-500', lightColor: 'bg-orange-50/50', textColor: 'text-orange-600' },
            { id: 'listo', label: '¡Plato Listo! 🍽️', subLabel: 'El mozo te lo alcanza enseguida', icon: Zap, color: 'bg-blue-500', lightColor: 'bg-blue-50/50', textColor: 'text-blue-600' },
            { id: 'completado', label: '¡Provecho! ✨', subLabel: 'Esperamos que lo disfrutes', icon: Check, color: 'bg-green-600', lightColor: 'bg-green-50/50', textColor: 'text-green-600' },
        ],
        retiro: [
            { id: 'pendiente', label: 'Confirmando...', subLabel: 'El local está revisando tu pedido', icon: Clock, color: 'bg-yellow-500', lightColor: 'bg-yellow-50/50', textColor: 'text-yellow-600' },
            { id: 'recibido', label: '¡Pedido Tomado! ✅', subLabel: 'Enseguida lo preparamos', icon: Check, color: 'bg-indigo-500', lightColor: 'bg-indigo-50/50', textColor: 'text-indigo-600' },
            { id: 'en_proceso', label: 'Cocinando 🔥', subLabel: '¡El fuego está prendido!', icon: ChefHat, color: 'bg-orange-500', lightColor: 'bg-orange-50/50', textColor: 'text-orange-600' },
            { id: 'en_camino', label: '¡Pedido Listo! 🛍️', subLabel: 'Ya podés pasar a retirarlo', icon: ShoppingBag, color: 'bg-blue-600', lightColor: 'bg-blue-50/50', textColor: 'text-blue-600' },
            { id: 'completado', label: '¡Entregado! ✨', subLabel: 'Gracias por tu visita', icon: Check, color: 'bg-green-600', lightColor: 'bg-green-50/50', textColor: 'text-green-600' },
        ]
    };

    const steps = stepsConfig[businessType] || stepsConfig.gastronomico;
    const normalizedStatus = status === 'entregado' ? 'completado' : status;
    const currentIndex = steps.findIndex((s: any) => s.id === normalizedStatus);
    const currentStep = steps[currentIndex] || steps[0];

    if (status === 'cancelado') {
        return (
            <div className="bg-white rounded-3xl p-8 text-center border border-red-100 h-full flex flex-col justify-center items-center">
                <XCircle size={60} className="text-red-500 mb-4"/>
                <h3 className="text-2xl font-black text-red-600 uppercase tracking-tighter">Pedido Cancelado</h3>
                <p className="text-gray-500 mt-2">Ponete en contacto con nosotros por WhatsApp.</p>
            </div>
        );
    }

    const Icon = currentStep.icon;

 return (
    <div className="relative h-full flex flex-col justify-between py-4">
        {/* --- CONTENIDO CENTRAL --- */}
        <div className="flex-1 flex flex-col justify-center items-center">
            <div className={`mx-auto w-24 h-24 mb-6 relative`}>
                <div className={`absolute inset-0 rounded-full ${currentStep.color} opacity-20 animate-ping`}></div>
                <div className="relative w-full h-full bg-white rounded-full flex items-center justify-center shadow-xl border-4 border-white text-center">
                    <Icon size={40} className={`${currentStep.textColor}`} />
                </div>
            </div>
            
            <h3 className="text-3xl font-black text-gray-900 tracking-tighter leading-none mb-2 text-center">
                {currentStep.label}
            </h3>
            
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest text-center px-4">
                {currentStep.subLabel}
            </p>
            
            {/* --- BARRA DE PROGRESO (PUNTITOS) --- */}
            <div className="flex gap-1.5 h-1.5 mt-8 px-8 w-full max-w-[280px]">
                {steps.map((step: any, i: number) => (
                    <div 
                        key={step.id} 
                        className={`flex-1 rounded-full transition-all duration-700 ${i <= currentIndex ? step.color : 'bg-gray-100'}`}
                    ></div>
                ))}
            </div>
        </div>

        {/* --- PIE DE PÁGINA: LOGO SNAPPY (RESTAURADO Y CLICKABLE) --- */}
        <div className="mt-8 pt-4 border-t border-gray-50/50">
            <a 
                href="https://snappy.uno" 
                target="_blank" 
                rel="noreferrer" 
                className="flex items-center justify-center gap-1 group no-underline"
            >
                <p className="text-[10px] font-black text-gray-300 group-hover:text-gray-400 transition-colors uppercase tracking-[0.2em]">
                    Potenciado por 
                    <Zap size={12} className="inline ml-1 text-yellow-400 fill-yellow-400 group-hover:scale-110 transition-transform" /> 
                    <span className="ml-0.5">Snappy</span>
                </p>
            </a>
        </div>
    </div>
);
}