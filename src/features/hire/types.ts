export interface RoleTemplate {
  id: string;
  name: string;
  role: string;
  identity: string;
  voice: string;
  expertise: string[];
  abilities: string[];
}

export interface AbilityOption {
  id: string;
  label: string;
  description: string;
}

export interface HireFormState {
  roleTemplateId: string;
  name: string;
  role: string;
  identity: string;
  voice: string;
  expertise: string[];
  abilities: string[];
  provider: string;
  model: string;
}

export type CreateAgentResult = { ok: true; id: string } | { ok: false; message: string };
