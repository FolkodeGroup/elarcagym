
import { GoogleGenAI, Type } from "@google/genai";
import { Member } from "../types";

const apiKey = process.env.API_KEY || ''; 

// Helper to create client
const getAiClient = () => {
    if(!apiKey) console.warn("Gemini API Key missing");
    return new GoogleGenAI({ apiKey });
}

export const generateDietPlan = async (member: Member, calories: number) => {
    const ai = getAiClient();
    const prompt = `Crea un resumen de plan alimenticio diario para ${member.firstName} con un objetivo de ${calories} calorías. Manténlo simple y saludable. Todo el texto en ESPAÑOL.`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        name: { type: Type.STRING, description: "Nombre del plan de dieta" },
                        calories: { type: Type.NUMBER },
                        description: { type: Type.STRING, description: "Descripción completa del plan en Español" }
                    }
                }
            }
        });
        return JSON.parse(response.text);
    } catch (error) {
        console.error("Error generating diet:", error);
        throw error;
    }
}
