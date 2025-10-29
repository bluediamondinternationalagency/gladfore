import { db } from "./db";
import { users, farmers } from "@shared/schema";
import bcrypt from "bcryptjs";

async function seed() {
  console.log("Seeding database...");

  // Create admin user
  const adminPassword = await bcrypt.hash("admin123", 10);
  const [admin] = await db.insert(users).values({
    phone: "+254700000000",
    password: adminPassword,
    role: "admin",
    name: "Admin User",
  }).onConflictDoNothing().returning();
  
  console.log("✓ Created admin user (phone: +254700000000, password: admin123)");

  // Create agent user
  const agentPassword = await bcrypt.hash("agent123", 10);
  const [agent] = await db.insert(users).values({
    phone: "+254711111111",
    password: agentPassword,
    role: "agent",
    name: "Agent John",
  }).onConflictDoNothing().returning();
  
  console.log("✓ Created agent user (phone: +254711111111, password: agent123)");

  // Create farmer user
  const farmerPassword = await bcrypt.hash("farmer123", 10);
  const [farmer1User] = await db.insert(users).values({
    phone: "+254712345678",
    password: farmerPassword,
    role: "farmer",
    name: "Mary Wanjiku",
  }).onConflictDoNothing().returning();
  
  console.log("✓ Created farmer user (phone: +254712345678, password: farmer123)");

  // Create some sample farmers in the system
  const sampleFarmers = [
    { farmerId: "F2025001", name: "Mary Wanjiku", phone: "+254712345678", agentId: agent?.id || null },
    { farmerId: "F2025002", name: "John Kamau", phone: "+254723456789", agentId: agent?.id || null },
    { farmerId: "F2025003", name: "Grace Akinyi", phone: "+254734567890", agentId: agent?.id || null },
  ];

  await db.insert(farmers).values(sampleFarmers).onConflictDoNothing();
  console.log("✓ Created sample farmers");

  console.log("\nSeed complete! You can now log in with:");
  console.log("  Admin:  +254700000000 / admin123");
  console.log("  Agent:  +254711111111 / agent123");
  console.log("  Farmer: +254712345678 / farmer123");
}

seed()
  .then(() => {
    console.log("\n✓ Seeding successful");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Seeding failed:", error);
    process.exit(1);
  });
