import { z } from 'zod';
import { 
  insertUserSchema, users, 
  insertEggCollectionSchema, eggCollection,
  insertEggSalesSchema, eggSales,
  insertChickenManagementSchema, chickenManagement,
  insertDiseaseRecordsSchema, diseaseRecords,
  insertInventorySchema, inventory,
  insertExpensesSchema, expenses,
  insertVaccinationsSchema, vaccinations
} from './schema';

export const errorSchemas = {
  validation: z.object({ message: z.string(), field: z.string().optional() }),
  notFound: z.object({ message: z.string() }),
  internal: z.object({ message: z.string() }),
  unauthorized: z.object({ message: z.string() }),
};

export const api = {
  auth: {
    login: {
      method: 'POST' as const,
      path: '/api/auth/login' as const,
      input: z.object({ email: z.string().email(), password: z.string() }),
      responses: {
        200: z.object({ token: z.string(), user: z.custom<typeof users.$inferSelect>() }),
        401: errorSchemas.unauthorized,
      },
    },
    register: {
      method: 'POST' as const,
      path: '/api/auth/register' as const,
      input: insertUserSchema,
      responses: {
        201: z.object({ token: z.string(), user: z.custom<typeof users.$inferSelect>() }),
        400: errorSchemas.validation,
      }
    },
    me: {
      method: 'GET' as const,
      path: '/api/auth/me' as const,
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: errorSchemas.unauthorized,
      }
    }
  },
  eggCollection: {
    list: {
      method: 'GET' as const,
      path: '/api/eggs' as const,
      responses: { 200: z.array(z.custom<typeof eggCollection.$inferSelect>()) }
    },
    create: {
      method: 'POST' as const,
      path: '/api/eggs' as const,
      input: insertEggCollectionSchema.extend({
        eggsCollected: z.coerce.number(),
        brokenEggs: z.coerce.number().default(0),
      }),
      responses: {
        201: z.custom<typeof eggCollection.$inferSelect>(),
        400: errorSchemas.validation,
      }
    }
  },
  eggSales: {
    list: {
      method: 'GET' as const,
      path: '/api/sales' as const,
      responses: { 200: z.array(z.custom<typeof eggSales.$inferSelect>()) }
    },
    create: {
      method: 'POST' as const,
      path: '/api/sales' as const,
      input: insertEggSalesSchema.extend({
        eggsSold: z.coerce.number(),
        pricePerEgg: z.union([z.string(), z.number()]),
        totalAmount: z.union([z.string(), z.number()]),
      }),
      responses: {
        201: z.custom<typeof eggSales.$inferSelect>(),
        400: errorSchemas.validation,
      }
    }
  },
  chickens: {
    list: {
      method: 'GET' as const,
      path: '/api/chickens' as const,
      responses: { 200: z.array(z.custom<typeof chickenManagement.$inferSelect>()) }
    },
    create: {
      method: 'POST' as const,
      path: '/api/chickens' as const,
      input: insertChickenManagementSchema.extend({
        totalChickens: z.coerce.number(),
        healthy: z.coerce.number(),
        sick: z.coerce.number(),
        dead: z.coerce.number(),
        chicks: z.coerce.number(),
      }),
      responses: {
        201: z.custom<typeof chickenManagement.$inferSelect>(),
        400: errorSchemas.validation,
      }
    }
  },
  diseases: {
    list: {
      method: 'GET' as const,
      path: '/api/diseases' as const,
      responses: { 200: z.array(z.custom<typeof diseaseRecords.$inferSelect>()) }
    },
    create: {
      method: 'POST' as const,
      path: '/api/diseases' as const,
      input: insertDiseaseRecordsSchema.extend({
        chickensAffected: z.coerce.number(),
      }),
      responses: {
        201: z.custom<typeof diseaseRecords.$inferSelect>(),
        400: errorSchemas.validation,
      }
    }
  },
  inventory: {
    list: {
      method: 'GET' as const,
      path: '/api/inventory' as const,
      responses: { 200: z.array(z.custom<typeof inventory.$inferSelect>()) }
    },
    create: {
      method: 'POST' as const,
      path: '/api/inventory' as const,
      input: insertInventorySchema.extend({
        quantity: z.coerce.number(),
        cost: z.union([z.string(), z.number()]),
      }),
      responses: {
        201: z.custom<typeof inventory.$inferSelect>(),
        400: errorSchemas.validation,
      }
    }
  },
  expenses: {
    list: {
      method: 'GET' as const,
      path: '/api/expenses' as const,
      responses: { 200: z.array(z.custom<typeof expenses.$inferSelect>()) }
    },
    create: {
      method: 'POST' as const,
      path: '/api/expenses' as const,
      input: insertExpensesSchema.extend({
        amount: z.union([z.string(), z.number()]),
      }),
      responses: {
        201: z.custom<typeof expenses.$inferSelect>(),
        400: errorSchemas.validation,
      }
    }
  },
  vaccinations: {
    list: {
      method: 'GET' as const,
      path: '/api/vaccinations' as const,
      responses: { 200: z.array(z.custom<typeof vaccinations.$inferSelect>()) }
    },
    create: {
      method: 'POST' as const,
      path: '/api/vaccinations' as const,
      input: insertVaccinationsSchema.extend({
        chickensVaccinated: z.coerce.number(),
      }),
      responses: {
        201: z.custom<typeof vaccinations.$inferSelect>(),
        400: errorSchemas.validation,
      }
    }
  },
  ai: {
    chat: {
      method: 'POST' as const,
      path: '/api/ai-chat' as const,
      input: z.object({ message: z.string() }),
      responses: {
        200: z.object({ response: z.string() }),
        500: errorSchemas.internal,
      }
    },
    diseaseDetection: {
      method: 'POST' as const,
      path: '/api/ai/disease-detection' as const,
      input: z.object({
        imageBase64: z.string().min(1),
        notes: z.string().optional(),
      }),
      responses: {
        200: z.object({
          disease: z.string(),
          confidence: z.number(),
          severity: z.enum(['low', 'moderate', 'high']),
          suggestedTreatment: z.string(),
          observations: z.string(),
        }),
        400: errorSchemas.validation,
      }
    },
    eggPrediction: {
      method: 'POST' as const,
      path: '/api/ai/egg-prediction' as const,
      input: z.object({
        days: z.coerce.number().int().min(7).max(90).default(30),
      }),
      responses: {
        200: z.object({
          daysUsed: z.number(),
          expectedTomorrow: z.number(),
          expectedThisWeek: z.number(),
          trend: z.enum(['increasing', 'stable', 'decreasing']),
          confidence: z.number(),
          insights: z.string(),
        }),
        400: errorSchemas.validation,
      }
    },
    feedRecommendation: {
      method: 'POST' as const,
      path: '/api/ai/feed-recommendation' as const,
      input: z.object({
        farmSize: z.coerce.number().int().min(1),
        avgWeightKg: z.coerce.number().min(0.2).max(5).default(1.8),
        weather: z.enum(['normal', 'hot', 'cold']).default('normal'),
      }),
      responses: {
        200: z.object({
          morningFeedKg: z.number(),
          eveningFeedKg: z.number(),
          waterLiters: z.number(),
          recommendation: z.string(),
        }),
        400: errorSchemas.validation,
      }
    },
    smartReport: {
      method: 'POST' as const,
      path: '/api/ai/smart-report' as const,
      input: z.object({
        period: z.enum(['weekly', 'monthly']).default('weekly'),
      }),
      responses: {
        200: z.object({
          title: z.string(),
          summary: z.string(),
          highlights: z.array(z.string()),
          risks: z.array(z.string()),
          actions: z.array(z.string()),
        }),
        400: errorSchemas.validation,
      }
    },
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
