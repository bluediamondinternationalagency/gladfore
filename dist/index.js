var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/index.ts
import express2 from "express";
import session from "express-session";
import connectPg from "connect-pg-simple";

// server/db.ts
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  farmers: () => farmers,
  insertFarmerSchema: () => insertFarmerSchema,
  insertOrderSchema: () => insertOrderSchema,
  insertUserSchema: () => insertUserSchema,
  orderStatusEnum: () => orderStatusEnum,
  orders: () => orders,
  roleEnum: () => roleEnum,
  users: () => users
});
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

// server/db.ts
neonConfig.webSocketConstructor = ws;
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?"
  );
}
var pool = new Pool({ connectionString: process.env.DATABASE_URL });
var db = drizzle({ client: pool, schema: schema_exports });

// server/routes.ts
import { createServer } from "http";

// server/storage.ts
import { eq, desc } from "drizzle-orm";
var DatabaseStorage = class {
  // User methods
  async getUser(id) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || void 0;
  }
  async getUserByPhone(phone) {
    const [user] = await db.select().from(users).where(eq(users.phone, phone));
    return user || void 0;
  }
  async createUser(insertUser) {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }
  // Farmer methods
  async getFarmer(id) {
    const [farmer] = await db.select().from(farmers).where(eq(farmers.id, id));
    return farmer || void 0;
  }
  async getFarmerByPhone(phone) {
    const [farmer] = await db.select().from(farmers).where(eq(farmers.phone, phone));
    return farmer || void 0;
  }
  async getFarmerByFarmerId(farmerId) {
    const [farmer] = await db.select().from(farmers).where(eq(farmers.farmerId, farmerId));
    return farmer || void 0;
  }
  async getFarmersByAgentId(agentId) {
    return db.select().from(farmers).where(eq(farmers.agentId, agentId));
  }
  async createFarmer(insertFarmer) {
    const [farmer] = await db.insert(farmers).values(insertFarmer).returning();
    return farmer;
  }
  async createFarmers(insertFarmers) {
    return db.insert(farmers).values(insertFarmers).returning();
  }
  // Order methods
  async getOrder(id) {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order || void 0;
  }
  async getOrdersByFarmerId(farmerId) {
    return db.select().from(orders).where(eq(orders.farmerId, farmerId)).orderBy(desc(orders.createdAt));
  }
  async getOrdersByAgentId(agentId) {
    return db.select().from(orders).where(eq(orders.agentId, agentId)).orderBy(desc(orders.createdAt));
  }
  async getPendingOrders() {
    return db.select().from(orders).where(eq(orders.status, "pending")).orderBy(desc(orders.createdAt));
  }
  async getAllOrders() {
    return db.select().from(orders).orderBy(desc(orders.createdAt));
  }
  async createOrder(insertOrder) {
    const [order] = await db.insert(orders).values(insertOrder).returning();
    return order;
  }
  async updateOrderStatus(id, status, comments) {
    const [order] = await db.update(orders).set({ status, comments }).where(eq(orders.id, id)).returning();
    return order || void 0;
  }
};
var storage = new DatabaseStorage();

// server/routes.ts
import bcrypt from "bcryptjs";

// shared/logic/paymentUtils.ts
function calculateDownPayment(totalCost) {
  return totalCost * 0.5;
}
function validateDownPayment(totalCost, downPayment) {
  const expectedDownPayment = calculateDownPayment(totalCost);
  return Math.abs(downPayment - expectedDownPayment) < 0.01;
}

// server/routes.ts
import Papa from "papaparse";
function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }
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
  app2.post("/api/auth/register", async (req, res) => {
    try {
      const data = insertUserSchema.parse(req.body);
      const existingUser = await storage.getUserByPhone(data.phone);
      if (existingUser) {
        return res.status(400).json({ error: "User already exists" });
      }
      const hashedPassword = await bcrypt.hash(data.password, 10);
      const user = await storage.createUser({
        ...data,
        password: hashedPassword
      });
      req.session.regenerate((err) => {
        if (err) {
          return res.status(500).json({ error: "Session error" });
        }
        req.session.userId = user.id;
        req.session.role = user.role;
        res.json({ user: { id: user.id, phone: user.phone, role: user.role, name: user.name } });
      });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  app2.post("/api/auth/login", async (req, res) => {
    try {
      const { phone, password } = req.body;
      const user = await storage.getUserByPhone(phone);
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      req.session.regenerate((err) => {
        if (err) {
          return res.status(500).json({ error: "Session error" });
        }
        req.session.userId = user.id;
        req.session.role = user.role;
        res.json({ user: { id: user.id, phone: user.phone, role: user.role, name: user.name } });
      });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  app2.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ success: true });
    });
  });
  app2.get("/api/auth/me", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json({ user: { id: user.id, phone: user.phone, role: user.role, name: user.name } });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  app2.post("/api/farmers/upload-csv", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const { csvData } = req.body;
      if (!csvData) {
        return res.status(400).json({ error: "No CSV data provided" });
      }
      const parsed = Papa.parse(csvData, {
        header: true,
        skipEmptyLines: true
      });
      const farmersToInsert = parsed.data.map((row) => {
        return {
          farmerId: row.farmer_id || row.FarmerId || row.id,
          name: row.name || row.Name,
          phone: row.phone || row.Phone,
          agentId: null
        };
      });
      const validFarmers = farmersToInsert.filter((f) => f.farmerId && f.name && f.phone);
      if (validFarmers.length === 0) {
        return res.status(400).json({ error: "No valid farmers found in CSV" });
      }
      const farmers2 = await storage.createFarmers(validFarmers);
      res.json({ success: true, count: farmers2.length, farmers: farmers2 });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  app2.get("/api/farmers/search", requireAuth, requireRole("agent", "admin"), async (req, res) => {
    try {
      const { query } = req.query;
      if (!query || typeof query !== "string") {
        return res.status(400).json({ error: "Search query required" });
      }
      let farmer = await storage.getFarmerByPhone(query);
      if (!farmer) {
        farmer = await storage.getFarmerByFarmerId(query);
      }
      if (!farmer) {
        return res.status(404).json({ error: "Farmer not found" });
      }
      res.json({ farmer });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  app2.get("/api/farmers", requireAuth, requireRole("agent", "admin"), async (req, res) => {
    try {
      let farmers2 = [];
      if (req.session.role === "agent") {
        farmers2 = await storage.getFarmersByAgentId(req.session.userId);
      } else {
        farmers2 = [];
      }
      res.json({ farmers: farmers2 });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  app2.post("/api/orders", requireAuth, requireRole("agent"), async (req, res) => {
    try {
      const data = req.body;
      const farmer = await storage.getFarmer(data.farmerId);
      if (!farmer) {
        return res.status(404).json({ error: "Farmer not found" });
      }
      const totalCost = parseFloat(data.totalCost);
      const downPayment = parseFloat(data.downPayment);
      if (!validateDownPayment(totalCost, downPayment)) {
        return res.status(400).json({ error: "Down payment must be exactly 50% of total cost" });
      }
      const balance = totalCost - downPayment;
      const order = await storage.createOrder({
        farmerId: data.farmerId,
        agentId: req.session.userId,
        totalCost: data.totalCost,
        downPayment: data.downPayment,
        balance: balance.toFixed(2),
        dueDate: new Date(data.dueDate),
        status: "pending"
      });
      res.json({ order });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  app2.get("/api/orders", requireAuth, async (req, res) => {
    try {
      let orders2 = [];
      if (req.session.role === "admin") {
        orders2 = await storage.getAllOrders();
      } else if (req.session.role === "agent") {
        orders2 = await storage.getOrdersByAgentId(req.session.userId);
      } else if (req.session.role === "farmer") {
        const user = await storage.getUser(req.session.userId);
        if (!user) {
          return res.status(404).json({ error: "User not found" });
        }
        const farmer = await storage.getFarmerByPhone(user.phone);
        if (!farmer) {
          return res.json({ orders: [] });
        }
        orders2 = await storage.getOrdersByFarmerId(farmer.id);
      } else {
        orders2 = [];
      }
      res.json({ orders: orders2 });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  app2.get("/api/orders/pending", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const orders2 = await storage.getPendingOrders();
      res.json({ orders: orders2 });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  app2.patch("/api/orders/:id/approve", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const { id } = req.params;
      const { comments } = req.body;
      const order = await storage.updateOrderStatus(id, "approved", comments);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }
      res.json({ order });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  app2.patch("/api/orders/:id/reject", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const { id } = req.params;
      const { comments } = req.body;
      const order = await storage.updateOrderStatus(id, "rejected", comments);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }
      res.json({ order });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  app2.get("/api/stats", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const orders2 = await storage.getAllOrders();
      const totalDownPayments = orders2.reduce((sum, order) => sum + parseFloat(order.downPayment.toString()), 0);
      const totalPendingDebts = orders2.filter((o) => o.status === "approved").reduce((sum, order) => sum + parseFloat(order.balance.toString()), 0);
      res.json({
        totalDownPayments,
        totalPendingDebts,
        totalOrders: orders2.length,
        pendingOrders: orders2.filter((o) => o.status === "pending").length
      });
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
var PgStore = connectPg(session);
app.use(express2.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express2.urlencoded({ extended: false }));
app.use(
  session({
    store: new PgStore({
      pool,
      createTableIfMissing: true
    }),
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
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
})();
