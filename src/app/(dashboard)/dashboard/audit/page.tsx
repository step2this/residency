export default function AuditPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Audit Log</h1>
        <p className="text-muted-foreground">
          View all changes and actions for legal records
        </p>
      </div>

      <div className="rounded-lg border p-8 text-center">
        <p className="text-muted-foreground">No audit entries</p>
      </div>
    </div>
  );
}
