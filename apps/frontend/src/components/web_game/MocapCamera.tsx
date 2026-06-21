import React, { useEffect, useRef, useState } from 'react';
import { PoseLandmarker, FilesetResolver, DrawingUtils } from '@mediapipe/tasks-vision';
import { Unity, useUnityContext } from "react-unity-webgl";
import { apiFetch } from "@/lib/api";
import { useNavigate } from "react-router-dom";

type MocapCameraProps = {
  sessionId: string;
  patientUserId: string;
  exerciseId: number;
};

type AssignmentConfigResponse = {
  id: number;
  exercise_id: number;
  patient_user_id: string;
  params: Record<string, unknown>;
  num_series: number | null;
  num_reps: number | null;
  descanso_rep: number | null;
  descanso_serie: number | null;
  lado_ativo: string | null;
  meta_extensao: number | null;
  repouso_max: number | null;
  limite_tronco: number | null;
  tolerancia: number | null;
  created_at: string;
};

type FinalizeSessionResponse = {
  id: string;
  status: string;
  patient_user_id?: string;
  exercise_id?: number;
  assignment_id?: number;
  started_at?: string | null;
  finished_at?: string | null;
};

// Nova tipagem analítica de performance
type SerieHistory = {
  serie: number;
  corretas: number;
  errosExecucao: number;
  errosTronco: number;
};

export const MocapCamera = ({
  sessionId,
  patientUserId,
  exerciseId,
}: MocapCameraProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const navigate = useNavigate();

  // ========================================================
  // A LIGAÇÃO COM O JOGO UNITY
  // ========================================================
  const { unityProvider, sendMessage, isLoaded: isUnityLoaded } = useUnityContext({
    loaderUrl: "/unity/Joelho/Build/joelho.loader.js",
    dataUrl: "/unity/Joelho/Build/joelho.data",
    frameworkUrl: "/unity/Joelho/Build/joelho.framework.js",
    codeUrl: "/unity/Joelho/Build/joelho.wasm",
  });
  
  const unityCommRef = useRef({ isLoaded: false, send: sendMessage });
  useEffect(() => {
    unityCommRef.current.isLoaded = isUnityLoaded;
    unityCommRef.current.send = sendMessage;
  }, [isUnityLoaded, sendMessage]);
  
  // ========================================================
  // PARÂMETROS CLÍNICOS
  // ========================================================
  const [configClinica, setConfigClinica] = useState({
    ladoAtivo: "esquerdo" as "direito" | "esquerdo",
    repousoMax: 110,
    meta: 140,
    tolerancia: 5,
    limiteTronco: 15,
    series: 5,
    repeticoesPorSerie: 5,
    descansoRepeticao: 3, 
    descansoSerie: 10     
  });

  function normalizarLadoAtivo(valor?: string | null): "direito" | "esquerdo" {
    const v = (valor || "").toLowerCase().trim();
    if (v.includes("esquer")) return "esquerdo";
    return "direito";
  }

  const configRef = useRef(configClinica);
  useEffect(() => { configRef.current = configClinica; }, [configClinica]);

  useEffect(() => {
    if (unityCommRef.current.isLoaded) {
      unityCommRef.current.send("ReceptorReact", "ReceberLadoAtivoDoReact", configClinica.ladoAtivo);
    }
  }, [configClinica.ladoAtivo, isUnityLoaded]);

  // ========================================================
  // ESTADOS DO HUD E RELATÓRIO
  // ========================================================
  const [exercicioIniciado, setExercicioIniciado] = useState(false);
  const [progressoInicio, setProgressoInicio] = useState(0);
  
  const [serieAtual, setSerieAtual] = useState(1);
  const [repeticoes, setRepeticoes] = useState(0);
  const [estagio, setEstagio] = useState("REPOUSO");
  const [alertaPostura, setAlertaPostura] = useState(false);
  const [anguloAtualDisplay, setAnguloAtualDisplay] = useState(0);
  
  // Estados de Pausa e Descanso
  const [menuAberto, setMenuAberto] = useState(false);
  const [emDescanso, setEmDescanso] = useState(false);
  const [tempoDescansoVisual, setTempoDescansoVisual] = useState(0);
  const [progressoEsq, setProgressoEsq] = useState(0);
  const [progressoDir, setProgressoDir] = useState(0);

  const [relatorioFinal, setRelatorioFinal] = useState<SerieHistory[]>([]);
  const [finalizing, setFinalizing] = useState(false);

  // Refs de sincronização rápida para o loop 60fps
  const exercicioIniciadoRef = useRef(false);
  const menuAbertoRef = useRef(false);
  const emDescansoRef = useRef(false);
  
  const contadorGestoEsqRef = useRef(0);
  const contadorGestoDirRef = useRef(0);
  const contadorGestoInicioRef = useRef(0);
  
  const contadorRef = useRef(0);
  const serieCountRef = useRef(1);
  const estagioRef = useRef("REPOUSO");
  const alertaRef = useRef(false);
  const anguloRef = useRef(0);
  
  // Memória do Descanso atual para conseguir "Repetir"
  const duracaoDescansoAtualRef = useRef(10);
  const relogioRef = useRef(-1);
  
  // Memória de Auditoria de Ciclo (Abre quando sai do repouso, julga quando volta)
  const cicloAbertoRef = useRef(false);
  const picoAnguloCicloRef = useRef(0);
  const compensouTroncoCicloRef = useRef(false);
  
  const historicoSessaoRef = useRef<SerieHistory[]>([
    { serie: 1, corretas: 0, errosExecucao: 0, errosTronco: 0 }
  ]);
  const cronometroRef = useRef({ ativo: false, fim: 0 });
  const ultimoEsqueletoRef = useRef<any[] | null>(null);

  useEffect(() => { exercicioIniciadoRef.current = exercicioIniciado; }, [exercicioIniciado]);
  useEffect(() => { menuAbertoRef.current = menuAberto; }, [menuAberto]);
  useEffect(() => { emDescansoRef.current = emDescanso; }, [emDescanso]);

  async function handleFinalizeSession() {
    try {
      setFinalizing(true);
      
      const totalCorretas = relatorioFinal.reduce((acc, item) => acc + item.corretas, 0);
      const totalErrosExec = relatorioFinal.reduce((acc, item) => acc + item.errosExecucao, 0);
      const totalErrosTronco = relatorioFinal.reduce((acc, item) => acc + item.errosTronco, 0);
      const totalTentativas = totalCorretas + totalErrosExec;
      const accuracy = totalTentativas > 0 ? Math.round((totalCorretas / totalTentativas) * 100) : 0;

      const alerts: string[] = [];
      if (totalErrosTronco > 0) alerts.push(`Compensações de tronco detectadas: ${totalErrosTronco}`);
      if (totalErrosExec > 0) alerts.push(`Falhas de amplitude/meta detectadas: ${totalErrosExec}`);

      await apiFetch<FinalizeSessionResponse>(`/v1/sessions/${sessionId}/finalize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reps: repeticoes,
          rom: Number(configClinica.meta) || 0,
          cadence: null,
          alerts,
          accuracy, // Enviando a acurácia global calculada para a API
        }),
      });

      navigate("/dashboard");
    } catch (error) {
      console.error("Erro ao finalizar sessão:", error);
      alert("Não foi possível concluir o exercício.");
    } finally {
      setFinalizing(false);
    }
  }

  const calcularAngulo = (pontoA: any, pontoB: any, pontoC: any) => {
    const radianos = Math.atan2(pontoC.y - pontoB.y, pontoC.x - pontoB.x) -
                     Math.atan2(pontoA.y - pontoB.y, pontoA.x - pontoB.x);
    let angulo = Math.abs(radianos * 180.0 / Math.PI);
    return angulo > 180.0 ? 360.0 - angulo : angulo;
  };

  const calcularInclinacaoTronco = (ombro: any, anca: any) => {
    const dx = Math.abs(ombro.x - anca.x);
    const dy = Math.abs(ombro.y - anca.y);
    return Math.atan2(dx, dy) * (180.0 / Math.PI);
  };

  const atualizarHUD = (novoEstagio: string, compensando: boolean) => {
    let atualizouEstagio = false;
    if (estagioRef.current !== novoEstagio) {
        estagioRef.current = novoEstagio;
        setEstagio(novoEstagio);
        atualizouEstagio = true;
    }
    if (alertaRef.current !== compensando) {
        alertaRef.current = compensando;
        setAlertaPostura(compensando);
        if (unityCommRef.current.isLoaded) {
            if (compensando) unityCommRef.current.send("ReceptorReact", "ReceberEstadoDoReact", "POSTURA!");
            else {
                const estadoUnity = (novoEstagio === "DESCANSO" || novoEstagio === "FINALIZADO") ? "REPOUSO" : novoEstagio;
                unityCommRef.current.send("ReceptorReact", "ReceberEstadoDoReact", estadoUnity);
            }
        }
    } else if (atualizouEstagio && unityCommRef.current.isLoaded && !compensando) {
        const estadoUnity = (novoEstagio === "DESCANSO" || novoEstagio === "FINALIZADO") ? "REPOUSO" : novoEstagio;
        unityCommRef.current.send("ReceptorReact", "ReceberEstadoDoReact", estadoUnity);
    }
  };

  // ========================================================
  // LOOP MEDIAPIPE (DETECÇÃO + MÁQUINA DE ESTADOS)
  // ========================================================
  useEffect(() => {
    let poseLandmarker: PoseLandmarker;
    let animationFrameId: number;

    async function carregarConfig() {
      if (!patientUserId || !exerciseId) return;
      try {
        const data = await apiFetch<AssignmentConfigResponse[]>(
          `exercise-configs?patient_user_id=${patientUserId}&exercise_id=${exerciseId}`
        );
        if (!data?.length) return;
        const cfg = data[0];
        setConfigClinica((prev) => ({
          ...prev,
          ladoAtivo: normalizarLadoAtivo(cfg.lado_ativo),
          repousoMax: cfg.repouso_max ?? prev.repousoMax,
          meta: cfg.meta_extensao ?? prev.meta,
          tolerancia: cfg.tolerancia ?? prev.tolerancia,
          limiteTronco: cfg.limite_tronco ?? prev.limiteTronco,
          series: cfg.num_series ?? prev.series,
          repeticoesPorSerie: cfg.num_reps ?? prev.repeticoesPorSerie,
          descansoRepeticao: cfg.descanso_rep ?? prev.descansoRepeticao,
          descansoSerie: cfg.descanso_serie ?? prev.descansoSerie,
        }));
      } catch (error) { console.error("Erro ao carregar config:", error); }
    }

    carregarConfig();

    const inicializarMediaPipe = async () => {
      const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm");
      poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task`, delegate: "GPU" },
        runningMode: "VIDEO", numPoses: 1,
      });
      setIsLoaded(true);
      ligarCamera();
    };

    const ligarCamera = () => {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ video: true }).then((stream) => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.addEventListener("loadeddata", preverFrames);
          }
        });
      }
    };

    const preverFrames = () => {
      if (!videoRef.current || !canvasRef.current || !poseLandmarker) return;
      const video = videoRef.current; const canvas = canvasRef.current; const ctx = canvas.getContext("2d");
      if (!ctx) return;

      if (video.videoWidth === 0 || video.videoHeight === 0) {
        animationFrameId = window.requestAnimationFrame(preverFrames);
        return;
      }

      canvas.width = video.videoWidth; canvas.height = video.videoHeight;
      let startTimeMs = performance.now();
      const resultados = poseLandmarker.detectForVideo(video, startTimeMs);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      if (resultados.landmarks && resultados.landmarks.length > 0) {
        const esqueletoCru = resultados.landmarks[0];
        let esqueletoSuavizado = [];
        const fatorSuavizacao = 0.4;

        if (!ultimoEsqueletoRef.current) {
          esqueletoSuavizado = esqueletoCru;
        } else {
          for (let i = 0; i < esqueletoCru.length; i++) {
            const pontoAntigo = ultimoEsqueletoRef.current[i]; const pontoNovo = esqueletoCru[i];
            const confiabilidade = pontoNovo.visibility || 0;
            if (confiabilidade > 0.4) {
              esqueletoSuavizado.push({
                x: pontoAntigo.x + (pontoNovo.x - pontoAntigo.x) * fatorSuavizacao,
                y: pontoAntigo.y + (pontoNovo.y - pontoAntigo.y) * fatorSuavizacao,
                visibility: confiabilidade
              });
            } else { esqueletoSuavizado.push({ x: pontoAntigo.x, y: pontoAntigo.y, visibility: 0 }); }
          }
        }
        ultimoEsqueletoRef.current = esqueletoSuavizado;
        const utils = new DrawingUtils(ctx);
        utils.drawConnectors(esqueletoSuavizado, PoseLandmarker.POSE_CONNECTIONS, { color: "#00FF00", lineWidth: 4 });
        utils.drawLandmarks(esqueletoSuavizado, { color: "#FF0000", radius: 4 });

        const nariz = esqueletoSuavizado[0];
        const ombroEsq = esqueletoSuavizado[11]; const ombroDir = esqueletoSuavizado[12];
        const pulsoEsq = esqueletoSuavizado[15]; const pulsoDir = esqueletoSuavizado[16];

        const maoEsqLevantada = pulsoEsq.visibility > 0.6 && pulsoEsq.y < ombroEsq.y;
        const maoDirLevantada = pulsoDir.visibility > 0.6 && pulsoDir.y < ombroDir.y;

        // 1. TELA DE PRÉ-INÍCIO
        if (!exercicioIniciadoRef.current) {
          if (nariz.visibility > 0.5 && maoEsqLevantada) {
            contadorGestoInicioRef.current += 1;
            setProgressoInicio(Math.min(100, (contadorGestoInicioRef.current / 20) * 100));
            if (contadorGestoInicioRef.current >= 20) {
              exercicioIniciadoRef.current = true;
              setExercicioIniciado(true);
            }
          } else { contadorGestoInicioRef.current = 0; setProgressoInicio(0); }
        }
        
        // 2. MENU DE PAUSA ABERTO
        else if (menuAbertoRef.current) {
          if (maoEsqLevantada) {
            contadorGestoEsqRef.current += 1; setProgressoEsq((contadorGestoEsqRef.current / 15) * 100);
            if (contadorGestoEsqRef.current >= 15) { setMenuAberto(false); contadorGestoEsqRef.current = 0; setProgressoEsq(0); }
          } else { contadorGestoEsqRef.current = 0; setProgressoEsq(0); }

          if (maoDirLevantada) {
            contadorGestoDirRef.current += 1; setProgressoDir((contadorGestoDirRef.current / 15) * 100);
            if (contadorGestoDirRef.current >= 15) { setMenuAberto(false); handleFinalizeSession(); }
          } else { contadorGestoDirRef.current = 0; setProgressoDir(0); }
        }
        
        // 3. EXERCÍCIO ATIVO OU DESCANSO
        else {
          
          // GESTO DE REPETIR TEMPO NO DESCANSO
          if (emDescansoRef.current) {
            if (maoEsqLevantada) {
              contadorGestoEsqRef.current += 1; setProgressoEsq((contadorGestoEsqRef.current / 15) * 100);
              if (contadorGestoEsqRef.current >= 15) {
                // REINICIA O RELÓGIO COM A DURAÇÃO ORIGINAL!
                cronometroRef.current = {
                    ativo: true,
                    fim: startTimeMs + (duracaoDescansoAtualRef.current * 1000)
                };
                setTempoDescansoVisual(duracaoDescansoAtualRef.current);
                contadorGestoEsqRef.current = 0; setProgressoEsq(0);
              }
            } else { contadorGestoEsqRef.current = 0; setProgressoEsq(0); }
          } else {
            if (maoDirLevantada && estagioRef.current !== "FINALIZADO") {
              contadorGestoDirRef.current += 1; setProgressoDir((contadorGestoDirRef.current / 20) * 100);
              if (contadorGestoDirRef.current >= 20) { setMenuAberto(true); contadorGestoDirRef.current = 0; setProgressoDir(0); }
            } else { contadorGestoDirRef.current = 0; setProgressoDir(0); }
          }

          const configAtual = configRef.current;
          let ombro, anca, joelho, tornozelo;
          if (configAtual.ladoAtivo === "direito") {
            ombro = ombroDir; anca = esqueletoSuavizado[24]; joelho = esqueletoSuavizado[26]; tornozelo = esqueletoSuavizado[28];
          } else {
            ombro = ombroEsq; anca = esqueletoSuavizado[23]; joelho = esqueletoSuavizado[25]; tornozelo = esqueletoSuavizado[27];
          }

          if (ombro.visibility > 0.4 && anca.visibility > 0.4 && joelho.visibility > 0.4 && tornozelo.visibility > 0.4) {
            const anguloPerna = calcularAngulo(anca, joelho, tornozelo);
            const inclinacaoTronco = calcularInclinacaoTronco(ombro, anca);
            
            if (Math.abs(anguloPerna - anguloRef.current) > 1.5) {
              anguloRef.current = anguloPerna; setAnguloAtualDisplay(Math.round(anguloPerna));
            }

            if (unityCommRef.current.isLoaded) {
              unityCommRef.current.send("ReceptorReact", "ReceberAnguloDoReact", anguloPerna);
            }

            let estaCompensando = inclinacaoTronco > configAtual.limiteTronco;
            const limiteRepouso = configAtual.repousoMax;

            // ==============================================================
            // AUDITORIA DE CICLO (O Padrão Ouro de Análise Biomecânica)
            // ==============================================================

            // 1. ABRE O CICLO: Tirou a perna do repouso
            if (anguloPerna > limiteRepouso && !cicloAbertoRef.current && !emDescansoRef.current && estagioRef.current !== "FINALIZADO") {
                cicloAbertoRef.current = true;
                picoAnguloCicloRef.current = anguloPerna;
                compensouTroncoCicloRef.current = estaCompensando;
            }

            // 2. DURANTE O CICLO: Monitora o pico e a postura no ar
            if (cicloAbertoRef.current) {
                if (anguloPerna > picoAnguloCicloRef.current) picoAnguloCicloRef.current = anguloPerna;
                if (estaCompensando) compensouTroncoCicloRef.current = true;

                const minMeta = configAtual.meta * (1 - (configAtual.tolerancia / 100));
                const maxMeta = configAtual.meta * (1 + (configAtual.tolerancia / 100));

                // Display visual em tempo real na tela
                if (anguloPerna >= minMeta && anguloPerna <= maxMeta) atualizarHUD("SUCESSO", estaCompensando);
                else if (anguloPerna > maxMeta) atualizarHUD("EXCEDEU META", estaCompensando);
                else atualizarHUD("CONTRACAO", estaCompensando);

                // 3. FECHA O CICLO: Perna voltou para o repouso (Hora de julgar)
                if (anguloPerna <= limiteRepouso) {
                    cicloAbertoRef.current = false;

                    const pico = picoAnguloCicloRef.current;
                    const idxSerie = serieCountRef.current - 1;

                    // Julgamento A: Erro Biomecânico de Amplitude
                    if (pico >= minMeta && pico <= maxMeta) {
                        historicoSessaoRef.current[idxSerie].corretas += 1;
                    } else {
                        historicoSessaoRef.current[idxSerie].errosExecucao += 1;
                    }

                    // Julgamento B: Erro de Compensação Postural
                    if (compensouTroncoCicloRef.current) {
                        historicoSessaoRef.current[idxSerie].errosTronco += 1;
                    }

                    // Pontua a repetição feita
                    contadorRef.current += 1;
                    setRepeticoes(contadorRef.current);

                    const acabouSerie = contadorRef.current >= configAtual.repeticoesPorSerie;

                    if (acabouSerie) {
                        if (serieCountRef.current >= configAtual.series) {
                            atualizarHUD("FINALIZADO", false);
                            setRelatorioFinal([...historicoSessaoRef.current]);
                        } else {
                            serieCountRef.current += 1; setSerieAtual(serieCountRef.current);
                            historicoSessaoRef.current.push({ serie: serieCountRef.current, corretas: 0, errosExecucao: 0, errosTronco: 0 });

                            contadorRef.current = 0; setRepeticoes(0);

                            duracaoDescansoAtualRef.current = configAtual.descansoSerie;
                            cronometroRef.current = { ativo: true, fim: startTimeMs + (configAtual.descansoSerie * 1000) };
                            setEmDescanso(true); emDescansoRef.current = true;
                            setTempoDescansoVisual(configAtual.descansoSerie);
                            atualizarHUD("DESCANSO", false);
                        }
                    } else {
                        if (configAtual.descansoRepeticao > 0) {
                            duracaoDescansoAtualRef.current = configAtual.descansoRepeticao;
                            cronometroRef.current = { ativo: true, fim: startTimeMs + (configAtual.descansoRepeticao * 1000) };
                            setEmDescanso(true); emDescansoRef.current = true;
                            setTempoDescansoVisual(configAtual.descansoRepeticao);
                            atualizarHUD("DESCANSO", false);
                        } else {
                            atualizarHUD("REPOUSO", false);
                        }
                    }
                }
            } 
            // Fora de ciclo e de descanso = Repouso
            else if (!emDescansoRef.current && estagioRef.current !== "FINALIZADO") {
                if (cronometroRef.current.ativo) {
                    const faltamSecs = Math.ceil((cronometroRef.current.fim - startTimeMs) / 1000);
                    if (faltamSecs > 0) {
                        if (relogioRef.current !== faltamSecs) {
                            relogioRef.current = faltamSecs; setTempoDescansoVisual(faltamSecs);
                        }
                    } else {
                        cronometroRef.current.ativo = false; setEmDescanso(false); emDescansoRef.current = false;
                        atualizarHUD("REPOUSO", false);
                    }
                } else {
                    atualizarHUD("REPOUSO", estaCompensando);
                }
            }

            ctx.fillStyle = "#FFFFFF"; ctx.font = "bold 30px Arial"; ctx.lineWidth = 3;
            ctx.save(); ctx.translate(joelho.x * canvas.width + 20, joelho.y * canvas.height); ctx.scale(-1, 1);
            ctx.fillText(Math.round(anguloPerna) + "°", 0, 0); ctx.restore();
          }
        }
      } else { ultimoEsqueletoRef.current = null; }
      animationFrameId = window.requestAnimationFrame(preverFrames);
    };

    inicializarMediaPipe();
    return () => {
      if (animationFrameId) window.cancelAnimationFrame(animationFrameId);
      if (poseLandmarker) poseLandmarker.close();
    };
  }, [patientUserId, exerciseId]);

  const handleConfigChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setConfigClinica({
      ...configClinica,
      [name]: type === 'number' ? (value === '' ? '' : Number(value)) : value
    });
  };

  const isEsq = configClinica.ladoAtivo === "esquerdo";
  const isDir = configClinica.ladoAtivo === "direito";

  return (
    <div style={{ display: 'flex', flexDirection: 'row', width: '100vw', height: '100vh', margin: 0, padding: 0, fontFamily: 'sans-serif', boxSizing: 'border-box', backgroundColor: '#1a1a1a', position: 'absolute', top: 0, left: 0, overflow: 'hidden' }}>
      
      {/* LADO ESQUERDO (50% - Câmera + Painel Clínico) */}
      <div style={{ display: 'flex', flexDirection: 'column', width: '50%', height: '100%', borderRight: '3px solid #67B5A2', boxSizing: 'border-box', backgroundColor: '#1a1a1a' }}>
        
        {/* CONTAINER DA CÂMERA */}
        <div style={{ position: 'relative', width: '100%', flex: 1, minHeight: 0, backgroundColor: '#000', overflow: 'hidden' }}>
          {!isLoaded && <p style={{ color: 'white', padding: '20px', zIndex: 10 }}>A carregar IA...</p>}
          
          {/* UI 1: OVERLAY DE PRÉ-INÍCIO */}
          {isLoaded && !exercicioIniciado && (
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0, 0, 0, 0.8)', zIndex: 30, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(5px)' }}>
                <div style={{ fontSize: '70px', marginBottom: '5px' }}>🙋🏽‍♀️</div>
                <h2 style={{ color: 'white', margin: '0 0 15px 0', textAlign: 'center', fontSize: '2.2rem' }}>Vamos Começar?<br/>Levante sua mão esquerda</h2>
                <div style={{ width: '350px', height: '16px', backgroundColor: '#444', borderRadius: '8px', overflow: 'hidden', border: '2px solid white' }}>
                    <div style={{ width: `${progressoInicio}%`, height: '100%', backgroundColor: '#67B5A2', transition: 'width 0.1s linear' }} />
                </div>
                <button onClick={() => setExercicioIniciado(true)} style={{ marginTop: '20px', padding: '10px 25px', backgroundColor: 'transparent', color: 'white', border: '1px solid #888', borderRadius: '6px', cursor: 'pointer' }}>Ou... Clique aqui para iniciar!</button>

                <div style={{ marginTop: "20px", borderRadius: "16px", backgroundColor: "#333", border: "1px solid #555", padding: "16px", maxWidth: "80%" }}>
                    <h3 style={{ margin: 0, fontSize: "1.3rem", color: "#67B5A2" }}>Orientações Clínicas:</h3>
                    <div style={{ marginTop: "8px", color: "white", fontSize: "1rem", lineHeight: 1.5, textAlign: 'left' }}>
                        <p style={{ margin: "4px 0" }}>• Mantenha as costas apoiadas e a postura estável.</p>
                        <p style={{ margin: "4px 0" }}>• Estenda a perna indicada no placar até a meta e segure.</p>
                        <p style={{ margin: "4px 0" }}>• Retorne a perna de forma suave até embaixo.</p>
                        <p style={{ margin: "4px 0" }}>• Levantar a mão direita a qualquer momento pausa o treino.</p>
                    </div>
                </div>
            </div>
          )}

          {/* UI 2: OVERLAY DE DESCANSO (Com botão de Repetir Pausa) */}
          {exercicioIniciado && emDescanso && relatorioFinal.length === 0 && !menuAberto && (
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0, 0, 0, 0.85)', zIndex: 35, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(8px)' }}>
                <div style={{ fontSize: '70px', marginBottom: '5px' }}>⏳</div>
                <h2 style={{ color: '#67B5A2', fontSize: '2.8rem', margin: 0, textShadow: '2px 2px 4px black' }}>DESCANSO</h2>
                <p style={{ color: 'white', fontSize: '7rem', fontWeight: 'bold', margin: '5px 0', textShadow: '0px 5px 15px rgba(0,0,0,0.8)' }}>{tempoDescansoVisual}</p>

                <div style={{ marginTop: '15px', backgroundColor: 'rgba(255,255,255,0.08)', padding: '15px 40px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ fontSize: '45px', marginBottom: '5px' }}>✋🏽</span>
                    <p style={{ color: '#ddd', fontSize: '1.1rem', margin: '0 0 10px 0', textAlign: 'center' }}>Mão Esquerda<br /><b style={{ color: '#67B5A2' }}>REPETIR PAUSA</b></p>
                    <div style={{ width: '150px', height: '12px', backgroundColor: '#333', borderRadius: '6px', overflow: 'hidden' }}>
                        <div style={{ width: `${progressoEsq}%`, height: '100%', backgroundColor: '#67B5A2', transition: 'width 0.1s linear' }} />
                    </div>
                </div>
            </div>
          )}

          {/* UI 3: MENU DE PAUSA MANUAL */}
          {menuAberto && relatorioFinal.length === 0 && (
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 50, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)' }}>
                <h2 style={{ color: 'white', fontSize: '2.5rem', marginBottom: '30px', letterSpacing: '2px' }}>EXERCÍCIO PAUSADO</h2>
                <div style={{ display: 'flex', gap: '40px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: 'rgba(34, 197, 94, 0.1)', padding: '25px', borderRadius: '20px', border: '2px solid #22c55e' }}>
                        <span style={{ fontSize: '50px', marginBottom: '10px' }}>✋🏽</span>
                        <p style={{ color: 'white', fontSize: '1.3rem', margin: '0 0 15px 0', fontWeight: 'bold' }}>Continuar Treino</p>
                        <div style={{ width: '160px', height: '12px', backgroundColor: '#333', borderRadius: '6px', overflow: 'hidden' }}>
                            <div style={{ width: `${progressoEsq}%`, height: '100%', backgroundColor: '#22c55e', transition: 'width 0.1s linear' }} />
                        </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '25px', borderRadius: '20px', border: '2px solid #ef4444' }}>
                        <span style={{ fontSize: '50px', marginBottom: '10px' }}>🤚🏽</span>
                        <p style={{ color: 'white', fontSize: '1.3rem', margin: '0 0 15px 0', fontWeight: 'bold' }}>Encerrar Sessão</p>
                        <div style={{ width: '160px', height: '12px', backgroundColor: '#333', borderRadius: '6px', overflow: 'hidden' }}>
                            <div style={{ width: `${progressoDir}%`, height: '100%', backgroundColor: '#ef4444', transition: 'width 0.1s linear' }} />
                        </div>
                    </div>
                </div>
            </div>
          )}

          {/* UI 4: POPUP DE RELATÓRIO FINAL (Com 5 colunas de precisão) */}
          {relatorioFinal.length > 0 && (
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0, 0, 0, 0.85)', zIndex: 60, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(8px)' }}>
                <div style={{ backgroundColor: '#2b3d3b', padding: '35px', borderRadius: '20px', border: '4px solid #67B5A2', width: '90%', maxWidth: '800px', display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: '0 20px 50px #000' }}>
                    <h2 style={{ color: 'white', fontSize: '2.2rem', margin: '0 0 5px 0', textAlign: 'center' }}>Sessão Concluída com Sucesso!</h2>
                    <p style={{ color: '#ccc', marginBottom: '25px', fontSize: '1.1rem' }}>Desdobramento analítico de erros biomecânicos e posturais:</p>

                    <table style={{ width: '100%', color: 'white', borderCollapse: 'collapse', textAlign: 'center', marginBottom: '35px', fontSize: '1rem' }}>
                        <thead>
                            <tr style={{ borderBottom: '3px solid #444', backgroundColor: '#111' }}>
                                <th style={{ padding: '14px' }}>Série</th>
                                <th style={{ padding: '14px', color: '#22c55e' }}>Corretas</th>
                                <th style={{ padding: '14px', color: '#ef4444' }}>Erro (Execução)</th>
                                <th style={{ padding: '14px', color: '#f59e0b' }}>Erro (Tronco)</th>
                                <th style={{ padding: '14px', color: '#3b82f6' }}>Acurácia</th>
                            </tr>
                        </thead>
                        <tbody>
                            {relatorioFinal.map((r, i) => {
                                const totalTentativas = r.corretas + r.errosExecucao;
                                const acuracia = totalTentativas > 0 ? Math.round((r.corretas / totalTentativas) * 100) : 0;
                                return (
                                    <tr key={i} style={{ borderBottom: '1px solid #333', backgroundColor: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.03)' }}>
                                        <td style={{ padding: '15px', fontWeight: 'bold' }}>{r.serie}</td>
                                        <td style={{ padding: '15px', fontWeight: 'bold', fontSize: '1.3rem', color: '#22c55e' }}>{r.corretas}</td>
                                        <td style={{ padding: '15px', fontSize: '1.2rem', color: r.errosExecucao > 0 ? '#ef4444' : '#fff' }}>{r.errosExecucao}</td>
                                        <td style={{ padding: '15px', fontSize: '1.2rem', color: r.errosTronco > 0 ? '#f59e0b' : '#fff' }}>{r.errosTronco}</td>
                                        <td style={{ padding: '15px', fontWeight: 'bold', fontSize: '1.3rem', color: '#3b82f6' }}>{acuracia}%</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    <button onClick={handleFinalizeSession} disabled={finalizing} style={{ padding: '15px 40px', fontSize: '1.3rem', backgroundColor: '#67B5A2', color: 'white', border: 'none', borderRadius: '10px', cursor: finalizing ? 'not-allowed' : 'pointer', fontWeight: 'bold', boxShadow: '0 10px 20px rgba(0,0,0,0.5)' }}>
                        {finalizing ? "Salvando..." : "Concluir e Voltar"}
                    </button>
                </div>
            </div>
          )}

          {/* UI 5: ALERTA GIGANTE DE POSTURA */}
          {alertaPostura && !emDescanso && !menuAberto && relatorioFinal.length === 0 && (
            <div style={{ position: 'absolute', top: '25%', left: '50%', transform: 'translate(-50%, -50%)', backgroundColor: '#ef4444', padding: '15px 35px', borderRadius: '20px', border: '4px solid white', zIndex: 45, display: 'flex', alignItems: 'center', gap: '20px', boxShadow: '0 15px 30px rgba(239,68,68,0.6)' }}>
                <span style={{ fontSize: '50px' }}>⚠️</span>
                <div>
                    <h1 style={{ color: 'white', margin: 0, fontSize: '1.3rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Cuidado com o Tronco!</h1>
                    <p style={{ color: 'white', margin: '5px 0 0 0', fontSize: '1rem', fontWeight: 'bold' }}>Mantenha as costas apoiadas na cadeira.</p>
                </div>
            </div>
          )}

          {/* UI 6: HUD SUPERIOR GLASSMORPHISM */}
          {exercicioIniciado && (
            <div style={{ position: 'absolute', top: '15px', left: '50%', transform: 'translateX(-50%)', zIndex: 20, backgroundColor: 'rgba(26, 26, 26, 0.95)', padding: '12px 28px', borderRadius: '15px', border: '3px solid #67B5A2', display: 'flex', gap: '25px', boxShadow: '0 10px 20px rgba(0,0,0,0.6)' }}>
                <div style={{ borderRight: '1px solid rgba(255,255,255,0.2)', paddingRight: '20px', textAlign: 'center' }}>
                    <div style={{ color: '#aaa', fontSize: '11px', fontWeight: 'bold', letterSpacing: '1px' }}>SÉRIE</div>
                    <div style={{ color: 'white', fontSize: '30px', fontWeight: 'bold' }}>{serieAtual} <span style={{ fontSize: '16px', color: '#888' }}>/ {configClinica.series}</span></div>
                </div>

                <div style={{ borderRight: '1px solid rgba(255,255,255,0.2)', paddingRight: '20px', textAlign: 'center', opacity: isEsq ? 1 : 0.35, transition: 'opacity 0.3s' }}>
                    <div style={{ color: isEsq ? '#B02CA0' : '#aaa', fontSize: '11px', fontWeight: 'bold', letterSpacing: '1px' }}>◀ ESQUERDA</div>
                    <div style={{ color: isEsq ? '#B02CA0' : '#777', fontSize: '30px', fontWeight: 'bold' }}>
                        {isEsq ? repeticoes : '-'} <span style={{ fontSize: '16px', color: '#888' }}>/ {isEsq ? configClinica.repeticoesPorSerie : '-'}</span>
                    </div>
                </div>

                <div style={{ borderRight: '1px solid rgba(255,255,255,0.2)', paddingRight: '20px', textAlign: 'center', opacity: isDir ? 1 : 0.35, transition: 'opacity 0.3s' }}>
                    <div style={{ color: isDir ? '#D9BB4E' : '#aaa', fontSize: '11px', fontWeight: 'bold', letterSpacing: '1px' }}>DIREITA ▶</div>
                    <div style={{ color: isDir ? '#D9BB4E' : '#777', fontSize: '30px', fontWeight: 'bold' }}>
                        {isDir ? repeticoes : '-'} <span style={{ fontSize: '16px', color: '#888' }}>/ {isDir ? configClinica.repeticoesPorSerie : '-'}</span>
                    </div>
                </div>

                <div style={{ textAlign: 'center', minWidth: '150px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ color: '#aaa', fontSize: '11px', fontWeight: 'bold', letterSpacing: '1px' }}>ESTADO</div>
                    <div style={{ color: alertaPostura ? "#ef4444" : estagio === "SUCESSO" ? "#22c55e" : estagio === "EXCEDEU META" ? "#ef4444" : "#ea580c", fontSize: '18px', fontWeight: 'bold', marginTop: '3px', textTransform: 'uppercase' }}>
                        {alertaPostura ? "POSTURA!" : estagio}
                    </div>
                    <div style={{ color: '#fbbf24', fontSize: '12px', marginTop: '5px', fontWeight: 'bold' }}>Ângulo do joelho: {anguloAtualDisplay}°</div>
                </div>
            </div>
          )}

          <video ref={videoRef} autoPlay playsInline style={{ display: 'none' }} />
          <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', transform: 'scaleX(-1)', objectFit: 'cover' }} />
        </div>

        {/* PAINEL CLÍNICO */}
        <div style={{ flexShrink: 0, padding: '15px 25px', borderTop: '2px solid #67B5A2', boxSizing: 'border-box', backgroundColor: '#f9fafb', overflowY: 'auto' }}>
          <h3 style={{ marginTop: 0, marginBottom: '12px', color: '#111827', fontSize: '1.1rem', borderBottom: '2px solid #67B5A2', paddingBottom: '6px', fontWeight: 'bold' }}>
            Ajuste Clínico da Sessão
          </h3>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ flex: '1 1 20%', minWidth: '90px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', marginBottom: '4px', color: '#4b5563' }}>Séries</label>
              <input type="number" name="series" value={configClinica.series} onChange={handleConfigChange} style={{ width: '100%', padding: '6px', borderRadius: '6px', border: '1px solid #d1d5db', backgroundColor: '#fff', color: '#111827', fontWeight: 'bold' }} disabled={exercicioIniciado} />
            </div>
            <div style={{ flex: '1 1 20%', minWidth: '90px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', marginBottom: '4px', color: '#4b5563' }}>Reps / Série</label>
              <input type="number" name="repeticoesPorSerie" value={configClinica.repeticoesPorSerie} onChange={handleConfigChange} style={{ width: '100%', padding: '6px', borderRadius: '6px', border: '1px solid #d1d5db', backgroundColor: '#fff', color: '#111827', fontWeight: 'bold' }} disabled={exercicioIniciado} />
            </div>
            <div style={{ flex: '1 1 20%', minWidth: '110px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', marginBottom: '4px', color: '#059669' }}>Descanso Rep (s)</label>
              <input type="number" name="descansoRepeticao" value={configClinica.descansoRepeticao} onChange={handleConfigChange} style={{ width: '100%', padding: '6px', borderRadius: '6px', border: '1px solid #d1d5db', backgroundColor: '#fff', color: '#111827', fontWeight: 'bold' }} disabled={exercicioIniciado} />
            </div>
            <div style={{ flex: '1 1 20%', minWidth: '110px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', marginBottom: '4px', color: '#059669' }}>Descanso Série (s)</label>
              <input type="number" name="descansoSerie" value={configClinica.descansoSerie} onChange={handleConfigChange} style={{ width: '100%', padding: '6px', borderRadius: '6px', border: '1px solid #d1d5db', backgroundColor: '#fff', color: '#111827', fontWeight: 'bold' }} disabled={exercicioIniciado} />
            </div>

            <div style={{ flex: '1 1 20%', minWidth: '120px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', marginBottom: '4px', color: '#67B5A2' }}>LADO ATIVO</label>
              <select name="ladoAtivo" value={configClinica.ladoAtivo} onChange={handleConfigChange} style={{ width: '100%', padding: '6px', borderRadius: '6px', border: '2px solid #67B5A2', backgroundColor: '#fff', fontWeight: 'bold', color: '#111827' }} disabled={exercicioIniciado}>
                <option value="direito">Perna Direita</option>
                <option value="esquerdo">Perna Esquerda</option>
              </select>
            </div>
            <div style={{ flex: '1 1 20%', minWidth: '110px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', marginBottom: '4px', color: '#4b5563' }}>Meta Extensão (°)</label>
              <input type="number" name="meta" value={configClinica.meta} onChange={handleConfigChange} style={{ width: '100%', padding: '6px', borderRadius: '6px', border: '1px solid #d1d5db', backgroundColor: '#fff', color: '#111827', fontWeight: 'bold' }} disabled={exercicioIniciado} />
            </div>
            <div style={{ flex: '1 1 20%', minWidth: '110px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', marginBottom: '4px', color: '#4b5563' }}>Repouso Máx (°)</label>
              <input type="number" name="repousoMax" value={configClinica.repousoMax} onChange={handleConfigChange} style={{ width: '100%', padding: '6px', borderRadius: '6px', border: '1px solid #d1d5db', backgroundColor: '#fff', color: '#111827', fontWeight: 'bold' }} disabled={exercicioIniciado} />
            </div>
            <div style={{ flex: '1 1 20%', minWidth: '110px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', marginBottom: '4px', color: '#ef4444' }}>Limite Tronco (°)</label>
              <input type="number" name="limiteTronco" value={configClinica.limiteTronco} onChange={handleConfigChange} style={{ width: '100%', padding: '6px', borderRadius: '6px', border: '1px solid #d1d5db', backgroundColor: '#fff', color: '#111827', fontWeight: 'bold' }} disabled={exercicioIniciado} />
            </div>
          </div>
        </div>
      </div>

      {/* LADO DIREITO (50% - Jogo Unity) */}
      <div style={{ width: '50%', height: '100%', position: 'relative', overflow: 'hidden', backgroundColor: '#1a1a1a' }}>
        <Unity unityProvider={unityProvider} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} />
      </div>

    </div>
  );
};