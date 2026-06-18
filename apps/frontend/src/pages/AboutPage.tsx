import { Link } from "react-router-dom";
import { ArrowLeft, HeartPulse, ShieldCheck, Stethoscope, Users, WandSparkles } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[image:var(--gradient-bg)] px-4 py-6 sm:py-8">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <section className="rounded-2xl border border-border/60 bg-card/80 p-5 shadow-sm backdrop-blur">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 text-xs font-medium text-primary hover:opacity-80 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Link>

          <h1 className="mt-3 text-xl font-semibold tracking-tight">Sobre o Fisio Journey</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Plataforma acadêmica voltada ao acompanhamento de exercícios fisioterapêuticos com
            apoio de visão computacional, feedback em tempo real e elementos de gamificação.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-border/60 bg-card/80 p-5 shadow-sm backdrop-blur">
            <div className="flex items-center gap-3">
              <HeartPulse className="h-5 w-5 text-primary" />
              <h2 className="text-sm font-semibold tracking-tight">Objetivo da plataforma</h2>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              O Fisio Journey foi desenvolvido para apoiar a execução de exercícios prescritos por
              profissionais, permitindo que o paciente receba orientações visuais, acompanhamento
              do movimento e registro dos resultados da sessão.
            </p>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card/80 p-5 shadow-sm backdrop-blur">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-primary" />
              <h2 className="text-sm font-semibold tracking-tight">Fluxo do paciente</h2>
            </div>
            <div className="mt-3 space-y-2 text-sm text-muted-foreground">
              <p>• Visualiza exercícios disponíveis.</p>
              <p>• Inicia a sessão a partir da prescrição ativa.</p>
              <p>• Executa o exercício com feedback visual e acompanhamento do movimento.</p>
              <p>• Finaliza a sessão e recebe resumo de desempenho e conquistas.</p>
            </div>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card/80 p-5 shadow-sm backdrop-blur">
            <div className="flex items-center gap-3">
              <Stethoscope className="h-5 w-5 text-primary" />
              <h2 className="text-sm font-semibold tracking-tight">Fluxo do profissional</h2>
            </div>
            <div className="mt-3 space-y-2 text-sm text-muted-foreground">
              <p>• Cadastra pacientes e exercícios.</p>
              <p>• Define parâmetros clínicos de prescrição.</p>
              <p>• Acompanha sessões realizadas pelo paciente.</p>
              <p>• Analisa resultados como repetições, amplitude, alertas e acurácia.</p>
            </div>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card/80 p-5 shadow-sm backdrop-blur">
            <div className="flex items-center gap-3">
              <WandSparkles className="h-5 w-5 text-primary" />
              <h2 className="text-sm font-semibold tracking-tight">Gamificação</h2>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              A plataforma incorpora elementos visuais e conquistas para tornar a experiência mais
              motivadora, incentivando a continuidade do tratamento e o engajamento do paciente.
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-border/60 bg-card/80 p-5 shadow-sm backdrop-blur">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h2 className="text-sm font-semibold tracking-tight">Advertências</h2>
          </div>

          <div className="mt-3 space-y-2 text-sm text-muted-foreground">
            <p>
              • Esta plataforma foi desenvolvida para fins acadêmicos e de demonstração de fluxo.
            </p>
            <p>
              • A execução dos exercícios deve respeitar a orientação do profissional responsável.
            </p>
            <p>
              • Em caso de dor, desconforto ou instabilidade, o exercício deve ser interrompido.
            </p>
            <p>
              • Os dados apresentados têm caráter de apoio e não substituem avaliação clínica presencial.
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-border/60 bg-card/80 p-5 shadow-sm backdrop-blur">
          <h2 className="text-sm font-semibold tracking-tight">Projeto</h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Projeto acadêmico desenvolvido como Trabalho de Conclusão de Curso, unindo saúde,
            tecnologia, visão computacional, web e gamificação em uma proposta de apoio à
            fisioterapia.
          </p>
        </section>
      </main>
    </div>
  );
}