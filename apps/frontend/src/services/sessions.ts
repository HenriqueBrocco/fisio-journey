import { apiFetch } from "../lib/api";

export type PatientSession = {
  id: string;
  patient_user_id: string;
  exercise_id: number;
  assignment_id: number;
  status: "CREATED" | "FINISHED" | string;
  config_snapshot: Record<string, any>;
  started_at: string | null;
  finished_at: string | null;
};

export type SessionDetails = PatientSession;

export type SessionSummary = {
  session_id: string;
  reps: number;
  rom: number;
  cadence: number;
  alerts: string[];
  created_at: string;
};

export function listPatientSessions(patientId: string) {
  return apiFetch<PatientSession[]>(`/v1/patients/${patientId}/sessions`);
}

export function getSession(sessionId: string) {
  return apiFetch<SessionDetails>(`/v1/sessions/${sessionId}`);
}

export function getSummary(sessionId: string) {
  return apiFetch<SessionSummary>(`/v1/sessions/${sessionId}/summary`);
}