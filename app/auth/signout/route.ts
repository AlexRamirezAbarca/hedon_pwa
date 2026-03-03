import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function POST(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  
  // Clear the entire router cache to avoid "snapshot" ghosting
  revalidatePath('/', 'layout');
  
  return redirect("/login");
}
