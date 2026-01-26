'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { CheckCircle2, ChefHat, Bike, Clock, MapPin, XCircle } from 'lucide-react';

export default function OrderTracker({ orderId }: { orderId: string }) {
    const [status, setStatus] = useState('pendiente');
    
    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    useEffect(() => {
        // 1. Carga inicial
        const fetchStatus = async () => {
            const { data } = await supabase.from('orders').select('status').eq('id', orderId).single();
            if (data) setStatus(data.status);
        };
        fetchStatus();

        // 2. Suscripción Realtime
        const channel = supabase
            .channel(`order_${orderId}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` }, 
            (payload) => {
                setStatus(payload.new.status);
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [orderId]);

    // UI del Tracker
    const steps = [
        { id: 'pendiente', label: 'Recibido', icon: Clock, color: 'text-yellow-500', bg: 'bg-yellow-100' },
        { id: 'en_proceso', label: 'Cocinando', icon: ChefHat, color: 'text-orange-500', bg: 'bg-orange-100' },
        { id: 'en_camino', label: 'En Camino', icon: Bike, color: 'text-blue-500', bg: 'bg-blue-100' },
        { id: 'completado', label: 'Entregado', icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-100' },
    ];

    // Encontrar índice actual
    const currentIndex = steps.findIndex(s => s.id === status);
    // Si está cancelado, mostramos algo especial
    if (status === 'cancelado') {
        return (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center animate-in zoom-in">
                <XCircle size={48} className="mx-auto text-red-500 mb-2"/>
                <h3 className="text-xl font-bold text-red-700">Pedido Cancelado</h3>
                <p className="text-sm text-red-500">Contacta al local si crees que es un error.</p>
            </div>
        );
    }

    return (
        <div className="bg-white border rounded-2xl shadow-lg p-6 animate-in slide-in-from-bottom-10">
            <h3 className="text-center font-bold text-lg mb-6">Seguimiento de tu Pedido</h3>
            
            <div className="relative flex justify-between items-start">
                {/* Línea de progreso de fondo */}
                <div className="absolute top-5 left-0 w-full h-1 bg-gray-100 -z-10"></div>
                
                {/* Barra de progreso activa */}
                <div 
                    className="absolute top-5 left-0 h-1 bg-green-500 transition-all duration-1000 -z-0"
                    style={{ width: `${(currentIndex / (steps.length - 1)) * 100}%` }}
                ></div>

                {steps.map((step, i) => {
                    const isActive = i <= currentIndex;
                    const isCurrent = i === currentIndex;
                    
                    return (
                        <div key={step.id} className="flex flex-col items-center gap-2">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 border-4 ${isActive ? 'bg-green-500 text-white border-green-100' : 'bg-white text-gray-300 border-gray-100'} ${isCurrent ? 'scale-110 shadow-lg' : ''}`}>
                                <step.icon size={18} />
                            </div>
                            <span className={`text-[10px] font-bold uppercase transition-colors ${isActive ? 'text-green-600' : 'text-gray-300'}`}>
                                {step.label}
                            </span>
                        </div>
                    );
                })}
            </div>

            <div className="mt-6 text-center p-3 bg-gray-50 rounded-xl border border-dashed text-xs text-gray-500">
                Tu pedido #{orderId.slice(0,4)} se actualiza en tiempo real.
            </div>
        </div>
    );
}