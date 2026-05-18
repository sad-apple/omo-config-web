"use client";

import { ThemeProvider as InternalThemeProvider } from "@/hooks/useTheme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return <InternalThemeProvider>{children}</InternalThemeProvider>;
}
