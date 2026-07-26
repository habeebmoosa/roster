# Unit economics metrics

Reference definitions and healthy-range benchmarks for the core unit-economics metrics. Ranges
are starting points for sanity-checking a number, not hard rules — they vary by business model
and stage.

## Customer acquisition cost (CAC)

Total sales and marketing spend over a period, divided by the number of new customers acquired in
that period. Should be calculated on a fully-loaded basis (including salaries, tooling, and ad
spend) — not just ad spend alone, which understates it.

## Lifetime value (LTV)

The total gross margin a customer generates over their relationship with the business, typically
estimated as average revenue per customer × gross margin % × average customer lifespan (or
1 / churn rate as a proxy for lifespan).

## LTV:CAC ratio

A healthy SaaS LTV:CAC ratio is generally at least 3:1 — meaning a customer generates at least
three times what it cost to acquire them. Below that, growth is often not sustainable without
raising prices or cutting acquisition cost. Well above 5:1 can actually signal under-investment
in growth, not just efficiency.

## Payback period

How many months of gross margin it takes to recover the CAC for a customer. Shorter is better for
cash efficiency — a long payback period means capital is tied up in customer acquisition for a
long time before it's recovered.

## Gross margin vs. contribution margin

Gross margin subtracts cost of goods sold from revenue. Contribution margin also subtracts
variable costs directly tied to serving that customer (support costs, payment processing fees,
etc.) — use contribution margin, not gross margin, when calculating unit economics like LTV,
since it reflects what's actually left after everything that scales with the customer.
