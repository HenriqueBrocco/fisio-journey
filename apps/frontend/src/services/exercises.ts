import { apiFetch } from "../lib/api";

export type CreateExerciseInput = {
  title: string;
  description?: string;
  body_focus: "TRUNK" | string;
  analysis_kind: "V1_LITE_THRESHOLDS" | string;
};

export type ExerciseResponse = {
  id: number;
  created_by_user_id: string;
  title: string;
  description: string;
  body_focus: string;
  analysis_kind: string;
  created_at: string;
};

export function createExercise(input: CreateExerciseInput) {
  return apiFetch<ExerciseResponse>("/v1/exercises/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    auth: true,
  });
}