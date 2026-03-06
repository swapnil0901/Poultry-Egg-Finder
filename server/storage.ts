import { db } from "./db";
import { 
  users, eggCollection, eggSales, chickenManagement, diseaseRecords, 
  inventory, expenses, vaccinations,
  type User, type EggCollection, type EggSales, type ChickenManagement,
  type DiseaseRecord, type Inventory, type Expense, type Vaccination,
  type InsertUser
} from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import { api } from "@shared/routes";

function toDateOnly(value: string | Date | undefined): string {
  if (!value) {
    return new Date().toISOString().split("T")[0];
  }
  return new Date(value).toISOString().split("T")[0];
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

  // Chicken Management
  getChickenManagement(): Promise<ChickenManagement[]>;
  createChickenManagement(data: z.infer<typeof api.chickens.create.input>): Promise<ChickenManagement>;

  // Disease Tracker
  getDiseaseRecords(): Promise<DiseaseRecord[]>;
  createDiseaseRecord(data: z.infer<typeof api.diseases.create.input>): Promise<DiseaseRecord>;

  // Inventory
  getInventory(): Promise<Inventory[]>;
  createInventory(data: z.infer<typeof api.inventory.create.input>): Promise<Inventory>;

  // Expenses
  getExpenses(): Promise<Expense[]>;
  createExpense(data: z.infer<typeof api.expenses.create.input>): Promise<Expense>;

  // Vaccinations
  getVaccinations(): Promise<Vaccination[]>;
  createVaccination(data: z.infer<typeof api.vaccinations.create.input>): Promise<Vaccination>;
}

export class DatabaseStorage implements IStorage {
  // Auth
  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserById(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // Egg Collection
  async getEggCollections(): Promise<EggCollection[]> {
    return await db.select().from(eggCollection).orderBy(desc(eggCollection.date));
  }

  async createEggCollection(data: z.infer<typeof api.eggCollection.create.input>): Promise<EggCollection> {
    const [record] = await db.insert(eggCollection).values({
      ...data,
      date: new Date(data.date).toISOString().split('T')[0],
      brokenEggs: data.brokenEggs ?? 0,
    }).returning();
    return record;
  }

  // Egg Sales
  async getEggSales(): Promise<EggSales[]> {
    return await db.select().from(eggSales).orderBy(desc(eggSales.date));
  }

  async createEggSales(data: z.infer<typeof api.eggSales.create.input>): Promise<EggSales> {
    const [record] = await db.insert(eggSales).values({
      ...data,
      date: new Date(data.date).toISOString().split('T')[0],
      pricePerEgg: data.pricePerEgg.toString(),
      totalAmount: data.totalAmount.toString()
    }).returning();
    return record;
  }

  // Chicken Management
  async getChickenManagement(): Promise<ChickenManagement[]> {
    return await db.select().from(chickenManagement).orderBy(desc(chickenManagement.date));
  }

  async createChickenManagement(data: z.infer<typeof api.chickens.create.input>): Promise<ChickenManagement> {
    const [record] = await db.insert(chickenManagement).values(data).returning();
    return record;
  }

  // Disease Records
  async getDiseaseRecords(): Promise<DiseaseRecord[]> {
    return await db.select().from(diseaseRecords).orderBy(desc(diseaseRecords.date));
  }

  async createDiseaseRecord(data: z.infer<typeof api.diseases.create.input>): Promise<DiseaseRecord> {
    const [record] = await db.insert(diseaseRecords).values({
      ...data,
      date: new Date(data.date).toISOString().split('T')[0]
    }).returning();
    return record;
  }

  // Inventory
  async getInventory(): Promise<Inventory[]> {
    return await db.select().from(inventory).orderBy(desc(inventory.purchaseDate));
  }

  async createInventory(data: z.infer<typeof api.inventory.create.input>): Promise<Inventory> {
    const [record] = await db.insert(inventory).values({
      ...data,
      purchaseDate: new Date(data.purchaseDate).toISOString().split('T')[0],
      cost: data.cost.toString()
    }).returning();
    return record;
  }

  // Expenses
  async getExpenses(): Promise<Expense[]> {
    return await db.select().from(expenses).orderBy(desc(expenses.date));
  }

  async createExpense(data: z.infer<typeof api.expenses.create.input>): Promise<Expense> {
    const [record] = await db.insert(expenses).values({
      ...data,
      date: new Date(data.date).toISOString().split('T')[0],
      amount: data.amount.toString()
    }).returning();
    return record;
  }

  // Vaccinations
  async getVaccinations(): Promise<Vaccination[]> {
    return await db.select().from(vaccinations).orderBy(desc(vaccinations.date));
  }

  async createVaccination(data: z.infer<typeof api.vaccinations.create.input>): Promise<Vaccination> {
    const [record] = await db.insert(vaccinations).values({
      ...data,
      date: new Date(data.date).toISOString().split('T')[0],
      nextVaccination: new Date(data.nextVaccination).toISOString().split('T')[0]
    }).returning();
    return record;
  }
}

export class MemoryStorage implements IStorage {
  private userId = 1;
  private eggCollectionId = 1;
  private eggSalesId = 1;
  private chickenManagementId = 1;
  private diseaseId = 1;
  private inventoryId = 1;
  private expenseId = 1;
  private vaccinationId = 1;

  private userRecords: User[] = [];
  private eggCollectionRecords: EggCollection[] = [];
  private eggSalesRecords: EggSales[] = [];
  private chickenRecords: ChickenManagement[] = [];
  private diseaseRecordsList: DiseaseRecord[] = [];
  private inventoryRecords: Inventory[] = [];
  private expenseRecords: Expense[] = [];
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
      saleType: data.saleType ?? "Egg",
    };
    this.eggSalesRecords.push(record);
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
    };
    this.chickenRecords.push(record);
    return record;
  }

  async getDiseaseRecords(): Promise<DiseaseRecord[]> {
    return [...this.diseaseRecordsList].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }

  async createDiseaseRecord(data: z.infer<typeof api.diseases.create.input>): Promise<DiseaseRecord> {
    const record: DiseaseRecord = {
      id: this.diseaseId++,
      date: toDateOnly(data.date),
      diseaseName: data.diseaseName,
      chickensAffected: Number(data.chickensAffected),
      treatment: data.treatment,
    };
    this.diseaseRecordsList.push(record);
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

export const storage: IStorage = process.env.DATABASE_URL
  ? new DatabaseStorage()
  : new MemoryStorage();
