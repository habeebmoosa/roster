import type { ConnectorGroup } from "./types";

export const CONNECTOR_GROUPS: ConnectorGroup[] = [
  {
    category: "Knowledge & docs",
    items: [
      {
        id: "google-drive",
        name: "Google Drive",
        description: "Search and reference files from your Drive.",
      },
      {
        id: "notion",
        name: "Notion",
        description: "Pull pages and databases into an employee's knowledge.",
      },
      {
        id: "confluence",
        name: "Confluence",
        description: "Reference your team's internal documentation.",
      },
    ],
  },
  {
    category: "Communication",
    items: [
      {
        id: "slack",
        name: "Slack",
        description: "Let employees post updates and read channel context.",
      },
      { id: "gmail", name: "Gmail", description: "Draft and send email on your behalf." },
    ],
  },
  {
    category: "Productivity",
    items: [
      {
        id: "google-calendar",
        name: "Google Calendar",
        description: "Check availability and draft meeting invites.",
      },
      { id: "asana", name: "Asana", description: "Create and track tasks from a conversation." },
      { id: "linear", name: "Linear", description: "File and triage engineering issues." },
    ],
  },
  {
    category: "Data",
    items: [
      {
        id: "google-sheets",
        name: "Google Sheets",
        description: "Analyze and update spreadsheet data.",
      },
      { id: "airtable", name: "Airtable", description: "Read and write structured records." },
    ],
  },
];

/** Purely cosmetic starting state — nothing is actually connected to anything yet. */
export const DEFAULT_CONNECTED_IDS: readonly string[] = ["google-drive", "notion"];
