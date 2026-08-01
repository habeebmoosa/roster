import { Badge, Button, Card, CardDescription, CardTitle, EmptyState } from "@/ui";

export function BillingTab() {
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardTitle>Current plan</CardTitle>
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-text text-lg font-semibold">Free</span>
            <Badge variant="neutral">Up to 10 employees, 5,000 conversations/mo</Badge>
          </div>
          <Button variant="secondary" disabled title="Coming soon">
            Upgrade plan
          </Button>
        </div>
      </Card>

      <Card>
        <CardTitle>Payment method</CardTitle>
        <div className="mt-3 flex items-center justify-between">
          <CardDescription className="mb-0">No payment method on file.</CardDescription>
          <Button variant="secondary" disabled title="Coming soon">
            Add payment method
          </Button>
        </div>
      </Card>

      <Card>
        <CardTitle>Billing history</CardTitle>
        <EmptyState className="mt-4 border-none p-6" title="No invoices yet" />
      </Card>
    </div>
  );
}
