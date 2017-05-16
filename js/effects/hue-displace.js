import Effect, {fract} from './effect';

export default class HueDisplaceEffect extends Effect {
  insertIntoVertexShader(vertexShader, ctx) {
    if (ctx.state.hueDisplaceDistance !== 0) {
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

  insertUniforms(uniforms, ctx) {
    uniforms.hueDisplaceDistance = () => {
      return ctx.state.hueDisplaceDistance;
    };
    uniforms.hueDisplaceTime = (reglctx) => {
      return fract(reglctx.time / ctx.state.hueDisplacePeriod) * 2 * Math.PI;
    };
    uniforms.hueDisplaceDirectionOffset = (reglctx) => {
      let result = ctx.state.hueDisplaceRotate * fract(reglctx.time / ctx.state.hueDisplacePeriod) * 2 * Math.PI;
      if (ctx.state.hueDisplaceRandomDirectionOffset) {
        if (ctx.hueDisplaceRandomDirectionOffsetValue === undefined
          || Math.floor(ctx.renderer.oldTime / ctx.state.hueDisplacePeriod)
          !== Math.floor(ctx.renderer.currentTime / ctx.state.hueDisplacePeriod)
        ) {
          ctx.hueDisplaceRandomDirectionOffsetValue = Math.random() * 2 * Math.PI;
        }
        result += ctx.hueDisplaceRandomDirectionOffsetValue;
      }

      return result;
    };
    uniforms.hueDisplaceScaleByValue = () => {
      return ctx.state.hueDisplaceScaleByValue;
    };
  }
}
