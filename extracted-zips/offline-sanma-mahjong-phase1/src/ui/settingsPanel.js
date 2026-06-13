(function attachSettingsPanel(global) {
  const Sanma = global.Sanma = global.Sanma || {};
  const RuleConfig = Sanma.RuleConfig;

  function renderSettings(root, currentConfig) {
    root.innerHTML = "";
    RuleConfig.normalSettings.forEach((setting) => {
      const field = document.createElement("label");
      field.className = "setting-field";
      const text = document.createElement("span");
      text.className = "setting-label";
      text.textContent = setting.label;
      field.appendChild(text);

      let input;
      if (setting.type === "select") {
        input = document.createElement("select");
        setting.options.forEach((option) => {
          const item = document.createElement("option");
          item.value = option.value;
          item.textContent = option.label;
          item.selected = currentConfig[setting.key] === option.value;
          input.appendChild(item);
        });
      } else {
        input = document.createElement("input");
        input.type = "checkbox";
        input.checked = Boolean(currentConfig[setting.key]);
      }
      input.dataset.settingKey = setting.key;
      field.appendChild(input);

      if (setting.help) {
        const help = document.createElement("small");
        help.textContent = setting.help;
        field.appendChild(help);
      }

      root.appendChild(field);
    });
  }

  function readSettings(root, baseConfig) {
    const next = Object.assign({}, baseConfig);
    root.querySelectorAll("[data-setting-key]").forEach((input) => {
      const key = input.dataset.settingKey;
      if (input.type === "checkbox") {
        next[key] = input.checked;
      } else {
        next[key] = input.value;
      }
    });
    return RuleConfig.createRuleConfig(next);
  }

  Sanma.SettingsPanel = { renderSettings, readSettings };
})(window);
