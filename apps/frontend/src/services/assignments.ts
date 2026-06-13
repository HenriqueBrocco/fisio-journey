import { apiFetch } from "../lib/api";

export type CreateConfigRequest = {
  exercise_id: number;
  patient_user_id: string;
  params: Record<string, any>;

  num_series: number;
  num_reps: number;
  descanso_rep: number;
  descanso_serie: number;
  lado_ativo: string;
  meta_extensao: number;
  repouso_max: number;
  limite_tronco: number;
  tolerancia: number;
};

export type CreateConfigResponse = {
  id: number;
  exercise_id: number;
  patient_user_id: string;
  params: Record<string, any>;

  num_series: number;
  num_reps: number;
  descanso_rep: number;
  descanso_serie: number;
  lado_ativo: string;
  meta_extensao: number;
  repouso_max: number;
  limite_tronco: number;
  tolerancia: number;

  created_at: string;
};

export type CreateAssignmentRequest = {
  patient_user_id: string;
  exercise_id: number;
  config_id: number;
  schedule: "DAILY" | "WEEKLY" | "MONTHLY" | string;
  active: boolean;
};

export type CreateAssignmentResponse = {
  id: number;
  patient_user_id: string;
  exercise_id: number;
  config_id: number;
  schedule: string;
  active: boolean;
  created_at: string;
};

export function createAssignmentConfig(payload: CreateConfigRequest) {
  return apiFetch<CreateConfigResponse>("/v1/exercise-configs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function createAssignment(payload: CreateAssignmentRequest) {
  return apiFetch<CreateAssignmentResponse>("/v1/assignments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}