import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/login");
  }

  // Security Verification (Hardcoded or Env-based)
  // Fallback to allow entry if env is not completely set up yet so you can configure it,
  // but we heavily warn the user.
  const adminEmailsList = (process.env.ADMIN_EMAILS || "").split(",").map(e => e.trim());
  
  // Si la variable está definida pero el mail no coincide, bloquéalo.
  if (process.env.ADMIN_EMAILS && !adminEmailsList.includes(user.email || "")) {
      return redirect("/");
  }

  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-12 font-sans overflow-y-auto">
      {/* SECURITY BANNER IF OPEN */}
      {!process.env.ADMIN_EMAILS && (
          <div className="bg-red-900 text-white p-3 text-center text-xs font-bold tracking-widest uppercase mb-6 rounded-md border border-red-500 shadow-[0_0_20px_rgba(220,38,38,0.5)]">
             ⚠️ ADVERTENCIA: El Dashboard está público. Añade ADMIN_EMAILS=tu_correo en .env.local para asegurarlo.
          </div>
      )}
      
      {/* SERVICE KEY BANNER */}
      {!process.env.SUPABASE_SERVICE_ROLE_KEY && (
          <div className="bg-orange-900 text-white p-3 text-center text-xs font-bold mb-6 rounded-md">
             Falta la variable SUPABASE_SERVICE_ROLE_KEY en el .env.local para poder listar a los usuarios.
          </div>
      )}

      {children}
    </div>
  );
}
