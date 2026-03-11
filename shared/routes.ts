import { z } from 'zod';
import { 
  insertUserSchema, users, 
  insertEggCollectionSchema, eggCollection,
  insertEggSalesSchema, eggSales,
  insertChickenSalesSchema, chickenSales,
  insertChickenManagementSchema, chickenManagement,
  insertDiseaseRecordsSchema, diseaseRecords,
  insertInventorySchema, inventory,
  insertExpensesSchema, expenses,
  insertFeedMetricsSchema, feedMetrics,
  whatsappMessages,
  insertVaccinationsSchema, vaccinations
} from './schema';

export const errorSchemas = {
  validation: z.object({ message: z.string(), field: z.string().optional() }),
  notFound: z.object({ message: z.string() }),
  internal: z.object({ message: z.string() }),
  unauthorized: z.object({ message: z.string() }),
};

const dashboardAlertSchema = z.object({
  type: z.enum(["feed_low", "egg_drop", "mortality_increase"]),
  title: z.string(),
  message: z.string(),
  severity: z.enum(["warning", "critical"]),
  thresholdValue: z.number(),
  currentValue: z.number(),
  smsSent: z.boolean(),
  smsSentAt: z.string().nullable(),
});

const dashboardAnalyticsSchema = z.object({
  generatedAt: z.string(),
  today: z.object({
    date: z.string(),
    eggsProduced: z.number(),
    brokenEggs: z.number(),
    totalRevenue: z.number(),
    totalCost: z.number(),
    netProfit: z.number(),
    feedConsumedKg: z.number(),
    feedStockKg: z.number(),
    mortalityCount: z.number(),
    healthyChickens: z.number(),
    sickChickens: z.number(),
    newChicks: z.number(),
  }),
  profit: z.object({
    daily: z.number(),
    monthly: z.number(),
    yearly: z.number(),
  }),
  charts: z.object({
    eggProduction: z.array(
      z.object({
        date: z.string(),
        eggsProduced: z.number(),
        brokenEggs: z.number(),
      }),
    ),
    feedConsumption: z.array(
      z.object({
        date: z.string(),
        feedConsumedKg: z.number(),
        feedStockKg: z.number(),
      }),
    ),
    profitAnalysis: z.array(
      z.object({
        date: z.string(),
        revenue: z.number(),
        cost: z.number(),
        profit: z.number(),
      }),
    ),
  }),
  alerts: z.array(dashboardAlertSchema),
});

const publicUserSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email(),
  role: z.string(),
  createdAt: z.union([z.date(), z.string(), z.null()]).optional(),
});

export const api = {
  auth: {
    login: {
      method: 'POST' as const,
      path: '/api/auth/login' as const,
      input: z.object({ email: z.string().email(), password: z.string() }),
      responses: {
        200: z.object({ token: z.string(), user: publicUserSchema }),
        401: errorSchemas.unauthorized,
      },
    },
    register: {
      method: 'POST' as const,
      path: '/api/auth/register' as const,
      input: insertUserSchema,
      responses: {
        201: z.object({ token: z.string(), user: publicUserSchema }),
        400: errorSchemas.validation,
      }
    },
    me: {
      method: 'GET' as const,
      path: '/api/auth/me' as const,
      responses: {
        200: publicUserSchema,
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
        chickenType: z.enum(["Pure", "Broiler"]).default("Pure"),
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
        chickenType: z.enum(["Pure", "Broiler"]).default("Pure"),
      }),
      responses: {
        201: z.custom<typeof eggSales.$inferSelect>(),
        400: errorSchemas.validation,
      }
    }
  },
  chickenSales: {
    list: {
      method: 'GET' as const,
      path: '/api/chicken-sales' as const,
      responses: { 200: z.array(z.custom<typeof chickenSales.$inferSelect>()) }
    },
    create: {
      method: 'POST' as const,
      path: '/api/chicken-sales' as const,
      input: insertChickenSalesSchema.extend({
        chickensSold: z.coerce.number(),
        pricePerChicken: z.union([z.string(), z.number()]),
        totalAmount: z.union([z.string(), z.number()]),
        chickenType: z.enum(["Pure", "Broiler"]).default("Pure"),
        notes: z.string().optional().nullable(),
      }),
      responses: {
        201: z.custom<typeof chickenSales.$inferSelect>(),
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
        chickenType: z.enum(["Pure", "Broiler"]).default("Pure"),
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
  feedMetrics: {
    list: {
      method: 'GET' as const,
      path: '/api/feed-metrics' as const,
      responses: { 200: z.array(z.custom<typeof feedMetrics.$inferSelect>()) }
    },
    create: {
      method: 'POST' as const,
      path: '/api/feed-metrics' as const,
      input: insertFeedMetricsSchema.extend({
        openingStockKg: z.union([z.string(), z.number()]).default(0),
        feedAddedKg: z.union([z.string(), z.number()]).default(0),
        feedConsumedKg: z.union([z.string(), z.number()]),
        closingStockKg: z.union([z.string(), z.number()]),
        feedCost: z.union([z.string(), z.number()]).default(0),
      }),
      responses: {
        201: z.custom<typeof feedMetrics.$inferSelect>(),
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
  dashboard: {
    analytics: {
      method: 'GET' as const,
      path: '/api/dashboard/analytics' as const,
      responses: {
        200: dashboardAnalyticsSchema,
      }
    }
  },
  alerts: {
    sendWhatsApp: {
      method: 'POST' as const,
      path: '/send-alert' as const,
      input: z.object({
        phone: z.string().min(8).optional(),
        eggs: z.coerce.number().min(0).optional(),
        brokenEggs: z.coerce.number().min(0).optional(),
        feed: z.coerce.number().min(0).optional(),
        profit: z.coerce.number().optional(),
        date: z.string().optional(),
        status: z.string().optional(),
      }),
      responses: {
        200: z.object({
          status: z.literal("Message Ready"),
          messageId: z.number(),
          dataSource: z.enum(["database", "request"]),
          whatsappLink: z.string().url(),
          preview: z.string(),
        }),
        400: errorSchemas.validation,
      }
    },
    history: {
      method: 'GET' as const,
      path: '/api/alerts/messages' as const,
      responses: {
        200: z.array(z.custom<typeof whatsappMessages.$inferSelect>()),
      }
    },
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
