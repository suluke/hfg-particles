export type ImageScaling = 'crop-to-viewport' | 'fit-image' | 'fit-width' | 'fit-height' | 'scale-to-viewport';
export type CropDirection = 'crop-both' | 'crop-left' | 'crop-right' | 'crop-top' | 'crop-bottom';
export type ParticleShape = 'circle' | 'square';
export type ParticleFading = 'none' | 'fade-in' | 'fade-out' | 'fade-in-out';
export type ParticleOverlap = 'alpha blend' | 'additive' | 'multiply';

export type AppConfig = {
  schemaVersion: number;
  backgroundColor: [number, number, number, number];
  xParticlesCount: number;
  yParticlesCount: number;
  defaultImageScaling: ImageScaling;
  defaultImageCropping: {
    x: CropDirection;
    y: CropDirection;
  };
  particleScaling: number;
  particleShape: ParticleShape;
  particleFading: ParticleFading;
  particleOverlap: ParticleOverlap;
  effects: any[][]; // TODO: Type this properly
  duration: number;
};

export function create(): AppConfig {
  return {
    schemaVersion: 0,
    backgroundColor: [0, 0, 0, 1],
    xParticlesCount: 200,
    yParticlesCount: 125,
    defaultImageScaling: 'crop-to-viewport',
    defaultImageCropping: {
      x: 'crop-both',
      y: 'crop-both'
    },
    particleScaling: 1,
    particleShape: 'circle',
    particleFading: 'none',
    particleOverlap: 'alpha blend',
    effects: [],
    duration: 10000
  };
}