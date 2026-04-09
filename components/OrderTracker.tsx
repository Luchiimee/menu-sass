'use client';

import { useEffect, useState, useCallback } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Check, ChefHat, Bike, Clock, XCircle, Zap, MessageCircle, Package, Truck } from 'lucide-react';

interface OrderTrackerProps {
    orderId: string;
    restaurantPhone: string;
    businessType?: string;
    onStatusChange?: (status: string) => void;
}

// 1. EL CLIENTE AFUERA: Evita que se creen múltiples conexiones al re-renderizar
const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function OrderTracker({ orderId, restaurantPhone, businessType = 'gastronomico', onStatusChange }: OrderTrackerProps) {
    const [status, setStatus] = useState('pendiente');

    // 2. FUNCIÓN DE CARGA MANUAL (La hacemos reusable)
    const fetchStatus = useCallback(async () => {
        if (!orderId) return;
        const { data } = await supabase.from('orders').select('status').eq('id', orderId).single();
        if (data && data.status !== status) {
            console.log("Estado sincronizado manualmente:", data.status);
            setStatus(data.status);
            if(onStatusChange) onStatusChange(data.status);
        }
    }, [orderId, onStatusChange, status]);

    useEffect(() => {
        // Carga inicial
        fetchStatus();

        // 3. SINCRONIZADOR DE FOCO: Si el usuario vuelve de WhatsApp, forzamos un refresh
        const handleFocus = () => {
            console.log("El cliente volvió a la pestaña, refrescando estado...");
            fetchStatus();
        };

        window.addEventListener('focus', handleFocus);

        // 4. REALTIME: Escucha cambios mientras la pestaña está activa
        const channel = supabase
            .channel(`order_${orderId}`)
            .on('postgres_changes', { 
                event: 'UPDATE', 
                schema: 'public', 
                table: 'orders', 
                filter: `id=eq.${orderId}` 
            }, 
            (payload) => {
                const newStatus = payload.new.status;
                console.log("Cambio en tiempo real recibido:", newStatus);
                setStatus(newStatus);
                if(onStatusChange) onStatusChange(newStatus);
            })
            .subscribe();

        return () => { 
            supabase.removeChannel(channel); 
            window.removeEventListener('focus', handleFocus);
        };
    }, [orderId, fetchStatus]); // Quitamos supabase de aquí porque ahora es estático

    // --- CONFIGURACIÓN DE PASOS (Igual que antes) ---
    const stepsConfig: any = {
        gastronomico: [
            { id: 'pendiente', label: 'Confirmando...', subLabel: 'El local está revisando tu pedido', icon: Clock, color: 'bg-yellow-500', lightColor: 'bg-yellow-50/50', textColor: 'text-yellow-600' },
            { id: 'en_proceso', label: 'Cocinando 🔥', subLabel: '¡El fuego está prendido!', icon: ChefHat, color: 'bg-orange-500', lightColor: 'bg-orange-50/50', textColor: 'text-orange-600' },
            { id: 'en_camino', label: 'En Camino 🛵', subLabel: 'Tu pedido está llegando', icon: Bike, color: 'bg-blue-600', lightColor: 'bg-blue-50/50', textColor: 'text-blue-600' },
            { id: 'completado', label: '¡Disfrutalo! 🎉', subLabel: 'Pedido entregado con éxito', icon: Check, color: 'bg-green-600', lightColor: 'bg-green-50/50', textColor: 'text-green-600' },
        ],
        fraccionado: [
            { id: 'pendiente', label: 'Recibido ✅', subLabel: 'Estamos procesando tu compra', icon: Clock, color: 'bg-yellow-500', lightColor: 'bg-yellow-50/50', textColor: 'text-yellow-600' },
            { id: 'en_proceso', label: 'Pedido Recibido 📦', subLabel: 'Estamos armando tu paquete', icon: Package, color: 'bg-orange-500', lightColor: 'bg-orange-50/50', textColor: 'text-orange-600' },
            { id: 'en_camino', label: 'Pedido Enviado 🚚', subLabel: 'Tu pedido salió del local', icon: Truck, color: 'bg-blue-600', lightColor: 'bg-blue-50/50', textColor: 'text-blue-600' },
            { id: 'completado', label: '¡Entregado! 🛍️', subLabel: 'Gracias por tu compra', icon: Check, color: 'bg-green-600', lightColor: 'bg-green-50/50', textColor: 'text-green-600' },
        ],
        unidad: [
            { id: 'pendiente', label: 'Recibido ✅', subLabel: 'Estamos procesando tu compra', icon: Clock, color: 'bg-yellow-500', lightColor: 'bg-yellow-50/50', textColor: 'text-yellow-600' },
            { id: 'en_proceso', label: 'Pedido Recibido 📦', subLabel: 'Estamos armando tu paquete', icon: Package, color: 'bg-orange-500', lightColor: 'bg-orange-50/50', textColor: 'text-orange-600' },
            { id: 'en_camino', label: 'Pedido Enviado 🚚', subLabel: 'Tu pedido salió del local', icon: Truck, color: 'bg-blue-600', lightColor: 'bg-blue-50/50', textColor: 'text-blue-600' },
            { id: 'completado', label: '¡Entregado! 🛍️', subLabel: 'Gracias por tu compra', icon: Check, color: 'bg-green-600', lightColor: 'bg-green-50/50', textColor: 'text-green-600' },
        ]
    };

    const steps = stepsConfig[businessType] || stepsConfig.gastronomico;
    const normalizedStatus = status === 'entregado' ? 'completado' : status;
    const currentIndex = steps.findIndex((s: any) => s.id === normalizedStatus);
    const currentStep = steps[currentIndex] || steps[0];

    // --- VISTA DE CANCELADO ---
    if (status === 'cancelado') {
        return (
            <div className="bg-white rounded-t-[2.5rem] md:rounded-[2.5rem] shadow-[0_-10px_40px_rgba(0,0,0,0.15)] overflow-hidden animate-in zoom-in border border-red-100 flex flex-col h-full justify-between">
                <div className="flex-1 flex flex-col justify-center items-center p-8 text-center bg-red-50/30">
                    <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mb-6 shadow-sm border-4 border-white">
                        <XCircle size={48} className="text-red-500"/>
                    </div>
                    <h3 className="text-3xl font-black text-red-600 uppercase tracking-tighter mb-2">Pedido Cancelado</h3>
                    <p className="text-gray-500 font-medium px-4 mb-8 leading-relaxed">Si crees que hubo un problema o fue un error, por favor envianos un mensaje.</p>
                    <a href={`https://wa.me/${restaurantPhone}`} target="_blank" rel="noreferrer" className="bg-red-500 text-white px-8 py-4 rounded-2xl font-bold flex items-center gap-3 hover:bg-red-600 transition-all shadow-lg active:scale-95">
                        <MessageCircle size={24} /> Contactar al Local
                    </a>
                </div>
                <a href="https://snappy.uno" target="_blank" rel="noreferrer" className="block p-4 text-center bg-gray-900 hover:bg-black transition-colors cursor-pointer border-t border-gray-800 no-underline">
                    <p className="text-[10px] font-black text-white flex items-center justify-center gap-1 uppercase tracking-[0.2em]">Potenciado por <Zap size={12} className="text-yellow-400 fill-yellow-400"/> Snappy</p>
                </a>
            </div>
        );
    }

    const Icon = currentStep.icon;

    return (
        <div className="bg-white rounded-t-[2.5rem] md:rounded-[2.5rem] shadow-[0_-10px_40px_rgba(0,0,0,0.15)] overflow-hidden animate-in slide-in-from-bottom-10 border border-gray-50 relative h-full flex flex-col justify-between">
            <div className={`absolute top-0 left-0 w-full h-[40%] ${currentStep.lightColor} transition-colors duration-700 -z-0`}></div>
            <div className="relative p-8 text-center z-10 flex-1 flex flex-col justify-center">
                <div className="relative mx-auto w-28 h-28 mb-6">
                    <div className={`absolute inset-0 rounded-full ${currentStep.color} opacity-20 animate-ping`}></div>
                    <div className={`relative w-full h-full bg-white rounded-full flex items-center justify-center shadow-2xl border-[6px] border-white`}>
                        <Icon size={48} className={`${currentStep.textColor} transition-colors duration-500`} strokeWidth={2.5} />
                    </div>
                </div>
                <h3 className="text-4xl font-black text-gray-900 tracking-tighter mb-2 transition-all duration-300">{currentStep.label}</h3>
                <p className="text-base font-medium text-gray-400 mb-8 uppercase tracking-wide">{currentStep.subLabel}</p>
                <div className="flex gap-2 h-2 mb-2 px-4">
                   {steps.map((step: any, i: number) => (
                        <div key={step.id} className={`flex-1 rounded-full transition-all duration-700 ${i <= currentIndex ? step.color : 'bg-gray-100'}`}></div>
                    ))}
                </div>
            </div>
            <a href="https://snappy.uno" target="_blank" rel="noreferrer" className="block p-4 text-center bg-gray-900 hover:bg-black transition-colors cursor-pointer border-t border-gray-800 no-underline">
                <p className="text-[10px] font-black text-white flex items-center justify-center gap-1 uppercase tracking-[0.2em]">Potenciado por <Zap size={12} className="text-yellow-400 fill-yellow-400"/> Snappy</p>
            </a>
        </div>
    );
}