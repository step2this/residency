export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight mb-4">
          CoParent Schedule
        </h1>
        <p className="text-lg text-muted-foreground mb-8">
          Simplify child visitation scheduling for divorced families
        </p>
        <div className="flex gap-4 justify-center">
          <a
            href="/sign-in"
            className="px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Sign In
          </a>
          <a
            href="/sign-up"
            className="px-6 py-3 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90 transition-colors"
          >
            Get Started
          </a>
        </div>
      </div>
    </main>
  );
}
