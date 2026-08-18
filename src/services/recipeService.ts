import api from "./api";

export interface IngredientPayload {
  input_item_id: string;
  quantity_required: number;
}

export interface CreateRecipePayload {
  output_item_id: string;
  ingredients: IngredientPayload[];
  notes?: string;
}

export interface RecipeComponent {
  id: string;
  component_id: string;
  component_code: string | null;
  component_name: string | null;
  quantity_required: number;
  lazer_needed: boolean;
  has_sub_recipe: boolean;
}

export interface RecipeSummary {
  finished_good_id: string;
  finished_good_code: string | null;
  finished_good_name: string;
  version: number;
  component_count: number;
  components: RecipeComponent[];
}

export interface RecipeVersion {
  id: string;
  version: number;
  is_active: boolean;
  notes: string | null;
  component_count: number;
  created_at: string | null;
}

export default class RecipeService {
  static async createRecipe(payload: CreateRecipePayload) {
    const response = await api.post("/recipes/", {
      output_item_id: payload.output_item_id,
      ingredients: payload.ingredients,
      notes: payload.notes,
    });
    return response.data as { status: string; message: string; version: number };
  }

  static async getRecipes(): Promise<RecipeSummary[]> {
    const response = await api.get<{ status: string; data: RecipeSummary[] }>("/recipes/");
    return response.data.data;
  }

  static async getRecipe(finishedGoodId: string, version?: number): Promise<{ components: RecipeComponent[]; version: number | null }> {
    const url = version ? `/recipes/${finishedGoodId}?version=${version}` : `/recipes/${finishedGoodId}`;
    const response = await api.get<{ status: string; components: RecipeComponent[]; version: number | null }>(url);
    return { components: response.data.components, version: response.data.version };
  }

  static async getVersions(finishedGoodId: string): Promise<RecipeVersion[]> {
    const response = await api.get<{ status: string; versions: RecipeVersion[] }>(`/recipes/${finishedGoodId}/versions`);
    return response.data.versions;
  }

  // The explosion engine for clubbed orders — recurses through every
  // level of the BOM down to raw materials.
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
