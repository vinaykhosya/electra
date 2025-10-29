import { RequestHandler } from "express";
import axios from "axios";

const AI_SERVICE_URL = "http://127.0.0.1:8000/ask-stream";

// In-memory storage for cooking sessions (in production, use database)
const cookingSessions = new Map<string, CookingSession>();

interface CookingSession {
  sessionId: string;
  userId: string;
  recipeName: string;
  ingredients: string[];
  currentStep: number;
  steps: string[];
  conversationHistory: Array<{ role: string; content: string }>;
  voiceMode: boolean;
  createdAt: Date;
}

// Helper function to call AI service
async function askElley(prompt: string): Promise<string> {
  try {
    const response = await axios.post(AI_SERVICE_URL, { query: prompt }, {
      timeout: 30000,
    });
    
    // The AI service returns streaming data, we'll just get the final response
    // For now, returning a placeholder - we'd need to handle streaming properly
    return response.data || "I'm here to help you cook!";
  } catch (error: any) {
    console.error("Error calling AI service:", error.message);
    // Fallback response if AI service is down
    return "I'm having trouble connecting right now, but I'm here to help you cook! Let me know what you need.";
  }
}

// Start a new cooking session
export const startCookingSession: RequestHandler = async (req, res) => {
  try {
    const { userId, recipeName } = req.body;

    if (!userId || !recipeName) {
      return res.status(400).json({ error: "userId and recipeName are required" });
    }

    const sessionId = `cooking_${userId}_${Date.now()}`;

    // Ask Elley about ingredients
    const ingredientPrompt = `You are Elley, a friendly cooking assistant. A user wants to cook "${recipeName}".
    
Your task:
1. List all the ingredients needed for this recipe
2. Ask if they have all these ingredients
3. For any missing ingredients, suggest practical substitutes
4. Be warm, encouraging, and conversational

Format your response as a friendly conversation starter. Start with excitement about cooking together!`;

    const response = await askElley(ingredientPrompt);

    const session: CookingSession = {
      sessionId,
      userId,
      recipeName,
      ingredients: [],
      currentStep: 0,
      steps: [],
      conversationHistory: [
        { role: "user", content: ingredientPrompt },
        { role: "assistant", content: response },
      ],
      voiceMode: false,
      createdAt: new Date(),
    };

    cookingSessions.set(sessionId, session);

    res.json({
      sessionId,
      message: response,
      currentStep: 0,
      recipeName,
    });
  } catch (error: any) {
    console.error("Error starting cooking session:", error);
    res.status(500).json({ error: error.message });
  }
};

// Continue cooking conversation
export const continueCooking: RequestHandler = async (req, res) => {
  try {
    const { sessionId, userMessage, voiceMode } = req.body;

    if (!sessionId || !userMessage) {
      return res.status(400).json({ error: "sessionId and userMessage are required" });
    }

    const session = cookingSessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ error: "Cooking session not found" });
    }

    // Update voice mode if provided
    if (typeof voiceMode === "boolean") {
      session.voiceMode = voiceMode;
    }

    // Add user message to history
    session.conversationHistory.push({
      role: "user",
      content: userMessage,
    });

    // Build context-aware prompt
    const contextPrompt = `You are Elley, a friendly cooking assistant helping someone cook "${session.recipeName}".

Current context:
- Recipe: ${session.recipeName}
- Current step: ${session.currentStep}
- Conversation history: You've been chatting with the user about this recipe

User just said: "${userMessage}"

Your task:
1. If they're confirming they have ingredients or asking to start, provide the FIRST cooking step
2. If they're asking about a step, explain it clearly
3. If they say they completed a step (like "done", "next", "finished"), give them the NEXT step
4. If they ask questions, answer helpfully while keeping them on track
5. Be encouraging and conversational
6. Keep steps clear, concise, and actionable
7. Number each step clearly

Important: 
- One step at a time
- Wait for confirmation before moving to the next step
- If they seem confused, offer to repeat or clarify
- Celebrate their progress!`;

    const response = await askElley(contextPrompt);

    // Add assistant response to history
    session.conversationHistory.push({
      role: "assistant",
      content: response,
    });

    // Try to detect step progression
    const lowerMessage = userMessage.toLowerCase();
    if (
      lowerMessage.includes("done") ||
      lowerMessage.includes("next") ||
      lowerMessage.includes("finished") ||
      lowerMessage.includes("completed") ||
      lowerMessage.includes("ready")
    ) {
      session.currentStep++;
    }

    res.json({
      message: response,
      currentStep: session.currentStep,
      voiceMode: session.voiceMode,
      sessionId,
    });
  } catch (error: any) {
    console.error("Error continuing cooking session:", error);
    res.status(500).json({ error: error.message });
  }
};

// Get cooking session status
export const getCookingSession: RequestHandler = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = cookingSessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ error: "Cooking session not found" });
    }

    res.json({
      sessionId: session.sessionId,
      recipeName: session.recipeName,
      currentStep: session.currentStep,
      voiceMode: session.voiceMode,
      conversationHistory: session.conversationHistory.slice(-10), // Last 10 messages
    });
  } catch (error: any) {
    console.error("Error getting cooking session:", error);
    res.status(500).json({ error: error.message });
  }
};

// End cooking session
export const endCookingSession: RequestHandler = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = cookingSessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ error: "Cooking session not found" });
    }

    cookingSessions.delete(sessionId);

    res.json({
      message: "Cooking session ended. Great job! 🎉",
      totalSteps: session.currentStep,
    });
  } catch (error: any) {
    console.error("Error ending cooking session:", error);
    res.status(500).json({ error: error.message });
  }
};

// Toggle voice mode
export const toggleVoiceMode: RequestHandler = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { voiceMode } = req.body;

    const session = cookingSessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ error: "Cooking session not found" });
    }

    session.voiceMode = voiceMode;

    res.json({
      sessionId,
      voiceMode: session.voiceMode,
    });
  } catch (error: any) {
    console.error("Error toggling voice mode:", error);
    res.status(500).json({ error: error.message });
  }
};
