// Enums sérialisés en nombre par l'API (.NET).
export type MealType = 0 | 1 | 2; // Plat | Entrée | Dessert
export type MealTime = 0 | 1; // Midi | Soir

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  0: 'Plat',
  1: 'Entrée',
  2: 'Dessert',
};

export interface IngredientLine {
  name: string;
  quantity: number | null;
  unit: string | null;
}

export interface Meal {
  id: string;
  name: string;
  description: string | null;
  type: MealType;
  timeToCook: number;
  createdAt: string;
  ingredients: IngredientLine[];
}

export interface MealDto {
  name: string;
  description: string | null;
  type: MealType;
  timeToCook: number;
  ingredients: IngredientLine[];
}

/** Créneau du planning. dayOfWeek : 0 = lundi ... 6 = dimanche. */
export interface PlanningSlot {
  id: string;
  dayOfWeek: number;
  mealTime: MealTime;
  mealId: string;
  mealName: string;
  locked: boolean;
}

export interface Planning {
  id: string;
  weekStart: string; // yyyy-MM-dd, toujours un lundi
  slots: PlanningSlot[];
}

export interface ShoppingItem {
  name: string;
  count: number;
  meals: string[];
}

export interface ShoppingList {
  weekStart: string;
  items: ShoppingItem[];
}
