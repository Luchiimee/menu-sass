'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Bell, BellOff, Loader2, Download, X, Share, PlusSquare } from 'lucide-react';

export default function PushNotificationManager({ mobile = false }: { mobile?: boolean }) {
  const [status, setStatus] = useState<'loading' | 'ios-install' | 'not-supported' | 'ready'>('loading');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [showIOSModal, setShowIOSModal] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    const init = async () => {
      try {
        const ua = navigator.userAgent;
        const isIOS = /iPad|iPhone|iPod/.test(ua);
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
          (window.navigator as any).standalone === true;

        // iOS necesita PWA instalada para push
      if (isIOS && !isStandalone) {
  setStatus('not-supported');
  return;
}

        // Verificar APIs
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
          setStatus('not-supported');
          return;
        }

        // Sesión
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setStatus('not-supported');
          return;
        }
        setUserId(session.user.id);

        // Service Worker
        const registration = await navigator.serviceWorker.register('/sw.js');
        await navigator.serviceWorker.ready;

        const existing = await registration.pushManager.getSubscription();
        setIsSubscribed(!!existing);
        setStatus('ready');
      } catch (err) {
        console.error('Push init error:', err);
        setStatus('not-supported');
      }
    };

    init();
  }, []);

  const subscribe = async () => {
    if (!userId) return;
    setStatus('loading');

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setStatus('ready');
        return;
      }
new Audio('/pedido.mp3').play().catch(() => console.log("Audio desbloqueado"));
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
      });

      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: subscription.toJSON(), userId }),
      });

      if (res.ok) setIsSubscribed(true);
      setStatus('ready');
    } catch (err) {
      console.error('Subscribe error:', err);
      setStatus('ready');
    }
  };

  const unsubscribe = async () => {
    if (!userId) return;
    setStatus('loading');

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint, userId }),
        });
        await subscription.unsubscribe();
      }

      setIsSubscribed(false);
      setStatus('ready');
    } catch (err) {
      console.error('Unsubscribe error:', err);
      setStatus('ready');
    }
  };

  // No mostrar nada si no hay soporte
  if (status === 'not-supported') return null;

  // MOBILE
  if (mobile) {
    if (status === 'loading') {
      return (
        <div className="p-2 bg-gray-100 rounded-full border border-gray-200">
          <Loader2 size={20} className="animate-spin text-gray-400" />
        </div>
      );
    }

    if (status === 'ios-install') {
      return (
        <>
          <button
            onClick={() => setShowIOSModal(true)}
            className="p-2 bg-orange-50 rounded-full border border-orange-200 active:scale-95 transition"
          >
            <Download size={20} className="text-orange-500" />
          </button>
          {showIOSModal && (
            <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
              <div className="bg-white rounded-2xl p-5 animate-in zoom-in-95 max-w-xs w-full">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-base font-bold text-gray-900">Instalar App</h3>
                  <button onClick={() => setShowIOSModal(false)} className="p-1.5 bg-gray-100 rounded-full">
                    <X size={18} className="text-gray-600" />
                  </button>
                </div>
                <p className="text-xs text-gray-600 mb-4">Para recibir notificaciones, instalá la app:</p>
                <div className="space-y-2.5">
                  <div className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-xl">
                    <div className="bg-blue-100 p-1.5 rounded-lg"><Share size={16} className="text-blue-600" /></div>
                    <div>
                      <p className="font-bold text-xs text-gray-900">1. Tocá Compartir</p>
                      <p className="text-[10px] text-gray-500">Ícono de cuadrado con flecha</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-xl">
                    <div className="bg-green-100 p-1.5 rounded-lg"><PlusSquare size={16} className="text-green-600" /></div>
                    <div>
                      <p className="font-bold text-xs text-gray-900">2. Agregar a Inicio</p>
                      <p className="text-[10px] text-gray-500">"Agregar a pantalla de inicio"</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-xl">
                    <div className="bg-orange-100 p-1.5 rounded-lg"><Bell size={16} className="text-orange-600" /></div>
                    <div>
                      <p className="font-bold text-xs text-gray-900">3. Abrí desde el ícono</p>
                      <p className="text-[10px] text-gray-500">Activá las notificaciones</p>
                    </div>
                  </div>
                </div>
                <button onClick={() => setShowIOSModal(false)} className="w-full mt-4 bg-black text-white py-2.5 rounded-xl font-bold text-sm">
                  Entendido
                </button>
              </div>
            </div>
          )}
        </>
      );
    }

   return (
      <button
        onClick={isSubscribed ? unsubscribe : subscribe}
        className={`p-2 rounded-full transition active:scale-95 border ${
          isSubscribed
            ? 'bg-green-50 text-green-700 border-green-200'
            : 'bg-red-50 text-red-600 border-red-200 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.4)]'
        }`}
      >
        {isSubscribed ? <Bell size={20} /> : <BellOff size={20} className="animate-bounce" />}
      </button>
    );
  }

  // DESKTOP
  // DESKTOP
  if (status === 'loading') {
    return (
      <div className="flex items-center gap-2 px-4 py-2 text-xs text-gray-400">
        <Loader2 size={14} className="animate-spin" />
        <span>Cargando...</span>
      </div>
    );
  }

  if (status === 'ios-install') {
    return (
      <>
        <button
          onClick={() => setShowIOSModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium bg-orange-50 text-orange-700 w-full hover:bg-orange-100 transition"
        >
          <Download size={16} />
          <span>Instala la app para notificaciones</span>
        </button>
        {showIOSModal && (
          <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl p-5 animate-in zoom-in-95 max-w-xs w-full">
              {/* ... todo el contenido del modal que ya tenías queda igual ... */}
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-base font-bold text-gray-900">Instalar App</h3>
                <button onClick={() => setShowIOSModal(false)} className="p-1.5 bg-gray-100 rounded-full hover:bg-gray-200">
                  <X size={18} className="text-gray-600" />
                </button>
              </div>
              <p className="text-xs text-gray-600 mb-4">Para recibir notificaciones, instalá la app:</p>
              <div className="space-y-2.5">
                <div className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-xl">
                  <div className="bg-blue-100 p-1.5 rounded-lg"><Share size={16} className="text-blue-600" /></div>
                  <div>
                    <p className="font-bold text-xs text-gray-900">1. Tocá Compartir</p>
                    <p className="text-[10px] text-gray-500">Ícono de cuadrado con flecha</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-xl">
                  <div className="bg-green-100 p-1.5 rounded-lg"><PlusSquare size={16} className="text-green-600" /></div>
                  <div>
                    <p className="font-bold text-xs text-gray-900">2. Agregar a Inicio</p>
                    <p className="text-[10px] text-gray-500">"Agregar a pantalla de inicio"</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-xl">
                  <div className="bg-orange-100 p-1.5 rounded-lg"><Bell size={16} className="text-orange-600" /></div>
                  <div>
                    <p className="font-bold text-xs text-gray-900">3. Abrí desde el ícono</p>
                    <p className="text-[10px] text-gray-500">Activá las notificaciones</p>
                  </div>
                </div>
              </div>
              <button onClick={() => setShowIOSModal(false)} className="w-full mt-4 bg-black text-white py-2.5 rounded-xl font-bold text-sm hover:bg-gray-800 transition">
                Entendido
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // --- ESTE ES EL BOTÓN FINAL PARA DESKTOP ---
return (
    <button
      onClick={isSubscribed ? unsubscribe : subscribe}
      className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all w-full border ${
        isSubscribed
          ? 'text-green-700 bg-green-50 border-green-100 hover:bg-green-100'
          : 'text-red-600 bg-red-50 border-red-100 hover:bg-red-200 animate-pulse ring-2 ring-red-500/20'
      }`}
    >
      <div className="flex-shrink-0">
        {isSubscribed ? (
          <Bell size={14} fill="currentColor" />
        ) : (
          <BellOff size={14} className="text-red-600 animate-bounce" />
        )}
      </div>
      
      {/* Texto más chico y en una sola línea */}
      <span className="uppercase tracking-tighter text-[9px] font-black whitespace-nowrap overflow-hidden text-ellipsis">
        {isSubscribed ? 'Notificaciones On' : 'Activar Notificación'}
      </span>
    </button>
  );
}