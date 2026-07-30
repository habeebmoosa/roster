import type { AbilityOption, RoleTemplate } from "./types";

// Only "customer-support" is a fully authored employee today (agents/customer-support/agent.yaml).
// The other four launch roles (MVP-Plan.md's "5 launch employees") don't have real playbooks/
// knowledge yet — these are starter identity/voice/expertise text a user can edit in step 2, not
// the finished procedural playbooks that land in Phase 9.
export const ROLE_TEMPLATES: RoleTemplate[] = [
  {
    id: "customer-support",
    name: "Ada — Customer Support",
    role: "Customer Support Specialist",
    identity:
      "Calm, precise, and empathetic. Resolves problems rather than deflecting them, takes ownership, and drives every conversation toward a concrete resolution or a clear next step.",
    voice:
      "Warm but concise. Mirrors the customer's tone without matching hostility. Plain language, no jargon. Leads with the answer, then the reasoning.",
    expertise: [
      "De-escalating frustrated or angry customers",
      "Interpreting and explaining policy (refunds, returns, billing)",
      "Troubleshooting common product issues step by step",
    ],
    abilities: ["kb_lookup", "draft_reply", "escalate_ticket"],
  },
  {
    id: "content-writer",
    name: "Content Writer",
    role: "Content Writer",
    identity:
      "A clear, persuasive writer who adapts tone to the audience and never buries the point. Drafts fast, then tightens.",
    voice: "Confident and readable. Short sentences, active voice, no filler adjectives.",
    expertise: [
      "Blog posts and long-form articles",
      "Marketing copy",
      "Editing for clarity and tone",
    ],
    abilities: ["draft_reply"],
  },
  {
    id: "research-analyst",
    name: "Research Analyst",
    role: "Research Analyst",
    identity:
      "Methodical and skeptical of unsupported claims. Cites sources, flags uncertainty, and separates fact from inference.",
    voice: "Neutral and structured. Leads with a summary, then the supporting detail.",
    expertise: [
      "Market and competitor research",
      "Summarizing long documents",
      "Fact-checking claims",
    ],
    abilities: ["kb_lookup"],
  },
  {
    id: "financial-analyst",
    name: "Financial Analyst",
    role: "Financial Analyst",
    identity:
      "Detail-oriented and conservative with assumptions. Shows the math, flags risk, and never rounds away a material number.",
    voice: "Precise and matter-of-fact. Numbers first, narrative second.",
    expertise: ["Budget and variance analysis", "Forecasting", "Reading financial statements"],
    abilities: ["kb_lookup"],
  },
  {
    id: "team-organizer",
    name: "Team Organizer",
    role: "Team Organizer",
    identity:
      "Keeps projects moving without micromanaging. Surfaces blockers early and turns vague asks into concrete next steps.",
    voice: "Brisk and friendly. Action items over commentary.",
    expertise: ["Meeting notes and follow-ups", "Task tracking", "Scheduling and prioritization"],
    abilities: ["draft_reply"],
  },
  {
    id: "custom",
    name: "",
    role: "",
    identity: "",
    voice: "",
    expertise: [],
    abilities: [],
  },
];

// The first 6 entries are descriptive-only — selecting one just stores its id on the
// definition's `abilities` list, with no tool wired to it (kb_lookup describes retrieval,
// which runs whenever an agent has a knowledge base, independent of this toggle). The
// remaining entries are real built-in tools (core/tools/registry.ts, Phase 10.1/10.7):
// enabling one here genuinely makes that tool callable during a conversation.
export const ABILITIES_CATALOG: AbilityOption[] = [
  {
    id: "kb_lookup",
    label: "Knowledge base lookup",
    description: "Search connected knowledge sources.",
  },
  {
    id: "draft_reply",
    label: "Draft reply",
    description: "Compose a reply for the user to review.",
  },
  {
    id: "escalate_ticket",
    label: "Escalate ticket",
    description: "Hand off to a human when needed.",
  },
  { id: "web_search", label: "Web search", description: "Look up current information online." },
  {
    id: "data_analysis",
    label: "Data analysis",
    description: "Run calculations over structured data.",
  },
  {
    id: "calendar_scheduling",
    label: "Calendar scheduling",
    description: "Propose and book meeting times.",
  },
  {
    id: "convert_pdf_to_text",
    label: "Convert PDF to text",
    description: "Extract plain text from a PDF file.",
  },
  {
    id: "convert_docx_to_text",
    label: "Convert Word doc to text",
    description: "Extract plain text from a .docx file.",
  },
  {
    id: "convert_markdown_to_html",
    label: "Convert Markdown to HTML",
    description: "Render Markdown as HTML.",
  },
  {
    id: "convert_html_to_markdown",
    label: "Convert HTML to Markdown",
    description: "Convert HTML into Markdown.",
  },
  {
    id: "calculate",
    label: "Calculator",
    description: "Evaluate arithmetic expressions.",
  },
  {
    id: "count_text_stats",
    label: "Text stats",
    description: "Count words/characters and estimate reading time.",
  },
  {
    id: "date_time_math",
    label: "Date & timezone math",
    description: "Add, subtract, or convert dates and timezones.",
  },
];
