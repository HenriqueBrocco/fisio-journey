import { apiFetch } from "../lib/api";

export type CreatePatientInput = {
  name: string;
  email: string;
  password: string;
};

export type PatientResponse = {
  id: string;
  role: string;
  name: string;
  email: string;
};

export function createPatient(input: CreatePatientInput) {
  return apiFetch<PatientResponse>("/v1/patients", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    auth: true,
  });
}