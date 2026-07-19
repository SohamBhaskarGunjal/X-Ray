export interface UserProfile {
  name: string;
  role: string;
  bio: string;
  linkedin: string;
  github: string;
  instagram: string;
  twitter: string;
  portfolio: string;
}

export type TrackerMode = 'particle' | 'xray';

export interface HandData {
  landmarks: { x: number; y: number; z: number }[];
  isPinching: boolean;
  pinchPoint: { x: number; y: number };
  indexTip: { x: number; y: number };
  thumbBottom: { x: number; y: number };
}
