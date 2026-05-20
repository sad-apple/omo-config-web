import type { Metadata } from "next";
import "./globals.css";
import { Sidebar, SidebarProvider } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/layout/ThemeProvider";

export const metadata: Metadata = {
  title: "OMO Config",
  description: "OMO AI Model Configuration Manager",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full bg-background text-foreground transition-colors duration-300">
        <ThemeProvider>
        <SidebarProvider>
          <div className="flex min-h-full flex-col lg:flex-row">
            <Sidebar />
            <div className="flex flex-1 flex-col">
              <Header />
              <main className="flex-1 p-4 lg:p-6">{children}</main>
            </div>
          </div>
        </SidebarProvider>
        <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
