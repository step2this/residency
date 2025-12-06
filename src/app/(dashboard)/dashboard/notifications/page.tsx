export default function NotificationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
        <p className="text-muted-foreground">
          View all your notifications
        </p>
      </div>

      <div className="rounded-lg border p-8 text-center">
        <p className="text-muted-foreground">No notifications</p>
      </div>
    </div>
  );
}
