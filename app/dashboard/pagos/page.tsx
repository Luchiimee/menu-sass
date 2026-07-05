'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { toast } from 'sonner';
import {
  Loader2, Wallet, Landmark, CreditCard, Percent, Check, X, Trash2, Pencil, Zap, Lightbulb,
} from 'lucide-react';
import DeliveryZonesConfig from '@/components/dashboard/DeliveryZonesConfig';

type Tab = 'metodos' | 'descuentos' | 'delivery';
type DiscountType = 'envio_gratis' | 'porcentaje' | 'porcentaje_envio_gratis' | 'efectivo';

const DISCOUNT_TYPES: { id: DiscountType; label: string; emoji: string }[] = [
  { id: 'envio_gratis',             label: 'Envío gratis',        emoji: '🛵' },
  { id: 'porcentaje',               label: '% de descuento',      emoji: '🏷️' },
  { id: 'porcentaje_envio_gratis',  label: '% + envío gratis',    emoji: '🎁' },
  { id: 'efectivo',                 label: 'Pago en efectivo',    emoji: '💵' },
];

function tabFromParam(param: string | null): Tab {
  if (param === 'delivery') return 'delivery';
  if (param === 'descuentos') return 'descuentos';
  return 'metodos';
}

function ruleDescription(rule: any): string {
  const monto = rule.monto_minimo != null ? Number(rule.monto_minimo).toLocaleString('es-AR') : null;
  switch (rule.tipo as DiscountType) {
    case 'envio_gratis':
      return `Envío gratis en compras desde $${monto}`;
    case 'porcentaje':
      return `${rule.porcentaje}% de descuento en compras desde $${monto}`;
    case 'porcentaje_envio_gratis':
      return `${rule.porcentaje}% de descuento + envío gratis desde $${monto}`;
    case 'efectivo':
      return `${rule.porcentaje}% de descuento pagando en efectivo`;
    default:
      return DISCOUNT_TYPES.find(t => t.id === rule.tipo)?.label || rule.tipo;
  }
}

function ruleChips(rule: any): string[] {
  const chips: string[] = [];
  if (rule.monto_minimo != null) chips.push(`Mín. $${Number(rule.monto_minimo).toLocaleString('es-AR')}`);
  if (rule.porcentaje != null) chips.push(`${rule.porcentaje}% OFF`);
  if (rule.tipo === 'envio_gratis' || rule.tipo === 'porcentaje_envio_gratis') chips.push('Envío gratis');
  if (rule.tipo === 'efectivo') chips.push('Solo efectivo');
  if (rule.tipo !== 'efectivo' && rule.acumulable_efectivo) chips.push('+ acumulable con efectivo');
  if (rule.gana_si_no_acumula) chips.push('Gana si hay conflicto');
  return chips;
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${checked ? 'bg-fresco' : 'bg-border'}`}
    >
      <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );
}

function CardHeader({ icon, title, subtitle, badge, action }: { icon: React.ReactNode; title: string; subtitle: string; badge?: string; action?: React.ReactNode }) {
  return (
    <div className="bg-surface px-6 py-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-fresco shrink-0">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="font-bold text-ink flex items-center gap-2">
          {title}
          {badge && (
            <span className="text-[9px] font-black uppercase tracking-widest bg-white text-graphite px-2 py-0.5 rounded-full shrink-0">
              {badge}
            </span>
          )}
        </h3>
        <p className="text-xs text-graphite">{subtitle}</p>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

function PagosContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [loading, setLoading] = useState(true);
  const [isLocked, setIsLocked] = useState(true);
  const [restaurant, setRestaurant] = useState<any>({ id: null, subscription_plan: null });
  const [tab, setTab] = useState<Tab>(() => tabFromParam(searchParams.get('tab')));

  const [efectivoEnabled, setEfectivoEnabled] = useState(true);
  const [transferenciaEnabled, setTransferenciaEnabled] = useState(true);
  const [aliasTransferencia, setAliasTransferencia] = useState('');
  const [savingAlias, setSavingAlias] = useState(false);

  const [rules, setRules] = useState<any[]>([]);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [savingRule, setSavingRule] = useState(false);
  const [deletingRuleId, setDeletingRuleId] = useState<string | null>(null);
  const [newRule, setNewRule] = useState({
    tipo: 'envio_gratis' as DiscountType,
    monto_minimo: '',
    porcentaje: '',
    acumulable_efectivo: false,
    gana_si_no_acumula: false,
  });

  const hasActiveEfectivoRule = rules.some(r => r.tipo === 'efectivo' && r.id !== editingRuleId);

  const [showConflictConfirm, setShowConflictConfirm] = useState(false);
  const [conflictingRule, setConflictingRule] = useState<any>(null);

  // El conflicto de "gana_si_no_acumula" solo existe entre una regla de monto
  // y la regla de efectivo — nunca entre dos reglas del mismo lado.
  const findConflictingRule = (tipo: DiscountType) => {
    const isOpponent = tipo === 'efectivo'
      ? (r: any) => r.tipo !== 'efectivo'
      : (r: any) => r.tipo === 'efectivo';
    return rules.find(r => r.gana_si_no_acumula && r.id !== editingRuleId && isOpponent(r));
  };

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

        // Pagos y delivery es exclusivo de los planes GO y Plus — sin excepción para admins
        const locked = !rest.subscription_plan || rest.subscription_plan === 'light';
        setIsLocked(locked);
        setRestaurant(rest);
        if (locked) return;

        setEfectivoEnabled(rest.efectivo_enabled ?? true);
        setTransferenciaEnabled(rest.transferencia_enabled ?? true);
        setAliasTransferencia(rest.alias_transferencia || '');

        const { data: rulesData } = await supabase
          .from('discount_rules')
          .select('*')
          .eq('restaurant_id', rest.id)
          .eq('activo', true)
          .order('created_at', { ascending: true });

        if (mounted) setRules(rulesData || []);
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

  const closeRuleModal = () => {
    setShowRuleModal(false);
    setEditingRuleId(null);
    setNewRule({ tipo: 'envio_gratis', monto_minimo: '', porcentaje: '', acumulable_efectivo: false, gana_si_no_acumula: false });
  };

  const handleOpenEdit = (rule: any) => {
    setNewRule({
      tipo: rule.tipo,
      monto_minimo: rule.monto_minimo != null ? String(rule.monto_minimo) : '',
      porcentaje: rule.porcentaje != null ? String(rule.porcentaje) : '',
      acumulable_efectivo: !!rule.acumulable_efectivo,
      gana_si_no_acumula: !!rule.gana_si_no_acumula,
    });
    setEditingRuleId(rule.id);
    setShowRuleModal(true);
  };

  const handleToggleGanaSiNoAcumula = () => {
    if (!newRule.gana_si_no_acumula) {
      const conflict = findConflictingRule(newRule.tipo);
      if (conflict) {
        setConflictingRule(conflict);
        setShowConflictConfirm(true);
        return;
      }
    }
    setNewRule(r => ({ ...r, gana_si_no_acumula: !r.gana_si_no_acumula }));
  };

  const handleConfirmConflict = () => {
    setNewRule(r => ({ ...r, gana_si_no_acumula: true }));
    setShowConflictConfirm(false);
    setConflictingRule(null);
  };

  const handleCancelConflict = () => {
    setShowConflictConfirm(false);
    setConflictingRule(null);
  };

  const handleSaveRule = async () => {
    if (newRule.tipo !== 'efectivo' && !newRule.monto_minimo) {
      toast.error('Ingresá el monto mínimo de compra');
      return;
    }
    if (newRule.tipo !== 'envio_gratis' && !newRule.porcentaje) {
      toast.error('Ingresá el porcentaje de descuento');
      return;
    }

    // Acotamos el UPDATE del servidor a la categoría opuesta (monto vs. efectivo),
    // para no tocar reglas sin relación con este conflicto puntual.
    const isOpponent = newRule.tipo === 'efectivo'
      ? (r: any) => r.tipo !== 'efectivo'
      : (r: any) => r.tipo === 'efectivo';

    setSavingRule(true);
    const payload = {
      tipo: newRule.tipo,
      monto_minimo: newRule.tipo === 'efectivo' ? null : Number(newRule.monto_minimo),
      porcentaje: newRule.tipo === 'envio_gratis' ? null : Number(newRule.porcentaje),
      acumulable_efectivo: hasActiveEfectivoRule ? newRule.acumulable_efectivo : false,
      gana_si_no_acumula: newRule.gana_si_no_acumula,
    };

    // Solo una regla puede ganar en caso de conflicto — si esta se marca, se
    // desmarca la del lado opuesto (server-side, no solo en el form).
    if (payload.gana_si_no_acumula) {
      let clearQuery = supabase
        .from('discount_rules')
        .update({ gana_si_no_acumula: false })
        .eq('restaurant_id', restaurant.id)
        .eq('activo', true);
      clearQuery = newRule.tipo === 'efectivo'
        ? clearQuery.neq('tipo', 'efectivo')
        : clearQuery.eq('tipo', 'efectivo');
      if (editingRuleId) clearQuery = clearQuery.neq('id', editingRuleId);
      await clearQuery;
    }

    const { data, error } = editingRuleId
      ? await supabase.from('discount_rules').update(payload).eq('id', editingRuleId).select().single()
      : await supabase.from('discount_rules').insert({ restaurant_id: restaurant.id, ...payload }).select().single();
    setSavingRule(false);

    if (error || !data) {
      toast.error(editingRuleId ? 'No se pudo actualizar la regla' : 'No se pudo guardar la regla');
      return;
    }

    setRules(prev => {
      const cleared = payload.gana_si_no_acumula
        ? prev.map(r => (isOpponent(r) ? { ...r, gana_si_no_acumula: false } : r))
        : prev;
      return editingRuleId ? cleared.map(r => r.id === data.id ? data : r) : [...cleared, data];
    });
    closeRuleModal();
    toast.success(editingRuleId ? 'Regla actualizada' : 'Regla creada');
  };

  const handleDeleteRule = async (id: string) => {
    setDeletingRuleId(id);
    const { error } = await supabase.from('discount_rules').update({ activo: false }).eq('id', id);
    setDeletingRuleId(null);
    if (error) {
      toast.error('No se pudo eliminar la regla');
      return;
    }
    setRules(prev => prev.filter(r => r.id !== id));
    toast.success('Regla eliminada');
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="animate-spin text-gray-300" size={40} />
      </div>
    );
  }

  return (
    <div className="bg-paper -m-4 lg:-m-10 p-4 lg:p-10 min-h-[calc(100vh-64px)] lg:min-h-[calc(100vh-0px)] relative">

      {isLocked && (
        <div className="fixed inset-0 z-[150] backdrop-blur-sm bg-white/60 flex items-center justify-center p-4">
          <div className="bg-white shadow-2xl p-10 rounded-[2.5rem] max-w-md w-full text-center border border-border relative animate-in zoom-in-95">
            <button onClick={() => router.push('/dashboard')} className="absolute top-6 right-6 p-2 bg-surface hover:bg-border rounded-full transition-colors">
              <X size={20} className="text-graphite" />
            </button>
            <div className="mx-auto w-16 h-16 bg-fresco/10 rounded-full flex items-center justify-center mb-5 text-fresco">
              <Wallet size={32} />
            </div>
            <h2 className="text-2xl font-black mb-2 tracking-tight uppercase italic text-ink">Pagos y Delivery</h2>
            <p className="text-graphite mb-8 text-sm font-medium">Esta sección es exclusiva de los planes <b>GO</b> y <b>Plus</b>.</p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => router.push('/dashboard/plan')}
                className="w-full py-4 rounded-2xl font-bold bg-fresco text-white hover:bg-fresco/90 transition shadow-lg uppercase text-xs tracking-widest flex items-center justify-center gap-2"
              >
                Ver planes <Zap size={18} fill="currentColor" />
              </button>
              <button onClick={() => router.push('/dashboard')} className="text-[10px] font-black text-graphite uppercase tracking-widest mt-2 hover:text-ink transition">
                Volver al inicio
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={`max-w-4xl mx-auto space-y-8 pb-24 transition-all duration-500 ${isLocked ? 'blur-sm pointer-events-none opacity-50 select-none overflow-hidden h-screen' : ''}`}>

        <header className="text-left">
          <h1 className="text-2xl font-black text-ink uppercase tracking-tight">Pagos y Delivery</h1>
        </header>

        {/* TABS */}
        <div className="flex gap-1 bg-white border border-border p-1 rounded-2xl w-fit">
          {([
            { id: 'metodos',    label: 'Métodos de pago'   },
            { id: 'descuentos', label: 'Descuentos'        },
            { id: 'delivery',   label: 'Zonas de delivery' },
          ] as const).map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wide transition-all ${
                tab === t.id ? 'bg-ink text-white' : 'text-graphite hover:text-ink'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── TAB: MÉTODOS DE PAGO ── */}
        {tab === 'metodos' && (
          <div className="space-y-6">
            <div className="bg-white border border-border rounded-2xl shadow-sm overflow-hidden">
              <CardHeader
                icon={<Wallet size={20} />}
                title="Efectivo"
                subtitle="El cliente paga en mano al recibir o retirar"
                action={<ToggleSwitch checked={efectivoEnabled} onChange={handleToggleEfectivo} />}
              />
            </div>

            <div className="bg-white border border-border rounded-2xl shadow-sm overflow-hidden">
              <CardHeader
                icon={<Landmark size={20} />}
                title="Transferencia bancaria"
                subtitle="El cliente transfiere y te avisa por WhatsApp"
                action={<ToggleSwitch checked={transferenciaEnabled} onChange={handleToggleTransferencia} />}
              />

              {transferenciaEnabled && (
                <div className="px-6 py-5 border-t border-border/60 space-y-2 animate-in fade-in slide-in-from-top-2">
                  <label className="text-[10px] font-black text-graphite uppercase tracking-widest">Alias para transferencias</label>
                  <div className="flex gap-2">
                    <input
                      value={aliasTransferencia}
                      onChange={(e) => setAliasTransferencia(e.target.value)}
                      placeholder="alias.transferencia"
                      className="flex-1 px-4 py-3 bg-surface border border-border rounded-2xl text-sm font-bold outline-none focus:border-fresco transition-colors text-ink"
                    />
                    <button
                      onClick={handleSaveAlias}
                      disabled={savingAlias}
                      className="px-5 py-3 bg-ink text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                      {savingAlias ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                      Guardar
                    </button>
                  </div>
                  <p className="text-[10px] text-graphite font-medium">Se muestra al cliente cuando confirma el pedido.</p>
                </div>
              )}
            </div>

            <div className="bg-white border border-border rounded-2xl shadow-sm overflow-hidden opacity-60">
              <CardHeader
                icon={<CreditCard size={20} />}
                title="Mercado Pago"
                subtitle="Cobros automáticos directo desde el catálogo digital."
                badge="Próximamente"
              />
            </div>

            {restaurant.subscription_plan === 'plus' && (
              <div className="bg-white border border-border rounded-2xl shadow-sm overflow-hidden opacity-60">
                <CardHeader
                  icon={<Wallet size={20} />}
                  title="Ualá"
                  subtitle="Cobrá directo a tu cuenta Ualá."
                  badge="Próximamente"
                />
              </div>
            )}
          </div>
        )}

        {/* ── TAB: DESCUENTOS ── */}
        {tab === 'descuentos' && (
          <div className="bg-white border border-border rounded-2xl shadow-sm overflow-hidden">
            <div className="bg-surface px-6 py-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-fresco shrink-0">
                  <Percent size={20} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-ink">Reglas de descuento</h3>
                  <p className="text-xs text-graphite">Envío gratis, porcentajes y combinaciones</p>
                </div>
              </div>
              <button
                onClick={() => setShowRuleModal(true)}
                className="px-4 py-2.5 bg-ink text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-colors shrink-0"
              >
                + Agregar regla
              </button>
            </div>

            <div className="p-6 space-y-3">
              {rules.length === 0 ? (
                <p className="text-sm text-graphite text-center py-10">Todavía no creaste ninguna regla de descuento.</p>
              ) : (
                rules.map(rule => (
                  <div key={rule.id} className="flex items-center justify-between gap-4 p-4 bg-surface/60 border border-border rounded-xl">
                    <div className="space-y-2 min-w-0">
                      <p className="text-sm font-bold text-ink">{ruleDescription(rule)}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {ruleChips(rule).map((chip, i) => (
                          <span key={i} className="text-[10px] font-bold text-graphite bg-white px-2 py-1 rounded-full border border-border">
                            {chip}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleOpenEdit(rule)}
                        className="p-2.5 text-graphite hover:bg-surface rounded-xl transition-colors"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteRule(rule.id)}
                        disabled={deletingRuleId === rule.id}
                        className="p-2.5 text-alert hover:bg-alert/10 rounded-xl transition-colors disabled:opacity-40"
                      >
                        {deletingRuleId === rule.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ── TAB: ZONAS DE DELIVERY ── */}
        {tab === 'delivery' && (
          <DeliveryZonesConfig restaurantId={restaurant.id} />
        )}

      </div>

      {/* MODAL: NUEVA REGLA DE DESCUENTO */}
      {showRuleModal && (
        <div className="fixed inset-0 z-[1000] bg-ink/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-[2rem] shadow-2xl max-w-md w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-lg text-ink uppercase tracking-tight">{editingRuleId ? 'Editar regla' : 'Nueva regla'}</h3>
              <button onClick={closeRuleModal} className="p-1.5 rounded-full hover:bg-surface transition-colors">
                <X size={20} className="text-graphite" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {DISCOUNT_TYPES.map(t => (
                <button
                  key={t.id}
                  onClick={() => setNewRule(r => ({ ...r, tipo: t.id }))}
                  className={`p-4 rounded-2xl border-2 text-center transition-all ${
                    newRule.tipo === t.id ? 'border-fresco bg-fresco/10' : 'border-border bg-white hover:bg-surface'
                  }`}
                >
                  <div className="text-2xl mb-1">{t.emoji}</div>
                  <div className="text-[11px] font-bold text-ink leading-tight">{t.label}</div>
                </button>
              ))}
            </div>

            {newRule.tipo !== 'efectivo' && (
              <div className="space-y-1">
                <label className="text-[10px] font-black text-graphite uppercase tracking-widest">Monto mínimo de compra</label>
                <input
                  type="number"
                  value={newRule.monto_minimo}
                  onChange={(e) => setNewRule(r => ({ ...r, monto_minimo: e.target.value }))}
                  placeholder="0"
                  className="w-full px-4 py-3 bg-surface border border-border rounded-2xl text-sm font-bold outline-none focus:border-fresco transition-colors text-ink"
                />
              </div>
            )}

            {newRule.tipo !== 'envio_gratis' && (
              <div className="space-y-1">
                <label className="text-[10px] font-black text-graphite uppercase tracking-widest">Porcentaje de descuento</label>
                <input
                  type="number"
                  value={newRule.porcentaje}
                  onChange={(e) => setNewRule(r => ({ ...r, porcentaje: e.target.value }))}
                  placeholder="10"
                  className="w-full px-4 py-3 bg-surface border border-border rounded-2xl text-sm font-bold outline-none focus:border-fresco transition-colors text-ink"
                />
              </div>
            )}

            <div className="flex items-center justify-between p-4 bg-surface rounded-2xl">
              <div>
                <p className="text-sm font-bold text-ink">Esta regla gana si hay conflicto</p>
                <p className="text-[10px] text-graphite">Si no se acumula con la otra regla activa, esta se aplica y la otra se descarta.</p>
              </div>
              <ToggleSwitch
                checked={newRule.gana_si_no_acumula}
                onChange={handleToggleGanaSiNoAcumula}
              />
            </div>

            {hasActiveEfectivoRule ? (
              <div className="flex items-center justify-between p-4 bg-surface rounded-2xl">
                <div>
                  <p className="text-sm font-bold text-ink">Aplicar descuento por efectivo</p>
                  <p className="text-[10px] text-graphite">También se acumula si el cliente paga en efectivo</p>
                </div>
                <ToggleSwitch
                  checked={newRule.acumulable_efectivo}
                  onChange={() => setNewRule(r => ({ ...r, acumulable_efectivo: !r.acumulable_efectivo }))}
                />
              </div>
            ) : (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl flex gap-2.5">
                <Lightbulb size={16} className="text-blue-500 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700 leading-relaxed">
                  Creá una regla de tipo <b>Pago en efectivo</b> para poder decidir si tus otras reglas también se acumulan con ese descuento.
                </p>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button onClick={closeRuleModal} className="flex-1 py-3.5 rounded-2xl border border-border text-graphite font-black text-xs uppercase tracking-widest hover:bg-surface transition-colors">
                Cancelar
              </button>
              <button
                onClick={handleSaveRule}
                disabled={savingRule}
                className="flex-1 py-3.5 rounded-2xl bg-ink text-white font-black text-xs uppercase tracking-widest hover:bg-black transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {savingRule ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                {editingRuleId ? 'Guardar cambios' : 'Guardar regla'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRMAR CONFLICTO gana_si_no_acumula */}
      {showConflictConfirm && conflictingRule && (
        <div className="fixed inset-0 z-[1100] bg-ink/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-[2rem] shadow-2xl max-w-sm w-full p-6 space-y-5 animate-in zoom-in-95">
            <h3 className="font-black text-lg text-ink uppercase tracking-tight">Confirmar cambio</h3>
            <p className="text-sm text-graphite leading-relaxed">
              Ya tenés otra regla que gana en caso de conflicto ("<b>{ruleDescription(conflictingRule)}</b>"). Si continuás, se desactivará esa regla y quedará activada esta.
            </p>
            <div className="flex gap-2 pt-2">
              <button onClick={handleCancelConflict} className="flex-1 py-3.5 rounded-2xl border border-border text-graphite font-black text-xs uppercase tracking-widest hover:bg-surface transition-colors">
                Cancelar
              </button>
              <button onClick={handleConfirmConflict} className="flex-1 py-3.5 rounded-2xl bg-ink text-white font-black text-xs uppercase tracking-widest hover:bg-black transition-colors">
                Continuar
              </button>
            </div>
          </div>
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
