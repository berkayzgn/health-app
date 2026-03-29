import { api } from './api';

export interface MedicalConditionDTO {
  id: string;
  code: string;
  /** abc.json diseases → disease, allergies → allergy */
  kind: 'disease' | 'allergy';
  displayNames: { en: string; tr: string; [k: string]: string };
  triggerFoods: string[];
  sortOrder: number;
}

export interface MacroPlanDTO {
  id: string;
  code: string;
  displayNames: { en: string; tr: string; [k: string]: string };
  sortOrder: number;
}

export async function getMedicalConditions(): Promise<MedicalConditionDTO[]> {
  return api.get<MedicalConditionDTO[]>('/catalog/medical-conditions');
}

export async function getMacroPlans(): Promise<MacroPlanDTO[]> {
  return api.get<MacroPlanDTO[]>('/catalog/macro-plans');
}
