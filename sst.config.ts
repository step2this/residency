/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "coparent-schedule",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
      providers: {
        aws: {
          region: "us-east-1",
        },
      },
    };
  },
  async run() {
    new sst.aws.Nextjs("CoParentWeb", {
      environment: {
        // Neon Database
        DATABASE_URL: process.env.DATABASE_URL!,

        // Clerk Auth - Public keys safe to embed
        NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!,
        NEXT_PUBLIC_CLERK_SIGN_IN_URL: "/sign-in",
        NEXT_PUBLIC_CLERK_SIGN_UP_URL: "/sign-up",
        NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL: "/dashboard",
        NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL: "/onboarding",

        // Clerk Secret - Will be set via SST secret
        CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY!,
        CLERK_WEBHOOK_SECRET: process.env.CLERK_WEBHOOK_SECRET || "",

        // App URL - Will be dynamically set after first deployment
        NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || "https://placeholder.com",
      },
      server: {
        runtime: "nodejs22.x",
        memory: "1024 MB",
        timeout: "30 seconds",
      },
      imageOptimization: {
        memory: "1536 MB",
      },
    });
  },
});
