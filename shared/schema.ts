import { pgTable, text, serial, integer, timestamp, date, numeric, boolean } from "drizzle-orm/pg-core";
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
  chickenType: text("chicken_type").notNull().default("Pure"),
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
  chickenType: text("chicken_type").notNull().default("Pure"),
  saleType: text("sale_type").notNull().default("Egg"), // 'Egg' | 'Tray'
});

export const chickenSales = pgTable("chicken_sales", {
  id: serial("id").primaryKey(),
  date: date("date").notNull(),
  chickensSold: integer("chickens_sold").notNull(),
  pricePerChicken: numeric("price_per_chicken").notNull(),
  customerName: text("customer_name").notNull(),
  totalAmount: numeric("total_amount").notNull(),
  chickenType: text("chicken_type").notNull().default("Pure"),
  notes: text("notes"),
});

export const chickenManagement = pgTable("chicken_management", {
  id: serial("id").primaryKey(),
  date: date("date").notNull().defaultNow(),
  totalChickens: integer("total_chickens").notNull(),
  healthy: integer("healthy").notNull(),
  sick: integer("sick").notNull(),
  dead: integer("dead").notNull(),
  chicks: integer("chicks").notNull(),
  chickenType: text("chicken_type").notNull().default("Pure"),
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

export const feedMetrics = pgTable("feed_metrics", {
  id: serial("id").primaryKey(),
  date: date("date").notNull(),
  openingStockKg: numeric("opening_stock_kg").notNull().default("0"),
  feedAddedKg: numeric("feed_added_kg").notNull().default("0"),
  feedConsumedKg: numeric("feed_consumed_kg").notNull(),
  closingStockKg: numeric("closing_stock_kg").notNull(),
  feedCost: numeric("feed_cost").notNull().default("0"),
  notes: text("notes"),
});

export const alertEvents = pgTable("alert_events", {
  id: serial("id").primaryKey(),
  alertDate: date("alert_date").notNull(),
  alertType: text("alert_type").notNull(),
  severity: text("severity").notNull(),
  alertMessage: text("alert_message").notNull(),
  thresholdValue: numeric("threshold_value").notNull().default("0"),
  currentValue: numeric("current_value").notNull().default("0"),
  smsSent: boolean("sms_sent").notNull().default(false),
  smsResponse: text("sms_response"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const whatsappMessages = pgTable("whatsapp_messages", {
  id: serial("id").primaryKey(),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
  phone: text("phone").notNull(),
  messageDate: date("message_date").notNull(),
  eggs: integer("eggs").notNull(),
  brokenEggs: integer("broken_eggs").notNull().default(0),
  feedConsumedKg: numeric("feed_consumed_kg").notNull().default("0"),
  profit: numeric("profit").notNull().default("0"),
  status: text("status").notNull().default("Normal"),
  messageText: text("message_text").notNull(),
  whatsappLink: text("whatsapp_link").notNull(),
});

export const fcmTokens = pgTable("fcm_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  token: text("token").notNull().unique(),
  deviceLabel: text("device_label"),
  userAgent: text("user_agent"),
  isActive: boolean("is_active").notNull().default(true),
  lastSeenAt: timestamp("last_seen_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
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
export const insertChickenSalesSchema = createInsertSchema(chickenSales).omit({ id: true });
export const insertChickenManagementSchema = createInsertSchema(chickenManagement).omit({ id: true });
export const insertInventorySchema = createInsertSchema(inventory).omit({ id: true });
export const insertExpensesSchema = createInsertSchema(expenses).omit({ id: true });
export const insertFeedMetricsSchema = createInsertSchema(feedMetrics).omit({ id: true });
export const insertAlertEventsSchema = createInsertSchema(alertEvents).omit({ id: true, createdAt: true });
export const insertWhatsappMessagesSchema = createInsertSchema(whatsappMessages).omit({ id: true, sentAt: true });
export const insertFcmTokenSchema = createInsertSchema(fcmTokens).omit({
  id: true,
  isActive: true,
  lastSeenAt: true,
  createdAt: true,
  updatedAt: true,
});
export const insertVaccinationsSchema = createInsertSchema(vaccinations).omit({ id: true });

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type InsertEggCollection = z.infer<typeof insertEggCollectionSchema>;
export type InsertEggSales = z.infer<typeof insertEggSalesSchema>;
export type InsertChickenSale = z.infer<typeof insertChickenSalesSchema>;
export type InsertChickenManagement = z.infer<typeof insertChickenManagementSchema>;
export type InsertInventory = z.infer<typeof insertInventorySchema>;
export type InsertExpense = z.infer<typeof insertExpensesSchema>;
export type InsertFeedMetric = z.infer<typeof insertFeedMetricsSchema>;
export type InsertAlertEvent = z.infer<typeof insertAlertEventsSchema>;
export type InsertWhatsappMessage = z.infer<typeof insertWhatsappMessagesSchema>;
export type InsertFcmToken = z.infer<typeof insertFcmTokenSchema>;
export type InsertVaccination = z.infer<typeof insertVaccinationsSchema>;

export type User = typeof users.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type EggCollection = typeof eggCollection.$inferSelect;
export type EggSales = typeof eggSales.$inferSelect;
export type ChickenSale = typeof chickenSales.$inferSelect;
export type ChickenManagement = typeof chickenManagement.$inferSelect;
export type Inventory = typeof inventory.$inferSelect;
export type Expense = typeof expenses.$inferSelect;
export type FeedMetric = typeof feedMetrics.$inferSelect;
export type AlertEvent = typeof alertEvents.$inferSelect;
export type WhatsAppMessage = typeof whatsappMessages.$inferSelect;
export type FcmToken = typeof fcmTokens.$inferSelect;
export type Vaccination = typeof vaccinations.$inferSelect;
