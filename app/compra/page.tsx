import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { Playfair_Display } from "next/font/google";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Lock, CreditCard, MessageCircle, LogOut } from "lucide-react";
import { WelcomeSplash } from "@/components/welcome-splash";

const playfair = Playfair_Display({ subsets: ["latin"] });

export default async function CompraPage(props: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
    const searchParams = await props.searchParams;
    const isNewLogin = searchParams?.login === 'success';

    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return redirect("/login");
    }

    // Si ya pagó, enviarlo de vuelta al inicio
    if (user.user_metadata?.has_paid === true) {
        if (isNewLogin) return redirect("/?login=success");
        return redirect("/");
    }

    // Datos hardcodeados para la transferencia manual de la beta
    const WHATSAPP_NUMBER = "593984196793"; // Tu WhatsApp
    const COST = "$5.00";
    const PAYPHONE_LINK = "https://payp.hn/tu-enlace";
    const BANK_ACCOUNT = "Banco Pichincha - Cta Ahorros: 2200000000 - A nombre de: Hedon App";

    const whatsappMessage = encodeURIComponent(`Hola, acabo de pagar ${COST} para activar mi cuenta en Hedon. Mi email registrado es: ${user.email}`);
    const whatsappLink = `https://wa.me/${WHATSAPP_NUMBER}?text=${whatsappMessage}`;

    return (
        <div className="flex-1 flex flex-col min-h-screen bg-black overflow-y-auto selection:bg-red-900/30">
            {isNewLogin && <WelcomeSplash />}
            
            {/* Header simple */}
            <header className="h-16 flex items-center justify-between px-6 border-b border-zinc-900/50 bg-black/80 backdrop-blur-md">
                <div className="flex items-center gap-3">
                    <h1 className={`${playfair.className} text-xl font-black tracking-tight text-white`}>
                        Hedon<span className="text-red-700">.</span>
                    </h1>
                </div>
                <form action="/auth/signout" method="post">
                    <button type="submit" className="text-zinc-500 hover:text-white transition-colors p-2 text-xs flex gap-2 items-center">
                        <LogOut className="w-4 h-4" /> Salir
                    </button>
                </form>
            </header>

            <main className="flex-1 px-6 py-12 flex flex-col items-center justify-center max-w-md mx-auto w-full space-y-8">

                <div className="text-center space-y-4">
                    <div className="w-16 h-16 bg-red-950/30 rounded-full flex items-center justify-center mx-auto border border-red-900/50 mb-6 relative">
                        <Lock className="w-8 h-8 text-red-500" />
                        <div className="absolute inset-0 bg-red-500/20 blur-xl rounded-full" />
                    </div>
                    <h2 className={`${playfair.className} text-3xl font-black text-white`}>
                        Acceso VIP Requerido
                    </h2>
                    <p className="text-zinc-400 text-sm">
                        Estás a un paso de vivir la experiencia narrada por nuestra Directora Premium. Para continuar y crear tu sala inmersiva, necesitas activar tu cuenta.
                    </p>
                </div>

                <Card className="w-full bg-zinc-900/50 border-zinc-800 p-6 space-y-6 relative overflow-hidden">
                    {/* Decoración */}
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <CreditCard className="w-24 h-24" />
                    </div>

                    <div className="relative z-10 border-b border-zinc-800 pb-4">
                        <p className="text-xs text-red-500 font-bold uppercase tracking-widest mb-1">Precio Beta Cerrada</p>
                        <div className="text-4xl font-serif text-white">{COST} <span className="text-sm text-zinc-500 font-sans">USD / Sala Privada</span></div>
                    </div>

                    <div className="relative z-10 space-y-4 text-sm text-zinc-300">
                        <p className="font-semibold text-white">Métodos de Pago Autorizados:</p>

                        <div className="space-y-3 bg-black/50 p-4 rounded-lg border border-zinc-800/50">
                            <div>
                                <span className="text-xs text-zinc-500 block mb-1">Opción 1: Transferencia Directa</span>
                                <code className="text-red-400 font-mono text-xs">{BANK_ACCOUNT}</code>
                            </div>
                            <div className="h-px bg-zinc-800 w-full" />
                            <div>
                                <span className="text-xs text-zinc-500 block mb-1">Opción 2: Tarjeta de Crédito (Ecuador)</span>
                                <a href={PAYPHONE_LINK} target="_blank" rel="noreferrer" className="text-red-400 hover:text-red-300 underline font-mono text-xs">Pagar Aquí con PayPhone</a>
                            </div>
                        </div>
                    </div>

                </Card>

                <div className="w-full space-y-4 text-center">
                    <Button asChild className="w-full bg-red-800 hover:bg-red-700 text-white border-none py-6 text-lg hover:shadow-[0_0_20px_-5px_rgba(220,38,38,0.5)] transition-all">
                        <a href={whatsappLink} target="_blank" rel="noreferrer" className="flex items-center gap-3">
                            <MessageCircle className="w-5 h-5" /> Enviar Comprobante
                        </a>
                    </Button>
                    <p className="text-[11px] text-zinc-500">
                        Una vez envíes el comprobante a nuestro equipo por WhatsApp, tu cuenta será activada manualmente en menos de 5 minutos y podrás regresar a esta app.
                    </p>
                </div>

            </main>
        </div>
    );
}
