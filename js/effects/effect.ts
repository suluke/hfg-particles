export type EffectConfig = Record<string, any>;

export type EffectRegistrationParams = {
  instance: any;
  props: any;
  uniforms: any;
  vertexShader: string;
  fragmentShader: string;
  attributes?: any;
  varyings?: any;
};

/**
 * Base class for config UIs
 */
export abstract class ConfigUI {
  abstract getElement(): HTMLElement;

  abstract getConfig(): EffectConfig;

  getConfigAsync(): Promise<EffectConfig> {
    return new Promise((resolve) => {
      resolve(this.getConfig());
    });
  }

  abstract applyConfig(config: EffectConfig): void;

  notifyChange(): void {
    // TODO
  }
}

/**
 * Base class for effects
 */
export default abstract class Effect {
  static register(instance: any, props: any, uniforms: any, vertexShader: string, fragmentShader: string, attributes?: any, varyings?: any): void {
    throw new Error('Method not implemented');
  }

  static registerAsync(instance: any, props: any, uniforms: any, vertexShader: string, fragmentShader: string, attributes?: any, varyings?: any): Promise<void> {
    this.register(instance, props, uniforms, vertexShader, fragmentShader, attributes, varyings);
    return Promise.resolve();
  }

  static getId(): string {
    // Static + this = JS <3
    return this.name;
  }

  static getDisplayName(): string {
    throw new Error('Method not implemented');
  }

  static getConfigUI(): ConfigUI {
    throw new Error('Method not implemented');
  }

  static getDefaultConfig(): EffectConfig {
    throw new Error('Method not implemented');
  }

  static getRandomConfig(): EffectConfig {
    throw new Error('Method not implemented');
  }

  static getDescription(): string {
    throw new Error('Method not implemented');
  }

  static supportsRepetition(): boolean {
    return true;
  }

  static isEventOnly(): boolean {
    return false;
  }
}

export function fract(x: number): number {
  return x - Math.floor(x);
}
