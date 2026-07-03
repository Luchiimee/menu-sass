'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { toast } from 'sonner';
import { Loader2, Wallet, Landmark, CreditCard, Percent, Check } from 'lucide-react';
import DeliveryZonesConfig from '@/components/dashboard/DeliveryZonesConfig';

type Tab = 'metodos' | 'descuentos' | 'delivery';

function tabFromParam(param: string | null): Tab {
  if (param === 'delivery') return 'delivery';
  if (param === 'descuentos') return 'descuentos';
  return 'metodos';
}

function PagosContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [loading, setLoading] = useState(true);
  const [restaurant, setRestaurant] = useState<any>({ id: null, subscription_plan: null });
  const [tab, setTab] = useState<Tab>(() => tabFromParam(searchParams.get('tab')));

  const [efectivoEnabled, setEfectivoEnabled] = useState(true);
  const [transferenciaEnabled, setTransferenciaEnabled] = useState(true);
  const [aliasTransferencia, setAliasTransferencia] = useState('');
  const [savingAlias, setSavingAlias] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;

        const { data: rest } = await supabase
          .from('restaurants')
          .select('id, subscription_plan, efectivo_enabled, transferencia_enabled, alias_transferencia')
          .eq('user_id', session.user.id)
          .maybeSingle();

        if (!mounted || !rest) return;

        // Pagos y delivery es exclusivo de los planes GO y Plus
        if (!rest.subscription_plan || rest.subscription_plan === 'light') {
          router.replace('/dashboard');
          return;
        }

        setRestaurant(rest);
        setEfectivoEnabled(rest.efectivo_enabled ?? true);
        setTransferenciaEnabled(rest.transferencia_enabled ?? true);
        setAliasTransferencia(rest.alias_transferencia || '');
      } catch (error) {
        console.error('Error cargando Pagos y delivery:', error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadData();
    return () => { mounted = false; };
  }, []);

  const handleToggleEfectivo = async () => {
    const newValue = !efectivoEnabled;
    setEfectivoEnabled(newValue);
    const { error } = await supabase.from('restaurants').update({ efectivo_enabled: newValue }).eq('id', restaurant.id);
    if (!error) {
      toast.success(newValue ? 'Efectivo activado' : 'Efectivo desactivado', { position: 'bottom-right', duration: 1500 });
    } else {
      setEfectivoEnabled(!newValue);
      toast.error('No se pudo guardar');
    }
  };

  const handleToggleTransferencia = async () => {
    const newValue = !transferenciaEnabled;
    setTransferenciaEnabled(newValue);
    const { error } = await supabase.from('restaurants').update({ transferencia_enabled: newValue }).eq('id', restaurant.id);
    if (!error) {
      toast.success(newValue ? 'Transferencia activada' : 'Transferencia desactivada', { position: 'bottom-right', duration: 1500 });
    } else {
      setTransferenciaEnabled(!newValue);
      toast.error('No se pudo guardar');
    }
  };

  const handleSaveAlias = async () => {
    if (!restaurant.id) return;
    setSavingAlias(true);
    const { error } = await supabase.from('restaurants').update({ alias_transferencia: aliasTransferencia || null }).eq('id', restaurant.id);
    setSavingAlias(false);
    if (!error) toast.success('Alias guardado', { position: 'bottom-right', duration: 1500 });
    else toast.error('No se pudo guardar el alias');
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="animate-spin text-gray-300" size={40} />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-24 px-4 pt-24 md:pt-10 animate-in fade-in duration-500">

      <header className="text-left">
        <h1 className="text-2xl font-black text-gray-900 uppercase italic tracking-tighter">Pagos y Delivery</h1>
      </header>

      {/* TABS */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl w-fit">
        {([
          { id: 'metodos',    label: 'Métodos de pago'   },
          { id: 'descuentos', label: 'Descuentos'        },
          { id: 'delivery',   label: 'Zonas de delivery' },
        ] as const).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wide transition-all ${
              tab === t.id ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB: MÉTODOS DE PAGO ── */}
      {tab === 'metodos' && (
        <div className="max-w-2xl space-y-6">
          <section className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-green-50 p-3 rounded-2xl text-green-600">
                  <Wallet size={24} />
                </div>
                <div>
                  <h2 className="font-bold text-xl text-gray-900">Efectivo</h2>
                  <p className="text-xs text-gray-400 font-medium italic">El cliente paga en mano al recibir o retirar</p>
                </div>
              </div>
              <button
                onClick={handleToggleEfectivo}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${efectivoEnabled ? 'bg-fresco' : 'bg-gray-200'}`}
              >
                <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${efectivoEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          </section>

          <section className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-8 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-brasa/10 p-3 rounded-2xl text-brasa">
                  <Landmark size={24} />
                </div>
                <div>
                  <h2 className="font-bold text-xl text-gray-900">Transferencia bancaria</h2>
                  <p className="text-xs text-gray-400 font-medium italic">El cliente transfiere y te avisa por WhatsApp</p>
                </div>
              </div>
              <button
                onClick={handleToggleTransferencia}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${transferenciaEnabled ? 'bg-brasa' : 'bg-gray-200'}`}
              >
                <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${transferenciaEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>

            {transferenciaEnabled && (
              <div className="pt-4 border-t border-gray-100 space-y-2 animate-in fade-in slide-in-from-top-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Alias para transferencias</label>
                <div className="flex gap-2">
                  <input
                    value={aliasTransferencia}
                    onChange={(e) => setAliasTransferencia(e.target.value)}
                    placeholder="alias.transferencia"
                    className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold outline-none focus:border-brasa transition-colors"
                  />
                  <button
                    onClick={handleSaveAlias}
                    disabled={savingAlias}
                    className="px-5 py-3 bg-gray-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    {savingAlias ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                    Guardar
                  </button>
                </div>
                <p className="text-[10px] text-gray-400 font-medium">Se muestra al cliente cuando confirma el pedido.</p>
              </div>
            )}
          </section>

          <section className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-8">
            <div className="flex items-center gap-4">
              <div className="bg-brasa/10 p-3 rounded-2xl text-brasa">
                <CreditCard size={24} />
              </div>
              <div className="flex-1">
                <h2 className="font-bold text-xl text-gray-900 flex items-center gap-2">
                  Mercado Pago
                  <span className="text-[9px] font-black uppercase tracking-widest bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full">Próximamente</span>
                </h2>
                <p className="text-xs text-gray-400 font-medium italic">Cobros automáticos directo desde el catálogo digital.</p>
              </div>
            </div>
          </section>

          {restaurant.subscription_plan === 'plus' && (
            <section className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-8">
              <div className="flex items-center gap-4">
                <div className="bg-brasa/10 p-3 rounded-2xl text-brasa">
                  <Wallet size={24} />
                </div>
                <div className="flex-1">
                  <h2 className="font-bold text-xl text-gray-900 flex items-center gap-2">
                    Ualá
                    <span className="text-[9px] font-black uppercase tracking-widest bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full">Próximamente</span>
                  </h2>
                  <p className="text-xs text-gray-400 font-medium italic">Cobrá directo a tu cuenta Ualá.</p>
                </div>
              </div>
            </section>
          )}
        </div>
      )}

      {/* ── TAB: DESCUENTOS ── */}
      {tab === 'descuentos' && (
        <div className="max-w-2xl bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-16 text-center">
          <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Percent size={24} className="text-gray-400" />
          </div>
          <p className="font-black text-gray-900 uppercase tracking-tighter text-lg mb-1">Próximamente</p>
          <p className="text-sm text-gray-400 font-medium">La gestión de descuentos y cupones<br />estará disponible en breve.</p>
        </div>
      )}

      {/* ── TAB: ZONAS DE DELIVERY ── */}
      {tab === 'delivery' && (
        <div className="max-w-2xl">
          <DeliveryZonesConfig restaurantId={restaurant.id} />
        </div>
      )}

    </div>
  );
}

export default function PagosPage() {
  return (
    <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><Loader2 className="animate-spin text-gray-300" size={40} /></div>}>
      <PagosContent />
    </Suspense>
  );
}
