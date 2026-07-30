import { redirect } from "next/navigation";

// Providers is now a tab within /settings (sub-phase 6.9). Redirect so any
// existing links/bookmarks to this URL keep working.
export default function ProvidersSettingsRedirect() {
  redirect("/settings?tab=providers");
}
