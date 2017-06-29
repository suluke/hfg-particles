import { Framebuffer, FullscreenRectCommand, Shader, Uniforms } from '../regl-utils';

class PaintResultCommand extends FullscreenRectCommand {
  constructor(getResult) {
    super();
    this.frag = `
      precision highp float;
      uniform sampler2D resultTexture;
      varying vec2 texcoord;
      void main() {
        vec3 color = texture2D(resultTexture, texcoord).rgb;
        gl_FragColor = vec4(color, 1);
      }
    `;
    this.uniforms = {
      resultTexture: () => getResult().texture,
    };
  }
}

class AccumulationCommand extends FullscreenRectCommand {
  constructor(getParticles, getHistory, getOutput, agents) {
    super();
    this.uniforms = {};
    const frag = new Shader();
    const stdUniforms = new Uniforms();
    stdUniforms.addUniform('particleTexture', 'sampler2D', () => getParticles().texture);
    stdUniforms.addUniform('historyTexture', 'sampler2D', () => getHistory().texture);
    stdUniforms.addUniform('globalTime', 'int', (ctx, props) => props.clock.getTime());
    stdUniforms.compile(frag, this.uniforms);
    frag.varyings += 'varying vec2 texcoord;\n'
    frag.mainBody = `
      vec3 historyColor = texture2D(historyTexture, texcoord).rgb;
      vec3 particleColor = texture2D(particleTexture, texcoord).rgb;
      vec3 accumulationResult = vec3(0.0);
      int activeAgents = 0;

      ${AccumulationCommand.fragmentCodeForAgents(agents, frag, this.uniforms)}

      if (activeAgents > 0) {
        accumulationResult /= float(activeAgents);
      } else {
        accumulationResult = particleColor;
      }

      gl_FragColor = vec4(accumulationResult, 1);
    `;
    this.frag = frag.compile();
    this.framebuffer = () => getOutput().framebuffer;
  }
  static fragmentCodeForAgents(agents, shader, uniforms) {
    const code = [];

    for (let i = 0; i < agents.length; i++) {
      const agent = agents[i];
      const agentUniforms = new Uniforms(i);
      const fadeWeightUniform = agentUniforms.addUniform('fadeWeight', 'float', (ctx, props) => {
        const timeBegin = agent.instance.timeBegin;
        const timeEnd = agent.instance.timeEnd;
        const fadein = agent.instance.config.fadein;
        const fadeout = agent.instance.config.fadeout;
        const t = props.clock.getTime();
        // t in [timeBegin, timeEnd] (guranteed by if below)
        return t < (timeBegin + fadein) ? (t - timeBegin) / fadein :
          t > (timeEnd - fadeout) ? 1 - (t - (timeEnd - fadeout)) / fadeout :
          1;
      });
      code.push(`
        if (${agent.instance.timeBegin} <= globalTime && globalTime <= ${agent.instance.timeEnd}) {
          activeAgents++;
          vec3 accumulationEffectResult;
          ${agent.getFragmentCode(agentUniforms)}
          accumulationResult += mix(particleColor, accumulationEffectResult, ${fadeWeightUniform});
        }
      `);
      agentUniforms.compile(shader, uniforms);
    }
    return code.join('\n');
  }
}

export default class RendererPipeline {
  constructor(regl) {
    this.regl = regl;
    this.mainCommand = null;
    this.accumulationAgents = [];
    this.particleBuffer = new Framebuffer(this.regl);
    this.accuHistoryBuffer = new Framebuffer(this.regl);
    this.resultBuffer = new Framebuffer(this.regl);
    const getResult = () => this.resultBuffer;
    this.accumulationCommand = null;
    this.paintResultCommand = this.regl(new PaintResultCommand(getResult));
  }
  addAccumulationAgent(agent) {
    this.accumulationAgents.push(agent);
  }
  compile(cmd) {
    this.mainCommand = cmd;
    const getParticles = () => this.particleBuffer;
    const getHistory = () => this.accuHistoryBuffer;
    const getOut = () => this.resultBuffer;
    this.accumulationCommand = this.regl(
      new AccumulationCommand(getParticles, getHistory, getOut, this.accumulationAgents)
    );
  }
  reset(clearColor) {
    this.accumulationAgents.length = 0;
    this.mainCommand = null;
    this.clearColor = clearColor;
  }
  resize(width, height) {
    this.particleBuffer.resize(width, height);
    this.accuHistoryBuffer.resize(width, height);
    this.resultBuffer.resize(width, height);
  }
  run(props) {
    if (!this.mainCommand) {
      return;
    }
    if (this.accumulationAgents.length === 0 || props.clock.getPaused()) {
      this.regl.clear({ color: this.clearColor });
      this.mainCommand(props);
    } else { // Accumulation is active
      // Do NOT change the buffers AFTER paintResultCommand, because if we
      // pause at some point, the other if() branch above will have the
      // two buffers alrady swapped - which we don't want. resultBuffer
      // should still be resultBuffer
      [this.accuHistoryBuffer, this.resultBuffer] = [this.resultBuffer, this.accuHistoryBuffer];
      this.particleBuffer.framebuffer.use(() => {
        this.regl.clear({color: this.clearColor});
        this.mainCommand(props);
      });

      this.accumulationCommand(props);
      this.paintResultCommand(props);
    }
  }
  isValid() {
    return this.mainCommand !== null;
  }
}
