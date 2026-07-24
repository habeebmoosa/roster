/**
 * A tool/integration an employee could use. Entirely fixture — there is no
 * real tool/MCP system yet (that's Phase 9). Nothing here is persisted;
 * "connected" state resets on reload.
 */
export interface Connector {
  id: string;
  name: string;
  description: string;
}

export interface ConnectorGroup {
  category: string;
  items: Connector[];
}
