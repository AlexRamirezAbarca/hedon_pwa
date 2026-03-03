require('dotenv').config({ path: '.env.local' });
const { OpenAI } = require('openai');

async function testKey() {
    console.log("Validando llave de OpenAI...");
    
    if (!process.env.OPENAI_API_KEY) {
        console.error("❌ ERROR: No se encontró OPENAI_API_KEY en el archivo .env.local");
        process.exit(1);
    }

    try {
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const completion = await openai.models.list();
        console.log("✅ ÉXITO: La llave es válida y tiene permisos de lectura de modelos.");
        
        // Let's do a tiny generation test
        const testRes = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: "Say 'Hedon is alive' in exactly 3 words" }],
            max_tokens: 10
        });
        console.log("🤖 IA Responde:", testRes.choices[0].message.content);
        console.log("¡Todo listo para la historia!");
    } catch (e) {
        console.error("❌ ERROR con OpenAI:", e.message);
    }
}

testKey();
