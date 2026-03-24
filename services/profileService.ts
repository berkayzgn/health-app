import { api } from "./api";

export interface UserProfileResponse {
  id: string;
  email: string;
  name: string;
  heightCm?: string;
  weightKg?: string;
  conditionTypes?: string[];
  dietaryPreferences?: string[];
}

export interface UpdateProfilePayload {
  heightCm?: string;
  weightKg?: string;
  conditionTypes?: string[];
  dietaryPreferences?: string[];
}

export async function updateProfile(
  payload: UpdateProfilePayload
): Promise<UserProfileResponse | null> {
  return api.patch<UserProfileResponse | null>("/users/me", payload);
}
