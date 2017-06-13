import Effect, { ConfigUI, fract } from './effect';
import { Framebuffer, FullscreenRectCommand } from '../regl-utils';

export default class AccumulationEffect extends Effect {
  static getEffectStepClass() {
    throw new Error('Not implemented');
  }

  static register(instance, props) {
    const regl = props.state.regl;
    const StepClass = this.getEffectStepClass();
    const stepCommand = regl(new StepClass());

    props.state.pipeline.addAccumulationPass((props) => {
      //const time = props.clock.getTime();
      //if (instance.timeBegin <= time && time <= instance.timeEnd) {
        stepCommand(props);
      //}
    });
  }
}
