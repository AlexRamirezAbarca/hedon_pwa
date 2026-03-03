'use client';

import { useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

export function GameSessionObserver({ coupleId }: { coupleId: string }) {
    const router = useRouter();

    useEffect(() => {
        if (!coupleId) return;
        const supabase = createClient();

        // 1. Listen for couple deletions (Disconnects)
        const disconnectChannel = supabase
            .channel(`couple_delete_${coupleId}`)
            .on(
                'postgres_changes',
                { event: 'DELETE', schema: 'public', table: 'couples', filter: `id=eq.${coupleId}` },
                () => {
                    console.log("Couple deleted via Realtime. Redirecting...");
                    window.location.assign('/');
                }
            )
            .subscribe();

        // 2. Poll fallback for both Disconnects & New Game Sessions
        // (Using polling for Game Sessions because RLS might prevent full realtime visibility on initial insert without extra DB setup)
        const pollInterval = setInterval(async () => {
            // Check if couple still exists
            const { data: coupleData, error: coupleError } = await supabase
                .from('couples')
                .select('id')
                .eq('id', coupleId)
                .single();

            if (coupleError || !coupleData) {
                console.log("Polling Sync: Couple connection missing. Redirecting...");
                window.location.assign('/');
                return;
            }

            // Check if an active game session exists
            const { data: sessionData } = await supabase
                .from('game_sessions')
                .select('id')
                .eq('couple_id', coupleId)
                .eq('status', 'ACTIVE')
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (sessionData && sessionData.id) {
                console.log("Polling Sync: Game session detected. Joining room...");
                router.push(`/lobby/${sessionData.id}`);
            }

        }, 3000);

        return () => {
            supabase.removeChannel(disconnectChannel);
            clearInterval(pollInterval);
        };
    }, [coupleId, router]);

    return null;
}
