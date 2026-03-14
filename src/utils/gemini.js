/**
 * GEMINI AI COACH ENGINE
 * Ultra-resilient with automatic model fallback, caching, and graceful degradation.
 */

const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

// Cache the last model that worked so we try it first next time
let _lastWorkingModel = null;

// Master model list — ordered by preference
const ALL_MODELS = [
    "gemini-2.5-flash",
    "gemini-flash-latest",
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    "gemini-pro-latest",
    "gemini-flash-lite-latest",
];

export async function getGeminiCoachResponse(userMessage, chatHistory = []) {
    // Build smart model order: last working model first, then the rest
    let models = [...ALL_MODELS];
    if (_lastWorkingModel) {
        models = [_lastWorkingModel, ...models.filter(m => m !== _lastWorkingModel)];
    }

    let lastError = null;
    for (const model of models) {
        try {
            const result = await callGeminiAPI(model, userMessage, chatHistory);
            _lastWorkingModel = model; // Remember what worked
            return result;
        } catch (error) {
            lastError = error;
            console.warn(`[Gemini AI] ${model} failed: ${error.message.slice(0, 80)}. Trying next...`);
            continue;
        }
    }

    // ALL models failed — return a graceful offline response instead of crashing
    console.error("[Gemini AI] All models exhausted. Returning offline response.");
    return getOfflineResponse(userMessage);
}

/**
 * Graceful offline responses when API is unavailable.
 * This ensures the user NEVER sees an error — the coach always responds.
 */
function getOfflineResponse(userMessage) {
    const msg = userMessage.toLowerCase();

    if (msg.includes("motivat") || msg.includes("quote")) {
        return "**\"The only bad workout is the one that didn't happen.\"**\n\nEvery set, every rep — it all adds up. You showed up today, and that's what separates you from the rest. Keep going! 💪";
    }
    if (msg.includes("recover") || msg.includes("rest") || msg.includes("sore")) {
        return "Recovery is where the magic happens! Here's your checklist:\n\n- **Sleep** 7-9 hours tonight\n- **Hydrate** — aim for 3L of water\n- **Protein** within 30 min post-workout\n- **Stretch** for 10 minutes\n\nYour muscles grow during rest, not during the workout. Trust the process!";
    }
    if (msg.includes("meal") || msg.includes("food") || msg.includes("eat") || msg.includes("diet") || msg.includes("nutrition")) {
        return "Great question! Post-workout fuel matters:\n\n- **Protein**: Chicken, eggs, or greek yogurt (30-40g)\n- **Carbs**: Brown rice, sweet potato, or oats\n- **Timing**: Eat within 45 minutes after training\n\nKeep it simple, keep it consistent. You don't need a perfect diet — just a good one, every day.";
    }
    if (msg.includes("workout") || msg.includes("exercise") || msg.includes("tip")) {
        return "Here's a power tip for your next session:\n\n**Mind-muscle connection** — don't just move the weight, FEEL the muscle working. Slow down your reps, squeeze at the top, and control the negative.\n\nQuality always beats quantity. Own every single rep! 🔥";
    }
    if (msg.includes("streak") || msg.includes("progress")) {
        return "Your consistency is what matters most! Every single day you show up, you're building something special.\n\n**Remember:** Progress isn't always visible. Some days the win is just showing up. Keep that streak alive — future you will thank you! 🔥";
    }
    if (msg.includes("burnout") || msg.includes("tired") || msg.includes("unmotivat")) {
        return "Feeling burnt out? That's actually your body telling you something important.\n\n- Take a **deload week** — go lighter\n- Try a **different workout style**\n- Remember your **WHY** — why did you start?\n\nIt's okay to rest. Champions take breaks, they just never quit.";
    }

    // Generic motivational response
    const responses = [
        "I'm your CONQUER ONE coach, and I'm here for you! Right now I'm running in offline mode, but that doesn't stop us. What's your main fitness goal this week? Let's break it down! 💪",
        "Hey champion! I'm temporarily in offline mode, but here's what I know — you showed up, you asked, and that means you're committed. Remember: **consistency beats intensity**. Keep pushing! 🔥",
        "Great to hear from you! I'm running offline right now, but let me leave you with this: every workout is a vote for the person you're becoming. Make today count! 💪",
    ];
    return responses[Math.floor(Math.random() * responses.length)];
}

async function callGeminiAPI(modelName, message, history) {
    if (!apiKey || apiKey === "YOUR_API_KEY_HERE") {
        throw new Error("API key not configured. Set EXPO_PUBLIC_GEMINI_API_KEY in your .env file.");
    }

    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    const systemPrompt = "You are the 'CONQUER ONE' fitness coach. You are encouraging, direct, and use simple but powerful words. Avoid overly scientific or mechanical jargon. Speak like a real human coach who is motivating and clear. Keep your advice practical, athletic, and friendly. Limit response to 100 words.";

    let contents = [
        { role: "user", parts: [{ text: `Act as my coach with these rules: ${systemPrompt}. Now respond to my next message.` }] },
        { role: "model", parts: [{ text: "Understood! I'm here and ready to help you crush your session. What's on your mind today?" }] }
    ];

    // Add chat history (skip welcome message at index 0)
    if (history && history.length > 1) {
        history.slice(1).forEach(msg => {
            if (msg && msg.content) {
                contents.push({
                    role: msg.role === "user" ? "user" : "model",
                    parts: [{ text: msg.content }]
                });
            }
        });
    }

    contents.push({ role: "user", parts: [{ text: message }] });

    let response;
    try {
        response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents })
        });
    } catch (networkError) {
        throw new Error(`NETWORK_ERROR: ${networkError.message}`);
    }

    let data;
    try {
        data = await response.json();
    } catch (parseError) {
        throw new Error(`PARSE_ERROR: Status ${response.status}`);
    }

    if (data.error) {
        const code = data.error.code || response.status;
        const msg = data.error.message || "Unknown API error";
        throw new Error(`${code}: ${msg}`);
    }

    if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
        return data.candidates[0].content.parts[0].text;
    }

    // Handle blocked responses
    if (data.candidates && data.candidates[0]?.finishReason === "SAFETY") {
        return "I want to help, but let's keep our conversation focused on fitness and health! What workout question can I answer for you?";
    }

    throw new Error("EMPTY_RESPONSE");
}
