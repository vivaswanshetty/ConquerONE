/**
 * GEMINI EXPERIMENTAL STABLE ENGINE
 * This version uses the 'LATEST' aliases which are optimized for your specific API tier.
 */

const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

export async function getGeminiCoachResponse(userMessage, chatHistory = []) {
    // We use 'latest' aliases as they are the most reliable for your API tier
    const models = ["gemini-flash-latest", "gemini-pro-latest"];

    for (const model of models) {
        try {
            return await callGeminiAPI(model, userMessage, chatHistory);
        } catch (error) {
            // Handle specific error codes
            const errorMsg = error.message;
            if (errorMsg.includes("404") || errorMsg.includes("429") || errorMsg.includes("500")) {
                console.warn(`[Gemini AI] Model ${model} unavailable (Error: ${errorMsg}). Hub-switching...`);
                continue;
            }
            throw error;
        }
    }
    throw new Error("ALL_COACH_CHANNELS_BUSY");
}

async function callGeminiAPI(modelName, message, history) {
    if (!apiKey || apiKey === "YOUR_API_KEY_HERE") throw new Error("401_KEY_MISSING");

    // Using v1beta as the latest experimental models (Gemini 3 family) require it
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    const systemPrompt = "You are the 'CONQUER ONE' fitness coach. You are encouraging, direct, and use simple but powerful words. Avoid overly scientific or mechanical jargon. Speak like a real human coach who is motivating and clear. Keep your advice practical, athletic, and friendly. Limit response to 100 words.";

    let contents = [
        { role: "user", parts: [{ text: `Act as my coach with these rules: ${systemPrompt}. Now respond to my next message.` }] },
        { role: "model", parts: [{ text: "Understood! I'm here and ready to help you crush your session. What's on your mind today?" }] }
    ];

    history.forEach(msg => {
        if (msg.id !== "1") {
            contents.push({
                role: msg.role === "user" ? "user" : "model",
                parts: [{ text: msg.content }]
            });
        }
    });

    contents.push({ role: "user", parts: [{ text: message }] });

    const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents })
    });

    const data = await response.json();

    if (data.error) {
        throw new Error(data.error.code ? data.error.code.toString() : "API_ERROR");
    }

    if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
        return data.candidates[0].content.parts[0].text;
    }

    throw new Error("EMPTY_RESPONSE");
}
