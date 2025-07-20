import RecordButton from './record';

export default class BetaFeaturesToggle {
  constructor(menu, renderer) {
    const features = [new RecordButton(renderer)];
    this.elm = menu.menu.querySelector('.menu-beta-features input');
    menu.addChangeListener((config) => {
      if ('enableBetaFeatures' in config)
        this.elm.checked = config.enableBetaFeatures;
      else
        config.enableBetaFeatures = this.elm.checked;
    });
    const onChange = (evt) => {
      const enabled = this.elm.checked;
      menu.submittedConfig.enableBetaFeatures = enabled;
      menu.persist();
      for (let i = 0; i < features.length; i++) {
        const feature = features[i];
        if (enabled)
          feature.enable();
        else
          feature.disable();
      }
    };
    this.elm.addEventListener('change', onChange);
    // Give the app time to load the initial config
    window.setTimeout(onChange, 0);
  }
}
