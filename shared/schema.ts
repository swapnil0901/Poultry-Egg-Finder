import { pgTable, text, serial, integer, timestamp, date, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull(), // 'admin' | 'worker'
  createdAt: timestamp("created_at").defaultNow(),
});

export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id")
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const eggCollection = pgTable("egg_collection", {
  id: serial("id").primaryKey(),
  date: date("date").notNull(),
  eggsCollected: integer("eggs_collected").notNull(),
  brokenEggs: integer("broken_eggs").notNull().default(0),
  shed: text("shed").notNull(),
  notes: text("notes"),
});

export const eggSales = pgTable("egg_sales", {
  id: serial("id").primaryKey(),
  date: date("date").notNull(),
  eggsSold: integer("eggs_sold").notNull(),
  pricePerEgg: numeric("price_per_egg").notNull(),
  customerName: text("customer_name").notNull(),
  totalAmount: numeric("total_amount").notNull(),
  saleType: text("sale_type").notNull().default("Egg"), // 'Egg' | 'Tray'
});

export const chickenManagement = pgTable("chicken_management", {
  id: serial("id").primaryKey(),
  date: date("date").notNull().defaultNow(),
  totalChickens: integer("total_chickens").notNull(),
  healthy: integer("healthy").notNull(),
  sick: integer("sick").notNull(),
  dead: integer("dead").notNull(),
  chicks: integer("chicks").notNull(),
});

export const diseaseRecords = pgTable("disease_records", {
  id: serial("id").primaryKey(),
  date: date("date").notNull(),
  diseaseName: text("disease_name").notNull(),
  chickensAffected: integer("chickens_affected").notNull(),
  treatment: text("treatment").notNull(),
});

export const inventory = pgTable("inventory", {
  id: serial("id").primaryKey(),
  itemName: text("item_name").notNull(),
  quantity: integer("quantity").notNull(),
  purchaseDate: date("purchase_date").notNull(),
  supplier: text("supplier").notNull(),
  cost: numeric("cost").notNull(),
});

export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  date: date("date").notNull(),
  expenseType: text("expense_type").notNull(),
  amount: numeric("amount").notNull(),
  description: text("description"),
});

export const vaccinations = pgTable("vaccinations", {
  id: serial("id").primaryKey(),
  vaccineName: text("vaccine_name").notNull(),
  date: date("date").notNull(),
  chickensVaccinated: integer("chickens_vaccinated").notNull(),
  nextVaccination: date("next_vaccination").notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertConversationSchema = createInsertSchema(conversations).omit({ id: true, createdAt: true });
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, createdAt: true });
export const insertEggCollectionSchema = createInsertSchema(eggCollection).omit({ id: true });
export const insertEggSalesSchema = createInsertSchema(eggSales).omit({ id: true });
export const insertChickenManagementSchema = createInsertSchema(chickenManagement).omit({ id: true });
export const insertDiseaseRecordsSchema = createInsertSchema(diseaseRecords).omit({ id: true });
export const insertInventorySchema = createInsertSchema(inventory).omit({ id: true });
export const insertExpensesSchema = createInsertSchema(expenses).omit({ id: true });
export const insertVaccinationsSchema = createInsertSchema(vaccinations).omit({ id: true });

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type InsertEggCollection = z.infer<typeof insertEggCollectionSchema>;
export type InsertEggSales = z.infer<typeof insertEggSalesSchema>;
export type InsertChickenManagement = z.infer<typeof insertChickenManagementSchema>;
export type InsertDiseaseRecord = z.infer<typeof insertDiseaseRecordsSchema>;
export type InsertInventory = z.infer<typeof insertInventorySchema>;
export type InsertExpense = z.infer<typeof insertExpensesSchema>;
export type InsertVaccination = z.infer<typeof insertVaccinationsSchema>;

export type User = typeof users.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type EggCollection = typeof eggCollection.$inferSelect;
export type EggSales = typeof eggSales.$inferSelect;
export type ChickenManagement = typeof chickenManagement.$inferSelect;
export type DiseaseRecord = typeof diseaseRecords.$inferSelect;
export type Inventory = typeof inventory.$inferSelect;
export type Expense = typeof expenses.$inferSelect;
export type Vaccination = typeof vaccinations.$inferSelect;
