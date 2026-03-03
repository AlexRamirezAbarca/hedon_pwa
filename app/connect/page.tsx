import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getOrCreateCoupleCode } from "@/app/actions/pairing";
import { ConnectClient } from "./connect-client";

export const dynamic = 'force-dynamic';

export default async function ConnectPage() {
    const supabase = await createClient();

    // 1. Verify Auth & Payment
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return redirect("/login");
    if (user.user_metadata?.has_paid !== true) return redirect("/compra");

    // 2. Fetch or Create Couple Code from DB
    const res = await getOrCreateCoupleCode();

    // Safely fallback if action fails
    const myJoinCode = res.success ? (res.code as string) : "ERR...";
    const status = res.success ? (res.status as string) : "PENDING";
    const coupleId = res.success ? (res.id as string) : undefined;

    return (
        <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
            <header className="mb-8 text-center">
                <h1 className="text-3xl font-serif font-bold tracking-tight">Vincular Pareja</h1>
                <p className="text-zinc-500 text-sm mt-2">Escanea o comparte para conectar.</p>
            </header>

            <ConnectClient
                initialCode={myJoinCode}
                initialStatus={status}
                coupleId={coupleId}
            />
        </div>
    );
}
