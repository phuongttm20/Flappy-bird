import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pause, Play, RotateCcw, Volume2, VolumeX, Sun, Sunset, Moon } from 'lucide-react';
import { renderGame } from '../game/renderer';
import { soundEngine } from '../game/sound';
import {
  BASE_PIPE_GAP,
  BASE_PIPE_SPEED,
  BIRD_RADIUS,
  BIRD_X,
  BirdState,
  Cloud,
  FLAP_VELOCITY,
  FloatingScore,
  GAME_HEIGHT,
  GAME_WIDTH,
  GRAVITY,
  GameState,
  MAX_FALL_SPEED,
  MIN_PIPE_GAP,
  PIPE_SPAWN_INTERVAL,
  PIPE_WIDTH,
  PLAYABLE_HEIGHT,
  Particle,
  PipePair,
  SkyTheme,
  getMedalForScore,
} from '../game/types';

const BEST_SCORE_KEY = 'chimbay_best_score_v1';
const THEME_KEY = 'chimbay_sky_theme_v1';

function createInitialClouds(): Cloud[] {
  return [
    { x: 70, y: 88, scale: 0.95, speed: 16 },
    { x: 225, y: 142, scale: 0.72, speed: 11 },
    { x: 360, y: 74, scale: 1.08, speed: 19 },
    { x: 470, y: 175, scale: 0.8, speed: 13 },
  ];
}

function createInitialBird(): BirdState {
  return {
    x: BIRD_X,
    y: PLAYABLE_HEIGHT * 0.46,
    vy: 0,
    rotation: 0,
    wingPhase: 0,
  };
}

function circleRectCollides(
  cx: number,
  cy: number,
  cr: number,
  rx: number,
  ry: number,
  rw: number,
  rh: number
): boolean {
  const closestX = Math.max(rx, Math.min(cx, rx + rw));
  const closestY = Math.max(ry, Math.min(cy, ry + rh));
  const dx = cx - closestX;
  const dy = cy - closestY;
  return dx * dx + dy * dy < cr * cr;
}

export const FlappyGame: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [gameState, setGameState] = useState<GameState>('READY');
  const [score, setScore] = useState<number>(0);
  const [bestScore, setBestScore] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(BEST_SCORE_KEY);
      return saved ? Math.max(0, parseInt(saved, 10) || 0) : 0;
    } catch {
      return 0;
    }
  });
  const [isNewRecord, setIsNewRecord] = useState<boolean>(false);
  const [muted, setMuted] = useState<boolean>(false);
  const [theme, setTheme] = useState<SkyTheme>(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved === 'day' || saved === 'sunset' || saved === 'night') return saved;
    } catch {
      // ignore storage errors
    }
    return 'day';
  });

  // Mutable simulation refs for 60/120fps smooth rAF loop without React re-render lag
  const stateRef = useRef<GameState>('READY');
  const themeRef = useRef<SkyTheme>(theme);
  const scoreRef = useRef<number>(0);
  const bestScoreRef = useRef<number>(bestScore);
  const gameOverAtRef = useRef<number>(0);

  const birdRef = useRef<BirdState>(createInitialBird());
  const pipesRef = useRef<PipePair[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const floatingScoresRef = useRef<FloatingScore[]>([]);
  const cloudsRef = useRef<Cloud[]>(createInitialClouds());

  const groundOffsetRef = useRef<number>(0);
  const skylineOffsetRef = useRef<number>(0);
  const spawnTimerRef = useRef<number>(0.6);
  const flashAlphaRef = useRef<number>(0);
  const timeRef = useRef<number>(0);

  useEffect(() => {
    themeRef.current = theme;
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // ignore
    }
  }, [theme]);

  useEffect(() => {
    soundEngine.setMuted(muted);
  }, [muted]);

  const spawnFlapParticles = useCallback((x: number, y: number) => {
    const colors = ['#FEF08A', '#FFFFFF', '#FDE047'];
    for (let i = 0; i < 6; i++) {
      const angle = Math.PI + (Math.random() - 0.5) * 1.3;
      const speed = 45 + Math.random() * 85;
      particlesRef.current.push({
        x: x - 10,
        y: y + 4,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed + 25,
        radius: 2 + Math.random() * 2.5,
        alpha: 0.9,
        color: colors[i % colors.length],
        life: 0,
        maxLife: 0.32 + Math.random() * 0.18,
      });
    }
  }, []);

  const spawnScoreParticles = useCallback((x: number, y: number) => {
    for (let i = 0; i < 10; i++) {
      const angle = (Math.PI * 2 * i) / 10 + Math.random() * 0.3;
      const speed = 55 + Math.random() * 75;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 2.2 + Math.random() * 2,
        alpha: 1,
        color: i % 2 === 0 ? '#FEF08A' : '#86EFAC',
        life: 0,
        maxLife: 0.45 + Math.random() * 0.15,
      });
    }
  }, []);

  const resetToReady = useCallback(() => {
    birdRef.current = createInitialBird();
    pipesRef.current = [];
    particlesRef.current = [];
    floatingScoresRef.current = [];
    spawnTimerRef.current = 0.55;
    flashAlphaRef.current = 0;
    scoreRef.current = 0;
    setScore(0);
    setIsNewRecord(false);
    stateRef.current = 'READY';
    setGameState('READY');
  }, []);

  const triggerGameOver = useCallback(() => {
    if (stateRef.current === 'GAME_OVER') return;
    stateRef.current = 'GAME_OVER';
    gameOverAtRef.current = performance.now();
    flashAlphaRef.current = 0.72;
    setGameState('GAME_OVER');

    const finalScore = scoreRef.current;
    if (finalScore > bestScoreRef.current) {
      bestScoreRef.current = finalScore;
      setBestScore(finalScore);
      setIsNewRecord(true);
      try {
        localStorage.setItem(BEST_SCORE_KEY, String(finalScore));
      } catch {
        // ignore
      }
      soundEngine.playHit();
      window.setTimeout(() => {
        soundEngine.playNewBest();
      }, 240);
    } else {
      soundEngine.playHit();
    }
  }, []);

  const flap = useCallback(() => {
    const current = stateRef.current;

    if (current === 'PAUSED') return;

    if (current === 'GAME_OVER') {
      // Brief cooldown so accidental tap right as bird hits doesn't skip scorecard
      if (performance.now() - gameOverAtRef.current > 380) {
        resetToReady();
      }
      return;
    }

    if (current === 'READY') {
      scoreRef.current = 0;
      setScore(0);
      setIsNewRecord(false);
      pipesRef.current = [];
      spawnTimerRef.current = 0.65;
      stateRef.current = 'PLAYING';
      setGameState('PLAYING');
    }

    birdRef.current.vy = FLAP_VELOCITY;
    birdRef.current.wingPhase = 0;
    spawnFlapParticles(birdRef.current.x, birdRef.current.y);
    soundEngine.playFlap();
  }, [resetToReady, spawnFlapParticles]);

  const togglePause = useCallback(() => {
    if (stateRef.current === 'PLAYING') {
      stateRef.current = 'PAUSED';
      setGameState('PAUSED');
    } else if (stateRef.current === 'PAUSED') {
      stateRef.current = 'PLAYING';
      setGameState('PLAYING');
    }
  }, []);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;

      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        e.preventDefault();
        flap();
      } else if (e.code === 'KeyP' || e.code === 'Escape') {
        e.preventDefault();
        togglePause();
      } else if (e.code === 'KeyM') {
        e.preventDefault();
        setMuted((prev) => !prev);
      } else if (e.code === 'Enter' && stateRef.current === 'GAME_OVER') {
        e.preventDefault();
        if (performance.now() - gameOverAtRef.current > 250) {
          resetToReady();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [flap, resetToReady, togglePause]);

  // Main animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const setupCanvasDpr = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = GAME_WIDTH * dpr;
      canvas.height = GAME_HEIGHT * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    setupCanvasDpr();
    window.addEventListener('resize', setupCanvasDpr);

    let rafId = 0;
    let lastTime = performance.now();

    const loop = (now: number) => {
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const dt = Math.min(rawDt, 0.05); // clamp delta to prevent huge jumps after tab switch

      const mode = stateRef.current;
      timeRef.current += dt;

      // Update flash fade
      if (flashAlphaRef.current > 0) {
        flashAlphaRef.current = Math.max(0, flashAlphaRef.current - dt * 2.8);
      }

      // Gentle ambient cloud drift in READY / PLAYING
      if (mode === 'READY' || mode === 'PLAYING') {
        cloudsRef.current.forEach((c) => {
          c.x -= c.speed * dt;
          if (c.x < -70) {
            c.x = GAME_WIDTH + 70;
            c.y = 54 + Math.random() * 145;
          }
        });
      }

      const currentSpeed = Math.min(BASE_PIPE_SPEED + scoreRef.current * 1.4, 240);

      if (mode === 'READY') {
        groundOffsetRef.current += BASE_PIPE_SPEED * 0.65 * dt;
        skylineOffsetRef.current += 18 * dt;
        const bird = birdRef.current;
        bird.y = PLAYABLE_HEIGHT * 0.45 + Math.sin(timeRef.current * 4.2) * 9;
        bird.rotation = Math.sin(timeRef.current * 4.2) * 0.06;
        bird.wingPhase += dt * 11;
      } else if (mode === 'PLAYING') {
        groundOffsetRef.current += currentSpeed * dt;
        skylineOffsetRef.current += currentSpeed * 0.16 * dt;

        // Bird physics
        const bird = birdRef.current;
        bird.vy = Math.min(MAX_FALL_SPEED, bird.vy + GRAVITY * dt);
        bird.y += bird.vy * dt;

        // Smooth pitch angle based on vertical velocity
        if (bird.vy < 0) {
          bird.rotation = Math.max(-0.46, bird.rotation - dt * 6.5);
        } else {
          const targetRot = Math.min(Math.PI / 2.2, ((bird.vy - 90) / 420) * 1.25);
          bird.rotation += (Math.max(-0.2, targetRot) - bird.rotation) * Math.min(1, dt * 8);
        }

        // Faster wing beat while ascending
        bird.wingPhase += dt * (bird.vy < 60 ? 18 : 9);

        // Ceiling clamp
        if (bird.y - BIRD_RADIUS < 0) {
          bird.y = BIRD_RADIUS;
          bird.vy = 0;
        }

        // Spawn pipes
        spawnTimerRef.current -= dt;
        if (spawnTimerRef.current <= 0) {
          const gapHeight = Math.max(MIN_PIPE_GAP, BASE_PIPE_GAP - scoreRef.current * 0.55);
          const margin = 76 + gapHeight / 2;
          const minGapY = margin;
          const maxGapY = PLAYABLE_HEIGHT - margin;
          const gapY = minGapY + Math.random() * (maxGapY - minGapY);

          pipesRef.current.push({
            x: GAME_WIDTH + 16,
            gapY,
            gapHeight,
            passed: false,
          });
          // Keep pipe horizontal cadence slightly tighter as speed scales
          const speedRatio = BASE_PIPE_SPEED / currentSpeed;
          spawnTimerRef.current = Math.max(1.12, PIPE_SPAWN_INTERVAL * speedRatio);
        }

        // Move pipes & check score / collision
        const hitRadius = BIRD_RADIUS - 3; // fair forgiving hitbox
        const nextPipes: PipePair[] = [];

        for (const pipe of pipesRef.current) {
          pipe.x -= currentSpeed * dt;

          // Score check when bird center passes pipe center
          if (!pipe.passed && pipe.x + PIPE_WIDTH / 2 < bird.x) {
            pipe.passed = true;
            scoreRef.current += 1;
            setScore(scoreRef.current);
            soundEngine.playScore();
            spawnScoreParticles(bird.x, bird.y - 16);
            floatingScoresRef.current.push({
              x: bird.x,
              y: bird.y - 24,
              text: '+1',
              alpha: 1,
              vy: -42,
            });
          }

          // Top & bottom pipe bounding boxes
          const topH = pipe.gapY - pipe.gapHeight / 2;
          const bottomY = pipe.gapY + pipe.gapHeight / 2;
          const bottomH = PLAYABLE_HEIGHT - bottomY;

          const hitTop = circleRectCollides(bird.x, bird.y, hitRadius, pipe.x, 0, PIPE_WIDTH, topH);
          const hitBottom = circleRectCollides(
            bird.x,
            bird.y,
            hitRadius,
            pipe.x,
            bottomY,
            PIPE_WIDTH,
            bottomH
          );

          if (hitTop || hitBottom) {
            triggerGameOver();
          }

          if (pipe.x + PIPE_WIDTH > -30) {
            nextPipes.push(pipe);
          }
        }
        pipesRef.current = nextPipes;

        // Ground collision
        if (bird.y + hitRadius >= PLAYABLE_HEIGHT) {
          bird.y = PLAYABLE_HEIGHT - hitRadius;
          triggerGameOver();
        }
      } else if (mode === 'GAME_OVER') {
        // Bird falls gently onto ground after collision
        const bird = birdRef.current;
        if (bird.y + (BIRD_RADIUS - 2) < PLAYABLE_HEIGHT) {
          bird.vy = Math.min(MAX_FALL_SPEED, bird.vy + GRAVITY * dt);
          bird.y = Math.min(PLAYABLE_HEIGHT - (BIRD_RADIUS - 2), bird.y + bird.vy * dt);
          bird.rotation = Math.min(Math.PI / 2, bird.rotation + dt * 5.5);
        }
      }

      // Update particles & floating scores in all non-paused states
      if (mode !== 'PAUSED') {
        particlesRef.current = particlesRef.current.filter((pt) => {
          pt.life += dt;
          pt.x += pt.vx * dt;
          pt.y += pt.vy * dt;
          pt.vy += 180 * dt;
          pt.alpha = Math.max(0, 1 - pt.life / pt.maxLife);
          return pt.life < pt.maxLife;
        });

        floatingScoresRef.current = floatingScoresRef.current.filter((fs) => {
          fs.y += fs.vy * dt;
          fs.alpha -= dt * 1.5;
          return fs.alpha > 0;
        });
      }

      renderGame({
        ctx,
        theme: themeRef.current,
        time: timeRef.current,
        groundOffset: groundOffsetRef.current,
        skylineOffset: skylineOffsetRef.current,
        clouds: cloudsRef.current,
        pipes: pipesRef.current,
        bird: birdRef.current,
        particles: particlesRef.current,
        floatingScores: floatingScoresRef.current,
        flashAlpha: flashAlphaRef.current,
        isDead: mode === 'GAME_OVER',
      });

      rafId = window.requestAnimationFrame(loop);
    };

    rafId = window.requestAnimationFrame(loop);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', setupCanvasDpr);
    };
  }, [spawnScoreParticles, triggerGameOver]);

  const medal = getMedalForScore(score);

  return (
    <div className="min-h-screen w-full bg-[#0B1320] text-slate-100 flex flex-col items-center justify-center px-4 py-4 sm:py-6 select-none">
      {/* Main container bounded cleanly for desktop & mobile */}
      <div className="w-full max-w-[460px] flex flex-col gap-3">
        {/* Compact Top Bar */}
        <header className="flex items-center justify-between gap-4 px-1">
          <div className="flex items-baseline gap-3 min-w-0">
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-white whitespace-nowrap">
              Chim Bay
            </h1>
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 whitespace-nowrap">
              <span>Kỷ lục:</span>
              <span className="font-display font-bold text-amber-300 tabular-nums">{bestScore}</span>
            </div>
          </div>

          {/* Sky Theme Segmented Selector */}
          <div
            className="flex items-center gap-1 p-1 rounded-lg bg-slate-800/90 border border-slate-700/80"
            role="group"
            aria-label="Chọn bối cảnh bầu trời"
          >
            <button
              type="button"
              onClick={() => setTheme('day')}
              aria-label="Ban ngày"
              title="Ban ngày"
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                theme === 'day'
                  ? 'bg-sky-500 text-slate-950 shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
              <span className="hidden xs:inline sm:inline">Ngày</span>
            </button>
            <button
              type="button"
              onClick={() => setTheme('sunset')}
              aria-label="Hoàng hôn"
              title="Hoàng hôn"
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                theme === 'sunset'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
            >
              <Sunset className="w-3.5 h-3.5" />
              <span className="hidden xs:inline sm:inline">Chiều</span>
            </button>
            <button
              type="button"
              onClick={() => setTheme('night')}
              aria-label="Ban đêm"
              title="Ban đêm"
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                theme === 'night'
                  ? 'bg-indigo-400 text-slate-950 shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
            >
              <Moon className="w-3.5 h-3.5" />
              <span className="hidden xs:inline sm:inline">Đêm</span>
            </button>
          </div>
        </header>

        {/* Game Viewport Stage */}
        <div
          className="relative w-full aspect-[420/620] max-h-[calc(100vh-145px)] mx-auto rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/15 bg-sky-300 touch-manipulation cursor-pointer"
          onPointerDown={(e) => {
            if (e.button !== 0 && e.pointerType === 'mouse') return;
            flap();
          }}
        >
          <canvas
            ref={canvasRef}
            className="block w-full h-full"
            aria-label="Khung trò chơi Chim Bay"
          />

          {/* Top In-Stage Controls & Score */}
          <div className="absolute inset-x-0 top-0 p-4 flex items-start justify-between pointer-events-none">
            {/* Live Score Display */}
            <div className="flex-1 flex justify-center pl-16">
              {gameState !== 'READY' && (
                <div
                  className="font-display text-5xl font-extrabold text-white tabular-nums tracking-tight drop-shadow-[0_3px_0_rgba(15,23,42,0.85)]"
                  style={{ WebkitTextStroke: '2px rgba(15, 23, 42, 0.85)' }}
                >
                  {score}
                </div>
              )}
            </div>

            {/* Utility Controls (Sound + Pause) */}
            <div
              className="flex items-center gap-2 pointer-events-auto"
              onPointerDown={(e) => e.stopPropagation()}
            >
              {(gameState === 'PLAYING' || gameState === 'PAUSED') && (
                <button
                  type="button"
                  onClick={togglePause}
                  aria-label={gameState === 'PAUSED' ? 'Tiếp tục' : 'Tạm dừng'}
                  title={gameState === 'PAUSED' ? 'Tiếp tục (P)' : 'Tạm dừng (P)'}
                  className="w-10 h-10 rounded-xl bg-slate-900/55 hover:bg-slate-900/75 text-white backdrop-blur-xs border border-white/15 flex items-center justify-center transition-colors cursor-pointer"
                >
                  {gameState === 'PAUSED' ? (
                    <Play className="w-4 h-4 fill-current" />
                  ) : (
                    <Pause className="w-4 h-4 fill-current" />
                  )}
                </button>
              )}

              <button
                type="button"
                onClick={() => setMuted((prev) => !prev)}
                aria-label={muted ? 'Bật âm thanh' : 'Tắt âm thanh'}
                title={muted ? 'Bật âm thanh (M)' : 'Tắt âm thanh (M)'}
                className="w-10 h-10 rounded-xl bg-slate-900/55 hover:bg-slate-900/75 text-white backdrop-blur-xs border border-white/15 flex items-center justify-center transition-colors cursor-pointer"
              >
                {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* READY / TITLE OVERLAY */}
          {gameState === 'READY' && (
            <div className="absolute inset-0 flex flex-col items-center justify-between py-12 px-6 pointer-events-none">
              <div className="text-center mt-2">
                <h2
                  className="font-display text-5xl font-extrabold text-white tracking-tight drop-shadow-[0_4px_0_rgba(15,23,42,0.8)]"
                  style={{ WebkitTextStroke: '2px rgba(15, 23, 42, 0.85)' }}
                >
                  Chim Bay
                </h2>
                <p className="mt-2 text-sm font-semibold text-slate-900 bg-white/80 backdrop-blur-xs px-3.5 py-1.5 rounded-lg inline-block shadow-sm">
                  Bay qua các ống nước mà không va chạm
                </p>
              </div>

              <div className="flex flex-col items-center gap-3 mb-14 pointer-events-auto">
                <button
                  type="button"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    flap();
                  }}
                  className="px-7 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 active:translate-y-0.5 text-slate-950 font-display font-bold text-lg shadow-[0_4px_0_#b45309] transition-all cursor-pointer whitespace-nowrap"
                >
                  Bắt đầu chơi
                </button>
                <p className="text-xs font-semibold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]">
                  Nhấn Space, Mũi tên lên hoặc Chạm để vỗ cánh
                </p>
              </div>
            </div>
          )}

          {/* PAUSED OVERLAY */}
          {gameState === 'PAUSED' && (
            <div
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-6"
              onPointerDown={(e) => e.stopPropagation()}
            >
              <div className="w-full max-w-[280px] rounded-2xl bg-slate-900 border border-slate-700/90 p-6 text-center shadow-2xl">
                <h2 className="font-display text-2xl font-bold text-white">Tạm dừng</h2>
                <p className="mt-1.5 text-sm text-slate-400">
                  Điểm hiện tại: <span className="font-semibold text-white tabular-nums">{score}</span>
                </p>

                <div className="mt-5 flex flex-col gap-2.5">
                  <button
                    type="button"
                    onClick={togglePause}
                    className="w-full py-2.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Tiếp tục</span>
                  </button>
                  <button
                    type="button"
                    onClick={resetToReady}
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Chơi lại từ đầu</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* GAME OVER SCORECARD OVERLAY */}
          {gameState === 'GAME_OVER' && (
            <div
              className="absolute inset-0 bg-slate-950/55 backdrop-blur-[2px] flex items-center justify-center p-5"
              onPointerDown={(e) => e.stopPropagation()}
            >
              <div className="w-full max-w-[310px] rounded-2xl bg-[#FFFDF7] text-slate-900 border-2 border-slate-900 p-6 shadow-[0_8px_0_rgba(15,23,42,0.9)]">
                <div className="text-center">
                  <h2 className="font-display text-3xl font-extrabold text-slate-900 tracking-tight">
                    Kết thúc
                  </h2>
                  {isNewRecord && (
                    <p className="mt-1 text-xs font-bold text-amber-600">
                      Kỷ lục mới!
                    </p>
                  )}
                </div>

                {/* Medal + Score Split */}
                <div className="mt-5 grid grid-cols-2 gap-4 items-center py-4 border-y border-slate-200">
                  {/* Medal Display */}
                  <div className="flex flex-col items-center justify-center gap-1.5">
                    <span className="text-xs font-medium text-slate-500">Huy chương</span>
                    <div className="w-14 h-14 flex items-center justify-center">
                      <svg
                        viewBox="0 0 64 64"
                        className="w-14 h-14 drop-shadow-sm"
                        aria-label={`Huy chương ${medal.label}`}
                      >
                        {/* Ribbon */}
                        <path d="M22 6h8l4 14h-8z" fill="#EF4444" stroke="#1E293B" strokeWidth="2.5" />
                        <path d="M42 6h-8l-4 14h8z" fill="#DC2626" stroke="#1E293B" strokeWidth="2.5" />
                        {/* Coin */}
                        <circle
                          cx="32"
                          cy="38"
                          r="20"
                          fill={medal.fill}
                          stroke={medal.stroke}
                          strokeWidth="3"
                        />
                        <circle
                          cx="32"
                          cy="38"
                          r="14"
                          fill="none"
                          stroke={medal.shine}
                          strokeWidth="2"
                          strokeDasharray={medal.id === 'none' ? '4 4' : undefined}
                        />
                        {medal.id !== 'none' && (
                          <path
                            d="M32 28l2.8 5.6 6.2.9-4.5 4.4 1.1 6.2-5.6-2.9-5.6 2.9 1.1-6.2-4.5-4.4 6.2-.9z"
                            fill={medal.shine}
                          />
                        )}
                      </svg>
                    </div>
                    <span className="text-xs font-semibold text-slate-700">{medal.label}</span>
                  </div>

                  {/* Score & Best */}
                  <div className="flex flex-col gap-3 text-right pr-1">
                    <div>
                      <div className="text-xs font-medium text-slate-500">Điểm</div>
                      <div className="font-display text-3xl font-extrabold text-slate-900 tabular-nums leading-tight">
                        {score}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-medium text-slate-500">Cao nhất</div>
                      <div className="font-display text-2xl font-bold text-amber-600 tabular-nums leading-tight">
                        {bestScore}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={resetToReady}
                    className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:translate-y-0.5 text-slate-950 font-display font-bold text-base shadow-[0_3px_0_#15803d] flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Chơi lại</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Clean Unboxed Footer Instructions */}
        <footer className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span>Space / Chuột / Chạm: Bay</span>
            <span aria-hidden="true">·</span>
            <span>P: Tạm dừng</span>
            <span aria-hidden="true">·</span>
            <span>M: Âm thanh</span>
          </div>
          <div className="sm:hidden flex items-center gap-1.5">
            <span>Kỷ lục:</span>
            <span className="font-display font-bold text-amber-300 tabular-nums">{bestScore}</span>
          </div>
        </footer>
      </div>
    </div>
  );
};
