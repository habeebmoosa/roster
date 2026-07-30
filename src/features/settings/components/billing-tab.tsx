import {
  Badge,
  Button,
  Card,
  CardDescription,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/ui";
import { FIXTURE_INVOICES } from "../fixtures";

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
        <div className="mt-4">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Invoice</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {FIXTURE_INVOICES.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-mono">{invoice.id}</TableCell>
                  <TableCell className="text-text-muted">{invoice.date}</TableCell>
                  <TableCell className="text-text-muted">{invoice.amount}</TableCell>
                  <TableCell>
                    <Badge variant="success">{invoice.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
