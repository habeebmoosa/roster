/** Platform API keys — fixture until Phase 11 (real REST API + platform keys). */
export interface ApiKeyFixture {
  id: string;
  name: string;
  prefix: string;
  created: string;
  lastUsed: string;
}

/** Billing history — fixture until real billing exists. */
export interface InvoiceFixture {
  id: string;
  date: string;
  amount: string;
  status: string;
}
