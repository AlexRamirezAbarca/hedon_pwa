import { Playfair_Display } from "next/font/google";
import { getAllUsers } from "@/app/actions/admin";
import { AdminTableClient } from "./admin-client";
import { ShieldAlert } from "lucide-react";

const playfair = Playfair_Display({ subsets: ["latin"] });

export default async function AdminDashboardPage() {
    const { users, error } = await getAllUsers();

    return (
        <div className="max-w-5xl mx-auto">
            <header className="mb-12 border-b border-zinc-900 pb-6">
                <h1 className={`${playfair.className} text-4xl font-black tracking-tight flex items-center gap-3`}>
                    Hedon<span className="text-red-700">.</span> 
                    <span className="text-zinc-500 font-sans text-xl uppercase tracking-widest font-normal">Command Center</span>
                </h1>
                <p className="text-zinc-500 text-sm mt-2">Visión global de clientes y acceso de monetización.</p>
            </header>

            <main>
                {error ? (
                    <div className="bg-red-950/20 border border-red-900/50 p-6 rounded-xl flex items-center gap-4 text-red-400">
                        <ShieldAlert className="w-8 h-8" />
                        <div>
                            <h3 className="font-bold">Acceso a Supabase Denegado</h3>
                            <p className="text-sm opacity-80">{error}</p>
                        </div>
                    </div>
                ) : (
                    <AdminTableClient initialUsers={users} />
                )}
            </main>
        </div>
    )
}
