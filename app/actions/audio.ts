'use server'

export async function generateTTS(text: string) {
    const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
    
    // Default sensual/mysterious voice ID (e.g. 'Rachel' or any custom one you prefer)
    // For now we use a default known ElevenLabs voice ID, the user can change it later.
    // 'EXAVITQu4vr4xnSDxMaL' is a common default female voice (Bella)
    // 'pNInz6obbfdqGjc1j' is a known generic voice. Let's use Bella as default if none provided.
    const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL'; 

    if (!ELEVENLABS_API_KEY) {
        console.error("Missing ELEVENLABS_API_KEY");
        return { error: "Configuración de audio incompleta" };
    }

    try {
        const response = await fetch(
            `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/stream`,
            {
                method: 'POST',
                headers: {
                    'Accept': 'audio/mpeg',
                    'xi-api-key': ELEVENLABS_API_KEY,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    // Adding zero-width spaces or explicit ellipses between paragraphs forces ElevenLabs to pause longer.
                    text: text.replace(/\n *\n/g, ' ... ... ... '), 
                    model_id: "eleven_multilingual_v2", // Multilingual models are better for Spanish
                    voice_settings: {
                        stability: 0.35, // Lower stability makes the voice more expressive and less monotonic
                        similarity_boost: 0.85, // Higher boost forces it to stick to the soft character of the voice
                        style: 0.2, // Slight style exaggeration for "acting"
                        use_speaker_boost: true
                    }
                }),
            }
        );

        if (!response.ok) {
            const errText = await response.text();
            console.error("ElevenLabs Error:", errText);
            return { error: "No se pudo generar el audio." };
        }

        // Return the binary audio data as a base64 string so it can be played on the client easily
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64Audio = buffer.toString('base64');
        const audioSrc = `data:audio/mpeg;base64,${base64Audio}`;

        return { success: true, audioSrc };
    } catch (error) {
        console.error("TTS Pipeline Error:", error);
        return { error: "Error en el servidor de audio." };
    }
}
