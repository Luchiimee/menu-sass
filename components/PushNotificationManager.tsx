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
          setStatus('ios-install');
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
            <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end justify-center animate-in fade-in">
              <div className="bg-white w-full rounded-t-3xl p-6 pb-10 animate-in slide-in-from-bottom-4 max-w-lg">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-gray-900">Instalar App</h3>
                  <button onClick={() => setShowIOSModal(false)} className="p-2 bg-gray-100 rounded-full">
                    <X size={20} className="text-gray-600" />
                  </button>
                </div>
                <p className="text-sm text-gray-600 mb-6">Para recibir notificaciones en iPhone, instalá la app siguiendo estos pasos:</p>
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl">
                    <div className="bg-blue-100 p-2 rounded-lg"><Share size={20} className="text-blue-600" /></div>
                    <div>
                      <p className="font-bold text-sm text-gray-900">1. Tocá el botón Compartir</p>
                      <p className="text-xs text-gray-500">El ícono de cuadrado con flecha hacia arriba</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl">
                    <div className="bg-green-100 p-2 rounded-lg"><PlusSquare size={20} className="text-green-600" /></div>
                    <div>
                      <p className="font-bold text-sm text-gray-900">2. Agregar a Inicio</p>
                      <p className="text-xs text-gray-500">Buscá "Agregar a pantalla de inicio"</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl">
                    <div className="bg-orange-100 p-2 rounded-lg"><Bell size={20} className="text-orange-600" /></div>
                    <div>
                      <p className="font-bold text-sm text-gray-900">3. Abrí desde el ícono</p>
                      <p className="text-xs text-gray-500">Luego podrás activar las notificaciones</p>
                    </div>
                  </div>
                </div>
                <button onClick={() => setShowIOSModal(false)} className="w-full mt-6 bg-black text-white py-3 rounded-xl font-bold">
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
            : 'bg-gray-100 text-gray-700 border-gray-200'
        }`}
      >
        {isSubscribed ? <Bell size={20} /> : <BellOff size={20} />}
      </button>
    );
  }

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
            <div className="bg-white w-full rounded-2xl p-6 animate-in zoom-in-95 max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-900">Instalar App</h3>
                <button onClick={() => setShowIOSModal(false)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200">
                  <X size={20} className="text-gray-600" />
                </button>
              </div>
              <p className="text-sm text-gray-600 mb-6">Para recibir notificaciones en iPhone/iPad, instalá la app siguiendo estos pasos:</p>
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl">
                  <div className="bg-blue-100 p-2 rounded-lg"><Share size={20} className="text-blue-600" /></div>
                  <div>
                    <p className="font-bold text-sm text-gray-900">1. Tocá el botón Compartir</p>
                    <p className="text-xs text-gray-500">El ícono de cuadrado con flecha hacia arriba</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl">
                  <div className="bg-green-100 p-2 rounded-lg"><PlusSquare size={20} className="text-green-600" /></div>
                  <div>
                    <p className="font-bold text-sm text-gray-900">2. Agregar a Inicio</p>
                    <p className="text-xs text-gray-500">Buscá "Agregar a pantalla de inicio"</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl">
                  <div className="bg-orange-100 p-2 rounded-lg"><Bell size={20} className="text-orange-600" /></div>
                  <div>
                    <p className="font-bold text-sm text-gray-900">3. Abrí desde el ícono</p>
                    <p className="text-xs text-gray-500">Luego podrás activar las notificaciones</p>
                  </div>
                </div>
              </div>
              <button onClick={() => setShowIOSModal(false)} className="w-full mt-6 bg-black text-white py-3 rounded-xl font-bold hover:bg-gray-800 transition">
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
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium transition-all w-full ${
        isSubscribed
          ? 'text-green-700 bg-green-50 hover:bg-green-100'
          : 'text-gray-500 bg-gray-50 hover:bg-gray-100'
      }`}
    >
      {isSubscribed ? <Bell size={16} /> : <BellOff size={16} />}
      <span>{isSubscribed ? 'Notificaciones activas' : 'Activar notificaciones'}</span>
    </button>
  );
}
