import { CONNECTOR_GROUPS, ConnectorsBoard } from "@/features/connectors";

export default function ConnectorsPage() {
  return (
    <div className="px-6 py-6">
      <h1 className="text-text text-2xl font-bold tracking-tight">Connectors</h1>
      <p className="text-text-muted mt-1">Tools your employees can use, grouped by category.</p>

      <div className="mt-6">
        <ConnectorsBoard groups={CONNECTOR_GROUPS} />
      </div>
    </div>
  );
}
