'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { AlertTriangle, Clock } from 'lucide-react';
import Link from 'next/link';

export default function TrialBanner() {
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  const [hasPlan, setHasPlan] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkTrial = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: rest } = await supabase
        .from('restaurants')
        .select('created_at, subscription_plan')
        .eq('user_id', session.user.id)
        .single();

      if (rest) {
        // Si ya tiene plan "Plus" o "Max", no mostramos banner de prueba
        if (rest.subscription_plan === 'plus' || rest.subscription_plan === 'max') {
          setHasPlan(true);
        } else {
          // Calculamos días restantes
          const created = new Date(rest.created_at);
          const now = new Date();
          const diffTime = Math.abs(now.getTime() - created.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
          const trialDays = 14;
          setDaysLeft(trialDays - diffDays);
        }
      }
      setLoading(false);
    };

    checkTrial();
  }, []);

  if (loading || hasPlan) return null;

  // Si ya se venció (días negativos)
  if (daysLeft !== null && daysLeft <= 0) {
    return (
      <div className="bg-red-600 text-white px-4 py-3 flex justify-between items-center text-sm font-bold shadow-md relative z-50">
        <div className="flex items-center gap-2">
          <AlertTriangle size={18} className="animate-pulse"/>
          <span>Tu periodo de prueba de 14 días ha terminado.</span>
        </div>
        <Link href="/dashboard/settings" className="bg-white text-red-600 px-4 py-1.5 rounded-full hover:bg-gray-100 transition">
          Activar Plan Ahora
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-indigo-600 text-white px-4 py-2 flex flex-col sm:flex-row justify-between items-center text-xs sm:text-sm font-medium relative z-50">
      <div className="flex items-center gap-2 mb-2 sm:mb-0">
        <Clock size={16}/>
        <span>
          Estás disfrutando de tus <strong>14 días gratis</strong>. 
          {daysLeft !== null && ` Te quedan ${daysLeft} días para configurar tu pago.`}
        </span>
      </div>
      <Link href="/dashboard/settings" className="bg-white/20 hover:bg-white/30 text-white border border-white/40 px-3 py-1 rounded-lg transition whitespace-nowrap">
        Elegir Plan
      </Link>
    </div>
  );
}