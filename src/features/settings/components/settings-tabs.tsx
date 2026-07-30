"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { Tabs, TabsList, TabsPanel, TabsTrigger } from "@/ui";

const TABS = [
  { value: "workspace", label: "Workspace" },
  { value: "profile", label: "Profile" },
  { value: "providers", label: "Providers" },
  { value: "api-keys", label: "API keys" },
  { value: "billing", label: "Billing" },
] as const;

export function isSettingsTabValue(value: string): boolean {
  return TABS.some((tab) => tab.value === value);
}

export function SettingsTabs({
  initialTab,
  workspace,
  profile,
  providers,
  apiKeys,
  billing,
}: {
  initialTab: string;
  workspace: ReactNode;
  profile: ReactNode;
  providers: ReactNode;
  apiKeys: ReactNode;
  billing: ReactNode;
}) {
  const router = useRouter();
  const validInitial = isSettingsTabValue(initialTab) ? initialTab : "workspace";

  return (
    <Tabs
      defaultValue={validInitial}
      onValueChange={(value) => router.replace(`/settings?tab=${value}`, { scroll: false })}
    >
      <TabsList>
        {TABS.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
      <div className="mt-6">
        <TabsPanel value="workspace">{workspace}</TabsPanel>
        <TabsPanel value="profile">{profile}</TabsPanel>
        <TabsPanel value="providers">{providers}</TabsPanel>
        <TabsPanel value="api-keys">{apiKeys}</TabsPanel>
        <TabsPanel value="billing">{billing}</TabsPanel>
      </div>
    </Tabs>
  );
}
