import { Link, useLocation } from "react-router-dom";
import { Bot } from "lucide-react";

export function FloatingElleyButton() {
  const { pathname } = useLocation();

  // hide the floating button on the Elley page itself
  if (pathname === "/elley") return null;

  return (
    <Link to="/elley" aria-label="Open Elley" className="fixed bottom-6 right-6 z-50">
      <div className="h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:scale-105 transition-transform">
        <Bot className="h-6 w-6" />
      </div>
    </Link>
  );
}

export default FloatingElleyButton;
