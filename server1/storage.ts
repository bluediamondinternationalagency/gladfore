import { users, farmers, orders, type User, type InsertUser, type Farmer, type InsertFarmer, type Order, type InsertOrder } from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByPhone(phone: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Farmer methods
  getFarmer(id: string): Promise<Farmer | undefined>;
  getFarmerByPhone(phone: string): Promise<Farmer | undefined>;
  getFarmerByFarmerId(farmerId: string): Promise<Farmer | undefined>;
  getFarmersByAgentId(agentId: string): Promise<Farmer[]>;
  createFarmer(farmer: InsertFarmer): Promise<Farmer>;
  createFarmers(farmers: InsertFarmer[]): Promise<Farmer[]>;

  // Order methods
  getOrder(id: string): Promise<Order | undefined>;
  getOrdersByFarmerId(farmerId: string): Promise<Order[]>;
  getOrdersByAgentId(agentId: string): Promise<Order[]>;
  getPendingOrders(): Promise<Order[]>;
  getAllOrders(): Promise<Order[]>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrderStatus(id: string, status: "pending" | "approved" | "rejected", comments?: string): Promise<Order | undefined>;
}

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByPhone(phone: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.phone, phone));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // Farmer methods
  async getFarmer(id: string): Promise<Farmer | undefined> {
    const [farmer] = await db.select().from(farmers).where(eq(farmers.id, id));
    return farmer || undefined;
  }

  async getFarmerByPhone(phone: string): Promise<Farmer | undefined> {
    const [farmer] = await db.select().from(farmers).where(eq(farmers.phone, phone));
    return farmer || undefined;
  }

  async getFarmerByFarmerId(farmerId: string): Promise<Farmer | undefined> {
    const [farmer] = await db.select().from(farmers).where(eq(farmers.farmerId, farmerId));
    return farmer || undefined;
  }

  async getFarmersByAgentId(agentId: string): Promise<Farmer[]> {
    return db.select().from(farmers).where(eq(farmers.agentId, agentId));
  }

  async createFarmer(insertFarmer: InsertFarmer): Promise<Farmer> {
    const [farmer] = await db.insert(farmers).values(insertFarmer).returning();
    return farmer;
  }

  async createFarmers(insertFarmers: InsertFarmer[]): Promise<Farmer[]> {
    return db.insert(farmers).values(insertFarmers).returning();
  }

  // Order methods
  async getOrder(id: string): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order || undefined;
  }

  async getOrdersByFarmerId(farmerId: string): Promise<Order[]> {
    return db.select().from(orders).where(eq(orders.farmerId, farmerId)).orderBy(desc(orders.createdAt));
  }

  async getOrdersByAgentId(agentId: string): Promise<Order[]> {
    return db.select().from(orders).where(eq(orders.agentId, agentId)).orderBy(desc(orders.createdAt));
  }

  async getPendingOrders(): Promise<Order[]> {
    return db.select().from(orders).where(eq(orders.status, "pending")).orderBy(desc(orders.createdAt));
  }

  async getAllOrders(): Promise<Order[]> {
    return db.select().from(orders).orderBy(desc(orders.createdAt));
  }

  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    const [order] = await db.insert(orders).values(insertOrder).returning();
    return order;
  }

  async updateOrderStatus(id: string, status: "pending" | "approved" | "rejected", comments?: string): Promise<Order | undefined> {
    const [order] = await db
      .update(orders)
      .set({ status, comments })
      .where(eq(orders.id, id))
      .returning();
    return order || undefined;
  }
}

export const storage = new DatabaseStorage();
