# Product Overview — AI Employees

> A platform of hireable, specialized AI employees that perform like domain experts on *any* LLM you bring — including cheap models like Gemini Flash or open-weight models.

---

## 1. The problem

Companies adopting AI agents keep hitting the same walls:

- **Generic assistants aren't experts.** A general-purpose chatbot can answer anything shallowly, but it doesn't behave like a seasoned support specialist, financial analyst, or DevOps engineer. It lacks a role, a point of view, and a way of working.
- **Good agents are locked to expensive models.** Most capable agents only work well on frontier models, so quality is tied to a large, ongoing token bill.
- **Vendors control the brain.** Buyers must trust a provider's model choice, data handling, and pricing, with little control over any of it.
- **Most agent projects stall.** Analysts expect a large share of agentic AI projects to be cancelled — not because models are weak, but because of unclear value, runaway cost, and weak governance.

The gap isn't smarter models. It's the lack of well-engineered, specialized agents that are reliable, affordable, and trustworthy to deploy.

---

## 2. The product

**AI Employees** is a platform where you "hire" specialized agents, each with its own identity, expertise, voice, and abilities (tools). You connect your own LLM API key (Bring Your Own Key), pick an employee, and put it to work through chat or API.

Each employee is engineered so the surrounding system — curated knowledge, expert playbooks, structured workflows, disciplined retrieval — carries the quality, rather than relying on a top-tier model to do the heavy lifting. The result: an employee that performs like a specialist even on a modest model.

### What makes an "employee" different from a chatbot
- **Identity & voice** — a consistent persona and communication style
- **Expertise** — domain knowledge plus *procedural* know-how (how an expert actually solves recurring problems)
- **Abilities (tools)** — connect the tools each role needs; add your own via MCP or HTTP
- **Memory** — remembers the user, past decisions, and preferences across sessions

---

## 3. The core differentiator

> **Any LLM, expert performance.** The model is a commodity; the engineering around it is the product.

This is the whole thesis, and it's backed by current research: models wrapped in a structured, validated environment reach roughly 80% of frontier-model performance even when using open-weight models, and structured workflows cut errors by 60–80% versus one-shot prompting. Most agent failures are *context* failures, not model failures.

Practically, this means customers can:
- Run capable employees on **cheap or open models**, cutting cost dramatically
- **Own the brain** — their key, their model choice, their data path
- Trust that quality is **proven, not promised** — every employee is validated across model tiers (frontier / mid / cheap) before it ships

Competitors treat model-agnosticism as a checkbox. Here it's the entire design goal, measured on every change.

---

## 4. The launch employees

| Employee | Role | Example abilities |
|---|---|---|
| **Customer Support** | Resolves tickets, de-escalates, interprets policy | Knowledge-base lookup, draft reply, escalate |
| **Content Writer** | Drafts on-brand content with the right tone | Web search, SEO outline, tone presets |
| **Research Analyst** | Investigates topics and summarizes with citations | Web search, URL fetch, summarize-and-cite |
| **Financial Analyst** | Analyzes numbers and explains the "why" | Calculator, CSV/spreadsheet analysis, market data |
| **Team Organizer** | Turns goals into plans and agendas | Task breakdown, meeting-agenda builder, calendar draft |

More roles (DevOps, Designer, and others) follow once the pattern is proven — each new employee is a configuration and content exercise, not new engineering.

---

## 5. How it works (at a glance)

1. **Sign in** with Google.
2. **Add your LLM key** for any supported provider (10–15 popular ones). Keys are encrypted and never exposed.
3. **Pick an employee** and choose which model to run it on.
4. **Put it to work** via the chat interface or the REST API.
5. Behind the scenes, the employee retrieves only the most relevant knowledge and playbooks, runs a structured workflow with validation, uses its tools, and streams back an expert-quality response.

---

## 6. Who it's for

- **Small businesses & solo operators** — hire a support rep, a content writer, or an analyst without headcount, on an affordable model. (SMEs are currently the largest segment of the AI-agent market.)
- **Enterprises** — deploy specialized, governed agents with control over model choice, data handling, and what each agent is allowed to access.
- **Developers** — access employees via API, attach custom tools via MCP, and embed expert agents into their own products.

---

## 7. Why now

- Enterprise adoption of task-specific agents is accelerating sharply, with agents moving from pilots into production.
- The field has consolidated around "context engineering" — strong evidence that the scaffolding around a model, not the model itself, determines reliability.
- BYOK is increasingly attractive as buyers seek control over cost and data.
- Yet the market is crowded with generic "AI employee" platforms and vendor-locked agents. A platform that is genuinely model-agnostic *and* genuinely expert is still an open position.

---

## 8. What we are — and are not (for MVP)

**We are:** a platform of a few genuinely excellent, model-agnostic specialist employees, accessible by chat and API, with your own key and your own tools.

**We are not (yet):** a 24/7 automation engine, a multi-agent orchestration system, a provider of our own fine-tuned models, or an "every role under the sun" marketplace. These are on the roadmap; the MVP earns the right to build them by proving the core employee quality first.

---

## 9. Roadmap beyond MVP

- **Automation workflows** — run employees continuously as event-driven automations (after dedicated research).
- **Agent marketplace** — open the agent-definition *format* now; let the community build and sell employees later, with a revenue share.
- **Fine-tuned specialist brains** — optional per-employee models, once usage data shows where fine-tuning genuinely helps.
- **Multi-agent teams** — employees that collaborate and delegate.
- **Deeper enterprise controls** — richer permissions, audit trails, and compliance features.

---

## 10. The one-sentence pitch

**Hire AI employees that work like experts on whatever model you bring — because we engineer the expertise into the agent, not the model.**
