"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, RotateCcw, Volume2, VolumeX } from "lucide-react";

export default function PongGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPaused, setIsPaused] = useState(true);
  const [playerScore, setPlayerScore] = useState(0);
  const [computerScore, setComputerScore] = useState(0);
  const [difficulty, setDifficulty] = useState(3);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<"player" | "computer" | null>(null);
  const gameStateRef = useRef<any>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Constantes do jogo
    const CANVAS_WIDTH = 800;
    const CANVAS_HEIGHT = 500;
    const FOOT_WIDTH = 40;
    const FOOT_HEIGHT = 60;
    const BALL_SIZE = 30;
    const WINNING_SCORE = 7;

    // Estado do jogo
    const game = {
      player: {
        x: 30,
        y: CANVAS_HEIGHT / 2,
        width: FOOT_WIDTH,
        height: FOOT_HEIGHT,
        speed: 0,
      },
      computer: {
        x: CANVAS_WIDTH - 30 - FOOT_WIDTH,
        y: CANVAS_HEIGHT / 2,
        width: FOOT_WIDTH,
        height: FOOT_HEIGHT,
        speed: 0,
      },
      ball: {
        x: CANVAS_WIDTH / 2,
        y: CANVAS_HEIGHT / 2,
        vx: 0,
        vy: 0,
        size: BALL_SIZE,
        speed: 5,
      },
      particles: [] as Array<{
        x: number;
        y: number;
        vx: number;
        vy: number;
        life: number;
        color: string;
      }>,
      mouseY: CANVAS_HEIGHT / 2,
    };
    gameStateRef.current = game;

    // Inicializa velocidade da bola
    const resetBall = (toRight: boolean = Math.random() > 0.5) => {
      game.ball.x = CANVAS_WIDTH / 2;
      game.ball.y = CANVAS_HEIGHT / 2;
      const angle = ((Math.random() - 0.5) * Math.PI) / 3;
      game.ball.vx = (toRight ? 1 : -1) * game.ball.speed * Math.cos(angle);
      game.ball.vy = game.ball.speed * Math.sin(angle);
    };

    const createParticles = (x: number, y: number, color: string) => {
      for (let i = 0; i < 8; i++) {
        const angle = (Math.PI * 2 * i) / 8;
        game.particles.push({
          x,
          y,
          vx: Math.cos(angle) * 3,
          vy: Math.sin(angle) * 3,
          life: 1,
          color,
        });
      }
    };

    const playSound = (frequency: number, duration: number) => {
      if (!soundEnabled) return;
      try {
        const audioContext = new (window.AudioContext ||
          (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.frequency.value = frequency;
        oscillator.type = "sine";
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(
          0.01,
          audioContext.currentTime + duration
        );
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + duration);
      } catch (e) {
        console.log("Audio not supported");
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      game.mouseY = ((e.clientY - rect.top) / rect.height) * CANVAS_HEIGHT;
    };
    canvas.addEventListener("mousemove", handleMouseMove);

    resetBall();

    // Imagens
    const backgroundImg = new Image();
    backgroundImg.src = "/images/background.png";
    const playerFootImg = new Image();
    playerFootImg.src = "/images/player-foot.png";
    const computerFootImg = new Image();
    computerFootImg.src = "/images/computer-foot.png";

    // Loop principal
    let animationId: number;
    const gameLoop = () => {
      if (!ctx) return;

      // Desenha background com zoom tipo "cover"
      if (backgroundImg.complete) {
        const canvasRatio = CANVAS_WIDTH / CANVAS_HEIGHT;
        const imgRatio = backgroundImg.width / backgroundImg.height;
        let sx = 0,
          sy = 0,
          sWidth = backgroundImg.width,
          sHeight = backgroundImg.height;

        if (imgRatio > canvasRatio) {
          sWidth = backgroundImg.height * canvasRatio;
          sx = (backgroundImg.width - sWidth) / 2;
        } else {
          sHeight = backgroundImg.width / canvasRatio;
          sy = (backgroundImg.height - sHeight) / 2;
        }

        ctx.drawImage(
          backgroundImg,
          sx,
          sy,
          sWidth,
          sHeight,
          0,
          0,
          CANVAS_WIDTH,
          CANVAS_HEIGHT
        );
      } else {
        ctx.fillStyle = "#d9c49a";
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      }

      // Linha do meio
      ctx.strokeStyle = "rgba(139, 69, 19, 0.4)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(CANVAS_WIDTH / 2, 0);
      ctx.lineTo(CANVAS_WIDTH / 2, CANVAS_HEIGHT);
      ctx.stroke();

      // Net pattern
      ctx.strokeStyle = "rgba(139, 69, 19, 0.2)";
      ctx.lineWidth = 1;
      for (let i = 0; i < CANVAS_HEIGHT; i += 20) {
        ctx.beginPath();
        ctx.moveTo(CANVAS_WIDTH / 2 - 10, i);
        ctx.lineTo(CANVAS_WIDTH / 2 + 10, i);
        ctx.stroke();
      }

      if (!isPaused && !gameOver) {
        // Movimento player
        const targetY = Math.max(
          game.player.height / 2,
          Math.min(CANVAS_HEIGHT - game.player.height / 2, game.mouseY)
        );
        game.player.y += (targetY - game.player.y) * 0.2;

        // Movimento IA
        const aiSpeed = 2 + difficulty * 0.5;
        const predictedY = game.ball.y + game.ball.vy * 10;
        if (game.ball.x > CANVAS_WIDTH / 2) {
          if (predictedY > game.computer.y + 10) game.computer.y += aiSpeed;
          else if (predictedY < game.computer.y - 10)
            game.computer.y -= aiSpeed;
        }
        game.computer.y = Math.max(
          game.computer.height / 2,
          Math.min(CANVAS_HEIGHT - game.computer.height / 2, game.computer.y)
        );

        // Movimento bola
        game.ball.x += game.ball.vx;
        game.ball.y += game.ball.vy;

        // Colisão bola com teto/chão
        if (
          game.ball.y <= game.ball.size / 2 ||
          game.ball.y >= CANVAS_HEIGHT - game.ball.size / 2
        ) {
          game.ball.vy *= -1;
          playSound(300, 0.1);
          createParticles(game.ball.x, game.ball.y, "#ffd700");
        }

        const checkFootCollision = (foot: typeof game.player) => {
          if (
            game.ball.x - game.ball.size / 2 <= foot.x + foot.width / 2 &&
            game.ball.x + game.ball.size / 2 >= foot.x - foot.width / 2 &&
            game.ball.y + game.ball.size / 2 >= foot.y - foot.height / 2 &&
            game.ball.y - game.ball.size / 2 <= foot.y + foot.height / 2
          ) {
            const relativeY = (game.ball.y - foot.y) / (foot.height / 2);
            const angle = relativeY * (Math.PI / 3);
            const speed =
              Math.sqrt(game.ball.vx ** 2 + game.ball.vy ** 2) * 1.05;
            game.ball.vx =
              (foot === game.player ? 1 : -1) * speed * Math.cos(angle);
            game.ball.vy = speed * Math.sin(angle);
            playSound(400, 0.1);
            createParticles(game.ball.x, game.ball.y, "#87ceeb");
          }
        };

        checkFootCollision(game.player);
        checkFootCollision(game.computer);

        // Placar
        if (game.ball.x < 0) {
          setComputerScore((prev) => {
            const newScore = prev + 1;
            if (newScore >= WINNING_SCORE) {
              setGameOver(true);
              setWinner("computer");
            }
            resetBall(true);
            return newScore;
          });
        } else if (game.ball.x > CANVAS_WIDTH) {
          setPlayerScore((prev) => {
            const newScore = prev + 1;
            if (newScore >= WINNING_SCORE) {
              setGameOver(true);
              setWinner("player");
            }
            resetBall(false);
            return newScore;
          });
        }

        // Atualiza partículas
        game.particles = game.particles.filter((p) => {
          p.x += p.vx;
          p.y += p.vy;
          p.life -= 0.02;
          return p.life > 0;
        });
      }

      // Desenha partículas
      game.particles.forEach((p) => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life;
        ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
      });
      ctx.globalAlpha = 1;

      // Desenha pés com imagens
      const drawFoot = (foot: typeof game.player, isPlayer: boolean) => {
        const img = isPlayer ? playerFootImg : computerFootImg;
        if (img.complete) {
          ctx.drawImage(
            img,
            foot.x - foot.width / 2,
            foot.y - foot.height / 2,
            foot.width,
            foot.height * 1.5
          );
        }
      };
      drawFoot(game.player, true);
      drawFoot(game.computer, false);

      const ballImg = new Image();
      ballImg.src = "/images/ball.png"; // caminho da sua imagem

      // Desenha bola
      const drawVolleyball = () => {
        if (ballImg.complete) {
          ctx.drawImage(
            ballImg,
            game.ball.x - (game.ball.size * 3) / 2,
            game.ball.y - (game.ball.size * 3) / 2,
            game.ball.size * 3,
            game.ball.size * 3
          );
        } else {
          // fallback caso a imagem não tenha carregado ainda
          ctx.fillStyle = "#ffffff";
          ctx.strokeStyle = "#1e90ff";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(game.ball.x, game.ball.y, game.ball.size / 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      };

      drawVolleyball();

      animationId = requestAnimationFrame(gameLoop);
    };

    gameLoop();

    return () => {
      cancelAnimationFrame(animationId);
      canvas.removeEventListener("mousemove", handleMouseMove);
    };
  }, [isPaused, difficulty, soundEnabled, gameOver]);

  const handleReset = () => {
    setPlayerScore(0);
    setComputerScore(0);
    setGameOver(false);
    setWinner(null);
    setIsPaused(true);
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-sky-400 via-blue-300 to-cyan-400 flex items-center justify-center p-4">
      <div className="flex flex-col lg:flex-row gap-6 items-center">
        {/* Canvas do jogo */}
        <Card className="p-6 bg-amber-50/90 border-amber-200 backdrop-blur shadow-2xl">
          <div className="relative">
            <canvas
              ref={canvasRef}
              width={800}
              height={500}
              className="rounded-lg border-4 border-amber-600 shadow-2xl"
              style={{ maxWidth: "100%", height: "auto" }}
            />

            {/* Placar */}
            <div className="absolute top-4 left-0 right-0 flex justify-center gap-12 pointer-events-none">
              <div className="text-center">
                <div className="text-5xl font-bold text-orange-600 drop-shadow-[0_0_10px_rgba(234,88,12,0.5)]">
                  {playerScore}
                </div>
                <div className="text-sm text-amber-900 bg-orange-100/60 rounded-xs p-0.5 mt-1 font-semibold">
                  Eri Johnson
                </div>
              </div>
              <div className="text-center">
                <div className="text-5xl font-bold text-red-600 drop-shadow-[0_0_10px_rgba(220,38,38,0.5)]">
                  {computerScore}
                </div>
                <div className="text-sm text-amber-900 bg-orange-100/60 rounded-xs p-0.5 mt-1 font-semibold">
                  Evando Mesquita
                </div>
              </div>
            </div>

            {/* Overlay Game Over */}
            {gameOver && (
              <div className="absolute inset-0 bg-amber-900/80 rounded-lg flex items-center justify-center backdrop-blur-sm">
                <div className="text-center">
                  <h2 className="text-4xl font-bold text-white mb-2">
                    {winner === "player" ? "🏖️ Você Venceu!" : "🤖 IA Venceu!"}
                  </h2>
                  <p className="text-amber-100 mb-6">
                    Placar Final: {playerScore} - {computerScore}
                  </p>
                  <Button
                    onClick={handleReset}
                    size="lg"
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    <RotateCcw className="mr-2 h-5 w-5" /> Jogar Novamente
                  </Button>
                </div>
              </div>
            )}

            {/* Overlay Pause */}
            {isPaused && !gameOver && (
              <div className="absolute inset-0 bg-amber-900/70 rounded-lg flex items-center justify-center backdrop-blur-sm">
                <div className="text-center">
                  <h2 className="text-3xl font-bold text-white mb-4">
                    🏐 Vôlei de Praia
                  </h2>
                  <p className="text-amber-100 mb-6">
                    Mova o mouse para controlar seu pé
                  </p>
                  <Button
                    onClick={() => setIsPaused(false)}
                    size="lg"
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Play className="mr-2 h-5 w-5" /> Iniciar Jogo
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Painel de controles */}
        <Card className="p-6 bg-amber-50/90 border-amber-200 backdrop-blur w-full lg:w-80 shadow-xl">
          <h3 className="text-xl font-bold text-amber-900 mb-4">Controles</h3>
          <div className="space-y-4">
            <Button
              onClick={() => setIsPaused(!isPaused)}
              disabled={gameOver}
              className="w-full bg-orange-600 hover:bg-orange-700"
              variant={isPaused ? "default" : "secondary"}
            >
              {isPaused ? (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Continuar
                </>
              ) : (
                <>
                  <Pause className="mr-2 h-4 w-4" />
                  Pausar
                </>
              )}
            </Button>

            <Button
              onClick={handleReset}
              className="w-full border-amber-600 text-amber-900 hover:bg-amber-100 bg-transparent"
              variant="outline"
            >
              <RotateCcw className="mr-2 h-4 w-4" /> Reiniciar
            </Button>

            <Button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="w-full border-amber-600 text-amber-900 hover:bg-amber-100"
              variant="outline"
            >
              {soundEnabled ? (
                <>
                  <Volume2 className="mr-2 h-4 w-4" />
                  Som Ligado
                </>
              ) : (
                <>
                  <VolumeX className="mr-2 h-4 w-4" />
                  Som Desligado
                </>
              )}
            </Button>

            <div className="space-y-2">
              <label className="text-sm text-amber-800 flex justify-between">
                <span>Dificuldade da IA (Evandro)</span>
                <span className="text-amber-900 font-semibold">
                  {difficulty}/5
                </span>
              </label>
              <Slider
                value={[difficulty]}
                onValueChange={(value) => setDifficulty(value[0])}
                min={1}
                max={5}
                step={1}
                className="w-full"
              />
            </div>

            <div className="mt-6 p-4 bg-amber-100 rounded-lg border border-amber-300">
              <h4 className="text-sm font-semibold text-amber-900 mb-2">
                Como Jogar
              </h4>
              <ul className="text-xs text-amber-800 space-y-1">
                <li>• Mova o mouse para controlar seu pé</li>
                <li>• Primeiro a fazer 7 pontos vence</li>
                <li>• A bola acelera a cada rebatida</li>
                <li>• Ajuste a dificuldade da IA</li>
                <li>• Beba água todos os dias</li>
              </ul>
            </div>

            <div className="mt-4 text-center text-xs text-amber-700">
              <p>Inspirado nas partidas épicas de Eri Johnson</p>
              <p className="mt-1">Desenvolvido por Léo Santander Nycz</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
