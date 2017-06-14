import Effect from './effect';
import { FullscreenRectCommand } from '../regl-utils'

export class AccumulationCommand extends FullscreenRectCommand {
  constructor() {
    super();
    this.uniforms = {
      texture: (ctx, props) => props.accumulationReadFramebuffer.texture
    };
    this.framebuffer = (ctx, props) => props.accumulationWriteFramebuffer.framebuffer;
  }
}

class AccumulationPass {
  constructor(isActive, render) {
    this.isActive = isActive;
    this.render = render;
  }
}

export default class AccumulationEffect extends Effect {
  static getEffectStepClass() {
    throw new Error('Not implemented');
  }

  static register(instance, props) {
    const regl = props.state.regl;
    const StepClass = this.getEffectStepClass();
    const stepCommand = regl(new StepClass());

    props.state.pipeline.addAccumulationPass(new AccumulationPass(
      () => {
        const time = props.clock.getTime();
        return instance.timeBegin <= time && time <= instance.timeEnd;
      },
      (props) => {
        stepCommand(props);
      }
    ));
  }
}
