import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { fetchWithAuth } from "@/lib/auth-client";
import { z } from "zod";

// Helper generator for standard CRUD hooks
function createResourceHooks<T, I>(
  queryKey: string,
  listPath: string,
  createPath: string,
  listSchema: z.ZodType<T[]>,
  createResponseSchema: z.ZodType<T>
) {
  return {
    useList: () => useQuery({
      queryKey: [queryKey],
      queryFn: async () => {
        const res = await fetchWithAuth(listPath);
        if (!res.ok) throw new Error(`Failed to fetch ${queryKey}`);
        const data = await res.json();
        return listSchema.parse(data);
      }
    }),
    useCreate: () => {
      const qc = useQueryClient();
      return useMutation({
        mutationFn: async (data: I) => {
          const res = await fetchWithAuth(createPath, {
            method: 'POST',
            body: JSON.stringify(data),
          });
          if (!res.ok) throw new Error(`Failed to create ${queryKey}`);
          return createResponseSchema.parse(await res.json());
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: [queryKey] })
      });
    }
  };
}

export const { useList: useEggs, useCreate: useCreateEgg } = createResourceHooks<z.infer<typeof api.eggCollection.list.responses[200]>[0], z.infer<typeof api.eggCollection.create.input>>(
  'eggs', api.eggCollection.list.path, api.eggCollection.create.path, 
  api.eggCollection.list.responses[200], api.eggCollection.create.responses[201]
);

export const { useList: useSales, useCreate: useCreateSale } = createResourceHooks<z.infer<typeof api.eggSales.list.responses[200]>[0], z.infer<typeof api.eggSales.create.input>>(
  'sales', api.eggSales.list.path, api.eggSales.create.path, 
  api.eggSales.list.responses[200], api.eggSales.create.responses[201]
);

export const { useList: useChickens, useCreate: useCreateChicken } = createResourceHooks<z.infer<typeof api.chickens.list.responses[200]>[0], z.infer<typeof api.chickens.create.input>>(
  'chickens', api.chickens.list.path, api.chickens.create.path, 
  api.chickens.list.responses[200], api.chickens.create.responses[201]
);

export const { useList: useDiseases, useCreate: useCreateDisease } = createResourceHooks<z.infer<typeof api.diseases.list.responses[200]>[0], z.infer<typeof api.diseases.create.input>>(
  'diseases', api.diseases.list.path, api.diseases.create.path, 
  api.diseases.list.responses[200], api.diseases.create.responses[201]
);

export const { useList: useInventory, useCreate: useCreateInventory } = createResourceHooks<z.infer<typeof api.inventory.list.responses[200]>[0], z.infer<typeof api.inventory.create.input>>(
  'inventory', api.inventory.list.path, api.inventory.create.path, 
  api.inventory.list.responses[200], api.inventory.create.responses[201]
);

export const { useList: useExpenses, useCreate: useCreateExpense } = createResourceHooks<z.infer<typeof api.expenses.list.responses[200]>[0], z.infer<typeof api.expenses.create.input>>(
  'expenses', api.expenses.list.path, api.expenses.create.path, 
  api.expenses.list.responses[200], api.expenses.create.responses[201]
);

export const { useList: useVaccinations, useCreate: useCreateVaccination } = createResourceHooks<z.infer<typeof api.vaccinations.list.responses[200]>[0], z.infer<typeof api.vaccinations.create.input>>(
  'vaccinations', api.vaccinations.list.path, api.vaccinations.create.path, 
  api.vaccinations.list.responses[200], api.vaccinations.create.responses[201]
);

export function useAIChat() {
  return useMutation({
    mutationFn: async (message: string) => {
      const res = await fetchWithAuth(api.ai.chat.path, {
        method: 'POST',
        body: JSON.stringify({ message }),
      });
      if (!res.ok) {
        const errorBody = await res.json().catch(() => null);
        throw new Error(errorBody?.message || 'AI request failed');
      }
      const data = await res.json();
      return api.ai.chat.responses[200].parse(data);
    }
  });
}

export function useAIDiseaseDetection() {
  return useMutation({
    mutationFn: async (payload: z.infer<typeof api.ai.diseaseDetection.input>) => {
      const res = await fetchWithAuth(api.ai.diseaseDetection.path, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errorBody = await res.json().catch(() => null);
        throw new Error(errorBody?.message || 'Disease detection failed');
      }
      const data = await res.json();
      return api.ai.diseaseDetection.responses[200].parse(data);
    }
  });
}

export function useAIEggPrediction() {
  return useMutation({
    mutationFn: async (payload: z.infer<typeof api.ai.eggPrediction.input>) => {
      const res = await fetchWithAuth(api.ai.eggPrediction.path, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errorBody = await res.json().catch(() => null);
        throw new Error(errorBody?.message || 'Egg prediction failed');
      }
      const data = await res.json();
      return api.ai.eggPrediction.responses[200].parse(data);
    }
  });
}

export function useAIFeedRecommendation() {
  return useMutation({
    mutationFn: async (payload: z.infer<typeof api.ai.feedRecommendation.input>) => {
      const res = await fetchWithAuth(api.ai.feedRecommendation.path, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errorBody = await res.json().catch(() => null);
        throw new Error(errorBody?.message || 'Feed recommendation failed');
      }
      const data = await res.json();
      return api.ai.feedRecommendation.responses[200].parse(data);
    }
  });
}

export function useAISmartReport() {
  return useMutation({
    mutationFn: async (payload: z.infer<typeof api.ai.smartReport.input>) => {
      const res = await fetchWithAuth(api.ai.smartReport.path, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errorBody = await res.json().catch(() => null);
        throw new Error(errorBody?.message || 'Smart report generation failed');
      }
      const data = await res.json();
      return api.ai.smartReport.responses[200].parse(data);
    }
  });
}
