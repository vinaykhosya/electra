import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Bot, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type Message = {
  sender: 'user' | 'ai';
  text: string;
};

export function RecipeAI() {
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

  return (
    <Card className="border-border/60 bg-card/80 backdrop-blur">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Bot className="h-5 w-5 text-primary" />
          Elley Assistant
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
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text || " "}</ReactMarkdown>
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
      </CardContent>
    </Card>
  );
}

