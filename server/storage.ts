import { and, desc, eq } from "drizzle-orm";
import { db, ensureDatabaseReady, isPostgresConfigured } from "./db.js";
import {
  users,
  eggCollection,
  eggSales,
  chickenSales,
  chickenManagement,
  inventory,
  expenses,
  feedMetrics,
  alertEvents,
  whatsappMessages,
  fcmTokens,
  vaccinations,
  type User,
  type EggCollection,
  type EggSales,
  type ChickenSale,
  type ChickenManagement,
  type Inventory,
  type Expense,
  type FeedMetric,
  type AlertEvent,
  type WhatsAppMessage,
  type FcmToken,
  type Vaccination,
  type InsertUser,
} from "../shared/schema.js";
import { z } from "zod";
import { api } from "../shared/routes.js";

function toDateOnly(value: string | Date | undefined): string {
  if (!value) {
    return new Date().toISOString().split("T")[0];
  }
  return new Date(value).toISOString().split("T")[0];
}

function toNumber(value: unknown, fallback = 0): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

export interface CreateAlertEventInput {
  alertDate: string;
  alertType: string;
  severity: string;
  alertMessage: string;
  thresholdValue: number;
  currentValue: number;
  smsSent: boolean;
  smsResponse?: string | null;
}

export interface CreateWhatsAppMessageInput {
  phone: string;
  messageDate: string;
  eggs: number;
  brokenEggs: number;
  feedConsumedKg: number;
  profit: number;
  status: string;
  messageText: string;
  whatsappLink: string;
}

export interface UpsertFcmTokenInput {
  token: string;
  userId?: number | null;
  deviceLabel?: string | null;
  userAgent?: string | null;
}

export interface IStorage {
  // Auth
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserById(id: number): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Egg Collection
  getEggCollections(): Promise<EggCollection[]>;
  createEggCollection(data: z.infer<typeof api.eggCollection.create.input>): Promise<EggCollection>;

  // Egg Sales
  getEggSales(): Promise<EggSales[]>;
  createEggSales(data: z.infer<typeof api.eggSales.create.input>): Promise<EggSales>;

  // Chicken Sales
  getChickenSales(): Promise<ChickenSale[]>;
  createChickenSales(data: z.infer<typeof api.chickenSales.create.input>): Promise<ChickenSale>;

  // Chicken Management
  getChickenManagement(): Promise<ChickenManagement[]>;
  createChickenManagement(data: z.infer<typeof api.chickens.create.input>): Promise<ChickenManagement>;

  // Inventory
  getInventory(): Promise<Inventory[]>;
  createInventory(data: z.infer<typeof api.inventory.create.input>): Promise<Inventory>;

  // Expenses
  getExpenses(): Promise<Expense[]>;
  createExpense(data: z.infer<typeof api.expenses.create.input>): Promise<Expense>;

  // Feed Metrics
  getFeedMetrics(): Promise<FeedMetric[]>;
  createFeedMetric(data: z.infer<typeof api.feedMetrics.create.input>): Promise<FeedMetric>;

  // Alerts
  getAlertEventsByDate(alertDate: string): Promise<AlertEvent[]>;
  getAlertEventByDateAndType(alertDate: string, alertType: string): Promise<AlertEvent | undefined>;
  createAlertEvent(input: CreateAlertEventInput): Promise<AlertEvent>;

  // WhatsApp messages
  getWhatsAppMessages(limit?: number): Promise<WhatsAppMessage[]>;
  createWhatsAppMessage(input: CreateWhatsAppMessageInput): Promise<WhatsAppMessage>;

  // FCM tokens
  getFcmTokens(): Promise<FcmToken[]>;
  upsertFcmToken(input: UpsertFcmTokenInput): Promise<FcmToken>;
  deactivateFcmToken(token: string): Promise<void>;

  // Vaccinations
  getVaccinations(): Promise<Vaccination[]>;
  createVaccination(data: z.infer<typeof api.vaccinations.create.input>): Promise<Vaccination>;
}

export class DatabaseStorage implements IStorage {
  private async database() {
    if (!db) {
      throw new Error("PostgreSQL is not configured. Set DATABASE_URL to enable database storage.");
    }

    await ensureDatabaseReady();
    return db;
  }

  // Auth
  async getUserByEmail(email: string): Promise<User | undefined> {
    const database = await this.database();
    const [user] = await database.select().from(users).where(eq(users.email, email)).limit(1);
    return user;
  }

  async getUserById(id: number): Promise<User | undefined> {
    const database = await this.database();
    const [user] = await database.select().from(users).where(eq(users.id, id)).limit(1);
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const database = await this.database();
    const [user] = await database
      .insert(users)
      .values({
        ...insertUser,
        createdAt: new Date(),
      })
      .returning();

    if (!user) {
      throw new Error("Failed to create user.");
    }

    return user;
  }

  // Egg Collection
  async getEggCollections(): Promise<EggCollection[]> {
    const database = await this.database();
    return database
      .select()
      .from(eggCollection)
      .orderBy(desc(eggCollection.date), desc(eggCollection.id));
  }

  async createEggCollection(data: z.infer<typeof api.eggCollection.create.input>): Promise<EggCollection> {
    const database = await this.database();
    const [record] = await database
      .insert(eggCollection)
      .values({
        date: toDateOnly(data.date),
        eggsCollected: toNumber(data.eggsCollected),
        brokenEggs: toNumber(data.brokenEggs, 0),
        chickenType: data.chickenType ?? "Pure",
        shed: data.shed,
        notes: data.notes ?? null,
      })
      .returning();

    if (!record) {
      throw new Error("Failed to create egg collection record.");
    }

    return record;
  }

  // Egg Sales
  async getEggSales(): Promise<EggSales[]> {
    const database = await this.database();
    return database
      .select()
      .from(eggSales)
      .orderBy(desc(eggSales.date), desc(eggSales.id));
  }

  async createEggSales(data: z.infer<typeof api.eggSales.create.input>): Promise<EggSales> {
    const database = await this.database();
    const [record] = await database
      .insert(eggSales)
      .values({
        date: toDateOnly(data.date),
        eggsSold: toNumber(data.eggsSold),
        pricePerEgg: data.pricePerEgg.toString(),
        customerName: data.customerName,
        totalAmount: data.totalAmount.toString(),
        chickenType: data.chickenType ?? "Pure",
        saleType: data.saleType ?? "Egg",
      })
      .returning();

    if (!record) {
      throw new Error("Failed to create egg sales record.");
    }

    return record;
  }

  // Chicken Sales
  async getChickenSales(): Promise<ChickenSale[]> {
    const database = await this.database();
    return database
      .select()
      .from(chickenSales)
      .orderBy(desc(chickenSales.date), desc(chickenSales.id));
  }

  async createChickenSales(data: z.infer<typeof api.chickenSales.create.input>): Promise<ChickenSale> {
    const database = await this.database();
    const [record] = await database
      .insert(chickenSales)
      .values({
        date: toDateOnly(data.date),
        chickensSold: toNumber(data.chickensSold),
        pricePerChicken: data.pricePerChicken.toString(),
        customerName: data.customerName,
        totalAmount: data.totalAmount.toString(),
        chickenType: data.chickenType ?? "Pure",
        notes: data.notes ?? null,
      })
      .returning();

    if (!record) {
      throw new Error("Failed to create chicken sales record.");
    }

    return record;
  }

  // Chicken Management
  async getChickenManagement(): Promise<ChickenManagement[]> {
    const database = await this.database();
    return database
      .select()
      .from(chickenManagement)
      .orderBy(desc(chickenManagement.date), desc(chickenManagement.id));
  }

  async createChickenManagement(data: z.infer<typeof api.chickens.create.input>): Promise<ChickenManagement> {
    const database = await this.database();
    const [record] = await database
      .insert(chickenManagement)
      .values({
        date: toDateOnly(data.date),
        totalChickens: toNumber(data.totalChickens),
        healthy: toNumber(data.healthy),
        sick: toNumber(data.sick),
        dead: toNumber(data.dead),
        chicks: toNumber(data.chicks),
        chickenType: data.chickenType ?? "Pure",
      })
      .returning();

    if (!record) {
      throw new Error("Failed to create chicken management record.");
    }

    return record;
  }

  // Inventory
  async getInventory(): Promise<Inventory[]> {
    const database = await this.database();
    return database
      .select()
      .from(inventory)
      .orderBy(desc(inventory.purchaseDate), desc(inventory.id));
  }

  async createInventory(data: z.infer<typeof api.inventory.create.input>): Promise<Inventory> {
    const database = await this.database();
    const [record] = await database
      .insert(inventory)
      .values({
        itemName: data.itemName,
        quantity: toNumber(data.quantity),
        purchaseDate: toDateOnly(data.purchaseDate),
        supplier: data.supplier,
        cost: data.cost.toString(),
      })
      .returning();

    if (!record) {
      throw new Error("Failed to create inventory record.");
    }

    return record;
  }

  // Expenses
  async getExpenses(): Promise<Expense[]> {
    const database = await this.database();
    return database
      .select()
      .from(expenses)
      .orderBy(desc(expenses.date), desc(expenses.id));
  }

  async createExpense(data: z.infer<typeof api.expenses.create.input>): Promise<Expense> {
    const database = await this.database();
    const [record] = await database
      .insert(expenses)
      .values({
        date: toDateOnly(data.date),
        expenseType: data.expenseType,
        amount: data.amount.toString(),
        description: data.description ?? null,
      })
      .returning();

    if (!record) {
      throw new Error("Failed to create expense record.");
    }

    return record;
  }

  // Feed Metrics
  async getFeedMetrics(): Promise<FeedMetric[]> {
    const database = await this.database();
    return database
      .select()
      .from(feedMetrics)
      .orderBy(desc(feedMetrics.date), desc(feedMetrics.id));
  }

  async createFeedMetric(data: z.infer<typeof api.feedMetrics.create.input>): Promise<FeedMetric> {
    const database = await this.database();
    const [record] = await database
      .insert(feedMetrics)
      .values({
        date: toDateOnly(data.date),
        openingStockKg: toNumber(data.openingStockKg, 0).toString(),
        feedAddedKg: toNumber(data.feedAddedKg, 0).toString(),
        feedConsumedKg: toNumber(data.feedConsumedKg).toString(),
        closingStockKg: toNumber(data.closingStockKg).toString(),
        feedCost: toNumber(data.feedCost, 0).toString(),
        notes: data.notes ?? null,
      })
      .returning();

    if (!record) {
      throw new Error("Failed to create feed metric record.");
    }

    return record;
  }

  // Alerts
  async getAlertEventsByDate(alertDate: string): Promise<AlertEvent[]> {
    const database = await this.database();
    return database
      .select()
      .from(alertEvents)
      .where(eq(alertEvents.alertDate, toDateOnly(alertDate)))
      .orderBy(desc(alertEvents.createdAt), desc(alertEvents.id));
  }

  async getAlertEventByDateAndType(
    alertDate: string,
    alertType: string,
  ): Promise<AlertEvent | undefined> {
    const database = await this.database();
    const [event] = await database
      .select()
      .from(alertEvents)
      .where(
        and(
          eq(alertEvents.alertDate, toDateOnly(alertDate)),
          eq(alertEvents.alertType, alertType),
        ),
      )
      .limit(1);

    return event;
  }

  async createAlertEvent(input: CreateAlertEventInput): Promise<AlertEvent> {
    const database = await this.database();
    const [event] = await database
      .insert(alertEvents)
      .values({
        alertDate: toDateOnly(input.alertDate),
        alertType: input.alertType,
        severity: input.severity,
        alertMessage: input.alertMessage,
        thresholdValue: toNumber(input.thresholdValue, 0).toString(),
        currentValue: toNumber(input.currentValue, 0).toString(),
        smsSent: input.smsSent,
        smsResponse: input.smsResponse ?? null,
      })
      .returning();

    if (!event) {
      throw new Error("Failed to create alert event.");
    }

    return event;
  }

  // WhatsApp Messages
  async getWhatsAppMessages(limit = 50): Promise<WhatsAppMessage[]> {
    const database = await this.database();
    const rows = await database
      .select()
      .from(whatsappMessages)
      .orderBy(desc(whatsappMessages.sentAt), desc(whatsappMessages.id))
      .limit(Math.max(1, Math.min(limit, 500)));

    return rows;
  }

  async createWhatsAppMessage(input: CreateWhatsAppMessageInput): Promise<WhatsAppMessage> {
    const database = await this.database();
    const [message] = await database
      .insert(whatsappMessages)
      .values({
        phone: input.phone,
        messageDate: toDateOnly(input.messageDate),
        eggs: toNumber(input.eggs),
        brokenEggs: toNumber(input.brokenEggs),
        feedConsumedKg: toNumber(input.feedConsumedKg).toString(),
        profit: toNumber(input.profit).toString(),
        status: input.status,
        messageText: input.messageText,
        whatsappLink: input.whatsappLink,
      })
      .returning();

    if (!message) {
      throw new Error("Failed to create WhatsApp message record.");
    }

    return message;
  }

  async getFcmTokens(): Promise<FcmToken[]> {
    const database = await this.database();
    return database
      .select()
      .from(fcmTokens)
      .where(eq(fcmTokens.isActive, true))
      .orderBy(desc(fcmTokens.updatedAt), desc(fcmTokens.id));
  }

  async upsertFcmToken(input: UpsertFcmTokenInput): Promise<FcmToken> {
    const database = await this.database();
    const [existing] = await database
      .select()
      .from(fcmTokens)
      .where(eq(fcmTokens.token, input.token))
      .limit(1);

    if (existing) {
      const [updated] = await database
        .update(fcmTokens)
        .set({
          userId: input.userId ?? existing.userId ?? null,
          deviceLabel: input.deviceLabel ?? existing.deviceLabel ?? null,
          userAgent: input.userAgent ?? existing.userAgent ?? null,
          isActive: true,
          lastSeenAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(fcmTokens.id, existing.id))
        .returning();

      if (!updated) {
        throw new Error("Failed to update FCM token.");
      }

      return updated;
    }

    const [created] = await database
      .insert(fcmTokens)
      .values({
        userId: input.userId ?? null,
        token: input.token,
        deviceLabel: input.deviceLabel ?? null,
        userAgent: input.userAgent ?? null,
        isActive: true,
        lastSeenAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    if (!created) {
      throw new Error("Failed to store FCM token.");
    }

    return created;
  }

  async deactivateFcmToken(token: string): Promise<void> {
    const database = await this.database();
    await database
      .update(fcmTokens)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(fcmTokens.token, token));
  }

  // Vaccinations
  async getVaccinations(): Promise<Vaccination[]> {
    const database = await this.database();
    return database
      .select()
      .from(vaccinations)
      .orderBy(desc(vaccinations.date), desc(vaccinations.id));
  }

  async createVaccination(data: z.infer<typeof api.vaccinations.create.input>): Promise<Vaccination> {
    const database = await this.database();
    const [record] = await database
      .insert(vaccinations)
      .values({
        vaccineName: data.vaccineName,
        date: toDateOnly(data.date),
        chickensVaccinated: toNumber(data.chickensVaccinated),
        nextVaccination: toDateOnly(data.nextVaccination),
      })
      .returning();

    if (!record) {
      throw new Error("Failed to create vaccination record.");
    }

    return record;
  }
}

export class MemoryStorage implements IStorage {
  private userId = 1;
  private eggCollectionId = 1;
  private eggSalesId = 1;
  private chickenSalesId = 1;
  private chickenManagementId = 1;
  private inventoryId = 1;
  private expenseId = 1;
  private feedMetricId = 1;
  private alertEventId = 1;
  private whatsappMessageId = 1;
  private fcmTokenId = 1;
  private vaccinationId = 1;

  private userRecords: User[] = [];
  private eggCollectionRecords: EggCollection[] = [];
  private eggSalesRecords: EggSales[] = [];
  private chickenSalesRecords: ChickenSale[] = [];
  private chickenRecords: ChickenManagement[] = [];
  private inventoryRecords: Inventory[] = [];
  private expenseRecords: Expense[] = [];
  private feedMetricRecords: FeedMetric[] = [];
  private alertEventRecords: AlertEvent[] = [];
  private whatsappMessageRecords: WhatsAppMessage[] = [];
  private fcmTokenRecords: FcmToken[] = [];
  private vaccinationRecords: Vaccination[] = [];

  async getUserByEmail(email: string): Promise<User | undefined> {
    return this.userRecords.find((user) => user.email === email);
  }

  async getUserById(id: number): Promise<User | undefined> {
    return this.userRecords.find((user) => user.id === id);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const user: User = {
      id: this.userId++,
      ...insertUser,
      createdAt: new Date(),
    };
    this.userRecords.push(user);
    return user;
  }

  async getEggCollections(): Promise<EggCollection[]> {
    return [...this.eggCollectionRecords].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }

  async createEggCollection(data: z.infer<typeof api.eggCollection.create.input>): Promise<EggCollection> {
    const record: EggCollection = {
      id: this.eggCollectionId++,
      date: toDateOnly(data.date),
      eggsCollected: Number(data.eggsCollected),
      brokenEggs: Number(data.brokenEggs ?? 0),
      chickenType: data.chickenType ?? "Pure",
      shed: data.shed,
      notes: data.notes ?? null,
    };
    this.eggCollectionRecords.push(record);
    return record;
  }

  async getEggSales(): Promise<EggSales[]> {
    return [...this.eggSalesRecords].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }

  async createEggSales(data: z.infer<typeof api.eggSales.create.input>): Promise<EggSales> {
    const record: EggSales = {
      id: this.eggSalesId++,
      date: toDateOnly(data.date),
      eggsSold: Number(data.eggsSold),
      pricePerEgg: data.pricePerEgg.toString(),
      customerName: data.customerName,
      totalAmount: data.totalAmount.toString(),
      chickenType: data.chickenType ?? "Pure",
      saleType: data.saleType ?? "Egg",
    };
    this.eggSalesRecords.push(record);
    return record;
  }

  async getChickenSales(): Promise<ChickenSale[]> {
    return [...this.chickenSalesRecords].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }

  async createChickenSales(data: z.infer<typeof api.chickenSales.create.input>): Promise<ChickenSale> {
    const record: ChickenSale = {
      id: this.chickenSalesId++,
      date: toDateOnly(data.date),
      chickensSold: Number(data.chickensSold),
      pricePerChicken: data.pricePerChicken.toString(),
      customerName: data.customerName,
      totalAmount: data.totalAmount.toString(),
      chickenType: data.chickenType ?? "Pure",
      notes: data.notes ?? null,
    };
    this.chickenSalesRecords.push(record);
    return record;
  }

  async getChickenManagement(): Promise<ChickenManagement[]> {
    return [...this.chickenRecords].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }

  async createChickenManagement(data: z.infer<typeof api.chickens.create.input>): Promise<ChickenManagement> {
    const record: ChickenManagement = {
      id: this.chickenManagementId++,
      date: toDateOnly(data.date),
      totalChickens: Number(data.totalChickens),
      healthy: Number(data.healthy),
      sick: Number(data.sick),
      dead: Number(data.dead),
      chicks: Number(data.chicks),
      chickenType: data.chickenType ?? "Pure",
    };
    this.chickenRecords.push(record);
    return record;
  }

  async getInventory(): Promise<Inventory[]> {
    return [...this.inventoryRecords].sort(
      (a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime(),
    );
  }

  async createInventory(data: z.infer<typeof api.inventory.create.input>): Promise<Inventory> {
    const record: Inventory = {
      id: this.inventoryId++,
      itemName: data.itemName,
      quantity: Number(data.quantity),
      purchaseDate: toDateOnly(data.purchaseDate),
      supplier: data.supplier,
      cost: data.cost.toString(),
    };
    this.inventoryRecords.push(record);
    return record;
  }

  async getExpenses(): Promise<Expense[]> {
    return [...this.expenseRecords].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }

  async createExpense(data: z.infer<typeof api.expenses.create.input>): Promise<Expense> {
    const record: Expense = {
      id: this.expenseId++,
      date: toDateOnly(data.date),
      expenseType: data.expenseType,
      amount: data.amount.toString(),
      description: data.description ?? null,
    };
    this.expenseRecords.push(record);
    return record;
  }

  async getFeedMetrics(): Promise<FeedMetric[]> {
    return [...this.feedMetricRecords].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }

  async createFeedMetric(data: z.infer<typeof api.feedMetrics.create.input>): Promise<FeedMetric> {
    const record: FeedMetric = {
      id: this.feedMetricId++,
      date: toDateOnly(data.date),
      openingStockKg: toNumber(data.openingStockKg, 0).toString(),
      feedAddedKg: toNumber(data.feedAddedKg, 0).toString(),
      feedConsumedKg: toNumber(data.feedConsumedKg, 0).toString(),
      closingStockKg: toNumber(data.closingStockKg, 0).toString(),
      feedCost: toNumber(data.feedCost, 0).toString(),
      notes: data.notes ?? null,
    };
    this.feedMetricRecords.push(record);
    return record;
  }

  async getAlertEventsByDate(alertDate: string): Promise<AlertEvent[]> {
    const day = toDateOnly(alertDate);
    return [...this.alertEventRecords]
      .filter((event) => event.alertDate === day)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getAlertEventByDateAndType(
    alertDate: string,
    alertType: string,
  ): Promise<AlertEvent | undefined> {
    const day = toDateOnly(alertDate);
    return this.alertEventRecords.find(
      (event) => event.alertDate === day && event.alertType === alertType,
    );
  }

  async createAlertEvent(input: CreateAlertEventInput): Promise<AlertEvent> {
    const event: AlertEvent = {
      id: this.alertEventId++,
      alertDate: toDateOnly(input.alertDate),
      alertType: input.alertType,
      severity: input.severity,
      alertMessage: input.alertMessage,
      thresholdValue: toNumber(input.thresholdValue, 0).toString(),
      currentValue: toNumber(input.currentValue, 0).toString(),
      smsSent: input.smsSent,
      smsResponse: input.smsResponse ?? null,
      createdAt: new Date(),
    };

    this.alertEventRecords.push(event);
    return event;
  }

  async getWhatsAppMessages(limit = 50): Promise<WhatsAppMessage[]> {
    return [...this.whatsappMessageRecords]
      .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime())
      .slice(0, Math.max(1, Math.min(limit, 500)));
  }

  async createWhatsAppMessage(input: CreateWhatsAppMessageInput): Promise<WhatsAppMessage> {
    const record: WhatsAppMessage = {
      id: this.whatsappMessageId++,
      sentAt: new Date(),
      phone: input.phone,
      messageDate: toDateOnly(input.messageDate),
      eggs: toNumber(input.eggs),
      brokenEggs: toNumber(input.brokenEggs),
      feedConsumedKg: toNumber(input.feedConsumedKg).toString(),
      profit: toNumber(input.profit).toString(),
      status: input.status,
      messageText: input.messageText,
      whatsappLink: input.whatsappLink,
    };

    this.whatsappMessageRecords.push(record);
    return record;
  }

  async getFcmTokens(): Promise<FcmToken[]> {
    return [...this.fcmTokenRecords]
      .filter((record) => record.isActive)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  async upsertFcmToken(input: UpsertFcmTokenInput): Promise<FcmToken> {
    const existing = this.fcmTokenRecords.find((record) => record.token === input.token);

    if (existing) {
      existing.userId = input.userId ?? existing.userId ?? null;
      existing.deviceLabel = input.deviceLabel ?? existing.deviceLabel ?? null;
      existing.userAgent = input.userAgent ?? existing.userAgent ?? null;
      existing.isActive = true;
      existing.lastSeenAt = new Date();
      existing.updatedAt = new Date();
      return existing;
    }

    const record: FcmToken = {
      id: this.fcmTokenId++,
      userId: input.userId ?? null,
      token: input.token,
      deviceLabel: input.deviceLabel ?? null,
      userAgent: input.userAgent ?? null,
      isActive: true,
      lastSeenAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.fcmTokenRecords.push(record);
    return record;
  }

  async deactivateFcmToken(token: string): Promise<void> {
    const existing = this.fcmTokenRecords.find((record) => record.token === token);
    if (!existing) {
      return;
    }
    existing.isActive = false;
    existing.updatedAt = new Date();
  }

  async getVaccinations(): Promise<Vaccination[]> {
    return [...this.vaccinationRecords].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }

  async createVaccination(data: z.infer<typeof api.vaccinations.create.input>): Promise<Vaccination> {
    const record: Vaccination = {
      id: this.vaccinationId++,
      vaccineName: data.vaccineName,
      date: toDateOnly(data.date),
      chickensVaccinated: Number(data.chickensVaccinated),
      nextVaccination: toDateOnly(data.nextVaccination),
    };
    this.vaccinationRecords.push(record);
    return record;
  }
}

const shouldUseMemoryStorage = !isPostgresConfigured;

export const storage: IStorage = shouldUseMemoryStorage
  ? new MemoryStorage()
  : new DatabaseStorage();
