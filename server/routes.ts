import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import bcrypt from "bcryptjs";
import { insertUserSchema, insertFarmerSchema, insertOrderSchema } from "@shared/schema";
import { validateDownPayment } from "@shared/logic/paymentUtils";
import Papa from "papaparse";
import { z } from "zod";

// Session user type
declare module "express-session" {
  interface SessionData {
    userId?: string;
    role?: "admin" | "agent" | "farmer";
  }
}

// Authentication middleware
function requireAuth(req: any, res: any, next: any) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }
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

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const data = insertUserSchema.parse(req.body);
      
      // Check if user exists
      const existingUser = await storage.getUserByPhone(data.phone);
      if (existingUser) {
        return res.status(400).json({ error: "User already exists" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(data.password, 10);
      
      // Create user
      const user = await storage.createUser({
        ...data,
        password: hashedPassword,
      });

      // Regenerate session to prevent session fixation
      req.session.regenerate((err) => {
        if (err) {
          return res.status(500).json({ error: "Session error" });
        }
        req.session.userId = user.id;
        req.session.role = user.role;
        
        res.json({ user: { id: user.id, phone: user.phone, role: user.role, name: user.name } });
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
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

      // Regenerate session to prevent session fixation
      req.session.regenerate((err) => {
        if (err) {
          return res.status(500).json({ error: "Session error" });
        }
        req.session.userId = user.id;
        req.session.role = user.role;

        res.json({ user: { id: user.id, phone: user.phone, role: user.role, name: user.name } });
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ success: true });
    });
  });

  app.get("/api/auth/me", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json({ user: { id: user.id, phone: user.phone, role: user.role, name: user.name } });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Farmer routes
  app.post("/api/farmers/upload-csv", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const { csvData } = req.body;
      
      if (!csvData) {
        return res.status(400).json({ error: "No CSV data provided" });
      }

      // Parse CSV
      const parsed = Papa.parse(csvData, {
        header: true,
        skipEmptyLines: true,
      });

      const farmersToInsert = parsed.data.map((row: any) => {
        return {
          farmerId: row.farmer_id || row.FarmerId || row.id,
          name: row.name || row.Name,
          phone: row.phone || row.Phone,
          agentId: null,
        };
      });

      // Validate data
      const validFarmers = farmersToInsert.filter((f: any) => f.farmerId && f.name && f.phone);

      if (validFarmers.length === 0) {
        return res.status(400).json({ error: "No valid farmers found in CSV" });
      }

      // Insert farmers
      const farmers = await storage.createFarmers(validFarmers);

      res.json({ success: true, count: farmers.length, farmers });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/farmers/search", requireAuth, requireRole("agent", "admin"), async (req, res) => {
    try {
      const { query } = req.query;
      
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: "Search query required" });
      }

      // Search by phone
      let farmer = await storage.getFarmerByPhone(query);
      
      // Search by farmer ID
      if (!farmer) {
        farmer = await storage.getFarmerByFarmerId(query);
      }

      if (!farmer) {
        return res.status(404).json({ error: "Farmer not found" });
      }

      res.json({ farmer });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/farmers", requireAuth, requireRole("agent", "admin"), async (req, res) => {
    try {
      let farmers: any[] = [];
      
      if (req.session.role === "agent") {
        farmers = await storage.getFarmersByAgentId(req.session.userId!);
      } else {
        // Admin can see all farmers - for simplicity, return empty for now
        farmers = [];
      }

      res.json({ farmers });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Order routes
  app.post("/api/orders", requireAuth, requireRole("agent"), async (req, res) => {
    try {
      const data = req.body;
      
      // Validate farmer exists
      const farmer = await storage.getFarmer(data.farmerId);
      if (!farmer) {
        return res.status(404).json({ error: "Farmer not found" });
      }

      // Validate down payment is exactly 50%
      const totalCost = parseFloat(data.totalCost);
      const downPayment = parseFloat(data.downPayment);
      
      if (!validateDownPayment(totalCost, downPayment)) {
        return res.status(400).json({ error: "Down payment must be exactly 50% of total cost" });
      }

      const balance = totalCost - downPayment;

      // Create order
      const order = await storage.createOrder({
        farmerId: data.farmerId,
        agentId: req.session.userId!,
        totalCost: data.totalCost,
        downPayment: data.downPayment,
        balance: balance.toFixed(2),
        dueDate: new Date(data.dueDate),
        status: "pending",
      });

      res.json({ order });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/orders", requireAuth, async (req, res) => {
    try {
      let orders: any[] = [];

      if (req.session.role === "admin") {
        orders = await storage.getAllOrders();
      } else if (req.session.role === "agent") {
        orders = await storage.getOrdersByAgentId(req.session.userId!);
      } else if (req.session.role === "farmer") {
        // Find farmer by user phone
        const user = await storage.getUser(req.session.userId!);
        if (!user) {
          return res.status(404).json({ error: "User not found" });
        }
        const farmer = await storage.getFarmerByPhone(user.phone);
        if (!farmer) {
          return res.json({ orders: [] });
        }
        orders = await storage.getOrdersByFarmerId(farmer.id);
      } else {
        orders = [];
      }

      res.json({ orders });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/orders/pending", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const orders = await storage.getPendingOrders();
      res.json({ orders });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/orders/:id/approve", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const { id } = req.params;
      const { comments } = req.body;

      const order = await storage.updateOrderStatus(id, "approved", comments);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }
      res.json({ order });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch("/api/orders/:id/reject", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const { id } = req.params;
      const { comments } = req.body;

      const order = await storage.updateOrderStatus(id, "rejected", comments);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }
      res.json({ order });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Stats routes
  app.get("/api/stats", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const orders = await storage.getAllOrders();
      
      const totalDownPayments = orders.reduce((sum, order) => sum + parseFloat(order.downPayment.toString()), 0);
      const totalPendingDebts = orders
        .filter(o => o.status === "approved")
        .reduce((sum, order) => sum + parseFloat(order.balance.toString()), 0);
      
      res.json({
        totalDownPayments,
        totalPendingDebts,
        totalOrders: orders.length,
        pendingOrders: orders.filter(o => o.status === "pending").length,
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
