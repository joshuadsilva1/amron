import api from "./api";

export interface IngredientPayload {
  input_item_id: string;
  quantity_required: number;
}

export interface CreateRecipePayload {
  output_item_id: string;
  ingredients: IngredientPayload[];
}

export interface RecipeComponent {
  id: string;
  component_id: string;
  component_code: string | null;
  component_name: string | null;
  quantity_required: number;
  lazer_needed: boolean;
}

export interface RecipeSummary {
  finished_good_id: string;
  finished_good_code: string | null;
  finished_good_name: string;
  component_count: number;
  components: RecipeComponent[];
}

export default class RecipeService {
  static async createRecipe(payload: CreateRecipePayload) {
    const response = await api.post("/recipes/", payload);
    return response.data;
  }

  static async getRecipes(): Promise<RecipeSummary[]> {
    const response = await api.get<{ status: string; data: RecipeSummary[] }>("/recipes/");
    return response.data.data;
  }

  static async getRecipe(finishedGoodId: string): Promise<{ components: RecipeComponent[] }> {
    const response = await api.get<{ status: string; components: RecipeComponent[] }>(`/recipes/${finishedGoodId}`);
    return { components: response.data.components };
  }

  // The explosion engine for clubbed orders
  static async explodeOrders(orders: any[]) {
    const response = await api.post("/recipes/explode", { orders });
    return response.data.data;
  }

  // Added to populate the finished good and ingredient dropdowns
  static async getProducts() {
    const response = await api.get<{ status: string; data: any[] }>("/items/");
    return response.data.data;
  }
}