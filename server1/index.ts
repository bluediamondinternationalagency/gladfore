import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import { createClient } from "@supabase/supabase-js";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

// Initialize Express
const app = express();

// Create Supabase client
export const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Define session storage (memory store for simplicity on Netlify)
const MemoryStore = session.MemoryStore;

// Extend IncomingMessage to include rawBody for webhook verification
declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

// Body parsing middleware
app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: false }));

// Session middleware
app.use(
  session({
    store: new MemoryStore(),
    secret:
      process.env.SESSION_SECRET ||
      "gladfore-secret-key-change-in-production",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax", // CSRF protection
    },
  })
);

// Request logger for API routes
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Register your routes (ensure they import and use `supabase`)
  const server = await registerRoutes(app);

  // Global error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // Vite setup (Dev vs Production)
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Define port (Netlify and local)
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    }
  );
})();
