(function attachCallFlow(global) {
  const Sanma = global.Sanma = global.Sanma || {};
  const TileUtil = Sanma.TileUtil;
  const CallWindow = Sanma.CallWindow;
  const FuritenManager = Sanma.FuritenManager;
  const RiichiRules = Sanma.RiichiRules;

  function callLabel(actionId) {
    return actionId === "pon" ? "ポン" : "チー";
  }

  function hasRiichi(player) {
    return Boolean(player && (player.hasRiichi || (player.riichi && (player.riichi.declared || player.riichi.pending))));
  }

  function failOpenCall(engine, message, metadata) {
    const options = metadata || {};
    if (message && engine && typeof engine.addLog === "function") engine.addLog(message);
    if (engine && options.emit !== false && typeof engine.emitChange === "function") engine.emitChange();
    return false;
  }

  function snapshotCallTile(engine, tile) {
    return engine && typeof engine.tileSnapshot === "function" ? engine.tileSnapshot(tile) : tile;
  }

  function validateOpenCall(engine, playerIndex, actionId, option) {
    if (!engine || !Array.isArray(engine.players)) return { ok: false, reason: "ゲーム状態が不正です。" };
    if (actionId !== "pon" && actionId !== "chi") return { ok: false, reason: "対応していない鳴きです。" };
    if (!Number.isInteger(playerIndex) || playerIndex < 0 || playerIndex >= engine.players.length) {
      return { ok: false, reason: "鳴くプレイヤーが不正です。" };
    }
    const caller = engine.players[playerIndex];
    if (!caller || !Array.isArray(caller.hand) || !Array.isArray(caller.melds)) {
      return { ok: false, reason: "鳴くプレイヤーの手牌状態が不正です。" };
    }
    if (hasRiichi(caller)) return { ok: false, reason: "リーチ後は鳴けません。" };
    if (!engine.lastDiscard || !Number.isInteger(engine.lastDiscard.playerIndex) || !engine.lastDiscard.tile) {
      return { ok: false, reason: "対象の捨て牌がありません。" };
    }
    if (!option || !option.tile || !option.tile.instanceId || !Array.isArray(option.consumeInstanceIds)) {
      return { ok: false, reason: "鳴き情報が不正です。" };
    }
    if (!Number.isInteger(option.fromPlayerIndex) || option.fromPlayerIndex !== engine.lastDiscard.playerIndex) {
      return { ok: false, reason: "鳴き元が現在の捨て牌と一致しません。" };
    }
    if (option.fromPlayerIndex === playerIndex) return { ok: false, reason: "自分の捨て牌は鳴けません。" };
    if (option.tile.instanceId !== engine.lastDiscard.tile.instanceId) {
      return { ok: false, reason: "鳴く牌が現在の捨て牌と一致しません。" };
    }

    const discarder = engine.players[option.fromPlayerIndex];
    if (!discarder || !Array.isArray(discarder.discards)) {
      return { ok: false, reason: "鳴き元の河が不正です。" };
    }
    const discardIndex = discarder.discards.findIndex((tile) => tile && tile.instanceId === option.tile.instanceId);
    if (discardIndex < 0) return { ok: false, reason: "対象の捨て牌が河にありません。" };

    const consumeInstanceIds = option.consumeInstanceIds.slice();
    if (consumeInstanceIds.length !== 2) return { ok: false, reason: "鳴きに必要な消費牌の枚数が不正です。" };
    if (new Set(consumeInstanceIds).size !== consumeInstanceIds.length) {
      return { ok: false, reason: "同じ手牌を複数回消費する鳴きはできません。" };
    }
    const consumedEntries = consumeInstanceIds.map((instanceId) => {
      const index = caller.hand.findIndex((tile) => tile && tile.instanceId === instanceId);
      return { instanceId, index, tile: index >= 0 ? caller.hand[index] : null };
    });
    if (consumedEntries.some((entry) => entry.index < 0 || !entry.tile)) {
      return { ok: false, reason: "鳴きに必要な牌を手牌から取り出せませんでした。" };
    }

    return {
      ok: true,
      caller,
      discarder,
      discardIndex,
      consumedEntries,
      fromPlayerIndex: option.fromPlayerIndex,
    };
  }

  Sanma.CallFlow = {
        applyOpenCall(playerIndex, actionId, option, metadata) {
          const options = metadata || {};
          const validation = validateOpenCall(this, playerIndex, actionId, option);
          if (!validation.ok) return failOpenCall(this, validation.reason, options);

          const caller = validation.caller;
          const discarder = validation.discarder;
          validation.consumedEntries
            .slice()
            .sort((left, right) => right.index - left.index)
            .forEach((entry) => caller.hand.splice(entry.index, 1));
          const calledTile = discarder.discards.splice(validation.discardIndex, 1)[0];
          const meldTiles = validation.consumedEntries
            .map((entry) => entry.tile)
            .concat(calledTile)
            .sort(TileUtil.compareTiles);

          caller.melds.push({
            type: actionId,
            tiles: meldTiles,
            fromPlayerIndex: validation.fromPlayerIndex,
            open: true,
          });
          caller.lastDraw = null;
          if (RiichiRules && typeof RiichiRules.clearIppatsu === "function") {
            RiichiRules.clearIppatsu(this);
          } else {
            this.players.forEach((player) => {
              player.ippatsuActive = false;
              if (player.riichi) player.riichi.ippatsu = false;
            });
          }
          this.turnIndex = playerIndex;
          this.phase = options.phase || (caller.isHuman ? "caller-discard" : "cpu-running");
          this.lastDiscard = null;
          this.callWindow = null;

          if (options.log !== false && typeof this.addLog === "function") {
            const actor = options.logPrefix || caller.name || "プレイヤー";
            const suffix = caller.isHuman ? "続けて打牌してください。" : "続けて打牌します。";
            this.addLog(`${actor}が${callLabel(actionId)}しました。${suffix}`);
          }
          if (typeof this.recordGameEvent === "function") {
            this.recordGameEvent("call", {
              playerIndex,
              playerName: caller.name,
              action: actionId,
              fromPlayerIndex: validation.fromPlayerIndex,
              tiles: meldTiles.map((tile) => snapshotCallTile(this, tile)),
              calledTile: snapshotCallTile(this, calledTile),
            });
          }
          if (options.emit !== false && typeof this.emitChange === "function") this.emitChange();
          return true;
        },

        applyCpuCall(candidate, metadata) {
          if (!candidate || !Number.isInteger(candidate.playerIndex)) return false;
          const actionId = candidate.actionId || candidate.action;
          if (actionId === "kan") {
            this.callWindow = null;
            return this.beginKanAttempt(candidate.playerIndex, candidate.option);
          }
          if (actionId !== "pon" && actionId !== "chi") return false;
          return this.applyOpenCall(candidate.playerIndex, actionId, candidate.option, metadata);
        },

        claimHumanCall(actionId, optionIndex) {
          if (actionId === "ron") return this.claimHumanRon();
          const validation = this.validateAction("鳴き", ["waitingForCall"]);
          if (!validation.ok) {
            this.emitChange();
            return false;
          }
          if (this.phase !== "human-call" || !this.callWindow) {
            this.addLog("現在は鳴けません。");
            this.emitChange();
            return false;
          }
          if (hasRiichi(this.humanPlayer)) {
            this.addLog("リーチ後は鳴けません。");
            this.emitChange();
            return false;
          }
          const action = this.callWindow.actions.find((candidate) => candidate.id === actionId);
          if (actionId !== "ron" && this.callWindow.pendingCpuRonCandidate) {
            const pending = this.callWindow.pendingCpuRonCandidate;
            this.callWindow = null;
            return this.resolveRonWin(pending.playerIndex, pending.analysis, { isCpuRon: true });
          }
          if (actionId !== "ron" && this.wall.remainingCount() <= 0) {
            const fromPlayerIndex = this.callWindow.fromPlayerIndex;
            this.callWindow = null;
            this.continueAfterDiscard(fromPlayerIndex);
            return false;
          }
          const option = action && action.options ? action.options[Number(optionIndex) || 0] : null;
          if (!action || !option) {
            this.addLog("選択した鳴きは利用できません。");
            this.emitChange();
            return false;
          }
          if (actionId === "kan") {
            if (FuritenManager && this.callWindow.actions.some((candidate) => candidate.id === "ron")) {
              FuritenManager.markMissedRon(this, this.humanPlayer.id);
            }
            return this.applyHumanKan(option);
          }
          if (actionId !== "pon" && actionId !== "chi") return false;
          if (FuritenManager && this.callWindow.actions.some((candidate) => candidate.id === "ron")) {
            FuritenManager.markMissedRon(this, this.humanPlayer.id);
          }
          return this.applyOpenCall(this.humanPlayer.id, actionId, option, {
            phase: "caller-discard",
            logPrefix: this.humanPlayer.name || "あなた",
          });
        },

        skipHumanCall() {
          const validation = this.validateAction("鳴きスキップ", ["waitingForCall"]);
          if (!validation.ok) {
            this.emitChange();
            return false;
          }
          if (this.phase !== "human-call" || !this.callWindow) return false;
          const discarderIndex = this.callWindow.fromPlayerIndex;
          const pendingCpuRonCandidate = this.callWindow.pendingCpuRonCandidate || null;
          if (FuritenManager && this.callWindow.actions.some((action) => action.id === "ron")) {
            FuritenManager.markMissedRon(this, this.humanPlayer.id);
          }
          if (this.callWindow.kind === "chankan") {
            const declarerIndex = this.callWindow.fromPlayerIndex;
            const kanType = this.callWindow.kanType;
            this.recordGameEvent("chankan", {
              playerIndex: this.humanPlayer.id,
              playerName: this.humanPlayer.name,
              fromPlayerIndex: declarerIndex,
              kanType,
              decision: "skip",
            });
            CallWindow.close(this.callWindow, "槍槓見送り");
            this.callWindow = null;
            this.pendingWinContext = null;
            if (pendingCpuRonCandidate) {
              return this.resolveRonWin(pendingCpuRonCandidate.playerIndex, pendingCpuRonCandidate.analysis, {
                isChankan: true,
                kanType,
                isAnkanKokushiException: pendingCpuRonCandidate.isAnkanKokushiException,
              });
            }
            const result = this.finalizePendingKan();
            if (result && result.applied && declarerIndex !== this.humanPlayer.id && this.phase === "cpu-running") {
              this.emitChange();
              this.runCpuUntilHumanTurn();
            }
            if (!result || !result.applied) {
              this.pendingWinContext = null;
              this.turnIndex = declarerIndex;
              this.phase = declarerIndex === this.humanPlayer.id ? "human-discard" : "cpu-running";
              this.addLog("槍槓復旧時に保留中のカン情報がなかったため、宣言者の手番へ戻しました。");
              this.emitChange();
              if (this.phase === "cpu-running") this.runCpuUntilHumanTurn();
            }
            return true;
          }
          CallWindow.close(this.callWindow, "スキップ");
          if (pendingCpuRonCandidate) {
            this.callWindow = null;
            return this.resolveRonWin(pendingCpuRonCandidate.playerIndex, pendingCpuRonCandidate.analysis, { isCpuRon: true });
          }
          this.addLog("鳴きをスキップしました。");
          this.recordGameEvent("call", { playerIndex: this.humanPlayer.id, playerName: this.humanPlayer.name, action: "skip" });
          this.continueAfterDiscard(discarderIndex);
          return true;
        }
  };
})(window);
