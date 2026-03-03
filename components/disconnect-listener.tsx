'use client';

import { useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';

export function DisconnectListener({ coupleId }: { coupleId: string }) {
    useEffect(() => {
        if (!coupleId) return;

        const supabase = createClient();

        const channel = supabase
            .channel(`couple_delete_${coupleId}`)
            .on(
                'postgres_changes',
                {
                    event: 'DELETE',
                    schema: 'public',
                    table: 'couples',
                    filter: `id=eq.${coupleId}`
                },
                () => {
                    console.log("Couple deleted via Realtime. Redirecting...");
                    window.location.assign('/');
                }
            )
            .subscribe();

        // Fallback polling to ensure we catch disconnects if WebSockets drop
        const pollInterval = setInterval(async () => {
            const { data, error } = await supabase
                .from('couples')
                .select('id')
                .eq('id', coupleId)
                .single();

            if (error || !data) {
                console.log("Polling Sync: Couple connection missing. Redirecting...");
                window.location.assign('/');
            }
        }, 5000);

        return () => {
            supabase.removeChannel(channel);
            clearInterval(pollInterval);
        };
    }, [coupleId]);

    return null; // Invisible functional component
}
