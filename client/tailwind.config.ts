import type { Config } from "tailwindcss";
// Import the root Tailwind config and override only what differs when running from client/
import baseConfig from "../tailwind.config";

export default {
  ...baseConfig,
  content: ["./index.html", "./**/*.{ts,tsx}"],
} satisfies Config;
