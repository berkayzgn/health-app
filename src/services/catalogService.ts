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

export async function getMedicalConditions(): Promise<MedicalConditionDTO[]> {
  return api.get<MedicalConditionDTO[]>('/catalog/medical-conditions');
}
