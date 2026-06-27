'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';

import { createBrowserClient } from '@supabase/ssr';
import { toast } from 'sonner';
import {
  Loader2, Clock, Lock, Check, Mail, AlertTriangle,
  LogOut, Trash2, ChevronDown, ChevronUp, X, Zap,
  Printer, Wifi, WifiOff, RefreshCw, Download, FlaskConical,
} from 'lucide-react';

const DAYS = [
  { key: 'monday', label: 'Lunes' },
  { key: 'tuesday', label: 'Martes' },
  { key: 'wednesday', label: 'Miércoles' },
  { key: 'thursday', label: 'Jueves' },
  { key: 'friday', label: 'Viernes' },
  { key: 'saturday', label: 'Sábado' },
  { key: 'sunday', label: 'Domingo' },
];

function SettingsContent() {
  const router = useRouter(); 
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // --- ESTADOS ---
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [showHours, setShowHours] = useState(false);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailUpdateLoading, setEmailUpdateLoading] = useState(false);
  const [profile, setProfile] = useState({ email: '' });
  const [restaurant, setRestaurant] = useState<any>({ id: null, business_hours: {}, subscription_plan: null });

  const [settingsTab, setSettingsTab] = useState<'seguridad' | 'horarios' | 'impresoras' | 'integraciones'>('seguridad');

  // --- QZ TRAY ---
  const [qzStatus, setQzStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [availablePrinters, setAvailablePrinters] = useState<string[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState('');
  const [thermalEnabled, setThermalEnabled] = useState(false);
  const [savingPrinter, setSavingPrinter] = useState(false);
  const [testPrinting, setTestPrinting] = useState(false);
  const [thermalPaperWidth, setThermalPaperWidth] = useState('80mm');

 useEffect(() => {
    let mounted = true;

    const loadData = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) return;
            
            setUserId(session.user.id);
            // ✅ Siempre usamos el mail que viene directamente del user de la sesión
            setProfile({ email: session.user.email || '' });

            const { data: restData } = await supabase
                .from('restaurants')
                .select('*')
                .eq('user_id', session.user.id)
                .maybeSingle();
            
            if (mounted && restData) {
                setRestaurant({ ...restData, business_hours: restData.business_hours || {} });
                setThermalEnabled(!!restData.thermal_printing_enabled);
                setSelectedPrinter(restData.thermal_printer_name ?? '');
                setThermalPaperWidth(localStorage.getItem('thermal_paper_width') || '80mm');
            }
        } catch (error) { 
            console.error("Error:", error); 
        } finally { 
            if (mounted) setLoading(false); 
        }
    };

    loadData();

    // 🔥 LA CLAVE: Escuchar cambios en la sesión
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'USER_UPDATED' || event === 'SIGNED_IN') {
            loadData(); // Recarga los datos cuando Supabase confirma el cambio
        }
    });

    return () => { 
        mounted = false; 
        subscription.unsubscribe();
    };
}, []);

  // Auto-reconectar a QZ Tray si thermal_printing_enabled está activo en DB.
  // Se dispara cuando: (1) el script cargó, (2) thermalEnabled=true (leído de DB),
  // (3) aún no estamos conectados. Sin esta condición triple, conectaría
  // aunque el usuario haya desactivado el toggle o ya esté conectado.
  useEffect(() => {
    if (!thermalEnabled) return;
    const tryConnect = () => {
      if ((window as any).qz && qzStatus === 'idle') connectQZ();
    };
    if ((window as any).qz) { tryConnect(); return; }
    window.addEventListener('qz-ready', tryConnect, { once: true });
    return () => window.removeEventListener('qz-ready', tryConnect);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thermalEnabled]);

  // --- FUNCIONES DE CUENTA ---
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const handlePasswordReset = async () => {
      if (!profile.email) return toast.error("No hay un correo asociado");
      const { error } = await supabase.auth.resetPasswordForEmail(profile.email, { 
          redirectTo: `${window.location.origin}/auth/callback?next=/dashboard/settings/new-password` 
      });
      if (error) toast.error("Error al enviar el correo");
      else toast.success("¡Correo enviado! Revisá tu bandeja de entrada.");
  };

  const [isPending, setIsPending] = useState(false);

  const handleUpdateEmail = async () => {
    if (!newEmail || newEmail === profile.email) return toast.error("Ingresá un email nuevo.");
    
    setEmailUpdateLoading(true);
    // Supabase envía el mail automáticamente al ejecutar esto
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    
    if (error) {
        toast.error(`Error: ${error.message}`);
    } else {
        // Mensaje corregido: Solo confirmar en el nuevo
        toast.success("Confirmá el link que enviamos a tu nuevo correo ✉️");
        setIsPending(true); // Activamos el estado de pendiente
        setIsEditingEmail(false);
    }
    setEmailUpdateLoading(false);
};

// Nueva función para reenviar
const handleResendEmail = () => {
    handleUpdateEmail(); // Simplemente volvemos a disparar la función
    toast.info("Link reenviado. Revisá el SPAM por las dudas.");
};

 const handleDeleteAccount = async () => {
    const confirm1 = confirm("⚠️ ¿ESTÁS SEGURO?\n\nSe borrará tu menú y se cancelará tu suscripción permanentemente.");
    if (!confirm1) return;
    
    const confirm2 = confirm("ESTA ACCIÓN ES IRREVERSIBLE.\n\n¿Realmente deseás eliminar absolutamente todos tus datos?");
    if (!confirm2) return;

    setLoading(true);
    try {
        const response = await fetch('/api/user/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId })
        });

        if (response.ok) {
            toast.success("Cuenta eliminada con éxito.");
            // Forzamos el cierre de sesión local y redirigimos
            await supabase.auth.signOut();
            router.push('/login');
        } else {
            throw new Error("Fallo en el servidor");
        }
    } catch (err) {
        toast.error("Hubo un error al intentar eliminar la cuenta.");
    } finally {
        setLoading(false);
    }
};
// --- FUNCIONES DE SUSCRIPCIÓN (Mercado Pago) ---
  const handleTogglePause = async () => {
    if (!restaurant.mp_preapproval_id) return;
    const isPausing = restaurant.subscription_status !== 'paused';
    
    const confirmMsg = isPausing 
      ? "⏸️ ¿PAUSAR COBROS?\n\nTu menú se ocultará y no se realizarán cobros hasta que lo reactives." 
      : "▶️ ¿REANUDAR COBROS?\n\nSe reactivará la visibilidad de tu menú y los cobros mensuales.";

    if (!confirm(confirmMsg)) return;

    setLoading(true);
    try {
      const res = await fetch('/api/mercadopago/pause', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId, 
          mpPreapprovalId: restaurant.mp_preapproval_id, 
          pause: isPausing 
        })
      });

      if (res.ok) {
        toast.success(`Suscripción ${isPausing ? 'pausada' : 'reanudada'}`);
        window.location.reload();
      } else throw new Error();
    } catch (err) {
      toast.error("Error al procesar la solicitud");
      setLoading(false);
    }
  };

const handleCancelSubscription = async () => {
    if (!restaurant.mp_preapproval_id) return;
    
    const confirmMsg = "⚠️ ¿CANCELAR SUSCRIPCIÓN?\n\nTu tarjeta se desvinculará y no habrá nuevos cobros. Seguirás teniendo acceso al panel hasta que termine tu periodo actual.";
    if (!confirm(confirmMsg)) return;

    setLoading(true);
    try {
        // 1. Primero limpiamos el ID en Supabase para que el dashboard sepa que NO hay tarjeta
        const { error: dbError } = await supabase
            .from('restaurants')
            .update({ 
                mp_preapproval_id: null,
                // Mantenemos el status para que no se bloquee el acceso hoy
            })
            .eq('user_id', userId);

        if (dbError) throw dbError;

        // 2. Avisamos a la API para que Mercado Pago cancele el débito automático
        await fetch('/api/mercadopago/cancel', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, mpPreapprovalId: restaurant.mp_preapproval_id })
        });

        toast.success("Tarjeta desvinculada. Acceso activo hasta el vencimiento.");
        window.location.reload();

    } catch (err) {
        console.error("Error al cancelar:", err);
        toast.error("Error al procesar la cancelación");
    } finally {
        setLoading(false);
    }
};
  // --- FUNCIONES DE CAJA ---
  const handleCashCloseHour = async (value: string) => {
    setRestaurant((prev: any) => ({ ...prev, cash_close_hour: value }));
    const { error } = await supabase
      .from('restaurants')
      .update({ cash_close_hour: value })
      .eq('id', restaurant.id);
    if (!error) toast.success('Horario de caja guardado', { position: 'bottom-right', duration: 1000 });
  };

  const handleAutoCloseToggle = async () => {
    const newValue = !restaurant.cash_auto_close_enabled;
    setRestaurant((prev: any) => ({ ...prev, cash_auto_close_enabled: newValue }));
    const { error } = await supabase
      .from('restaurants')
      .update({ cash_auto_close_enabled: newValue })
      .eq('id', restaurant.id);
    if (!error) toast.success(
      newValue ? 'Cierre automático activado' : 'Cierre automático desactivado',
      { position: 'bottom-right', duration: 1000 }
    );
  };

  // --- FUNCIONES QZ TRAY ---
  const connectQZ = async () => {
    const qz = (window as any).qz;
    if (!qz) return;

    if (qz.websocket.isActive()) {
      const printers = await qz.printers.find();
      const list = Array.isArray(printers) ? printers : [printers];
      setAvailablePrinters(list);
      if (!selectedPrinter && list.length > 0) setSelectedPrinter(list[0]);
      setQzStatus('connected');
      return;
    }

    setQzStatus('connecting');
    try {
      // Certificado público de Snappy (identifica el sitio ante QZ Tray)
      qz.security.setCertificatePromise((_resolve: (v: string) => void, reject: (e?: any) => void) => {
        fetch('/qz-certificate.pem')
          .then(r => r.text())
          .then(_resolve)
          .catch(reject);
      });

      qz.security.setSignatureAlgorithm('SHA512');
      qz.security.setSignaturePromise((toSign: string) => {
        return (resolve: (v: string) => void, reject: (e?: any) => void) => {
          fetch('/api/qz/sign', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ request: toSign }),
          })
            .then(r => r.json())
            .then(data => resolve(data.signature))
            .catch(reject);
        };
      });

      // usingSecure: true debe pasarse explícitamente.
      // Sin él, qz-tray.js lo fuerza a false cuando location.protocol === 'http:'
      // (dev local), ignorando el default interno de la librería.
      // Con true explícito: usa wss://localhost.qz.surf:8181 (cert público, sin
      // necesidad de aceptar certificado manual) en cualquier contexto http/https.
      await Promise.race([
        qz.websocket.connect({ usingSecure: true }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000)),
      ]);

      const printers: string | string[] = await qz.printers.find();
      const list = Array.isArray(printers) ? printers : [printers];
      setAvailablePrinters(list);
      if (!selectedPrinter && list.length > 0) setSelectedPrinter(list[0]);
      setQzStatus('connected');
    } catch {
      setQzStatus('error');
    }
  };

  const handleSavePrinter = async () => {
    if (!restaurant.id) return;
    setSavingPrinter(true);
    const { error } = await supabase
      .from('restaurants')
      .update({ thermal_printing_enabled: thermalEnabled, thermal_printer_name: selectedPrinter || null })
      .eq('id', restaurant.id);
    if (!error) {
      setRestaurant((prev: any) => ({ ...prev, thermal_printing_enabled: thermalEnabled, thermal_printer_name: selectedPrinter }));
      toast.success('Configuración de impresora guardada', { position: 'bottom-right', duration: 1500 });
    }
    setSavingPrinter(false);
  };

  const handleTestPrint = async () => {
    const qz = (window as any).qz;
    if (!qz || qzStatus !== 'connected' || !selectedPrinter) return;
    setTestPrinting(true);
    try {
      const paperWidthMm = thermalPaperWidth === '48mm' ? 48 : thermalPaperWidth === '58mm' ? 58 : 80;
      const bodyWidth    = thermalPaperWidth === '48mm' ? 130 : thermalPaperWidth === '58mm' ? 160 : 280;
      const narrow = thermalPaperWidth === '48mm' || thermalPaperWidth === '58mm';
      const fs = {
        name:     narrow ? 13 : 18,
        ticket:   narrow ?  9 : 12,
        date:     narrow ?  8 : 10,
        client:   narrow ?  9 : 12,
        clientLbl:narrow ? 10 : 14,
        items:    narrow ? 10 : 13,
        totals:   narrow ? 10 : 13,
        total:    narrow ? 15 : 22,
        footer:   narrow ?  8 : 10,
      };
      const cfg = qz.configs.create(selectedPrinter, { scaleContent: false, size: { width: paperWidthMm, height: null }, units: 'mm' });
      const html = `<html><body style="font-family:monospace;width:${bodyWidth}px;max-width:300px;padding:10px;margin:0 auto;color:#000${narrow ? ';text-align:center' : ''}">
        <div style="text-align:center;border-bottom:2px dashed #000;padding-bottom:10px;margin-bottom:10px">
          <b style="font-size:${fs.name}px">${restaurant.name?.toUpperCase() ?? 'SNAPPY'}</b>
          <p style="margin:5px 0;font-size:${fs.ticket}px">TICKET #PRUEBA</p>
          <p style="margin:0;font-size:${fs.date}px">${new Date().toLocaleString('es-AR', { hour12: false })}</p>
        </div>
        <div style="font-size:${fs.client}px;margin-bottom:10px;border:1px solid #000;padding:8px;border-radius:5px">
          <p style="margin:2px 0;font-size:${fs.clientLbl}px"><strong>CLIENTE:</strong> CLIENTE DE PRUEBA</p>
          <p style="margin:2px 0"><strong>ENTREGA:</strong> DELIVERY</p>
          <p style="margin:4px 0"><strong>HORARIO:</strong> LO ANTES POSIBLE</p>
        </div>
        <div style="border-top:1px solid #000;border-bottom:1px solid #000;padding:5px 0;margin-bottom:10px">
          <div style="margin-bottom:5px;font-size:${fs.items}px">
            <div style="display:flex;justify-content:space-between"><span>1x HAMBURGUESA CLÁSICA</span><span>$8.500</span></div>
          </div>
          <div style="margin-bottom:5px;font-size:${fs.items}px">
            <div style="display:flex;justify-content:space-between"><span>1x COCA COLA</span><span>$4.500</span></div>
          </div>
        </div>
        <div style="font-size:${fs.totals}px;line-height:1.6">
          <div style="display:flex;justify-content:space-between"><span>SUBTOTAL PRODUCTOS:</span><span>$13.000</span></div>
          <div style="display:flex;justify-content:space-between"><span>ENVÍO / DELIVERY:</span><span>+$2.500</span></div>
          <div style="border-top:2px dashed #000;padding-top:8px;margin-top:5px;font-size:${fs.total}px;font-weight:bold;display:flex;justify-content:space-between"><span>TOTAL:</span><span>$15.500</span></div>
        </div>
        <p style="text-align:center;font-size:${fs.footer}px;margin-top:25px;border-top:1px solid #eee;padding-top:10px">GRACIAS POR TU COMPRA<br>Snappy Tu Menú Digital</p>
      </body></html>`;
      await qz.print(cfg, [{ type: 'pixel', format: 'html', flavor: 'plain', data: html }]);
      toast.success('Ticket de prueba enviado', { position: 'bottom-right' });
    } catch (err: any) {
      toast.error('Error al imprimir: ' + err.message);
    } finally {
      setTestPrinting(false);
    }
  };

  // --- FUNCIONES DE HORARIOS ---
  const updateHour = async (day: string, field: string, value: any) => {
      const updatedHours = {
          ...restaurant.business_hours,
          [day]: { ...(restaurant.business_hours[day] || {}), [field]: value }
      };
      setRestaurant((prev: any) => ({ ...prev, business_hours: updatedHours }));
      
      const { error } = await supabase.from('restaurants').update({ business_hours: updatedHours }).eq('id', restaurant.id);
      if (!error) toast.success('Horario guardado', { position: 'bottom-right', duration: 1000 });
  };

  if (loading) return <div className="flex h-[80vh] items-center justify-center"><Loader2 className="animate-spin text-gray-300" size={40} /></div>;

// 🚀 Los horarios se bloquean si NO es Plan Light y el modo "Apertura Manual" está activo
const areHoursDisabled = restaurant.subscription_plan !== 'light' && restaurant.always_open;

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-24 px-4 pt-24 md:pt-10 animate-in fade-in duration-500">
      
      <header className="text-left">
        <h1 className="text-2xl font-black text-gray-900 uppercase italic tracking-tighter">Configuración del Local</h1>
      </header>

      {/* TABS */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl w-fit">
        {([
          { id: 'seguridad',     label: 'Seguridad'     },
          { id: 'horarios',      label: 'Horarios'      },
          { id: 'impresoras',    label: 'Impresoras'    },
          { id: 'integraciones', label: 'Integraciones' },
        ] as const).map(t => (
          <button
            key={t.id}
            onClick={() => setSettingsTab(t.id)}
            className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wide transition-all ${
              settingsTab === t.id ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* CONTENIDO DE TABS */}
      <div className="max-w-2xl space-y-6">

        {/* ── TAB: SEGURIDAD ── */}
        {settingsTab === 'seguridad' && (
        <div className="space-y-6">
          <section className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
            <h2 className="font-bold text-xl mb-6 flex items-center gap-2">
                <Lock size={20} className="text-blue-600" /> Seguridad
            </h2>
            
            <div className="space-y-6">
           <div className="text-left">
    <label className="text-[10px] font-bold text-gray-400 mb-2 block uppercase tracking-widest">Email de Acceso</label>
    
    {!isEditingEmail ? (
        <div className="space-y-3">
            {/* CARD DE INFORMACIÓN DEL CORREO */}
            <div className="p-4 bg-gray-50 rounded-[1.5rem] border border-gray-100 flex flex-col gap-3 relative overflow-hidden group">
                <div className="flex items-start gap-3 pr-2">
                    <div className="bg-white p-2 rounded-xl shadow-sm text-blue-600 shrink-0">
                        <Mail size={16} />
                    </div>
                    <div className="flex flex-col min-w-0">
                        {/* break-all asegura que el mail se vea completo aunque sea larguísimo */}
                        <span className="text-sm font-bold text-gray-800 break-all leading-tight">
                            {profile.email}
                        </span>
                        <div className="mt-2 flex items-center gap-2">
                            {isPending ? (
                                <span className="text-[7px] bg-amber-100 text-amber-600 px-2 py-0.5 rounded-md font-black animate-pulse uppercase tracking-tighter">
                                    Pendiente de Verificación
                                </span>
                            ) : (
                                <span className="text-[7px] bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-md font-black uppercase tracking-tighter flex items-center gap-1">
                                    <Check size={8} /> Correo Activo
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* BOTÓN DE CAMBIO - POSICIONADO PARA NO ESTORBAR AL MAIL */}
                <div className="pt-2 border-t border-gray-100 flex justify-end">
                    <button 
                        onClick={() => setIsEditingEmail(true)} 
                        className="text-[10px] font-black text-blue-600 hover:text-blue-800 uppercase tracking-tighter transition-all active:scale-95"
                    >
                        Cambiar Correo
                    </button>
                </div>
            </div>

            {/* AVISO DE REENVÍO (SOLO SI ESTÁ PENDIENTE) */}
            {isPending && (
                <div className="p-4 bg-amber-50/50 rounded-[1.5rem] border border-dashed border-amber-200 animate-in fade-in slide-in-from-top-2">
                    <p className="text-[9px] text-amber-800 font-bold leading-tight uppercase tracking-tighter mb-3">
                        Revisá tu casilla nueva para confirmar el cambio y activar el nuevo acceso.
                    </p>
                    <button 
                        onClick={handleResendEmail}
                        className="text-[9px] font-black text-blue-600 uppercase underline decoration-2 underline-offset-4 hover:text-blue-800"
                    >
                        Reenviar link de confirmación
                    </button>
                </div>
            )}
        </div>
    ) : (
        <div className="space-y-3 animate-in zoom-in-95 duration-200">
            <div className="flex flex-col gap-2">
                <input 
                    type="email" 
                    value={newEmail} 
                    onChange={(e) => setNewEmail(e.target.value)} 
                    placeholder="Nuevo correo electrónico" 
                    className="w-full p-4 bg-white border-2 border-blue-500 rounded-2xl text-sm font-bold outline-none shadow-lg shadow-blue-50" 
                />
                <div className="flex gap-2">
                    <button 
                        onClick={handleUpdateEmail} 
                        disabled={emailUpdateLoading} 
                        className="flex-1 py-4 bg-black text-white rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all"
                    >
                        {emailUpdateLoading ? <Loader2 className="animate-spin mx-auto" size={14}/> : 'Confirmar nuevo email'}
                    </button>
                    <button 
                        onClick={() => setIsEditingEmail(false)} 
                        className="p-4 bg-gray-100 text-gray-400 rounded-2xl hover:text-red-500 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>
            </div>
        </div>
    )}
</div>

                <hr className="border-gray-50" />
{/* GESTIÓN DE SUSCRIPCIÓN (Solo si hay suscripción activa o pausada) */}
                {restaurant.mp_preapproval_id && (
                  <div className="space-y-3 pt-2">
                    <hr className="border-gray-50 mb-4" />
                    <label className="text-[9px] font-black text-gray-400 mb-1 block uppercase tracking-widest">Suscripción Snappy</label>
                    
                    <button 
                      onClick={handleTogglePause} 
                      className={`w-full py-3 text-[10px] font-black rounded-xl uppercase tracking-widest transition-all ${
                        restaurant.subscription_status === 'paused'
                        ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                        : 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                      }`}
                    >
                      {restaurant.subscription_status === 'paused' ? '▶️ Reanudar mi Plan' : '⏸️ Pausar mi Plan'}
                    </button>

                    <button 
                      onClick={handleCancelSubscription} 
                      className="w-full py-3 text-[10px] font-black text-red-400 bg-white border border-red-50 rounded-xl hover:bg-red-50 transition tracking-widest uppercase"
                    >
                      ❌ Cancelar Suscripción
                    </button>
                  </div>
                )}
                <div className="flex flex-col gap-3">
                    <button onClick={handlePasswordReset} className="w-full py-3 text-[10px] font-black text-gray-500 bg-gray-50 rounded-xl hover:bg-gray-100 transition tracking-widest uppercase">
                        Restablecer Contraseña
                    </button>
                    <button onClick={handleLogout} className="w-full py-3 text-[10px] font-black text-red-600 bg-red-50 rounded-xl hover:bg-red-100 transition flex items-center justify-center gap-2 uppercase">
                        <LogOut size={16}/> Cerrar sesión
                    </button>
                </div>

                <div className="pt-4 border-t border-gray-50">
                    <button onClick={handleDeleteAccount} className="w-full py-3 text-[10px] font-black text-red-400 hover:text-red-600 transition tracking-widest uppercase flex items-center justify-center gap-2">
                        <Trash2 size={14} /> Eliminar Cuenta
                    </button>
                </div>
            </div>
          </section>
        </div>
        )}

        {/* ── TAB: HORARIOS ── */}
        {settingsTab === 'horarios' && (
        <div className="space-y-6">
            <section className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
                <button onClick={() => setShowHours(!showHours)} className="w-full p-8 flex justify-between items-center hover:bg-gray-50/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="bg-green-100 p-3 rounded-2xl text-green-600"><Clock size={24}/></div>
                      <div className="text-left">
                        <h2 className="font-bold text-xl text-gray-900">Horarios de Atención</h2>
                        <p className="text-xs text-gray-400 font-medium italic">Los cambios se guardan automáticamente</p>
                      </div>
                    </div>
                    {showHours ? <ChevronUp className="text-gray-400"/> : <ChevronDown className="text-gray-400"/>}
                </button>
                
                {showHours && (
                  <div className="p-8 pt-0 animate-in slide-in-from-top-4 duration-300 relative">
                    {/* BLOQUEO SI ESTÁ EN MODO SIEMPRE ABIERTO */}
                    {restaurant.subscription_plan !== 'light' && restaurant.always_open && (
                      <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/40 backdrop-blur-[2px] rounded-[2.5rem]">
                        <div className="bg-gray-900 text-white px-6 py-4 rounded-[2rem] shadow-2xl flex items-center gap-4 border border-white/10 mx-6">
                          <div className="bg-amber-500 p-2 rounded-xl text-black"><AlertTriangle size={20} /></div>
                          <div className="flex flex-col text-left">
                            <span className="text-xs font-black uppercase italic">Horarios Desactivados</span>
                            <span className="text-[10px] font-bold text-gray-400 uppercase">Desactivá el modo "Siempre Abierto" <br/>en el Inicio para editar.</span>
                          </div>
                        </div>
                      </div>
                    )}

              
<div className={`grid grid-cols-1 xl:grid-cols-2 gap-6 transition-all duration-500 ${areHoursDisabled ? 'opacity-30 grayscale pointer-events-none' : ''}`}>
                        {DAYS.map((day) => {
                            const dayData = restaurant.business_hours?.[day.key] || {};
                            const { isOpen, isSplit, open, close, open2, close2 } = dayData;
                            return (
                                <div key={day.key} className={`border-2 rounded-[2rem] p-6 transition-all ${isOpen ? 'border-green-100 bg-white' : 'border-gray-50 bg-gray-50/50'}`}>
                                    <div className="flex items-center justify-between mb-4">
                                        <span className="font-black text-gray-800 capitalize text-lg">{day.label}</span>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input 
  type="checkbox" 
  className="sr-only peer" 
  checked={isOpen || false} 
  disabled={areHoursDisabled} // 🚀 BLOQUEO AQUÍ
  onChange={(e) => updateHour(day.key, 'isOpen', e.target.checked)} 
/>
                                            <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-green-500 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                                        </label>
                                    </div>
                                    {isOpen ? (
                                       <div className="mt-6 space-y-4">
    {/* PRIMER TURNO */}
    <div className="flex items-center gap-2">
        <input 
            type="time" 
            value={open || '09:00'} 
            disabled={areHoursDisabled} 
            onChange={(e) => updateHour(day.key, 'open', e.target.value)} 
            className={`flex-1 p-3 bg-gray-50 rounded-xl text-sm font-black text-center ${areHoursDisabled ? 'opacity-40' : ''}`} 
        />
        <span className="font-bold text-gray-300">a</span>
        <input 
            type="time" 
            value={close || '23:00'} // 🚀 CORREGIDO: antes decía open
            disabled={areHoursDisabled} 
            onChange={(e) => updateHour(day.key, 'close', e.target.value)} // 🚀 CORREGIDO: antes decía open
            className={`flex-1 p-3 bg-gray-50 rounded-xl text-sm font-black text-center ${areHoursDisabled ? 'opacity-40' : ''}`} 
        />
    </div>

    {/* SEGUNDO TURNO (SI ESTÁ ACTIVO) */}
    {isSplit && (
        <div className="flex items-center gap-2 animate-in slide-in-from-top-1 border-t border-dashed pt-4">
            <input 
                type="time" 
                value={open2 || '17:00'} // 🚀 CORREGIDO: antes decía open
                disabled={areHoursDisabled} 
                onChange={(e) => updateHour(day.key, 'open2', e.target.value)} // 🚀 CORREGIDO: antes decía open
                className={`flex-1 p-3 bg-gray-50 rounded-xl text-sm font-black text-center ${areHoursDisabled ? 'opacity-40' : ''}`} 
            />
            <span className="font-bold text-gray-300">a</span>
            <input 
                type="time" 
                value={close2 || '23:00'} // 🚀 CORREGIDO: antes decía open
                disabled={areHoursDisabled} 
                onChange={(e) => updateHour(day.key, 'close2', e.target.value)} // 🚀 CORREGIDO: antes decía open
                className={`flex-1 p-3 bg-gray-50 rounded-xl text-sm font-black text-center ${areHoursDisabled ? 'opacity-40' : ''}`} 
            />
        </div>
    )}

    {/* CHECKBOX DOBLE TURNO */}
    <label className="flex items-center gap-2 cursor-pointer pt-2 group">
        <input 
            type="checkbox" 
            checked={isSplit || false} 
            disabled={areHoursDisabled} 
            onChange={(e) => updateHour(day.key, 'isSplit', e.target.checked)} 
            className="w-4 h-4 rounded border-gray-300 text-black" 
        />
        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Doble Turno</span>
    </label>
</div>
                                    ) : <p className="text-[10px] text-center text-gray-300 py-4 font-bold uppercase tracking-widest italic">Cerrado</p>}
                                </div>
                            );
                        })}
                    </div>
                  </div>
                )}
            </section>

            {/* --- SECCIÓN: HORARIO DE CIERRE DE CAJA --- */}
            {restaurant.subscription_plan !== 'light' && (
              <section className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-8">
                <div className="flex items-center gap-4 mb-6">
                  <div className="bg-amber-100 p-3 rounded-2xl text-amber-600">
                    <Clock size={24} />
                  </div>
                  <div>
                    <h2 className="font-bold text-xl text-gray-900">Horario de Cierre de Caja</h2>
                    <p className="text-xs text-gray-400 font-medium italic">
                      Define cuándo termina tu "día de caja" (independiente del horario del menú)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="flex-1 space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      Hora de cierre
                    </label>
                    <input
                      type="time"
                      value={restaurant.cash_close_hour?.slice(0, 5) ?? '00:00'}
                      onChange={(e) => handleCashCloseHour(e.target.value)}
                      className="w-full p-4 bg-gray-50 rounded-2xl text-lg font-black text-gray-900 text-center border-2 border-transparent focus:border-amber-400 outline-none transition-colors"
                    />
                  </div>
                  <div className="flex-1 bg-amber-50 rounded-2xl p-4 border border-amber-100">
                    <p className="text-[10px] font-black text-amber-800 uppercase tracking-widest mb-1">Ejemplo</p>
                    <p className="text-xs text-amber-700 font-medium leading-relaxed">
                      Si el cierre es <strong>03:00</strong>, el resumen del "20 de julio" incluye ventas
                      desde las 03:00 del 20 hasta las 03:00 del 21. Útil para negocios nocturnos.
                    </p>
                  </div>
                </div>

                {/* Toggle cierre automático */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 mt-2">
                  <div>
                    <p className="font-black text-sm text-gray-900">Cierre automático</p>
                    <p className="text-[10px] text-gray-400 font-medium mt-0.5">
                      {restaurant.cash_auto_close_enabled
                        ? 'La caja se cierra sola a la hora configurada'
                        : 'Solo cierre manual — el botón "Cerrar Caja" del panel'}
                    </p>
                  </div>
                  <button
                    onClick={handleAutoCloseToggle}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${
                      restaurant.cash_auto_close_enabled ? 'bg-amber-500' : 'bg-gray-200'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                      restaurant.cash_auto_close_enabled ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>

                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">
                  El cambio de horario aplica desde el próximo turno de caja
                </p>
              </section>
            )}
        </div>
        )}

        {/* ── TAB: IMPRESORAS ── */}
        {settingsTab === 'impresoras' && (
        <div className="space-y-6">
            {restaurant.subscription_plan !== 'light' && (
              <section className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
                <div className="grid grid-cols-1 md:grid-cols-[3fr_2fr]">

                  {/* Columna izquierda: todo el contenido */}
                  <div className="p-8 space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="bg-gray-900 p-3 rounded-2xl text-white">
                        <Printer size={24} />
                      </div>
                      <div>
                        <h2 className="font-bold text-xl text-gray-900">Impresoras Térmicas</h2>
                        <p className="text-xs text-gray-400 font-medium italic">
                          Impresión directa sin diálogo del browser — requiere QZ Tray
                        </p>
                      </div>
                    </div>

                    {/* Estado de conexión */}
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                      <div className="flex items-center gap-3">
                        {qzStatus === 'connecting' && <Loader2 size={18} className="text-gray-400 animate-spin" />}
                        {qzStatus === 'connected'  && <Wifi size={18} className="text-emerald-500" />}
                        {(qzStatus === 'error' || qzStatus === 'idle') && <WifiOff size={18} className="text-gray-400" />}
                        <div>
                          <p className="text-sm font-black text-gray-900">
                            {qzStatus === 'connecting' ? 'Conectando...' :
                             qzStatus === 'connected'  ? 'QZ Tray activo' :
                             qzStatus === 'error'      ? 'QZ Tray no detectado' :
                             'Sin escanear'}
                          </p>
                          {qzStatus !== 'connected' && (
                            <a
                              href="https://qz.io/download/"
                              target="_blank"
                              rel="noreferrer"
                              className="text-[10px] text-blue-500 font-bold underline underline-offset-2"
                            >
                              Descargar QZ Tray ↗
                            </a>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={connectQZ}
                        disabled={qzStatus === 'connecting'}
                        className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-600 hover:bg-gray-50 transition-all disabled:opacity-40"
                      >
                        <RefreshCw size={12} className={qzStatus === 'connecting' ? 'animate-spin' : ''} />
                        {qzStatus === 'connected' ? 'Reescanear' : 'Conectar'}
                      </button>
                    </div>

                    {/* Toggle + selector */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-black text-sm text-gray-900">Impresión automática en térmica</p>
                          <p className="text-[10px] text-gray-400 font-medium mt-0.5">
                            {qzStatus !== 'connected' ? 'Conectá QZ Tray para habilitar' :
                             thermalEnabled ? 'Activo — usa la impresora seleccionada' :
                             'Desactivado — usa impresión normal del browser'}
                          </p>
                        </div>
                        <button
                          onClick={() => setThermalEnabled(v => !v)}
                          disabled={qzStatus !== 'connected'}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 disabled:opacity-30 ${thermalEnabled ? 'bg-gray-900' : 'bg-gray-200'}`}
                        >
                          <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${thermalEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                      </div>

                      {qzStatus === 'connected' && thermalEnabled && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                              Impresora para comandas
                            </label>
                            <select
                              value={selectedPrinter}
                              onChange={e => setSelectedPrinter(e.target.value)}
                              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold outline-none focus:border-gray-900 transition-all"
                            >
                              {availablePrinters.length === 0 && (
                                <option value="">Sin impresoras detectadas</option>
                              )}
                              {availablePrinters.map(p => (
                                <option key={p} value={p}>{p}</option>
                              ))}
                            </select>
                          </div>

                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                              Ancho del papel
                            </label>
                            <select
                              value={thermalPaperWidth}
                              onChange={e => {
                                setThermalPaperWidth(e.target.value);
                                localStorage.setItem('thermal_paper_width', e.target.value);
                              }}
                              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold outline-none focus:border-gray-900 transition-all"
                            >
                              <option value="48mm">48mm (impresora de hoja normal)</option>
                              <option value="58mm">58mm (térmica estándar)</option>
                              <option value="80mm">80mm (térmica grande)</option>
                            </select>
                          </div>
                        </div>
                      )}

                      <div className="flex gap-3">
                        <button
                          onClick={handleSavePrinter}
                          disabled={savingPrinter}
                          className="flex-1 py-3 bg-gray-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {savingPrinter ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                          Guardar
                        </button>
                        {qzStatus === 'connected' && selectedPrinter && (
                          <button
                            onClick={handleTestPrint}
                            disabled={testPrinting}
                            className="flex-1 py-3 bg-white border border-gray-200 text-gray-700 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-50 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                          >
                            {testPrinting ? <Loader2 size={14} className="animate-spin" /> : <FlaskConical size={14} />}
                            Ticket de prueba
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Instrucciones del certificado */}
                    <div className="pt-4 border-t border-gray-100 space-y-3">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        Configuración inicial (una sola vez por computadora)
                      </p>
                      <ol className="space-y-2 text-xs text-gray-500 font-medium">
                        <li className="flex gap-2"><span className="font-black text-gray-400 shrink-0">1.</span>Instalá QZ Tray y dejalo corriendo en la computadora del mostrador</li>
                        <li className="flex gap-2"><span className="font-black text-gray-400 shrink-0">2.</span>Descargá el certificado de Snappy y agregalo en QZ Tray → Site Manager → snappy.uno</li>
                        <li className="flex gap-2"><span className="font-black text-gray-400 shrink-0">3.</span>Aceptá la conexión segura que pide el browser la primera vez</li>
                      </ol>
                      <a
                        href="/qz-certificate.pem"
                        download="snappy-qz-certificate.pem"
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-700 hover:bg-gray-100 transition-all"
                      >
                        <Download size={13} /> Descargar certificado
                      </a>
                    </div>
                  </div>

                  {/* Columna derecha: video ocupa toda la altura */}
                  <video
                    src="/videos/tutorial-impresora.mp4"
                    controls
                    className="w-full h-full object-cover"
                  />

                </div>
              </section>
            )}

        </div>
        )}

        {/* ── TAB: INTEGRACIONES ── */}
        {settingsTab === 'integraciones' && (
          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-16 text-center">
            <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Zap size={24} className="text-gray-400" />
            </div>
            <p className="font-black text-gray-900 uppercase tracking-tighter text-lg mb-1">Próximamente</p>
            <p className="text-sm text-gray-400 font-medium">Las integraciones con servicios externos<br/>estarán disponibles en breve.</p>
          </div>
        )}

      </div>{/* fin contenido tabs */}


      {loading && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-gray-900/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className="text-center space-y-4">
                <Loader2 className="animate-spin text-white mx-auto" size={60} strokeWidth={1} />
                <div className="space-y-1">
                    <h3 className="text-white font-black uppercase italic tracking-tighter text-xl">Eliminando Cuenta</h3>
                    <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Desvinculando Mercado Pago y limpiando datos...</p>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><Loader2 className="animate-spin text-gray-300" size={40} /></div>}>
      <SettingsContent />
    </Suspense>
  );
}