// netlify/functions/api/index.ts
import express from "express";
import session from "express-session";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import Papa from "papaparse";
import { createServer } from "http";
import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

// ------------------------
// Supabase client
// ------------------------
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// ------------------------
// Database schema
// ------------------------
const roleEnum = pgEnum("role", ["admin", "agent", "farmer"]);
const orderStatusEnum = pgEnum("order_status", ["pending", "approved", "rejected"]);

const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  phone: text("phone").notNull().unique(),
  password: text("password").notNull(),
  role: roleEnum("role").notNull(),
  name: text("name").notNull()
});

const farmers = pgTable("farmers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  farmerId: text("farmer_id").notNull().unique(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  agentId: varchar("agent_id").references(() => users.id)
});

const orders = pgTable("orders", {
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

// Schemas for request validation
const insertUserSchema = createInsertSchema(users).omit({ id: true });
const insertFarmerSchema = createInsertSchema(farmers).omit({ id: true });
const insertOrderSchema = createInsertSchema(orders).omit({ id: true, createdAt: true });

// ------------------------
// Payment helper
// ------------------------
function calculateDownPayment(totalCost: number) {
  return totalCost * 0.5;
}

function validateDownPayment(totalCost: number, downPayment: number) {
  const expectedDownPayment = calculateDownPayment(totalCost);
  return Math.abs(downPayment - expectedDownPayment) < 0.01;
}

// ------------------------
// Express setup
// ------------------------
const app = express();
const MemoryStore = session.MemoryStore;

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(
  session({
    store: new MemoryStore(),
    secret: process.env.SESSION_SECRET || "gladfore-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax"
    }
  })
);

// ------------------------
// Middleware
// ------------------------
function requireAuth(req: any, res: any, next: any) {
  if (!req.session.userId) return res.status(401).json({ error: "Not authenticated" });
  next();
}

function requireRole(...roles: string[]) {
  return (req: any, res: any, next: any) => {
    if (!req.session.role || !roles.includes(req.session.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  };
}

// ------------------------
// Routes
// ------------------------
app.post("/auth/register", async (req: any, res: any) => {
  try {
    const data = insertUserSchema.parse(req.body);

    const { data: existingUser } = await supabase
      .from("users")
      .select("*")
      .eq("phone", data.phone)
      .single();

    if (existingUser) return res.status(400).json({ error: "User already exists" });

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const { data: newUser, error: insertError } = await supabase
      .from("users")
      .insert([{ ...data, password: hashedPassword }])
      .select()
      .single();

    if (insertError) return res.status(500).json({ error: insertError.message });

    req.session.regenerate((err: any) => {
      if (err) return res.status(500).json({ error: "Session error" });
      req.session.userId = newUser.id;
      req.session.role = newUser.role;
      res.json({
        user: { id: newUser.id, phone: newUser.phone, role: newUser.role, name: newUser.name }
      });
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/auth/login", async (req: any, res: any) => {
  try {
    const { phone, password } = req.body;

    const { data: user, error } = await supabase.from("users").select("*").eq("phone", phone).single();

    if (!user) return res.status(401).json({ error: "Invalid credentials" });
    if (error) return res.status(500).json({ error: error.message });

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return res.status(401).json({ error: "Invalid credentials" });

    req.session.regenerate((err: any) => {
      if (err) return res.status(500).json({ error: "Session error" });
      req.session.userId = user.id;
      req.session.role = user.role;
      res.json({
        user: { id: user.id, phone: user.phone, role: user.role, name: user.name }
      });
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/auth/logout", (req: any, res: any) => {
  req.session.destroy(() => res.json({ success: true }));
});

app.get("/auth/me", requireAuth, async (req: any, res: any) => {
  try {
    const { data: user, error } = await supabase.from("users").select("*").eq("id", req.session.userId).single();
    if (!user) return res.status(404).json({ error: "User not found" });
    if (error) return res.status(500).json({ error: error.message });

    res.json({ user: { id: user.id, phone: user.phone, role: user.role, name: user.name } });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ------------------------
// Farmers CSV Upload
// ------------------------
app.post("/farmers/upload-csv", requireAuth, requireRole("admin"), async (req: any, res: any) => {
  try {
    const { csvData } = req.body;
    if (!csvData) return res.status(400).json({ error: "No CSV data provided" });

    const parsed = Papa.parse(csvData, { header: true, skipEmptyLines: true });
    const farmersToInsert = parsed.data.map((row: any) => ({
      farmerId: row.farmer_id || row.FarmerId || row.id,
      name: row.name || row.Name,
      phone: row.phone || row.Phone,
      agentId: null
    }));

    const validFarmers = farmersToInsert.filter((f) => f.farmerId && f.name && f.phone);
    if (validFarmers.length === 0) return res.status(400).json({ error: "No valid farmers found" });

    const { data: farmers2, error } = await supabase.from("farmers").insert(validFarmers).select();
    if (error) return res.status(500).json({ error: error.message });

    res.json({ success: true, count: farmers2.length, farmers: farmers2 });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ------------------------
// Other farmer/order routes omitted for brevity (same as your original code)
// ------------------------

// ------------------------
// Export as Netlify Function
// ------------------------
const server = createServer(app);
export { server as handler };
