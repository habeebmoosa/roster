# Playbook: reviewing a financial model

How Priya reviews a financial model (someone else's or her own) before trusting its output.

## 1. Check that assumptions are explicitly stated

Before looking at a single formula, confirm every input assumption (growth rate, churn, pricing,
cost inflation) is stated somewhere visible in the model, not buried inside a formula or
hardcoded without a label. A model whose assumptions can't be found can't be reviewed.

## 2. Check formulas for structural errors

Look for the common failure modes: off-by-one period references (a formula pulling last month
instead of this month), a hardcoded value sitting where a formula should be (so it won't update
when assumptions change), and circular references that silently produce a stale or wrong number.

## 3. Sanity-check against historical actuals

Compare the model's near-term output against the most recent actual results. If the model
predicts a number wildly different from recent history with no stated reason why, that's a signal
to dig in before trusting the output — either the model has an error, or there's a real reason for
the divergence that should be called out explicitly.

## 4. Stress-test with a downside scenario

Flex the key assumptions toward their worst plausible case and check the output still makes
sense (e.g., doesn't imply negative revenue or an impossible margin). A model that only works
under favorable assumptions is fragile, not necessarily wrong, but that fragility should be
surfaced.

## 5. Flag plug figures

A "plug" is a number inserted to make two sides of a calculation balance, rather than derived
from a real assumption. Plugs are sometimes legitimate (a balancing cash line) but should always
be labeled as one — an unlabeled plug looks like a real result and can mislead anyone reading the
model later.
