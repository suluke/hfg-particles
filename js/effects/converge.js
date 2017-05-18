import Effect, {fract} from './effect';

export default class ConvergeEffect extends Effect {
  insertIntoVertexShader(vertexShader, ctx) {
    if (ctx.state.convergeEnable) {
      vertexShader.uniforms += `
        uniform float convergeTime;
        uniform float convergeSpeed;
        uniform float convergeRotationSpeed;
        uniform float convergeMaxTravelTime;
      `;
      vertexShader.mainBody += `
        {
          vec2 screenTarget = ` + { "center": "vec2(0., 0.)", "color wheel": "getDirectionVector(hsv[0] + convergeTime * convergeRotationSpeed) * vec2(.8) * vec2(invScreenAspectRatio, 1.)" }[ctx.state.convergeTarget] + `;
          vec2 target = (invViewProjectionMatrix * vec4(screenTarget, 0, 1)).xy;

          vec2 d = target - initialPosition.xy;
          float d_len = length(d);
          
          float stop_t = sqrt(2. * d_len / convergeSpeed);

          if(convergeTime < stop_t) {
            float t = min(convergeTime, stop_t);
            position.xy += .5 * d / d_len * convergeSpeed * t * t;
          } else if(convergeTime < convergeMaxTravelTime) {
            position.xy += d;
          } else {
            float t = convergeTime - convergeMaxTravelTime;
            //position.xy += mix(d, vec2(0.), 1. - (1.-t) * (1.-t));
            //position.xy += mix(d, vec2(0.), t * t);
            position.xy += mix(d, vec2(0.), -cos(t / convergeMaxTravelTime * PI) * .5 + .5);
          }
        }
      `;
    }
  }

  insertUniforms(uniforms, ctx) {
    uniforms.convergeTime = (reglctx) => {
      const period = 2 * Math.sqrt(2 / ctx.state.convergeSpeed);
      return fract(reglctx.time / period) * period;
    };
    uniforms.convergeSpeed = () => {
      return ctx.state.convergeSpeed;
    };
    uniforms.convergeRotationSpeed = () => {
      return ctx.state.convergeRotationSpeed;
    };
    uniforms.convergeMaxTravelTime = () => {
      return Math.sqrt(2 / ctx.state.convergeSpeed);
    };
  }
}
