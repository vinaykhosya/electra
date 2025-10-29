import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Bot, User, ChefHat } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useNavigate } from 'react-router-dom';

type Message = {
  sender: 'user' | 'ai';
  text: string;
};

export default function Elley() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([
    { sender: 'ai', text: "Hello! I'm Elley. How can I help you in the kitchen today?" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Effect to auto-scroll to the bottom of the chat on new messages
  useEffect(() => {
    chatContainerRef.current?.scrollTo({ top: chatContainerRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { sender: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setInput('');

    // Add a placeholder for the AI's response that we will fill
    setMessages(prev => [...prev, { sender: 'ai', text: '' }]);

    try {
      // Fetch the streaming response from our backend bridge
      const response = await fetch('/api/ai/recipe-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: input }),
      });

      if (!response.body) return;
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      // Read the stream chunk by chunk
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        // Append the new chunk to the last AI message
        setMessages(prev => {
          const lastMessage = prev[prev.length - 1];
          lastMessage.text += chunk;
          return [...prev.slice(0, -1), lastMessage];
        });
      }

    } catch (error) {
      setMessages(prev => {
        const lastMessage = prev[prev.length - 1];
        lastMessage.text = "Sorry, I had trouble connecting. Please make sure the AI server is running and try again.";
        return [...prev.slice(0, -1), lastMessage];
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to extract YouTube preview info from custom tag
  function extractYouTubePreview(text: string): { id: string, url: string } | null {
    const match = text.match(/<youtube-preview id='([\w-]{11})' url='([^']+)' \/>/);
    if (!match) return null;
    return { id: match[1], url: match[2] };
  }

  // Find the last AI message with a YouTube preview tag
  const lastAiMsgIndex = messages.slice().reverse().findIndex(m => m.sender === 'ai' && extractYouTubePreview(m.text));
  const lastAiMsg = lastAiMsgIndex !== -1 ? messages[messages.length - 1 - lastAiMsgIndex] : null;
  const ytPreview = lastAiMsg ? extractYouTubePreview(lastAiMsg.text) : null;

  // Remove <youtube-preview> tag from message text for display
  function cleanMessageText(text: string): string {
    return text.replace(/<youtube-preview id='[\w-]{11}' url='[^']+' \/>/, '').trim();
  }

  return (
    <Card className="border-border/60 bg-card/80 backdrop-blur">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Bot className="h-5 w-5 text-primary" />
          Elley
        </CardTitle>
        <CardDescription>
          Your smart culinary partner. Ask for recipes, cooking tips, and more.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div ref={chatContainerRef} className="h-80 overflow-y-auto rounded-lg border bg-background/50 p-4 space-y-4">
          {messages.map((msg, index) => (
             <div key={index} className={`flex items-start gap-3 ${msg.sender === 'user' ? 'justify-end' : ''}`}>
              {msg.sender === 'ai' && <Bot className="h-5 w-5 text-primary flex-shrink-0" />}
              <div className={`prose prose-sm dark:prose-invert max-w-full rounded-lg px-3 py-2 ${msg.sender === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.sender === 'ai' ? cleanMessageText(msg.text) : (msg.text || " ")}</ReactMarkdown>
              </div>
              {msg.sender === 'user' && <User className="h-5 w-5 flex-shrink-0" />}
            </div>
          ))}
          {isLoading && messages[messages.length - 1]?.text === '' && (
             <div className="flex items-start gap-3">
               <Bot className="h-5 w-5 text-primary flex-shrink-0" />
               <div className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground animate-pulse">
                 Thinking...
               </div>
             </div>
          )}
        </div>
        {/* Show YouTube video in an iframe below the chat box if a video is present */}
        {ytPreview && (
          <div className="mt-4 flex justify-center">
            <iframe
              width="360"
              height="215"
              src={`https://www.youtube.com/embed/${ytPreview.id}`}
              title="YouTube video player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="rounded-lg shadow-lg"
            />
          </div>
        )}
        <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask for a recipe..."
            disabled={isLoading}
          />
          <Button type="submit" disabled={isLoading}>
            Send
          </Button>
        </form>
        
        {/* Cook with Me Button */}
        <div className="mt-4 pt-4 border-t">
          <Button 
            onClick={() => navigate('/cook-with-me')}
            variant="outline"
            className="w-full flex items-center justify-center gap-2"
          >
            <ChefHat className="w-4 h-4" />
            Cook with Me - Interactive Cooking Guide
          </Button>
          <p className="text-xs text-center text-muted-foreground mt-2">
            Get step-by-step cooking guidance with voice support
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
