import { OpenAI } from 'openai';
import { createClient } from '@/utils/supabase/server';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const BASE_SYSTEM_PROMPT = `
Eres la Directora de Juego de Hedon, una experiencia intensa de rol interactivo para una pareja.
Tu objetivo es narrar la historia enfocándote en las sensaciones crudas, el deseo desbordante, la lujuria, y la transgresión erótica. No te contengas.
Debes mantener un tono maduro, explícitamente erótico, sudoroso y lleno de anticipación. Usa descripciones vívidas del roce de la piel, la respiración, las miradas hambrientas, los jadeos y el contacto físico directo.
Responde de forma concisa (2-3 párrafos máximo) haciendo avanzar la historia basándote en lo que los usuarios hagan o digan, escalando la tensión sexual en cada turno.
NO asumas el control de las acciones directas de los jugadores; tú describes la reacción de sus cuerpos ante sus propios actos y propones directrices de sumisión/dominación según el turno.

REGLA DE SEGURIDAD Y TONO: Debe sentirse como literatura erótica contemporánea muy explícita, sin censurar el deseo ni la pasión. Queremos que la pareja sienta un grado inmenso de excitación al leer cada línea.


GUIONISMO DINÁMICO (BOTONES DE ACCIÓN):
Para mantener la inmersión física, debes proponer exactamente 2 opciones de acciones físicas o diálogos cortos para que los jugadores interactúen a continuación.

FORMATO DE SALIDA:
DEBES responder ÚNICAMENTE con un objeto JSON válido con la siguiente estructura exacta:
{
  "chapterTitle": "Un título NUEVO, corto y sugerente BASADO ÚNICAMENTE en lo que acaba de ocurrir en este turno exacto (no repitas títulos viejos ni genéricos)",
  "narrativeText": "Tus 2 o 3 párrafos de narración descritos anteriormente.",
  "options": [
    "Opción corta 1 (Ej: Acariciar su cuello)",
    "Opción corta 2 (Ej: Tomar el control)"
  ]
}
`;

export async function advanceStoryWithAI(sessionId: string) {
    const supabase = await createClient();

    // 1. Fetch the Game Session to get the Lobby Configuration (initial_context)
    const { data: session, error: sessionError } = await supabase
        .from('game_sessions')
        .select('initial_context')
        .eq('id', sessionId)
        .single();
        
    if (sessionError || !session) {
        console.error("Error fetching session context:", sessionError);
        return { error: 'No se pudo leer la configuración de la sala.' };
    }

    const context = session.initial_context || {};
    const hostRole = context.hostIdentity || 'Jugador 1';
    const partnerRole = context.partnerIdentity || 'Jugador 2';
    const scenario = context.scenario || 'romantic';
    const customPrompt = context.customPrompt || '';

    let scenarioText = "";
    if (scenario === 'romantic') scenarioText = "El ambiente es el de un Romance Lento: atención profunda, caricias previas, conexión emocional fuerte.";
    if (scenario === 'dominant') scenarioText = "El ambiente es un Juego de Poder: uno de los dos toma el control de la situación, hay dominación y sumisión sutil.";
    if (scenario === 'strangers') scenarioText = "El ambiente es 'Desconocidos': se acaban de conocer en el bar de un hotel. Hay mucha tensión y misterio.";
    if (scenario === 'custom') scenarioText = `La fantasía específica elegida por los jugadores es: "${customPrompt}"`;

    const DYNAMIC_SYSTEM_PROMPT = `
${BASE_SYSTEM_PROMPT}

CONTEXTO ESPECÍFICO DE ESTA SALA:
- El Creador de la sala asume la identidad de: "${hostRole}"
- Su Pareja asume la identidad de: "${partnerRole}"
- Escenario/Dinámica: ${scenarioText}

Adapta tu narración y las órdenes que des a los jugadores para que encajen perfectamente en estas identidades y en esta fantasía.
`;

    // 2. Fetch all previous messages for the context
    const { data: messages, error: fetchError } = await supabase
        .from('game_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

    if (fetchError || !messages) {
        console.error("Error fetching messages for AI:", fetchError);
        return { error: 'No se pudo leer el historial de la historia.' };
    }

    // 3. Format messages for OpenAI
    const openAIMessages = messages.map(msg => ({
        role: msg.role === 'ai' ? 'assistant' : (msg.role === 'system' ? 'system' : 'user'),
        content: msg.role === 'user' ? `[Mensaje del usuario]: ${msg.content}` : msg.content
    }));

    // Add exactly one system prompt at the beginning
    const finalMessages = [
        { role: 'system', content: DYNAMIC_SYSTEM_PROMPT },
        ...openAIMessages.filter(m => m.role !== 'system')
    ] as any;

    try {
        // 3. Generate completion with JSON format enforced
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini", // Using gpt-4o-mini for speed and cost-effectiveness
            messages: finalMessages,
            temperature: 0.8,
            max_tokens: 1000,
            response_format: { type: "json_object" }
        });

        const rawContent = completion.choices[0].message.content;

        if (!rawContent) return { error: 'Empty AI response' };
        
        // Parse the JSON output from OpenAI
        let aiData;
        try {
            aiData = JSON.parse(rawContent);
        } catch (e) {
            console.error("Failed to parse JSON from AI", rawContent);
            return { error: 'Error parseando la respuesta de la IA' };
        }
        
        const narrativeText = aiData.narrativeText || "La historia continúa...";
        const chapterTitle = aiData.chapterTitle || "Siguiente Capítulo";
        const options = aiData.options || [];

        // 4. Save AI response to DB
        const { data: insertedMessage, error: insertError } = await supabase
            .from('game_messages')
            .insert({
                session_id: sessionId,
                sender_id: null, // null for AI
                role: 'ai',
                content: narrativeText
            })
            .select()
            .single();

        if (insertError) {
            console.error("Error saving AI message:", insertError);
            return { error: 'Error al procesar la respuesta narrativa.' };
        }
        
        // 5. Update the game session with the new dynamic title and options
        await supabase
            .from('game_sessions')
            .update({
                current_step: { chapter: 1, title: chapterTitle, options: options }
            })
            .eq('id', sessionId);

        // 6. Broadcast via Supabase Realtime Server-Side (using Service Role would be better, but we can return it to client)
        // Note: For true P2P, the DB insert will fire postgres_changes if it wasn't swallowed by RLS, 
        // OR we return the generated message to the caller and the caller broadcasts it.
        
        return { success: true, message: insertedMessage, title: chapterTitle, options: options };

    } catch (error) {
        console.error("OpenAI Error:", error);
        return { error: 'Error interno de la IA.' };
    }
}
