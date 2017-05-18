import Effect, {fract} from './effect';

export default class HueDisplaceEffect extends Effect {
  insertIntoVertexShader(vertexShader, state) {
    if (state.hueDisplaceDistance !== 0) {
      vertexShader.uniforms += `
        uniform float hueDisplaceDistance;
        uniform float hueDisplaceTime;
        uniform float hueDisplaceDirectionOffset;
        uniform float hueDisplaceScaleByValue;
      `;
      vertexShader.mainBody += `
        {
          float angle = hsv[0] + hueDisplaceDirectionOffset;
          float offset = (-cos(hueDisplaceTime) + 1.) / 2.;
          position.xy += offset * getDirectionVector(angle) * hueDisplaceDistance * (1. - hueDisplaceScaleByValue * (1. - hsv[2]));
        }
      `;
    }
  }

  insertUniforms(uniforms) {
    uniforms.hueDisplaceDistance = (ctx, props) => {
      return props.state.hueDisplaceDistance;
    };
    uniforms.hueDisplaceTime = (ctx, props) => {
      return fract(ctx.time / props.state.hueDisplacePeriod) * 2 * Math.PI;
    };
    uniforms.hueDisplaceDirectionOffset = (ctx, props) => {
      let result = props.state.hueDisplaceRotate * fract(ctx.time / props.state.hueDisplacePeriod) * 2 * Math.PI;
      if (props.state.hueDisplaceRandomDirectionOffset) {
        // TODO It's really ugly that this effect writes into the global state
        if (props.state.hueDisplaceRandomDirectionOffsetValue === undefined
          || Math.floor(props.oldTime / props.state.hueDisplacePeriod)
          !== Math.floor(props.currentTime / props.state.hueDisplacePeriod)
        ) {
          props.state.hueDisplaceRandomDirectionOffsetValue = Math.random() * 2 * Math.PI;
        }
        result += props.state.hueDisplaceRandomDirectionOffsetValue;
      }

      return result;
    };
    uniforms.hueDisplaceScaleByValue = (ctx, props) => {
      return props.state.hueDisplaceScaleByValue;
    };
  }
}
