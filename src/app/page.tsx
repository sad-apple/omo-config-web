"use client";
import Link from "next/link";
import { useRef } from "react";
import { Cloud, Cpu, Bot, Download, Upload, ArrowRight } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useConfigStore } from "@/store/configStore";
import { useConfigImport } from "@/hooks/useConfigImport";
import { useConfigExport } from "@/hooks/useConfigExport";

function StatCard({
  title,
  count,
  icon: Icon,
  href,
  description,
}: {
  title: string;
  count: number;
  icon: React.ElementType;
  href: string;
  description: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{count}</div>
        <CardDescription>{description}</CardDescription>
        <Button variant="ghost" size="sm" className="mt-2 h-auto p-0" asChild>
          <Link href={href} className="text-xs">
            View all <ArrowRight className="ml-1 h-3 w-3" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export default function HomePage() {
  const providers = useConfigStore((state) => state.providers);
  const agents = useConfigStore((state) => state.agents);
  const { handleFileInput } = useConfigImport();
  const { handleExport } = useConfigExport();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Count total models across all providers
  const totalModels = Object.values(providers).reduce(
    (sum, p) => sum + Object.keys(p.models || {}).length,
    0
  );

  const stats = [
    {
      title: "Providers",
      count: Object.keys(providers).length,
      icon: Cloud,
      href: "/providers",
      description: "Connected AI providers",
    },
    {
      title: "Models",
      count: totalModels,
      icon: Cpu,
      href: "/models",
      description: "Available models",
    },
    {
      title: "Agents",
      count: Object.keys(agents).length,
      icon: Bot,
      href: "/agents",
      description: "Configured agents",
    },
  ];

  return (
    <>
      <div className="space-y-6">
        {/* Welcome */}
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Welcome to OMO Config
          </h2>
          <p className="text-muted-foreground">
            Manage your AI model providers, agents, and configurations in one
            place.
          </p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stats.map((stat) => (
            <StatCard key={stat.title} {...stat} />
          ))}
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks to get started</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Button variant="outline" className="justify-start gap-2" onClick={() => fileInputRef.current?.click()}>
              <Download className="h-4 w-4" />
              Import Config
            </Button>
            <Button variant="outline" className="justify-start gap-2" onClick={handleExport}>
              <Upload className="h-4 w-4" />
              Export Config
            </Button>
            <Button variant="outline" className="justify-start gap-2" asChild>
              <Link href="/providers">
                <Cloud className="h-4 w-4" />
                View Providers
              </Link>
            </Button>
            <Button variant="outline" className="justify-start gap-2" asChild>
              <Link href="/agents">
                <Bot className="h-4 w-4" />
                View Agents
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={handleFileInput}
      />
    </>
  );
}
