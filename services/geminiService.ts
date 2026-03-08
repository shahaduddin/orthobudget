import { GoogleGenAI } from "@google/genai";
import { Transaction, TransactionType, AiInsight } from "../types";

// NOTE: In a production environment, never expose your API key in the frontend code.
// Ideally, this call should go through your own backend proxy.
const API_KEY = process.env.API_KEY || ''; 

const ai = new GoogleGenAI({ apiKey: API_KEY });

export const analyzeSpendingHabits = async (transactions: Transaction[]): Promise<AiInsight[]> => {
  if (!API_KEY) {
    return [{
      title: "API Key Missing",
      message: "Please configure the Gemini API key to use AI features.",
      type: "neutral"
    }];
  }

  if (transactions.length === 0) {
    return [{
      title: "No Data",
      message: "Add some transactions to get AI insights!",
      type: "neutral"
    }];
  }

  // Prepare prompt context
  const recentTx = transactions.slice(0, 50).map(t => 
    `${t.date}: ${t.type} - ${t.category} - $${t.amount} (${t.description})`
  ).join('\n');

  const prompt = `
    You are a financial advisor. Analyze the following recent transactions for a user.
    Provide 3 concise, actionable insights or tips. 
    Format the response as a JSON array of objects with keys: "title", "message", "type" (positive, negative, or neutral).
    Do not use markdown formatting in the response, just raw JSON.
    
    Transactions:
    ${recentTx}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    return JSON.parse(text) as AiInsight[];
  } catch (error) {
    console.error("Gemini Error:", error);
    return [{
      title: "Analysis Failed",
      message: "Could not generate insights at this time. Please try again later.",
      type: "negative"
    }];
  }
};
