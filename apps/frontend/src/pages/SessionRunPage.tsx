import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { apiFetch } from "@/lib/api";
import { MocapCamera } from "@/components/web_game/MocapCamera";
import PassadaLateral from "@/components/web_game/PassadaLateral";

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

type Exercise = {
  id: number;
  title: string;
  description?: string;
  body_focus?: string;
  analysis_kind?: string;
};

export default function SessionRunPage() {
  const { id } = useParams<{ id: string }>();
  const sessionId = id || "";

  const [session, setSession] = useState<Session | null>(null);
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function carregarSessao() {
      if (!sessionId) {
        setError("Sessão não informada.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const sessionData = await apiFetch<Session>(`/v1/sessions/${sessionId}`);
        setSession(sessionData);

        const exerciseData = await apiFetch<Exercise>(`/v1/exercises/${sessionData.exercise_id}`);
        setExercise(exerciseData);
      } catch (err: any) {
        setError(err?.message || "Erro ao carregar sessão.");
      } finally {
        setLoading(false);
      }
    }

    carregarSessao();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Carregando sessão...</p>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>{error || "Sessão não encontrada."}</p>
      </div>
    );
  }

  const analysisKind = exercise?.analysis_kind;

  if (analysisKind === "LATERAL_LUNGE_V1") {
    return (
      <PassadaLateral
        sessionId={session.id}
        patientUserId={session.patient_user_id}
        exerciseId={session.exercise_id}
      />
    );
  }

  return (
    <MocapCamera
      sessionId={session.id}
      patientUserId={session.patient_user_id}
      exerciseId={session.exercise_id}
    />
  );
}