import api from "./api";

export interface IngredientPayload {
  input_item_id: string;
  quantity_required: number;
  lazer_needed?: boolean;
  // Only Black/Grey moulded parts may be routed to Colour — the backend
  // rejects this outright for a component whose powder_colour is White.
  colour_needed?: boolean;
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
  // Which department this component is drawn from (its own department,
  // set under Items) — a recipe's components can span several departments
  // at once, so this is what tells them apart on screen.
  component_department_id: string | null;
  component_department_name: string | null;
  // 'White' | 'Grey' | 'Black' | null — null means this isn't a
  // colour-tracked moulded part (set under Items).
  component_powder_colour: string | null;
  quantity_required: number;
  lazer_needed: boolean;
  colour_needed: boolean;
  has_sub_recipe: boolean;
}

export interface RecipeSummary {
  finished_good_id: string;
  finished_good_code: string | null;
  finished_good_name: string;
  version: number;
  component_count: number;
  // Distinct departments across this recipe's components, for an
  // at-a-glance view before expanding the component list.
  departments: string[];
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
