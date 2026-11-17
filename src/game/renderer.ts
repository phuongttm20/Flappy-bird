import {
  BirdState,
  Cloud,
  FloatingScore,
  GAME_HEIGHT,
  GAME_WIDTH,
  GROUND_HEIGHT,
  PIPE_CAP_HEIGHT,
  PIPE_CAP_OVERHANG,
  PIPE_WIDTH,
  PLAYABLE_HEIGHT,
  Particle,
  PipePair,
  SkyTheme,
} from './types';

interface ThemePalette {
  skyTop: string;
  skyMid: string;
  skyBottom: string;
  celestialColor: string;
  celestialGlow: string;
  cloudColor: string;
  cloudShadow: string;
  cityColor: string;
  cityWindows: string;
  hillsBack: string;
  hillsFront: string;
  pipeLight: string;
  pipeMid: string;
  pipeDark: string;
  pipeOutline: string;
  grassTop: string;
  grassHighlight: string;
  groundBase: string;
  groundStripe: string;
  groundBorder: string;
  starsAlpha: number;
}

const PALETTES: Record<SkyTheme, ThemePalette> = {
  day: {
    skyTop: '#38BDF8',
    skyMid: '#7DD3FC',
    skyBottom: '#E0F2FE',
    celestialColor: '#FEF08A',
    celestialGlow: 'rgba(254, 240, 138, 0.35)',
    cloudColor: '#FFFFFF',
    cloudShadow: '#E0F2FE',
    cityColor: '#93C5FD',
    cityWindows: 'rgba(255, 255, 255, 0.35)',
    hillsBack: '#86EFAC',
    hillsFront: '#4ADE80',
    pipeLight: '#86EFAC',
    pipeMid: '#22C55E',
    pipeDark: '#15803D',
    pipeOutline: '#14532D',
    grassTop: '#22C55E',
    grassHighlight: '#4ADE80',
    groundBase: '#E7C98F',
    groundStripe: '#D6B372',
    groundBorder: '#166534',
    starsAlpha: 0,
  },
  sunset: {
    skyTop: '#312E81',
    skyMid: '#EA580C',
    skyBottom: '#FDE68A',
    celestialColor: '#FDBA74',
    celestialGlow: 'rgba(251, 146, 60, 0.38)',
    cloudColor: '#FFEDD5',
    cloudShadow: '#FDBA74',
    cityColor: '#7C2D12',
    cityWindows: 'rgba(253, 224, 71, 0.35)',
    hillsBack: '#9A3412',
    hillsFront: '#431407',
    pipeLight: '#6EE7B7',
    pipeMid: '#10B981',
    pipeDark: '#047857',
    pipeOutline: '#064E3B',
    grassTop: '#16A34A',
    grassHighlight: '#4ADE80',
    groundBase: '#D6B178',
    groundStripe: '#BE965B',
    groundBorder: '#14532D',
    starsAlpha: 0.3,
  },
  night: {
    skyTop: '#020617',
    skyMid: '#0F172A',
    skyBottom: '#1E293B',
    celestialColor: '#F8FAFC',
    celestialGlow: 'rgba(226, 232, 240, 0.22)',
    cloudColor: '#334155',
    cloudShadow: '#1E293B',
    cityColor: '#1E293B',
    cityWindows: 'rgba(250, 204, 21, 0.45)',
    hillsBack: '#0F2922',
    hillsFront: '#143D32',
    pipeLight: '#34D399',
    pipeMid: '#059669',
    pipeDark: '#065F46',
    pipeOutline: '#022C22',
    grassTop: '#15803D',
    grassHighlight: '#22C55E',
    groundBase: '#927B58',
    groundStripe: '#7C6645',
    groundBorder: '#064E3B',
    starsAlpha: 0.9,
  },
};

const STARS = [
  { x: 42, y: 58, r: 1.4, phase: 0.2 },
  { x: 96, y: 110, r: 1.1, phase: 1.1 },
  { x: 148, y: 44, r: 1.7, phase: 2.3 },
  { x: 205, y: 88, r: 1.2, phase: 0.7 },
  { x: 268, y: 52, r: 1.5, phase: 1.9 },
  { x: 328, y: 118, r: 1.2, phase: 2.8 },
  { x: 376, y: 66, r: 1.6, phase: 0.4 },
  { x: 64, y: 165, r: 1.0, phase: 1.5 },
  { x: 175, y: 148, r: 1.3, phase: 2.1 },
  { x: 294, y: 158, r: 1.1, phase: 0.9 },
  { x: 392, y: 142, r: 1.4, phase: 1.7 },
];

const SKYLINE_BUILDINGS = [
  { w: 34, h: 86 },
  { w: 24, h: 58 },
  { w: 42, h: 112 },
  { w: 28, h: 72 },
  { w: 38, h: 95 },
  { w: 26, h: 64 },
  { w: 46, h: 120 },
  { w: 30, h: 78 },
  { w: 36, h: 90 },
  { w: 28, h: 60 },
];

export interface RenderParams {
  ctx: CanvasRenderingContext2D;
  theme: SkyTheme;
  time: number;
  groundOffset: number;
  skylineOffset: number;
  clouds: Cloud[];
  pipes: PipePair[];
  bird: BirdState;
  particles: Particle[];
  floatingScores: FloatingScore[];
  flashAlpha: number;
  isDead: boolean;
}

export function renderGame({
  ctx,
  theme,
  time,
  groundOffset,
  skylineOffset,
  clouds,
  pipes,
  bird,
  particles,
  floatingScores,
  flashAlpha,
  isDead,
}: RenderParams) {
  const p = PALETTES[theme];

  // 1. Sky Gradient
  const skyGrad = ctx.createLinearGradient(0, 0, 0, PLAYABLE_HEIGHT);
  skyGrad.addColorStop(0, p.skyTop);
  skyGrad.addColorStop(0.58, p.skyMid);
  skyGrad.addColorStop(1, p.skyBottom);
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, GAME_WIDTH, PLAYABLE_HEIGHT);

  // 2. Stars (Sunset / Night)
  if (p.starsAlpha > 0) {
    STARS.forEach((star) => {
      const twinkle = 0.55 + 0.45 * Math.sin(time * 2.4 + star.phase);
      ctx.fillStyle = `rgba(255, 255, 255, ${p.starsAlpha * twinkle})`;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // 3. Sun or Moon
  const celestialX = theme === 'sunset' ? 320 : 335;
  const celestialY = theme === 'sunset' ? 235 : 92;
  const celestialRadius = theme === 'sunset' ? 40 : 28;

  ctx.fillStyle = p.celestialGlow;
  ctx.beginPath();
  ctx.arc(celestialX, celestialY, celestialRadius * 1.65, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = p.celestialColor;
  ctx.beginPath();
  ctx.arc(celestialX, celestialY, celestialRadius, 0, Math.PI * 2);
  ctx.fill();

  if (theme === 'night') {
    // Subtle moon craters
    ctx.fillStyle = 'rgba(148, 163, 184, 0.25)';
    ctx.beginPath();
    ctx.arc(celestialX - 8, celestialY - 5, 5, 0, Math.PI * 2);
    ctx.arc(celestialX + 9, celestialY + 7, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // 4. Parallax Clouds
  clouds.forEach((c) => {
    drawCloud(ctx, c.x, c.y, c.scale, p.cloudColor, p.cloudShadow);
  });

  // 5. Distant Skyline
  drawSkyline(ctx, skylineOffset, p.cityColor, p.cityWindows);

  // 6. Rolling Hills
  drawHills(ctx, skylineOffset * 1.4, p.hillsBack, 58, 0.014);
  drawHills(ctx, groundOffset * 0.45, p.hillsFront, 34, 0.019);

  // 7. Pipes
  pipes.forEach((pipe) => {
    drawPipePair(ctx, pipe, p);
  });

  // 8. Ground
  drawGround(ctx, groundOffset, p);

  // 9. Particles
  particles.forEach((pt) => {
    ctx.save();
    ctx.globalAlpha = Math.max(0, pt.alpha);
    ctx.fillStyle = pt.color;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, pt.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });

  // 10. Bird
  drawBird(ctx, bird, isDead);

  // 11. Floating "+1" Score Pops
  floatingScores.forEach((fs) => {
    ctx.save();
    ctx.globalAlpha = Math.max(0, fs.alpha);
    ctx.font = '800 20px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.strokeText(fs.text, fs.x, fs.y);
    ctx.fillStyle = '#FEF08A';
    ctx.fillText(fs.text, fs.x, fs.y);
    ctx.restore();
  });

  // 12. Collision Screen Flash
  if (flashAlpha > 0.01) {
    ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha})`;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  }
}

function drawCloud(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  fill: string,
  shadow: string
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  // Soft bottom tint
  ctx.fillStyle = shadow;
  ctx.beginPath();
  ctx.roundRect(-34, 4, 68, 16, 8);
  ctx.fill();

  // Puffy puffs
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(-16, 4, 14, 0, Math.PI * 2);
  ctx.arc(0, -4, 18, 0, Math.PI * 2);
  ctx.arc(17, 4, 13, 0, Math.PI * 2);
  ctx.roundRect(-28, 2, 56, 15, 7);
  ctx.fill();

  ctx.restore();
}

function drawSkyline(
  ctx: CanvasRenderingContext2D,
  offset: number,
  color: string,
  windowColor: string
) {
  const totalWidth = SKYLINE_BUILDINGS.reduce((acc, b) => acc + b.w + 6, 0);
  const startX = -((offset % totalWidth) + totalWidth) % totalWidth;

  for (let repeat = 0; repeat < 3; repeat++) {
    let cursorX = startX + repeat * totalWidth;
    if (cursorX > GAME_WIDTH) break;

    SKYLINE_BUILDINGS.forEach((b, idx) => {
      const bx = cursorX;
      const by = PLAYABLE_HEIGHT - b.h;
      if (bx + b.w >= 0 && bx <= GAME_WIDTH) {
        ctx.fillStyle = color;
        ctx.fillRect(bx, by, b.w, b.h);

        // Subtle lit windows
        ctx.fillStyle = windowColor;
        const cols = Math.floor((b.w - 8) / 8);
        const rows = Math.floor((b.h - 28) / 12);
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            if ((r + c + idx) % 3 !== 0) {
              ctx.fillRect(bx + 5 + c * 8, by + 8 + r * 12, 4, 6);
            }
          }
        }
      }
      cursorX += b.w + 6;
    });
  }
}

function drawHills(
  ctx: CanvasRenderingContext2D,
  offset: number,
  color: string,
  height: number,
  freq: number
) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, PLAYABLE_HEIGHT);
  for (let x = 0; x <= GAME_WIDTH + 10; x += 10) {
    const wave =
      Math.sin((x + offset) * freq) * (height * 0.42) +
      Math.cos((x + offset) * freq * 0.55) * (height * 0.25);
    const y = PLAYABLE_HEIGHT - height * 0.65 - wave;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(GAME_WIDTH, PLAYABLE_HEIGHT);
  ctx.closePath();
  ctx.fill();
}

function drawPipePair(ctx: CanvasRenderingContext2D, pipe: PipePair, p: ThemePalette) {
  const topHeight = pipe.gapY - pipe.gapHeight / 2;
  const bottomY = pipe.gapY + pipe.gapHeight / 2;
  const bottomHeight = PLAYABLE_HEIGHT - bottomY;

  // Top pipe body
  if (topHeight > 0) {
    drawPipeSegment(ctx, pipe.x, 0, PIPE_WIDTH, topHeight, 'top', p);
  }

  // Bottom pipe body
  if (bottomHeight > 0) {
    drawPipeSegment(ctx, pipe.x, bottomY, PIPE_WIDTH, bottomHeight, 'bottom', p);
  }
}

function drawPipeSegment(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  orientation: 'top' | 'bottom',
  p: ThemePalette
) {
  // Cylindrical horizontal gradient
  const grad = ctx.createLinearGradient(x, 0, x + w, 0);
  grad.addColorStop(0, p.pipeDark);
  grad.addColorStop(0.18, p.pipeLight);
  grad.addColorStop(0.42, p.pipeMid);
  grad.addColorStop(0.85, p.pipeDark);
  grad.addColorStop(1, p.pipeOutline);

  // Main shaft
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);

  // Specular highlight strip
  ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
  ctx.fillRect(x + 9, y, 7, h);

  // Shaft border
  ctx.strokeStyle = p.pipeOutline;
  ctx.lineWidth = 2.5;
  ctx.strokeRect(x, y, w, h);

  // Flared Rim Cap
  const capX = x - PIPE_CAP_OVERHANG;
  const capW = w + PIPE_CAP_OVERHANG * 2;
  const capY = orientation === 'top' ? y + h - PIPE_CAP_HEIGHT : y;

  const capGrad = ctx.createLinearGradient(capX, 0, capX + capW, 0);
  capGrad.addColorStop(0, p.pipeDark);
  capGrad.addColorStop(0.18, p.pipeLight);
  capGrad.addColorStop(0.45, p.pipeMid);
  capGrad.addColorStop(0.85, p.pipeDark);
  capGrad.addColorStop(1, p.pipeOutline);

  ctx.fillStyle = capGrad;
  ctx.beginPath();
  ctx.roundRect(capX, capY, capW, PIPE_CAP_HEIGHT, 4);
  ctx.fill();

  ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.fillRect(capX + 10, capY + 2, 8, PIPE_CAP_HEIGHT - 4);

  ctx.strokeStyle = p.pipeOutline;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.roundRect(capX, capY, capW, PIPE_CAP_HEIGHT, 4);
  ctx.stroke();
}

function drawGround(ctx: CanvasRenderingContext2D, groundOffset: number, p: ThemePalette) {
  const groundY = PLAYABLE_HEIGHT;

  // Base soil
  ctx.fillStyle = p.groundBase;
  ctx.fillRect(0, groundY, GAME_WIDTH, GROUND_HEIGHT);

  // Grass top strip
  const grassH = 20;
  ctx.fillStyle = p.grassTop;
  ctx.fillRect(0, groundY, GAME_WIDTH, grassH);

  // Scrolling diagonal grass chevrons
  const stripeSpacing = 28;
  const shift = ((groundOffset % stripeSpacing) + stripeSpacing) % stripeSpacing;
  ctx.fillStyle = p.grassHighlight;
  for (let x = -stripeSpacing * 2; x < GAME_WIDTH + stripeSpacing; x += stripeSpacing) {
    const sx = x - shift;
    ctx.beginPath();
    ctx.moveTo(sx, groundY + grassH);
    ctx.lineTo(sx + 12, groundY);
    ctx.lineTo(sx + 24, groundY);
    ctx.lineTo(sx + 12, groundY + grassH);
    ctx.closePath();
    ctx.fill();
  }

  // Subtle soil pattern stripes
  ctx.fillStyle = p.groundStripe;
  for (let x = -stripeSpacing * 2; x < GAME_WIDTH + stripeSpacing; x += stripeSpacing) {
    const sx = x - shift;
    ctx.fillRect(sx + 4, groundY + grassH + 14, 12, 6);
    ctx.fillRect(sx + 18, groundY + grassH + 34, 10, 5);
  }

  // Crisp top border
  ctx.fillStyle = p.groundBorder;
  ctx.fillRect(0, groundY, GAME_WIDTH, 3);
  ctx.fillRect(0, groundY + grassH - 2, GAME_WIDTH, 2);
}

function drawBird(ctx: CanvasRenderingContext2D, bird: BirdState, isDead: boolean) {
  ctx.save();
  ctx.translate(bird.x, bird.y);
  ctx.rotate(bird.rotation);

  // Subtle drop shadow
  ctx.fillStyle = 'rgba(15, 23, 42, 0.16)';
  ctx.beginPath();
  ctx.ellipse(0, 4, 18, 14, 0, 0, Math.PI * 2);
  ctx.fill();

  // Tail feathers
  ctx.fillStyle = '#D97706';
  ctx.strokeStyle = '#1E293B';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(-14, -2);
  ctx.lineTo(-22, -7);
  ctx.lineTo(-19, 1);
  ctx.lineTo(-23, 6);
  ctx.lineTo(-13, 5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Main rounded body
  const bodyGrad = ctx.createRadialGradient(-4, -5, 3, 0, 0, 20);
  bodyGrad.addColorStop(0, '#FDE047');
  bodyGrad.addColorStop(0.65, '#FACC15');
  bodyGrad.addColorStop(1, '#EAB308');
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.ellipse(0, 0, 17.5, 14.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Warm cream belly patch
  ctx.fillStyle = '#FEF9C3';
  ctx.beginPath();
  ctx.ellipse(2, 6, 11, 6.5, -0.1, 0, Math.PI);
  ctx.fill();

  // Expressive eye
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(7, -4.5, 6.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  if (isDead) {
    // Dizzy X eye when crashed
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(4.5, -7);
    ctx.lineTo(9.5, -2);
    ctx.moveTo(9.5, -7);
    ctx.lineTo(4.5, -2);
    ctx.stroke();
  } else {
    // Crisp pupil & sparkle
    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.arc(9, -4.5, 2.7, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(9.8, -5.5, 1, 0, Math.PI * 2);
    ctx.fill();
  }

  // Two-part beak
  ctx.strokeStyle = '#1E293B';
  ctx.lineWidth = 2;
  ctx.fillStyle = '#F97316';
  ctx.beginPath();
  ctx.moveTo(12, -1);
  ctx.lineTo(24, 2);
  ctx.lineTo(12, 4.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#EA580C';
  ctx.beginPath();
  ctx.moveTo(12, 4.5);
  ctx.lineTo(21, 5);
  ctx.lineTo(12, 8);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Flapping wing
  const wingOffsetY = Math.sin(bird.wingPhase) * 4.5;
  const wingTilt = Math.sin(bird.wingPhase) * 0.25;
  ctx.save();
  ctx.translate(-4, 1 + wingOffsetY * 0.45);
  ctx.rotate(wingTilt);
  ctx.fillStyle = '#FEF08A';
  ctx.strokeStyle = '#1E293B';
  ctx.lineWidth = 2.1;
  ctx.beginPath();
  ctx.ellipse(0, 0, 9.5, 6.2, -0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  ctx.restore();
}
