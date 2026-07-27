import api from "./api";

interface LoginResponse {
  access_token: string;
  user: {
    id: number;
    phone: string;
    name?: string;
  };
}

export async function backendLogin(firebaseToken: string) {
  const response = await api.post<LoginResponse>(
    "/auth/login",
    {
      firebase_token: firebaseToken,
    }
  );

  return response.data;
}