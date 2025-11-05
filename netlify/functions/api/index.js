// server/index.ts
import express2 from "express";
import session from "express-session";
import { createClient as createClient2 } from "@supabase/supabase-js";

// server/routes.ts
import { createServer } from "http";
import bcrypt from "bcryptjs";
import Papa from "papaparse";

// server/supabaseClient.ts
import { createClient } from "@supabase/supabase-js";
var supabaseUrl = process.env.SUPABASE_URL;
var supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
var supabase = createClient(supabaseUrl, supabaseKey);

// shared/schema.ts
import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
var roleEnum = pgEnum("role", ["admin", "agent", "farmer"]);
var orderStatusEnum = pgEnum("order_status", ["pending", "approved", "rejected"]);
var users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  phone: text("phone").notNull().unique(),
  password: text("password").notNull(),
  role: roleEnum("role").notNull(),
  name: text("name").notNull()
});
var farmers = pgTable("farmers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  farmerId: text("farmer_id").notNull().unique(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  agentId: varchar("agent_id").references(() => users.id)
});
var orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  farmerId: varchar("farmer_id").notNull().references(() => farmers.id),
  agentId: varchar("agent_id").notNull().references(() => users.id),
  totalCost: decimal("total_cost", { precision: 10, scale: 2 }).notNull(),
  downPayment: decimal("down_payment", { precision: 10, scale: 2 }).notNull(),
  balance: decimal("balance", { precision: 10, scale: 2 }).notNull(),
  status: orderStatusEnum("status").notNull().default("pending"),
  comments: text("comments"),
  dueDate: timestamp("due_date").notNull(),
  createdAt: timestamp("created_at").notNull().default(sql`now()`)
});
var insertUserSchema = createInsertSchema(users).omit({ id: true });
var insertFarmerSchema = createInsertSchema(farmers).omit({ id: true });
var insertOrderSchema = createInsertSchema(orders).omit({ id: true, createdAt: true });

// shared/logic/paymentUtils.ts
function calculateDownPayment(totalCost) {
  return totalCost * 0.5;
}
function validateDownPayment(totalCost, downPayment) {
  const expectedDownPayment = calculateDownPayment(totalCost);
  return Math.abs(downPayment - expectedDownPayment) < 0.01;
}

// server/routes.ts
function requireAuth(req, res, next) {
  if (!req.session.userId)
    return res.status(401).json({ error: "Not authenticated" });
  next();
}
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.session.role || !roles.includes(req.session.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  };
}
async function registerRoutes(app2) {
  app2.post("/auth/register", async (req, res) => {
    try {
      const data = insertUserSchema.parse(req.body);
      const { data: existingUser, error: existingError } = await supabase.from("users").select("*").eq("phone", data.phone).single();
      if (existingUser)
        return res.status(400).json({ error: "User already exists" });
      if (existingError && existingError.code !== "PGRST116")
        return res.status(500).json({ error: existingError.message });
      const hashedPassword = await bcrypt.hash(data.password, 10);
      const { data: newUser, error: insertError } = await supabase.from("users").insert([{ ...data, password: hashedPassword }]).select().single();
      if (insertError)
        return res.status(500).json({ error: insertError.message });
      req.session.regenerate((err) => {
        if (err) return res.status(500).json({ error: "Session error" });
        req.session.userId = newUser.id;
        req.session.role = newUser.role;
        res.json({
          user: {
            id: newUser.id,
            phone: newUser.phone,
            role: newUser.role,
            name: newUser.name
          }
        });
      });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  app2.post("/auth/login", async (req, res) => {
    try {
      const { phone, password } = req.body;
      const { data: user, error } = await supabase.from("users").select("*").eq("phone", phone).single();
      if (!user) return res.status(401).json({ error: "Invalid credentials" });
      if (error) return res.status(500).json({ error: error.message });
      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) return res.status(401).json({ error: "Invalid credentials" });
      req.session.regenerate((err) => {
        if (err) return res.status(500).json({ error: "Session error" });
        req.session.userId = user.id;
        req.session.role = user.role;
        res.json({
          user: {
            id: user.id,
            phone: user.phone,
            role: user.role,
            name: user.name
          }
        });
      });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  app2.post("/auth/logout", (req, res) => {
    req.session.destroy(() => res.json({ success: true }));
  });
  app2.get("/auth/me", requireAuth, async (req, res) => {
    try {
      const { data: user, error } = await supabase.from("users").select("*").eq("id", req.session.userId).single();
      if (!user) return res.status(404).json({ error: "User not found" });
      if (error) return res.status(500).json({ error: error.message });
      res.json({
        user: {
          id: user.id,
          phone: user.phone,
          role: user.role,
          name: user.name
        }
      });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  app2.post(
    "/farmers/upload-csv",
    requireAuth,
    requireRole("admin"),
    async (req, res) => {
      try {
        const { csvData } = req.body;
        if (!csvData)
          return res.status(400).json({ error: "No CSV data provided" });
        const parsed = Papa.parse(csvData, { header: true, skipEmptyLines: true });
        const farmersToInsert = parsed.data.map((row) => ({
          farmerId: row.farmer_id || row.FarmerId || row.id,
          name: row.name || row.Name,
          phone: row.phone || row.Phone,
          agentId: null
        }));
        const validFarmers = farmersToInsert.filter(
          (f) => f.farmerId && f.name && f.phone
        );
        if (validFarmers.length === 0)
          return res.status(400).json({ error: "No valid farmers found" });
        const { data: farmers2, error } = await supabase.from("farmers").insert(validFarmers).select();
        if (error) return res.status(500).json({ error: error.message });
        res.json({ success: true, count: farmers2.length, farmers: farmers2 });
      } catch (error) {
        res.status(400).json({ error: error.message });
      }
    }
  );
  app2.get(
    "/farmers/search",
    requireAuth,
    requireRole("agent", "admin"),
    async (req, res) => {
      try {
        const query = req.query.query;
        if (!query) return res.status(400).json({ error: "Search query required" });
        let { data: farmer } = await supabase.from("farmers").select("*").eq("phone", query).single();
        if (!farmer) {
          const { data: f } = await supabase.from("farmers").select("*").eq("farmerId", query).single();
          farmer = f || null;
        }
        if (!farmer) return res.status(404).json({ error: "Farmer not found" });
        res.json({ farmer });
      } catch (error) {
        res.status(400).json({ error: error.message });
      }
    }
  );
  app2.get(
    "/farmers",
    requireAuth,
    requireRole("agent", "admin"),
    async (req, res) => {
      try {
        let farmers2 = [];
        if (req.session.role === "agent") {
          const { data, error } = await supabase.from("farmers").select("*").eq("agentId", req.session.userId);
          if (error) return res.status(500).json({ error: error.message });
          farmers2 = data || [];
        } else if (req.session.role === "admin") {
          const { data, error } = await supabase.from("farmers").select("*");
          if (error) return res.status(500).json({ error: error.message });
          farmers2 = data || [];
        }
        res.json({ farmers: farmers2 });
      } catch (error) {
        res.status(400).json({ error: error.message });
      }
    }
  );
  app2.post(
    "/orders",
    requireAuth,
    requireRole("agent"),
    async (req, res) => {
      try {
        const data = insertOrderSchema.parse(req.body);
        const farmerId = Number(data.farmerId);
        const totalCost = Number(data.totalCost);
        const downPayment = Number(data.downPayment);
        const { data: farmer } = await supabase.from("farmers").select("*").eq("id", farmerId).single();
        if (!farmer) return res.status(404).json({ error: "Farmer not found" });
        if (!validateDownPayment(totalCost, downPayment))
          return res.status(400).json({ error: "Down payment must be exactly 50% of total cost" });
        const balance = totalCost - downPayment;
        const { data: order, error } = await supabase.from("orders").insert([
          {
            ...data,
            farmerId,
            agentId: req.session.userId,
            balance,
            status: "pending"
          }
        ]).select().single();
        if (error) return res.status(500).json({ error: error.message });
        res.json({ order });
      } catch (error) {
        res.status(400).json({ error: error.message });
      }
    }
  );
  app2.get("/orders", requireAuth, async (req, res) => {
    try {
      let orders2 = [];
      if (req.session.role === "admin") {
        const { data, error } = await supabase.from("orders").select("*");
        if (error) return res.status(500).json({ error: error.message });
        orders2 = data || [];
      } else if (req.session.role === "agent") {
        const { data, error } = await supabase.from("orders").select("*").eq("agentId", req.session.userId);
        if (error) return res.status(500).json({ error: error.message });
        orders2 = data || [];
      } else if (req.session.role === "farmer") {
        const { data: user } = await supabase.from("users").select("*").eq("id", req.session.userId).single();
        if (!user) return res.status(404).json({ error: "User not found" });
        const { data: farmer } = await supabase.from("farmers").select("*").eq("phone", user.phone).single();
        if (!farmer) return res.json({ orders: [] });
        const { data: farmerOrders, error } = await supabase.from("orders").select("*").eq("farmerId", farmer.id);
        if (error) return res.status(500).json({ error: error.message });
        orders2 = farmerOrders || [];
      }
      res.json({ orders: orders2 });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      ),
      await import("@replit/vite-plugin-dev-banner").then(
        (m) => m.devBanner()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express2();
var supabase2 = createClient2(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
var MemoryStore = session.MemoryStore;
app.use(
  express2.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    }
  })
);
app.use(express2.urlencoded({ extended: false }));
app.use(
  session({
    store: new MemoryStore(),
    secret: process.env.SESSION_SECRET || "gladfore-secret-key-change-in-production",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1e3,
      // 30 days
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax"
      // CSRF protection
    }
  })
);
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true
    },
    () => {
      log(`serving on port ${port}`);
    }
  );
})();
export {
  supabase2 as supabase
};
