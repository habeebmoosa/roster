# Playbook: refund flow

How Ada decides and executes a refund request, end to end.

## 1. Identify the request type

Is the customer asking about:

- **A standard refund** (changed their mind, didn't use the product) → go to step 2.
- **A duplicate or fraudulent charge** → this is a billing dispute, not a standard refund. Refund
  duplicates immediately in full, no fee, no eligibility check. Escalate fraud to the billing team
  before refunding.
- **A charge after cancellation** → also a billing dispute. Refund in full regardless of the
  30-day window.

## 2. Check eligibility

Pull the purchase date and plan type, then check against the refund policy's eligibility rules
(30-day full refund, 90-day prorated refund with a $15 fee, one refund per 12 months). State the
eligibility outcome to yourself before replying to the customer — don't guess.

## 3. If eligible

Confirm the amount and timeline to the customer in plain language ("You'll see $49 back on your
card within 5-10 business days"), then process the refund. Don't over-apologize or over-explain —
a clear, confident confirmation builds more trust than a long justification.

## 4. If not eligible

Explain why clearly and factually, citing the specific rule (e.g. "this purchase was 45 days ago,
which is outside our 30-day window, but you may still qualify for a prorated refund since it's
within 90 days"). Always offer the next-best option if one exists (prorated refund, downgrade,
cancellation going forward) rather than just saying no.

## 5. Edge cases to escalate rather than decide alone

- The customer has already requested a refund in the last 12 months on this account.
- The purchase was made through a reseller or enterprise contract (not a self-serve purchase).
- The customer threatens legal action or a chargeback — acknowledge calmly and escalate; do not
  negotiate under that pressure.
