'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Sparkles, User, Flame, ArrowRight, ShieldAlert } from 'lucide-react'
import { saveLobbyConfig } from '@/app/actions/game'
import { createClient } from '@/utils/supabase/client'

interface LobbyClientProps {
    sessionId: string;
    isHost: boolean;
    initialContext?: any;
}

const PRESET_SCENARIOS = [
    { id: 'romantic', title: 'Romance Lento', desc: 'Atención profunda, caricias previas, conexión emocional fuerte.', icon: HeartPulse },
    { id: 'dominant', title: 'Juego de Poder', desc: 'Uno de los dos toma el control absoluto de la situación.', icon: Flame },
    { id: 'strangers', title: 'Desconocidos', desc: 'Se acaban de conocer en el bar de un hotel. Tensión y misterio.', icon: User },
    { id: 'custom', title: 'Fantasía Libre', desc: 'Escribe tu propio escenario y reglas.', icon: Sparkles },
]

// Mock icon for HeartPulse
function HeartPulse(props: any) {
    return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M19 16.9A5 5 0 0 0 18 7h-1.26a8 8 0 1 0-11.62 9" /><polyline points="13 12 11 12 11 16 13 16" /></svg>
}

export function LobbyClient({ sessionId, isHost, initialContext }: LobbyClientProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [step, setStep] = useState(1);

    // Form State
    const [myIdentity, setMyIdentity] = useState('');
    const [partnerIdentity, setPartnerIdentity] = useState('');
    const [scenario, setScenario] = useState('romantic');
    const [customFantasy, setCustomFantasy] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    // Debugging state for P2
    const [debugLogs, setDebugLogs] = useState<string[]>([]);

    const addLog = (msg: string) => {
        setDebugLogs(prev => [...prev, `${new Date().toLocaleTimeString()} - ${msg}`]);
    }

    // --- GAME SYNCHRONIZATION (P2 LISTENER) ---
    useEffect(() => {
        if (!sessionId) return;
        const supabase = createClient();

        addLog("Iniciando conexión WebSocket...");
        const channel = supabase.channel(`lobby_${sessionId}`)
            .on(
                'broadcast',
                { event: 'START_GAME' },
                (payload) => {
                    addLog(`¡Señal START_GAME recibida WS!`);
                    router.push(`/play/${sessionId}`);
                }
            )
            .subscribe((status, err) => {
                addLog(`Status Canal: ${status}`);
                if (err) addLog(`Error WS: ${JSON.stringify(err)}`);
            });

        // FALLBACK: User's proxy blocks WS, so we poll the DB for changes
        const pollInterval = setInterval(async () => {
            const { data } = await supabase
                .from('game_sessions')
                .select('initial_context')
                .eq('id', sessionId)
                .single();

            // If initial_context has properties (like scenario), P1 started the game
            if (data?.initial_context && Object.keys(data.initial_context).length > 0) {
                if (data.initial_context.scenario) {
                    addLog(`¡Señal recibida por Polling HTTP!`);
                    clearInterval(pollInterval);
                    router.push(`/play/${sessionId}`);
                }
            }
        }, 2000);

        return () => {
            supabase.removeChannel(channel);
            clearInterval(pollInterval);
        };
    }, [sessionId, router]);

    const handleNextStep = () => {
        if (step === 1) {
            if (!myIdentity || !partnerIdentity) {
                setErrorMsg('Por favor define los roles para continuar.');
                return;
            }
            setErrorMsg('');
            setStep(2);
        }
    }

    const handleStart = async () => {
        if (scenario === 'custom' && customFantasy.trim().length < 10) {
            setErrorMsg('Describe tu fantasía con un poco más de detalle (mín. 10 caracteres).');
            return;
        }

        setErrorMsg('');
        setLoading(true);

        const config = {
            hostIdentity: myIdentity,
            partnerIdentity: partnerIdentity,
            scenario: scenario,
            customPrompt: scenario === 'custom' ? customFantasy : ''
        };

        const res = await saveLobbyConfig(sessionId, config);

        if (res.error) {
            setErrorMsg(res.error);
            setLoading(false);
            return;
        }

        // Broadcast to P2 that the game is starting
        const supabase = createClient();
        console.log("Broadcasting START_GAME event...");

        const channel = supabase.channel(`lobby_${sessionId}`);

        channel.subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                const resp = await channel.send({
                    type: 'broadcast',
                    event: 'START_GAME',
                    payload: { message: 'Iniciando sesión' }
                });
                console.log("Broadcast response:", resp);

                // Small delay to ensure DB and broadcast are processed
                setTimeout(() => {
                    router.push(`/play/${sessionId}`);
                }, 800);
            }
        });
    }

    if (!isHost) {
        return (
            <div className="text-center space-y-6 mt-12 animate-pulse">
                <Spinner className="w-8 h-8 text-red-500 mx-auto animate-spin" />
                <div className="space-y-2">
                    <h3 className="text-xl text-white font-serif">Preparando la Habitación</h3>
                    <p className="text-zinc-500 text-sm">Tu pareja está configurando las dinámicas de esta noche. Espera un momento.</p>
                </div>

                {/* Diagnostic Panel */}
                <div className="mt-12 p-4 bg-zinc-950/50 border border-zinc-900 rounded-xl text-left font-mono text-[10px] text-emerald-500/70 h-32 overflow-y-auto w-full max-w-sm mx-auto shadow-inner">
                    <p className="text-zinc-600 mb-2">// Diagnostic Logs (P2 Sync)</p>
                    {debugLogs.map((log, i) => (
                        <div key={i}>{log}</div>
                    ))}
                    {debugLogs.length === 0 && <span className="opacity-50">Esperando eventos...</span>}
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-8 animate-in fade-in transition-all">

            {/* Step 1: Identities */}
            {step === 1 && (
                <div className="space-y-6">
                    <div className="space-y-2">
                        <Label className="text-zinc-400 text-xs uppercase tracking-widest">Paso 1 de 2: Identidades</Label>
                        <h3 className="text-2xl text-white font-serif">¿Cómo se dirigen el uno al otro?</h3>
                        <p className="text-zinc-500 text-sm">Define tu rol y el de tu pareja (Ej: Yo=Él, Pareja=Ella / Yo=Amo, Pareja=Sumisa / Yo=Lobo, Pareja=Vampiro).</p>
                    </div>

                    <div className="space-y-4 pt-4">
                        <div className="space-y-2">
                            <Label className="text-red-400">Tu Identidad (Host)</Label>
                            <Input
                                value={myIdentity}
                                onChange={(e) => setMyIdentity(e.target.value)}
                                placeholder="Ej: Maestro, Marido, Ella..."
                                className="bg-zinc-900 border-zinc-800 focus:border-red-900 text-white"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-red-400">Identidad de tu Pareja</Label>
                            <Input
                                value={partnerIdentity}
                                onChange={(e) => setPartnerIdentity(e.target.value)}
                                placeholder="Ej: Aprendiz, Esposa, Él..."
                                className="bg-zinc-900 border-zinc-800 focus:border-red-900 text-white"
                            />
                        </div>
                    </div>

                    {errorMsg && <p className="text-red-400 text-xs">{errorMsg}</p>}

                    <div className="pt-6">
                        <Button onClick={handleNextStep} className="w-full bg-white text-black hover:bg-zinc-200">
                            Continuar <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    </div>
                </div>
            )}

            {/* Step 2: Scenario Selection */}
            {step === 2 && (
                <div className="space-y-6">
                    <div className="space-y-2">
                        <Label className="text-zinc-400 text-xs uppercase tracking-widest pl-1">Paso 2 de 2: Ambiente</Label>
                        <h3 className="text-2xl text-white font-serif">Elige la Dinámica</h3>
                        <p className="text-zinc-500 text-sm">El Director IA basará la tensión y sus órdenes en este escenario inicial.</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {PRESET_SCENARIOS.map((s) => {
                            const Icon = s.icon;
                            const isSelected = scenario === s.id;
                            return (
                                <Card
                                    key={s.id}
                                    onClick={() => setScenario(s.id)}
                                    className={`p-4 cursor-pointer transition-all border ${isSelected ? 'bg-red-950/30 border-red-500 shadow-[0_0_20px_-5px_rgba(220,38,38,0.3)]' : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700'}`}
                                >
                                    <div className="flex items-start gap-4">
                                        <div className={`p-2 rounded-full ${isSelected ? 'bg-red-900/50 text-red-400' : 'bg-zinc-800 text-zinc-400'}`}>
                                            <Icon className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className={`font-serif font-bold ${isSelected ? 'text-white' : 'text-zinc-300'}`}>{s.title}</h4>
                                            <p className="text-xs text-zinc-500 mt-1">{s.desc}</p>
                                        </div>
                                    </div>
                                </Card>
                            )
                        })}
                    </div>

                    {scenario === 'custom' && (
                        <div className="space-y-3 pt-4 animate-in fade-in slide-in-from-top-2">
                            <Label className="text-red-400 flex items-center gap-2">
                                Describe tu Fantasía
                            </Label>
                            <Textarea
                                value={customFantasy}
                                onChange={(e) => setCustomFantasy(e.target.value)}
                                placeholder="Ej: Somos dos ladrones atrapados en una bóveda oscura. Tienes que robarme las llaves sin usar las manos..."
                                className="bg-zinc-900 border-zinc-800 focus:border-red-900 h-24 resize-none text-white text-sm"
                            />
                            <div className="flex items-start gap-2 bg-zinc-900/50 p-3 rounded-md border border-zinc-800/50">
                                <ShieldAlert className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
                                <p className="text-[10px] text-zinc-500 leading-tight">
                                    Por políticas de uso, roles no consensuados extremos, temas sobre menores o ilegalidades gráficas detendrán el motor de IA automáticamente.
                                </p>
                            </div>
                        </div>
                    )}

                    {errorMsg && <p className="text-red-400 text-xs text-center font-medium bg-red-950/50 py-2 rounded border border-red-900/30">{errorMsg}</p>}

                    <div className="flex gap-3 pt-6">
                        <Button variant="outline" onClick={() => setStep(1)} className="border-zinc-800 text-zinc-400 hover:text-white">
                            Atrás
                        </Button>
                        <Button onClick={handleStart} disabled={loading} className="flex-1 bg-red-900 text-white hover:bg-red-800">
                            {loading ? <Spinner className="w-4 h-4 mr-2 animate-spin" /> : null}
                            Iniciar Experiencia
                        </Button>
                    </div>
                </div>
            )}
        </div>
    )
}

function Spinner(props: any) {
    return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><line x1="12" y1="2" x2="12" y2="6" /><line x1="12" y1="18" x2="12" y2="22" /><line x1="4.93" y1="4.93" x2="7.76" y2="7.76" /><line x1="16.24" y1="16.24" x2="19.07" y2="19.07" /><line x1="2" y1="12" x2="6" y2="12" /><line x1="18" y1="12" x2="22" y2="12" /><line x1="4.93" y1="19.07" x2="7.76" y2="16.24" /><line x1="16.24" y1="7.76" x2="19.07" y2="4.93" /></svg>
}
