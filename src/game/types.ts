export type GameState = 'READY' | 'PLAYING' | 'PAUSED' | 'GAME_OVER';

export type SkyTheme = 'day' | 'sunset' | 'night';

export interface BirdState {
  x: number;
  y: number;
  vy: number;
  rotation: number;
  wingPhase: number;
}

export interface PipePair {
  x: number;
  gapY: number;
  gapHeight: number;
  passed: boolean;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  color: string;
  life: number;
  maxLife: number;
}

export interface FloatingScore {
  x: number;
  y: number;
  text: string;
  alpha: number;
  vy: number;
}

export interface Cloud {
  x: number;
  y: number;
  scale: number;
  speed: number;
}

export interface MedalInfo {
  id: 'bronze' | 'silver' | 'gold' | 'platinum' | 'none';
  label: string;
  fill: string;
  stroke: string;
  shine: string;
}

export const GAME_WIDTH = 420;
export const GAME_HEIGHT = 620;
export const GROUND_HEIGHT = 96;
export const PLAYABLE_HEIGHT = GAME_HEIGHT - GROUND_HEIGHT;

export const BIRD_X = 112;
export const BIRD_RADIUS = 16;

// Physics tuned in units per second (60fps normalized feel)
export const GRAVITY = 1520;
export const FLAP_VELOCITY = -455;
export const MAX_FALL_SPEED = 620;

export const PIPE_WIDTH = 66;
export const PIPE_CAP_HEIGHT = 26;
export const PIPE_CAP_OVERHANG = 5;
export const BASE_PIPE_SPEED = 175;
export const BASE_PIPE_GAP = 148;
export const MIN_PIPE_GAP = 122;
export const PIPE_SPAWN_INTERVAL = 1.48; // seconds

export function getMedalForScore(score: number): MedalInfo {
  if (score >= 50) {
    return {
      id: 'platinum',
      label: 'Bạch Kim',
      fill: '#E2E8F0',
      stroke: '#64748B',
      shine: '#FFFFFF',
    };
  }
  if (score >= 30) {
    return {
      id: 'gold',
      label: 'Vàng',
      fill: '#FACC15',
      stroke: '#CA8A04',
      shine: '#FEF08A',
    };
  }
  if (score >= 15) {
    return {
      id: 'silver',
      label: 'Bạc',
      fill: '#CBD5E1',
      stroke: '#64748B',
      shine: '#F8FAFC',
    };
  }
  if (score >= 5) {
    return {
      id: 'bronze',
      label: 'Đồng',
      fill: '#D97706',
      stroke: '#92400E',
      shine: '#FCD34D',
    };
  }
  return {
    id: 'none',
    label: 'Chưa có',
    fill: '#334155',
    stroke: '#475569',
    shine: '#64748B',
  };
}
