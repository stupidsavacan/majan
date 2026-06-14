(function attachSanmaRuleDetails(global) {
  const Sanma = global.Sanma = global.Sanma || {};

  function rulesFor(ruleConfig) {
    return (ruleConfig && ruleConfig.advancedRules && ruleConfig.advancedRules.sanma) || {};
  }

  function isManzuSequenceAllowed() {
    return false;
  }

  function canRonOnKita(ruleConfig) {
    return rulesFor(ruleConfig).ronOnKitaPolicy === "allow";
  }

  function canExtractKita(ruleConfig) {
    return rulesFor(ruleConfig).kita !== false && ruleConfig && ruleConfig.northMode === "kita-dora";
  }

  function shouldDrawKitaReplacement(ruleConfig) {
    return rulesFor(ruleConfig).kitaDrawReplacement !== false;
  }

  Sanma.SanmaRuleDetails = {
    isManzuSequenceAllowed,
    canRonOnKita,
    canExtractKita,
    shouldDrawKitaReplacement,
  };
})(window);
