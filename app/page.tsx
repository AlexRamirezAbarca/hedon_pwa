import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Playfair_Display } from "next/font/google";
import { GameSessionObserver } from "@/components/game-session-observer";
import { GameStartButton } from "@/components/game-start-button";
import { Link, Share2, Activity, Settings } from "lucide-react";
import { WelcomeSplash } from "@/components/welcome-splash";
import { UserMenu } from "@/components/user-menu";

const playfair = Playfair_Display({ subsets: ["latin"] });

export default async function Home(props: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const searchParams = await props.searchParams;
  const isNewLogin = searchParams?.login === 'success';

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/login");
  }

  const adminEmails = process.env.ADMIN_EMAILS ? process.env.ADMIN_EMAILS.split(',') : [];
  const isAdmin = adminEmails.includes(user.email || '');

  // Intercept for manual Beta payment phase
  const hasPaid = user.user_metadata?.has_paid === true;
  if (!hasPaid) {
    if (isNewLogin) return redirect("/compra?login=success");
    return redirect("/compra");
  }

  // Check Couple Status
  const { data: currentCouple } = await supabase
    .from('couples')
    .select('*')
    .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
    .eq('status', 'ACTIVE')
    .single();

  let isPaired = !!currentCouple;

  // Enforce 24-hour ephemeral session logic
  if (currentCouple) {
    const createdTime = new Date(currentCouple.created_at).getTime();
    const diffHours = (Date.now() - createdTime) / (1000 * 60 * 60);

    if (diffHours >= 24) {
      // Destruir sala si han pasado más de 24 horas sin invocar revalidatePath durante el render
      await supabase.from('game_sessions').delete().eq('couple_id', currentCouple.id);
      await supabase.from('couples').delete().eq('id', currentCouple.id);
      isPaired = false;
    }
  }

  return (
    <div className="p-6 relative overflow-hidden flex-1 flex flex-col">
      {isNewLogin && <WelcomeSplash />}

      <header className="flex justify-between items-center mb-12">
        <h1 className={`${playfair.className} text-2xl font-black tracking-tight`}>
          Hedon<span className="text-red-700">.</span>
        </h1>
        <div className="flex items-center gap-3">
          <UserMenu user={user} isAdmin={isAdmin} />
        </div>
      </header>

      <main className="max-w-md mx-auto space-y-8">

        {/* Welcome Section */}
        <section className="space-y-4">
          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] uppercase font-bold tracking-widest ${isPaired ? 'bg-red-900/20 border-red-900/30 text-red-400' : 'bg-zinc-900 border-zinc-800 text-zinc-400'}`}>
            <Activity className="w-3 h-3" /> Estado: {isPaired ? 'VINCULADOS' : 'Desconectado'}
          </div>

          <h2 className="text-4xl font-serif font-medium leading-tight text-zinc-100">
            Hola, <span className="text-zinc-500 italic">{user.user_metadata.full_name || 'Amante'}</span>.
          </h2>
          <p className="text-zinc-400 text-sm">
            {isPaired
              ? "Tu conexión está establecida. Próximamente la experiencia comenzará aquí."
              : "Tu sesión está activa pero solitaria. Para iniciar la experiencia, necesitas vincularte."}
          </p>
        </section>

        {/* Action Cards */}
        <div className="grid gap-4">

          {!isPaired ? (
            <>
              {/* Connect Card */}
              <a href="/connect" className="group block">
                <Card className="bg-zinc-900/50 border-zinc-800 p-6 flex items-center justify-between hover:bg-zinc-900/80 hover:border-red-900/30 transition-all cursor-pointer group-hover:shadow-[0_0_30px_-5px_rgba(220,38,38,0.2)]">
                  <div className="space-y-1">
                    <h3 className="text-lg font-serif font-bold text-white group-hover:text-red-500 transition-colors">Vincular Pareja</h3>
                    <p className="text-xs text-zinc-500">Escanea el código QR o comparte el link.</p>
                  </div>
                  <div className="h-10 w-10 bg-black rounded-full grid place-items-center border border-zinc-800 group-hover:border-red-900 group-hover:text-red-500 transition-colors">
                    <Share2 className="w-5 h-5" />
                  </div>
                </Card>
              </a>

              {/* Solo Mode (Disabled) */}
              <div className="opacity-50 grayscale cursor-not-allowed">
                <Card className="bg-transparent border-zinc-900 p-6 flex items-center justify-between border-dashed">
                  <div className="space-y-1">
                    <h3 className="text-lg font-serif font-bold text-zinc-600">Modo Solo</h3>
                    <p className="text-xs text-zinc-700">Exploración individual (Próximamente).</p>
                  </div>
                </Card>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <GameSessionObserver coupleId={currentCouple.id} />
              {/* Active Connection Panel */}
              <Card className="bg-black border-red-900/30 p-6 flex flex-col items-center justify-center space-y-6 shadow-[0_0_50px_-10px_rgba(220,38,38,0.15)]">
                <div className="w-full text-center space-y-1">
                  <p className="text-xs uppercase text-red-500 font-bold tracking-widest animate-pulse">Conexión Segura</p>
                  <h3 className="text-xl font-serif text-white">Listos para empezar</h3>
                </div>

                <div className="flex items-center gap-4 py-2">
                  <div className="w-16 h-16 rounded-full bg-zinc-900 flex items-center justify-center border-2 border-zinc-800 text-xl font-serif">TÚ</div>
                  <div className="h-px bg-gradient-to-r from-zinc-800 via-red-900 to-zinc-800 w-12" />
                  <div className="w-16 h-16 rounded-full bg-red-950 flex items-center justify-center border-2 border-red-900 text-xl font-serif shadow-[0_0_20px_-5px_rgba(220,38,38,0.5)]">P2</div>
                </div>

                <GameStartButton />
              </Card>

              {/* Disconnect Form */}
              <form action={async () => {
                "use server"
                const { unpairCouple } = await import("@/app/actions/pairing")
                await unpairCouple()
              }}>
                <Button variant="outline" type="submit" className="w-full border-zinc-800 text-zinc-500 hover:text-red-400 hover:bg-red-950/20 hover:border-red-900/50">
                  Desvincular Dispositivos
                </Button>
              </form>
            </div>
          )}

        </div>

      </main>
    </div>
  );
}
