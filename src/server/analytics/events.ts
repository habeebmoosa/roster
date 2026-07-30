/** The 4 funnel points Phase 13.3 tracks — named centrally to avoid drift/typos across call sites. */
export const ANALYTICS_EVENTS = {
  SIGNED_UP: "signed_up",
  PROVIDER_KEY_ADDED: "provider_key_added",
  EMPLOYEE_HIRED: "employee_hired",
  FIRST_CHAT_MESSAGE_SENT: "first_chat_message_sent",
} as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];
