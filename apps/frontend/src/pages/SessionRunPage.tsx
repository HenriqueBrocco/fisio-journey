import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiFetch } from "@/lib/api";
import CameraStream from "@/components/CameraStream";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { MocapCamera } from "@/components/web_game/MocapCamera";

type Session = {
  id: string;
  patient_user_id: string;
  exercise_id: number;
  assignment_id: number;
  status: "CREATED" | "RUNNING" | "FINISHED" | string;
  config_snapshot: Record<string, any>;
  started_at: string | null;
  finished_at: string | null;
};

type Summary = {
  session_id: string;
  reps: number;
  rom: number;
  cadence: number;
  alerts: string[];
  created_at: string;
};

type Exercise = {
  id: number;
  title: string;
  body_focus?: string;
  analysis_kind?: string;
};

export default function SessionRunPage() {
  const { id } = useParams<{ id: string }>();
  const sessionId = id || "";

  const [session, setSession] = useState<Session | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [exerciseMap, setExerciseMap] = useState<Record<number, Exercise>>({});

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = async () => {
    if (!sessionId) return;
    setLoading(true);
    setError(null);
    try {
      const [s, e] = await Promise.all([
        apiFetch<Session>(`/v1/sessions/${sessionId}`),
        apiFetch<Exercise[]>(`/v1/exercises`),
      ]);

      setSession(s);

      const map: Record<number, Exercise> = {};
      (Array.isArray(e) ? e : []).forEach((ex) => (map[ex.id] = ex));
      setExerciseMap(map);

      // tenta summary (pode não existir ainda)
      try {
        const sum = await apiFetch<Summary>(`/v1/sessions/${sessionId}/summary`);
        setSummary(sum);
      } catch {
        setSummary(null);
      }
    } catch (err: any) {
      setError(err?.message || "Erro ao carregar sessão.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const exerciseTitle = useMemo(() => {
    if (!session) return "";
    return exerciseMap[session.exercise_id]?.title || `Exercício #${session.exercise_id}`;
  }, [session, exerciseMap]);

  return (
    <div>
      <MocapCamera />
    </div>
  );
}