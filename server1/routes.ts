import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import bcrypt from "bcryptjs";
import Papa from "papaparse";
import { z } from "zod";
import { supabase } from "../client/src/lib/supabaseClient"; // your initialized Supabase client
import {
  insertUserSchema,
  insertFarmerSchema,
  insertOrderSchema,
} from "@shared/schema";
import { validateDownPayment } from "@shared/logic/paymentUtils";

// ------------------------------------------------------------
// Extend express-session types
// ------------------------------------------------------------
declare module "express-session" {
  interface SessionData {
    userId?: string;
    role?: "admin" | "agent" | "farmer";
  }
}

// Typed Request with session
import type { Session } from "express-session";

// Typed Request with session
interface AuthenticatedRequest extends Request {
  session: Session & {
    userId?: string;
    role?: "admin" | "agent" | "farmer";
  };
}


// ------------------------------------------------------------
// Middleware
// ------------------------------------------------------------
function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  if (!req.session.userId)
    return res.status(401).json({ error: "Not authenticated" });
  next();
}

function requireRole(...roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.session.role || !roles.includes(req.session.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  };
}

// ------------------------------------------------------------
// Routes
// ------------------------------------------------------------
export async function registerRoutes(app: Express): Promise<Server> {
  // -------------------- AUTH --------------------
  app.post("/auth/register", async (req: AuthenticatedRequest, res: Response) => {
    try {
      const data = insertUserSchema.parse(req.body);

      // Check if user exists
      const { data: existingUser, error: existingError } = await supabase
        .from("users")
        .select("*")
        .eq("phone", data.phone)
        .single();

      if (existingUser)
        return res.status(400).json({ error: "User already exists" });
      if (existingError && existingError.code !== "PGRST116")
        return res.status(500).json({ error: existingError.message });

      // Hash password
      const hashedPassword = await bcrypt.hash(data.password, 10);

      const { data: newUser, error: insertError } = await supabase
        .from("users")
        .insert([{ ...data, password: hashedPassword }])
        .select()
        .single();

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
            name: newUser.name,
          },
        });
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/auth/login", async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { phone, password } = req.body;

      const { data: user, error } = await supabase
        .from("users")
        .select("*")
        .eq("phone", phone)
        .single();

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
            name: user.name,
          },
        });
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/auth/logout", (req: AuthenticatedRequest, res: Response) => {
    req.session.destroy(() => res.json({ success: true }));
  });

  app.get("/auth/me", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { data: user, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", req.session.userId)
        .single();

      if (!user) return res.status(404).json({ error: "User not found" });
      if (error) return res.status(500).json({ error: error.message });

      res.json({
        user: {
          id: user.id,
          phone: user.phone,
          role: user.role,
          name: user.name,
        },
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // -------------------- FARMERS --------------------
  app.post(
    "/farmers/upload-csv",
    requireAuth,
    requireRole("admin"),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { csvData } = req.body;
        if (!csvData)
          return res.status(400).json({ error: "No CSV data provided" });

        const parsed = Papa.parse(csvData, { header: true, skipEmptyLines: true });

        const farmersToInsert = (parsed.data as any[]).map((row: any) => ({
          farmerId: row.farmer_id || row.FarmerId || row.id,
          name: row.name || row.Name,
          phone: row.phone || row.Phone,
          agentId: null,
        }));

        const validFarmers = farmersToInsert.filter(
          (f) => f.farmerId && f.name && f.phone
        );
        if (validFarmers.length === 0)
          return res.status(400).json({ error: "No valid farmers found" });

        const { data: farmers, error } = await supabase
          .from("farmers")
          .insert(validFarmers)
          .select();
        if (error) return res.status(500).json({ error: error.message });

        res.json({ success: true, count: farmers.length, farmers });
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    }
  );

  app.get(
    "/farmers/search",
    requireAuth,
    requireRole("agent", "admin"),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const query = req.query.query as string;
        if (!query) return res.status(400).json({ error: "Search query required" });

        let { data: farmer } = await supabase
          .from("farmers")
          .select("*")
          .eq("phone", query)
          .single();

        if (!farmer) {
          const { data: f } = await supabase
            .from("farmers")
            .select("*")
            .eq("farmerId", query)
            .single();
          farmer = f || null;
        }

        if (!farmer) return res.status(404).json({ error: "Farmer not found" });
        res.json({ farmer });
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    }
  );

  app.get(
    "/farmers",
    requireAuth,
    requireRole("agent", "admin"),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        let farmers: any[] = [];

        if (req.session.role === "agent") {
          const { data, error } = await supabase
            .from("farmers")
            .select("*")
            .eq("agentId", req.session.userId);
          if (error) return res.status(500).json({ error: error.message });
          farmers = data || [];
        } else if (req.session.role === "admin") {
          const { data, error } = await supabase.from("farmers").select("*");
          if (error) return res.status(500).json({ error: error.message });
          farmers = data || [];
        }

        res.json({ farmers });
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    }
  );

  // -------------------- ORDERS --------------------
  app.post(
    "/orders",
    requireAuth,
    requireRole("agent"),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const data = insertOrderSchema.parse(req.body);

        const farmerId = Number(data.farmerId);
        const totalCost = Number(data.totalCost);
        const downPayment = Number(data.downPayment);

        const { data: farmer } = await supabase
          .from("farmers")
          .select("*")
          .eq("id", farmerId)
          .single();

        if (!farmer) return res.status(404).json({ error: "Farmer not found" });

        if (!validateDownPayment(totalCost, downPayment))
          return res
            .status(400)
            .json({ error: "Down payment must be exactly 50% of total cost" });

        const balance = totalCost - downPayment;

        const { data: order, error } = await supabase
          .from("orders")
          .insert([
            {
              ...data,
              farmerId,
              agentId: req.session.userId,
              balance,
              status: "pending",
            },
          ])
          .select()
          .single();

        if (error) return res.status(500).json({ error: error.message });
        res.json({ order });
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    }
  );

  app.get("/orders", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      let orders: any[] = [];

      if (req.session.role === "admin") {
        const { data, error } = await supabase.from("orders").select("*");
        if (error) return res.status(500).json({ error: error.message });
        orders = data || [];
      } else if (req.session.role === "agent") {
        const { data, error } = await supabase
          .from("orders")
          .select("*")
          .eq("agentId", req.session.userId);
        if (error) return res.status(500).json({ error: error.message });
        orders = data || [];
      } else if (req.session.role === "farmer") {
        const { data: user } = await supabase
          .from("users")
          .select("*")
          .eq("id", req.session.userId)
          .single();
        if (!user) return res.status(404).json({ error: "User not found" });

        const { data: farmer } = await supabase
          .from("farmers")
          .select("*")
          .eq("phone", user.phone)
          .single();

        if (!farmer) return res.json({ orders: [] });

        const { data: farmerOrders, error } = await supabase
          .from("orders")
          .select("*")
          .eq("farmerId", farmer.id);
        if (error) return res.status(500).json({ error: error.message });

        orders = farmerOrders || [];
      }

      res.json({ orders });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ------------------------------------------------------------
  // Create and return HTTP server
  // ------------------------------------------------------------
  const httpServer = createServer(app);
  return httpServer;
}
