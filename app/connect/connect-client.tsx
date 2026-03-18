'use client'

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import QRCode from "react-qr-code"
import { Heart, ScanLine, Share2, Loader2, QrCode } from "lucide-react"
import { joinCouple } from "@/app/actions/pairing"
import { Scanner } from '@yudiel/react-qr-scanner'

interface ConnectClientProps {
    initialCode: string;
    initialStatus: string;
    coupleId?: string;
}

export function ConnectClient({ initialCode, initialStatus, coupleId }: ConnectClientProps) {
    const [status, setStatus] = useState(initialStatus);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'CODE' | 'SCAN'>('CODE');
    const router = useRouter();

    const isMatched = status === 'ACTIVE';
    const shareUrl = `https://hedon.app/join/${initialCode}`;

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (isMatched) {
            console.log("Match Active! Redirecting in 800ms...");
            timer = setTimeout(() => {
                // Hard reload to Home Dashboard so Server Components fetch fresh Pair status
                window.location.href = '/';
            }, 800);
        }
        return () => {
            if (timer) clearTimeout(timer);
        };
    }, [isMatched]);

    useEffect(() => {
        if (!coupleId || isMatched) return;

        const supabase = createClient();

        console.log("Subscribing to couple updates for ID:", coupleId);

        const channel = supabase
            .channel(`couple_updates_${coupleId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'couples'
                },
                (payload) => {
                    console.log("Realtime Update Received:", payload);
                    if (payload.new && payload.new.id === coupleId && payload.new.status === 'ACTIVE') {
                        setStatus('ACTIVE');
                    }
                }
            )
            .subscribe();

        // Fallback: Poll every 3 seconds in case WebSockets are blocked by proxies or browser extensions
        const pollInterval = setInterval(async () => {
            const { data } = await supabase
                .from('couples')
                .select('status')
                .eq('id', coupleId)
                .single();

            if (data?.status === 'ACTIVE') {
                console.log("Polling Sync: Match Active!");
                setStatus('ACTIVE');
            }
        }, 3000);

        return () => {
            supabase.removeChannel(channel);
            clearInterval(pollInterval);
        };
    }, [coupleId, isMatched]);

    async function handleJoinSubmit(formData: FormData) {
        setLoading(true);
        setErrorMsg(null);

        const res = await joinCouple(formData);

        if (res.error) {
            setErrorMsg(res.error);
            setLoading(false);
        } else {
            setStatus('ACTIVE');
        }
    }

    const handleScan = (detectedCodes: any[]) => {
        if (!detectedCodes || detectedCodes.length === 0 || loading || isMatched) return;
        
        const rawValue = detectedCodes[0].rawValue;
        if (!rawValue) return;

        // Extract the 7-character code from the URL (e.g., https://hedon.app/join/X7B9K2M) or if it's just the code
        const match = rawValue.match(/([a-zA-Z0-9]{7})$/);
        if (match && match[1]) {
            const code = match[1].toUpperCase();
            const fd = new FormData();
            fd.append('code', code);
            handleJoinSubmit(fd);
        }
    }

    return (
        <div className="w-full max-w-md space-y-8">
            {/* TAB Toggles */}
            <div className="grid grid-cols-2 gap-2 bg-zinc-900/50 p-1 rounded-xl border border-zinc-800">
                <Button 
                    variant="ghost" 
                    onClick={() => setActiveTab('CODE')}
                    className={`${activeTab === 'CODE' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-white hover:bg-zinc-800/50'} transition-all`}
                >
                    <Share2 className="w-4 h-4 mr-2" /> Mi Código
                </Button>
                <Button 
                    variant="ghost" 
                    onClick={() => setActiveTab('SCAN')}
                    className={`${activeTab === 'SCAN' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-white hover:bg-zinc-800/50'} transition-all`}
                >
                    <ScanLine className="w-4 h-4 mr-2" /> Escanear
                </Button>
            </div>

            {/* Dynamic Content Based on Tab */}
            {activeTab === 'CODE' ? (
                <Card className="bg-zinc-900/40 border-zinc-800 p-8 flex flex-col items-center justify-center space-y-6 backdrop-blur-md animate-in fade-in slide-in-from-bottom-4">
                    <div className="bg-white p-4 rounded-xl shadow-lg shadow-red-900/20 max-w-[250px] aspect-square flex items-center justify-center">
                        <div className="h-auto w-full max-w-full">
                            <QRCode
                                size={256}
                                style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                                value={shareUrl}
                                viewBox={`0 0 256 256`}
                                fgColor="#000000"
                                bgColor="#ffffff"
                                level="Q"
                            />
                        </div>
                    </div>

                    <div className="text-center space-y-2 w-full">
                        <Label className="text-xs uppercase text-zinc-500 font-bold tracking-wider">Tu Código Único</Label>
                        <div className="flex items-center gap-2 justify-center">
                            <div className="text-4xl font-mono font-bold tracking-widest text-red-500 select-all cursor-pointer hover:text-red-400 transition-colors">
                                {initialCode}
                            </div>
                        </div>
                    </div>
                </Card>
            ) : (
                <Card className="bg-zinc-900/40 border-zinc-800 p-6 flex flex-col items-center justify-center space-y-4 backdrop-blur-md animate-in fade-in slide-in-from-bottom-4">
                     <Label className="text-xs uppercase text-zinc-500 font-bold tracking-wider mb-2">Apunta al código de tu pareja</Label>
                     <div className="w-full max-w-[300px] bg-black rounded-xl overflow-hidden border-2 border-dashed border-zinc-700/50 relative">
                         <Scanner 
                            onScan={handleScan}
                            formats={['qr_code']}
                         />
                         {loading && (
                             <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-10">
                                 <Loader2 className="w-8 h-8 text-red-500 animate-spin mb-2" />
                                 <p className="text-xs text-red-400 font-bold tracking-widest uppercase">Vinculando...</p>
                             </div>
                         )}
                     </div>
                </Card>
            )}

            {/* Manual Entry or Success state */}
            {!isMatched ? (
                <form action={handleJoinSubmit} className="space-y-4 pt-4 border-t border-zinc-800/50">
                    <Label className="text-zinc-400 text-center block text-sm">¿Tienes el código de tu pareja?</Label>
                    <div className="flex gap-2 relative">
                        <Input
                            name="code"
                            placeholder="Ej. X7B9K2"
                            className="bg-zinc-950 border-zinc-800 text-center font-mono uppercase tracking-widest placeholder:text-zinc-700 h-12 text-lg focus:border-red-900/50 transition-all uppercase"
                            maxLength={7}
                            required
                            disabled={loading}
                        />
                        <Button type="submit" size="icon" disabled={loading} className="h-12 w-12 bg-white text-black hover:bg-zinc-200 shrink-0">
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Heart className="w-5 h-5 fill-current" />}
                        </Button>
                    </div>
                    {errorMsg && (
                        <p className="text-red-400 text-xs text-center border bg-red-950/40 border-red-900/30 p-2 rounded-md animate-in fade-in zoom-in-95 backdrop-blur-sm">
                            {errorMsg}
                        </p>
                    )}
                </form>
            ) : (
                <div className="pt-4 border-t border-zinc-800/50 text-center animate-in fade-in slide-in-from-bottom-2">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-900/20 border border-red-900/30 text-red-400">
                        <Heart className="w-4 h-4 fill-current animate-pulse" />
                        <span className="text-sm font-bold uppercase tracking-wider">¡Pareja Vinculada!</span>
                    </div>
                    <p className="text-xs text-zinc-500 mt-4">Redirigiendo a tu experiencia compartida...</p>
                </div>
            )}
        </div>
    )
}
