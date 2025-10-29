import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { Mic, MicOff, Volume2, VolumeX, ChefHat, Send } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export function CookWithMe() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [recipeName, setRecipeName] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const { toast } = useToast();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const synthesisRef = useRef<SpeechSynthesisUtterance | null>(null);
  const typewriterIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Typewriter effect state
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setUserInput(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        toast({
          title: "Microphone Error",
          description: "Could not access microphone. Please check permissions.",
          variant: "destructive",
        });
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      window.speechSynthesis.cancel();
    };
  }, [toast]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Typewriter effect for the last AI message
  const typewriterEffect = (text: string, callback?: () => void) => {
    setIsTyping(true);
    setDisplayedText("");
    let index = 0;

    if (typewriterIntervalRef.current) {
      clearInterval(typewriterIntervalRef.current);
    }

    typewriterIntervalRef.current = setInterval(() => {
      if (index < text.length) {
        setDisplayedText((prev) => prev + text.charAt(index));
        index++;
      } else {
        if (typewriterIntervalRef.current) {
          clearInterval(typewriterIntervalRef.current);
        }
        setIsTyping(false);
        if (callback) callback();
      }
    }, 30); // Adjust speed here (lower = faster)
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typewriterIntervalRef.current) {
        clearInterval(typewriterIntervalRef.current);
      }
    };
  }, []);

  const startCookingSession = async () => {
    if (!recipeName.trim()) {
      toast({
        title: "Recipe name required",
        description: "Please enter what you want to cook!",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/cooking/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: "user_" + Date.now(), // Replace with actual user ID
          recipeName: recipeName.trim(),
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setSessionId(data.sessionId);
        const aiMessage: Message = {
          role: "assistant",
          content: data.message,
          timestamp: new Date(),
        };
        setMessages([aiMessage]);
        setCurrentStep(data.currentStep);
        
        // Start typewriter effect
        typewriterEffect(data.message, () => {
          if (voiceMode) {
            speakMessage(data.message);
          }
        });
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!userInput.trim() || !sessionId) return;

    const newMessage: Message = {
      role: "user",
      content: userInput,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, newMessage]);
    setUserInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/cooking/continue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          userMessage: userInput,
          voiceMode,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        const aiMessage: Message = {
          role: "assistant",
          content: data.message,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, aiMessage]);
        setCurrentStep(data.currentStep);

        // Start typewriter effect
        typewriterEffect(data.message, () => {
          if (voiceMode) {
            speakMessage(data.message);
          }
        });
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleListening = () => {
    if (!recognitionRef.current) {
      toast({
        title: "Speech recognition not supported",
        description: "Your browser doesn't support speech recognition.",
        variant: "destructive",
      });
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const toggleVoiceMode = async () => {
    const newVoiceMode = !voiceMode;
    setVoiceMode(newVoiceMode);

    if (!newVoiceMode) {
      window.speechSynthesis.cancel();
    }

    if (sessionId) {
      try {
        await fetch(`/api/cooking/${sessionId}/voice`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ voiceMode: newVoiceMode }),
        });
      } catch (error) {
        console.error("Error updating voice mode:", error);
      }
    }

    toast({
      title: newVoiceMode ? "Voice mode enabled 🔊" : "Voice mode disabled 🔇",
      description: newVoiceMode 
        ? "Elley will now speak her responses" 
        : "Elley will only show text responses",
    });
  };

  // Clean text for speech by removing markdown symbols
  const cleanTextForSpeech = (text: string): string => {
    return text
      // Remove markdown bold/italic symbols
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/\_\_/g, '')
      .replace(/\_/g, '')
      // Remove markdown headers
      .replace(/#{1,6}\s/g, '')
      // Remove horizontal rules
      .replace(/\-{3,}/g, '')
      .replace(/\={3,}/g, '')
      // Remove bullet points and list markers
      .replace(/^\s*[\-\*\+]\s/gm, '')
      .replace(/^\s*\d+\.\s/gm, '')
      // Remove extra whitespace
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  };

  const speakMessage = (text: string) => {
    window.speechSynthesis.cancel();
    
    // Clean the text before speaking
    const cleanedText = cleanTextForSpeech(text);
    
    const utterance = new SpeechSynthesisUtterance(cleanedText);
    utterance.rate = 0.9;
    utterance.pitch = 1.1;
    utterance.volume = 1;
    
    // Try to find a female voice
    const voices = window.speechSynthesis.getVoices();
    const femaleVoice = voices.find(voice => 
      voice.name.includes('Female') || 
      voice.name.includes('Samantha') ||
      voice.name.includes('Victoria')
    );
    if (femaleVoice) {
      utterance.voice = femaleVoice;
    }

    synthesisRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const endSession = async () => {
    if (!sessionId) return;

    try {
      await fetch(`/api/cooking/${sessionId}`, {
        method: "DELETE",
      });

      toast({
        title: "Cooking session ended! 🎉",
        description: "Great job cooking with Elley!",
      });

      setSessionId(null);
      setMessages([]);
      setRecipeName("");
      setCurrentStep(0);
    } catch (error: any) {
      console.error("Error ending session:", error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (sessionId) {
        sendMessage();
      } else {
        startCookingSession();
      }
    }
  };

  return (
    <div className="container mx-auto py-10 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ChefHat className="w-6 h-6" />
            Cook with Elley
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!sessionId ? (
            // Start cooking form
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  What would you like to cook today?
                </label>
                <Input
                  placeholder="e.g., Paneer Tikka, Butter Chicken, Pasta..."
                  value={recipeName}
                  onChange={(e) => setRecipeName(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={loading}
                />
              </div>
              <Button 
                onClick={startCookingSession} 
                disabled={loading || !recipeName.trim()}
                className="w-full"
              >
                {loading ? "Starting..." : "Start Cooking! 👨‍🍳"}
              </Button>
              <div className="text-sm text-gray-600 space-y-1">
                <p>✨ Elley will:</p>
                <ul className="list-disc list-inside ml-4">
                  <li>Ask about ingredients and suggest substitutes</li>
                  <li>Guide you step-by-step through the recipe</li>
                  <li>Answer your questions as you cook</li>
                  <li>Celebrate your progress!</li>
                </ul>
              </div>
            </div>
          ) : (
            // Cooking chat interface
            <div className="space-y-4">
              {/* Header with controls */}
              <div className="flex items-center justify-between pb-4 border-b">
                <div>
                  <h3 className="font-semibold">{recipeName}</h3>
                  <p className="text-sm text-gray-600">Step {currentStep}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleVoiceMode}
                  >
                    {voiceMode ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                    {voiceMode ? " Voice ON" : " Voice OFF"}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={endSession}
                  >
                    End Session
                  </Button>
                </div>
              </div>

              {/* Messages */}
              <div className="h-96 overflow-y-auto space-y-4 p-4 bg-gray-50 rounded-lg">
                {messages.map((msg, idx) => {
                  const isLastMessage = idx === messages.length - 1;
                  const isAI = msg.role === "assistant";
                  const shouldAnimate = isLastMessage && isAI && isTyping;
                  
                  return (
                    <div
                      key={idx}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-3 ${
                          msg.role === "user"
                            ? "bg-blue-500 text-white"
                            : "bg-white border shadow-sm"
                        }`}
                      >
                        <p className="whitespace-pre-wrap">
                          {shouldAnimate ? displayedText : msg.content}
                          {shouldAnimate && <span className="animate-pulse">|</span>}
                        </p>
                        <span className="text-xs opacity-70 mt-1 block">
                          {msg.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  );
                })}
                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-white border shadow-sm rounded-lg p-3">
                      <div className="flex gap-2">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={toggleListening}
                  disabled={loading}
                  className={isListening ? "bg-red-100 border-red-500" : ""}
                >
                  {isListening ? (
                    <Mic className="w-4 h-4 text-red-500 animate-pulse" />
                  ) : (
                    <MicOff className="w-4 h-4" />
                  )}
                </Button>
                <Input
                  placeholder="Type your message or use voice..."
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={loading}
                  className="flex-1"
                />
                <Button onClick={sendMessage} disabled={loading || !userInput.trim()}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>

              {/* Quick actions */}
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" size="sm" onClick={() => setUserInput("Yes, I have all ingredients. Let's start!")}>
                  ✅ Have ingredients
                </Button>
                <Button variant="outline" size="sm" onClick={() => setUserInput("Done! What's next?")}>
                  ✅ Step done
                </Button>
                <Button variant="outline" size="sm" onClick={() => setUserInput("Can you repeat that step?")}>
                  🔄 Repeat
                </Button>
                <Button variant="outline" size="sm" onClick={() => setUserInput("I need help with this step")}>
                  ❓ Need help
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
