import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, timestamp, pgEnum, integer, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const roleEnum = pgEnum("role", ["admin", "agent", "farmer", "super_agent"]);
export const orderStatusEnum = pgEnum("order_status", ["pending", "approved", "rejected"]);
export const paymentStatusEnum = pgEnum("payment_status", ["pending", "approved", "rejected"]);

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  phone: text("phone").notNull().unique(),
  password: text("password").notNull(),
  role: roleEnum("role").notNull(),
  name: text("name").notNull(),
});

export const farmers = pgTable("farmers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  farmerId: text("farmer_id").notNull().unique(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  agentId: varchar("agent_id").references(() => users.id),
});

export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  farmerId: varchar("farmer_id").notNull().references(() => farmers.id),
  agentId: varchar("agent_id").notNull().references(() => users.id),
  superAgentId: varchar("super_agent_id").references(() => users.id),
  totalCost: decimal("total_cost", { precision: 10, scale: 2 }).notNull(),
  downPayment: decimal("down_payment", { precision: 10, scale: 2 }).notNull(),
  balance: decimal("balance", { precision: 10, scale: 2 }).notNull(),
  status: orderStatusEnum("status").notNull().default("pending"),
  comments: text("comments"),
  dueDate: timestamp("due_date").notNull(),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  superAgentApprovedAt: timestamp("super_agent_approved_at"),
  superAgentRejectedAt: timestamp("super_agent_rejected_at"),
  superAgentRejectionReason: text("super_agent_rejection_reason"),
  adminApprovedAt: timestamp("admin_approved_at"),
  adminRejectedAt: timestamp("admin_rejected_at"),
  adminRejectionReason: text("admin_rejection_reason"),
});

export const superAgentProfiles = pgTable("super_agent_profiles", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().unique(),
  fullName: text("full_name").notNull(),
  phone: text("phone").notNull(),
  region: text("region"),
  assignedAgentsCount: integer("assigned_agents_count").default(0),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const agentAssignments = pgTable("agent_assignments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  superAgentId: uuid("super_agent_id").notNull(),
  agentId: uuid("agent_id").notNull().unique(),
  assignedAt: timestamp("assigned_at").notNull().default(sql`now()`),
});

export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: uuid("order_id").notNull(),
  farmerId: uuid("farmer_id").notNull(),
  agentId: uuid("agent_id"),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  paymentType: text("payment_type").notNull(),
  paymentMethod: text("payment_method"),
  paymentReference: text("payment_reference"),
  status: text("status").notNull().default("pending"),
  processedAt: timestamp("processed_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertFarmerSchema = createInsertSchema(farmers).omit({ id: true });
export const insertOrderSchema = createInsertSchema(orders).omit({ id: true, createdAt: true });
export const insertSuperAgentProfileSchema = createInsertSchema(superAgentProfiles).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAgentAssignmentSchema = createInsertSchema(agentAssignments).omit({ id: true, assignedAt: true });
export const insertPaymentSchema = createInsertSchema(payments).omit({ id: true, createdAt: true, updatedAt: true });

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertFarmer = z.infer<typeof insertFarmerSchema>;
export type Farmer = typeof farmers.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;
export type InsertSuperAgentProfile = z.infer<typeof insertSuperAgentProfileSchema>;
export type SuperAgentProfile = typeof superAgentProfiles.$inferSelect;
export type InsertAgentAssignment = z.infer<typeof insertAgentAssignmentSchema>;
export type AgentAssignment = typeof agentAssignments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof payments.$inferSelect;
