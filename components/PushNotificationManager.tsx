'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Bell, BellOff, Loader2, Download } from 'lucide-react';

export default function PushNotificationManager({ mobile = false }: { mobile?: boolean }) {
  const [status, setStatus] = useState<'loading' | 'ios-install' | 'not-supported' | 'ready'>('loading');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

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
        <div
          className="p-2 bg-orange-50 rounded-full border border-orange-200"
          title="Abre en Safari e instala la app para notificaciones"
        >
          <Download size={20} className="text-orange-500" />
        </div>
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
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium bg-orange-50 text-orange-700 w-full">
        <Download size={16} />
        <span>Instala la app para notificaciones</span>
      </div>
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
