import Effect from './effect';
import { FullscreenRectCommand } from '../regl-utils'

export class AccumulationAgent {
  constructor(instance) {
    this.timeBegin = instance.timeBegin;
    this.timeEnd = instance.timeEnd;
  }
  getFragmentCode() {
    throw new Error('Not implemented');
  }
}

export default class AccumulationEffect extends Effect {
  static getAgentClass(/* instance */) {
    throw new Error('Not implemented');
  }

  static register(instance, props) {
    const AgentClass = this.getAgentClass();
    const agent = new AgentClass(instance);
    props.state.pipeline.addAccumulationAgent(agent);
  }
}
