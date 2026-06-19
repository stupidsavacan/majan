(function attachTurnFlow(global) {
  const Sanma = global.Sanma = global.Sanma || {};
  const Player = Sanma.Player;
  const Wall = Sanma.Wall;
  const RuleConfig = Sanma.RuleConfig;
  const TileUtil = Sanma.TileUtil;
  const HandAnalysis = Sanma.HandAnalysis;
  const YakuAnalysis = Sanma.YakuAnalysis;
  const ScoreCalculator = Sanma.ScoreCalculator;
  const Settlement = Sanma.Settlement;
  const ActionResolver = Sanma.ActionResolver;
  const CallWindow = Sanma.CallWindow;
  const RiichiManager = Sanma.RiichiManager;
  const KanManager = Sanma.KanManager;
  const KitaManager = Sanma.KitaManager;
  const FuritenManager = Sanma.FuritenManager;
  const RiichiRules = Sanma.RiichiRules;
  const KanRules = Sanma.KanRules;
  const CpuStrategy = Sanma.CpuStrategy;
  const AssistManager = Sanma.AssistManager;
  const GameRecord = Sanma.GameRecord;
  const MatchManager = Sanma.MatchManager;
  const DebugEventLog = Sanma.DebugEventLog;
  const GameStateMachine = Sanma.GameStateMachine;
  const InvariantChecker = Sanma.InvariantChecker;

  Sanma.TurnFlow = {
        discardHumanTile(instanceId) {
          const validation = this.validateAction("打牌", ["waitingForDiscard"]);
          if (!validation.ok) {
            this.emitChange();
            return false;
          }
          if ((this.phase !== "human-discard" && this.phase !== "caller-discard") || this.turnIndex !== 0) {
            this.addLog("現在はあなたの打牌番ではありません。");
            this.emitChange();
            return;
          }

          const target = this.humanPlayer.hand.find((tile) => tile.instanceId === instanceId);
          if (this.humanPlayer.riichi
            && this.humanPlayer.riichi.pending
            && !RiichiRules.canDeclareDiscard(this, this.humanPlayer.id, target)) {
            this.addLog("聴牌を維持するリーチ宣言牌を選んでください。");
            this.emitChange();
            return;
          }
          if (this.humanPlayer.hasRiichi
            && (!target || !this.humanPlayer.lastDraw || target.instanceId !== this.humanPlayer.lastDraw.instanceId)) {
            this.addLog("リーチ後はツモ切りのみです。");
            this.emitChange();
            return;
          }

          const discarded = this.humanPlayer.discardTileByInstanceId(instanceId);
          if (!discarded) {
            this.addLog("その牌は手牌にありません。");
            this.emitChange();
            return;
          }

          this.addLog(`あなたが ${TileUtil.getTileAriaLabel(discarded)} を切りました。`);
          this.recordGameEvent("discard", this.playerTileEvent(this.humanPlayer, discarded));
          const riichiResult = RiichiRules.handleDiscard(this, this.humanPlayer.id, discarded);
          if (riichiResult.finalized) {
            this.addLog(riichiResult.reason);
            this.recordGameEvent("riichi", {
              playerIndex: this.humanPlayer.id,
              playerName: this.humanPlayer.name,
              declarationDiscard: TileUtil.getTileShortLabel(discarded),
            });
          }
          const tenpai = HandAnalysis.analyzeTenpai(ActionResolver.getAnalysisTiles(this.humanPlayer), this.ruleConfig);
          if (tenpai.isTenpai) {
            this.addLog(`聴牌: 待ち牌 ${tenpai.waits.map((wait) => wait.label).join("、")}`);
          }
          this.handleDiscard(this.humanPlayer.id, discarded);
        },

        handleDiscard(discarderIndex, discarded) {
          this.lastDiscard = this.createLastDiscard(discarderIndex, discarded);
          this.lastDrawContext = null;
          this.noteOpeningDiscard(discarderIndex);
          if (this.resolveRonCandidatesAfterDiscard(discarderIndex)) return true;
          const reaction = this.resolveNonWinningCallsAfterDiscard(discarderIndex);
          if (reaction && reaction.handled) return true;
          this.continueAfterDiscard(discarderIndex);
          return true;
        },

        resolveNonWinningCallsAfterDiscard(discarderIndex) {
          if (this.wall.remainingCount() <= 0) return { handled: false };

          const resolver = Sanma.CallResolver;
          let selectedCpu = null;
          if (resolver
            && typeof resolver.collectCpuCallCandidates === "function"
            && typeof resolver.selectCpuCallCandidate === "function") {
            const candidates = resolver.collectCpuCallCandidates(this, discarderIndex) || [];
            selectedCpu = resolver.selectCpuCallCandidate(this, candidates) || null;
          }

          const windowState = discarderIndex !== this.humanPlayer.id
            ? CallWindow.create(this, this.humanPlayer.id)
            : null;
          if (windowState) {
            if (selectedCpu) windowState.pendingCpuCallCandidate = selectedCpu;
            this.markOpeningInterrupted("鳴き選択窓");
            this.callWindow = windowState;
            this.phase = "human-call";
            this.addLog(`${this.players[discarderIndex].name}の捨て牌に対する操作を選んでください。`);
            this.emitChange();
            return { handled: true, openedHumanWindow: true };
          }

          if (selectedCpu) {
            const applied = this.applySelectedCpuCallCandidate(selectedCpu, { source: "post-discard" });
            if (applied && this.phase === "cpu-running" && !this.cpuTaskActive) {
              this.emitChange();
              this.runCpuUntilHumanTurn();
            }
            return { handled: applied, appliedCpuCall: applied };
          }

          return { handled: false };
        },

        applySelectedCpuCallCandidate(candidate, metadata) {
          if (!candidate || typeof this.applyCpuCall !== "function") return false;
          const applied = this.applyCpuCall(candidate, metadata || {});
          if (!applied) return false;
          if ((candidate.actionId === "pon" || candidate.actionId === "chi")
            && this.players[candidate.playerIndex]
            && !this.players[candidate.playerIndex].isHuman) {
            this.pendingCpuCallDiscardIndex = candidate.playerIndex;
            this.turnIndex = candidate.playerIndex;
            if (this.phase !== "human-call" && this.phase !== "win-ended" && this.phase !== "round-ended") {
              this.phase = "cpu-running";
            }
          }
          return true;
        },

        continueAfterDiscard(discarderIndex) {
          const pendingCpuCallCandidate = this.callWindow
            && this.callWindow.fromPlayerIndex === discarderIndex
            ? this.callWindow.pendingCpuCallCandidate || null
            : null;
          this.callWindow = null;
          if (pendingCpuCallCandidate && this.wall.remainingCount() > 0) {
            const applied = this.applySelectedCpuCallCandidate(pendingCpuCallCandidate, { source: "human-skip" });
            if (applied) {
              if (this.phase === "cpu-running" && !this.cpuTaskActive) {
                this.emitChange();
                this.runCpuUntilHumanTurn();
              } else {
                this.emitChange();
              }
              return true;
            }
          }
          if (this.wall.remainingCount() <= 0) {
            this.phase = "round-ended";
            this.addLog("山がなくなりました。簡易流局として終了します。");
            this.finishGameRecord({ type: "exhaustive_draw", reason: "山がなくなりました。" });
            this.emitChange();
            return;
          }

          this.turnIndex = (discarderIndex + 1) % this.players.length;
          this.phase = "cpu-running";
          this.emitChange();
          this.runCpuUntilHumanTurn();
        },

        runCpuUntilHumanTurn() {
          this.syncStateMachine("CPU進行開始");
          if (this.cpuTaskActive) {
            DebugEventLog.add(this.debugEventLog, "actionRejected", {
              action: "cpuAutomation",
              reason: "CPU処理はすでに実行中です",
            });
            return false;
          }
          const guard = GameStateMachine.beginAction(
            this.stateMachine,
            "cpuAutomation",
            ["resolvingAction"]
          );
          if (!guard.ok) return false;
          this.cpuTaskActive = true;
          try {
            return this.runCpuUntilHumanTurnUnlocked();
          } finally {
            this.cpuTaskActive = false;
            GameStateMachine.endAction(this.stateMachine, "cpuAutomation");
          }
        },

        runCpuUntilHumanTurnUnlocked() {
          let cpuSteps = 0;
          while (this.turnIndex !== this.humanPlayer.id && this.wall.remainingCount() > 0) {
            cpuSteps += 1;
            if (cpuSteps > 12) {
              this.endRoundForInvalidDraw("CPU処理の安全上限を超えました。");
              return false;
            }
            const player = this.getCurrentPlayer();
            const discardAfterCall = this.pendingCpuCallDiscardIndex === player.id;
            if (discardAfterCall) {
              this.pendingCpuCallDiscardIndex = null;
              this.lastDrawContext = null;
            } else {
              if (!player.lastDraw) {
                const drawn = this.wall.draw();
                if (!drawn) {
                  this.endRoundForInvalidDraw(`${player.name}のツモ牌を取得できませんでした。`);
                  return;
                }
                player.receiveTile(drawn);
                this.lastDrawContext = this.createNormalDrawContext(player);
                this.addLog(`${player.name} がツモりました。`);
                this.recordGameEvent("draw", this.playerTileEvent(player, drawn));
                this.recordAssist(AssistManager.evaluateDraw({
                  state: this,
                  ruleConfig: this.ruleConfig,
                  player,
                  random: this.assistRandom,
                }));
              } else if (!(
                this.initialDealerDiscardPending
                && player.id === this.round.dealerIndex
                && this.lastDrawContext
                && this.lastDrawContext.playerIndex === player.id
                && this.lastDrawContext.isInitialDealerDraw
              )) {
                this.lastDrawContext = {
                  playerIndex: player.id,
                  isRinshan: false,
                  isInitialDealerDraw: this.initialDealerDiscardPending && player.id === this.round.dealerIndex,
                  isTenho: this.initialDealerDiscardPending && player.id === this.round.dealerIndex,
                  isChiho: false,
                };
              }
              if (this.tryCpuTsumo(player)) return;
              if (this.tryCpuKita(player)) return;
              if (this.tryCpuTsumo(player)) return;
              if (this.tryCpuKan(player)) return;
              this.tryCpuRiichi(player);
            }
            const discardIndex = this.chooseCpuDiscardIndex(player);
            const discarded = player.discardTileAt(discardIndex);
            if (!discarded) {
              this.endRoundForInvalidDraw(`${player.name}の打牌を取得できませんでした。`);
              return;
            }
            if (this.initialDealerDiscardPending && player.id === this.round.dealerIndex) {
              this.initialDealerDiscardPending = false;
            }
            const riichiResult = RiichiRules.handleDiscard(this, player.id, discarded);
            if (riichiResult.finalized) {
              this.addCpuActionLog(player, "リーチ", riichiResult.reason);
              this.addLog(riichiResult.reason);
              this.recordGameEvent("riichi", {
                playerIndex: player.id,
                playerName: player.name,
                declarationDiscard: TileUtil.getTileShortLabel(discarded),
              });
            }
            this.addLog(`${player.name} が ${TileUtil.getTileAriaLabel(discarded)} を切りました。`);
            this.recordGameEvent("discard", this.playerTileEvent(player, discarded));
            this.lastDiscard = this.createLastDiscard(player.id, discarded);
            this.noteOpeningDiscard(player.id);
            if (this.resolveRonCandidatesAfterDiscard(player.id)) return;
            const reaction = this.resolveNonWinningCallsAfterDiscard(player.id);
            if (reaction && reaction.openedHumanWindow) return;
            if (reaction && reaction.appliedCpuCall) {
              if (this.phase === "cpu-running") continue;
              return;
            }
            if (reaction && reaction.handled) return;
            if (this.wall.remainingCount() <= 0) {
              this.continueAfterDiscard(player.id);
              return;
            }
            this.turnIndex = (this.turnIndex + 1) % this.players.length;
          }

          if (this.wall.remainingCount() <= 0) {
            this.phase = "round-ended";
            this.addLog("山がなくなりました。簡易流局として終了します。");
            this.finishGameRecord({ type: "exhaustive_draw", reason: "山がなくなりました。" });
            this.emitChange();
            return;
          }

          if (this.turnIndex === this.humanPlayer.id) {
            if (this.humanPlayer.lastDraw) {
              this.lastDiscard = null;
              this.phase = "human-discard";
              this.addLog("切る牌を選んでください。");
              this.emitChange();
              return true;
            }
            const drawn = this.wall.draw();
            if (!drawn) {
              this.endRoundForInvalidDraw("あなたのツモ牌を取得できませんでした。");
              return;
            }
            this.humanPlayer.receiveTile(drawn);
            this.lastDrawContext = this.createNormalDrawContext(this.humanPlayer);
            this.recordGameEvent("draw", this.playerTileEvent(this.humanPlayer, drawn));
            this.recordAssist(AssistManager.evaluateDraw({
              state: this,
              ruleConfig: this.ruleConfig,
              player: this.humanPlayer,
              random: this.assistRandom,
            }));
            this.lastDiscard = null;
            this.phase = "human-discard";
            this.addLog(`あなたのツモ: ${TileUtil.getTileAriaLabel(drawn)}。切る牌を選んでください。`);
            this.emitChange();
          }
          return true;
        },

        chooseCpuDiscardIndex(player) {
          if (player.riichi && player.riichi.pending) {
            const options = RiichiRules.getDeclarationDiscardOptions(this, player.id);
            const optionIds = new Set(options.map((tile) => tile.instanceId));
            const declarationIndex = player.hand.findIndex((tile) => optionIds.has(tile.instanceId));
            if (declarationIndex < 0) {
              this.addCpuActionLog(player, "打牌失敗", "有効なリーチ宣言牌が見つかりません。");
              return -1;
            }
            this.addCpuActionLog(player, "リーチ宣言牌", "聴牌を維持する牌を選択しました。");
            return declarationIndex;
          }

          if (player.hasRiichi) {
            const lastDrawIndex = player.lastDraw
              ? player.hand.findIndex((tile) => tile.instanceId === player.lastDraw.instanceId)
              : -1;
            if (lastDrawIndex < 0) {
              this.addCpuActionLog(player, "打牌失敗", "リーチ後のツモ牌が見つからないため安全に局を終了します。");
              return -1;
            }
            this.addCpuActionLog(player, "ツモ切り", "リーチ後のためツモ牌をそのまま切ります。");
            return lastDrawIndex;
          }

          const analysis = ActionResolver.analyzeWin(this, player.id, "tsumo", null, null);
          const decision = CpuStrategy.chooseDiscard({
            player,
            state: this,
            ruleConfig: this.ruleConfig,
            analysis,
            random: this.cpuRandom,
          });
          const index = player.hand.findIndex((tile) => tile.instanceId === decision.tileInstanceId);
          const safeIndex = index >= 0 ? index : 0;
          const tile = player.hand[safeIndex];
          this.cpuThinkingLog.unshift({
            player: player.name,
            phase: "Phase 7 CPU思考",
            action: "打牌",
            selectedDiscard: TileUtil.getTileAriaLabel(tile),
            selectedTileInstanceId: tile.instanceId,
            reason: index >= 0 ? decision.reason : "候補牌が見つからなかったため先頭牌を選択しました。",
            score: decision.score,
            shanten: decision.candidates[0] ? decision.candidates[0].shanten : null,
            tenpai: decision.candidates[0] ? decision.candidates[0].tenpai : false,
            candidates: decision.candidates.slice(0, 8),
            assist: this.assistEvents[0] || null,
            hand: player.hand.map(TileUtil.getTileShortLabel).join(" "),
          });
          this.cpuThinkingLog = this.cpuThinkingLog.slice(0, 20);
          return safeIndex;
        },

        tryCpuKita(player) {
          if (player.hasRiichi) return false;
          let extractedCount = 0;
          while (extractedCount < 4) {
            const availability = KitaManager.canExtract(this, player.id);
            if (!availability.enabled || availability.options.length === 0) break;
            const result = KitaManager.extract(this, player.id, availability.options[0].instanceId);
            if (!result.applied) break;
            this.markOpeningInterrupted("北抜き");
            extractedCount += 1;
            this.addCpuActionLog(player, "抜き北", result.reason);
            this.addLog(`${player.name} が北を抜きました。`);
            this.recordGameEvent("kita", {
              playerIndex: player.id,
              playerName: player.name,
              tile: this.tileSnapshot(result.extracted),
            });
            if (!result.replacement) {
              this.phase = "round-ended";
              this.addLog("抜き北の補充牌がないため局を終了します。");
              this.finishGameRecord({ type: "exhaustive_draw", reason: "抜き北の補充牌がありません。" });
              this.emitChange();
              return true;
            }
            this.recordGameEvent("draw", this.playerTileEvent(player, result.replacement));
            this.recordAssist(AssistManager.evaluateDraw({
              state: this,
              ruleConfig: this.ruleConfig,
              player,
              random: this.assistRandom,
            }));
            if (this.tryCpuTsumo(player)) return true;
          }
          return false;
        },

        markOpeningInterrupted() {
          if (!this.openingYakuState) return;
          this.openingYakuState.dealerFirstDiscardPending = false;
          this.openingYakuState.chihoEligible = false;
        },

        noteOpeningDiscard(discarderIndex) {
          const opening = this.openingYakuState;
          if (!opening) return;
          if (opening.dealerFirstDiscardPending && discarderIndex === this.round.dealerIndex) {
            opening.dealerFirstDiscardPending = false;
            return;
          }
          opening.chihoEligible = false;
        },

        tryCpuRiichi(player) {
          const availability = RiichiManager.canDeclare(this, player.id);
          if (!availability.enabled) return false;
          const result = RiichiManager.declare(this, player.id);
          if (!result.applied) return false;
          this.addCpuActionLog(player, "リーチ", result.reason);
          this.addLog(`${player.name} がリーチ宣言牌を選択しています。`);
          return true;
        },

        addCpuActionLog(player, action, reason) {
          this.cpuThinkingLog.unshift({
            player: player.name,
            phase: "Phase 7 CPU思考",
            action,
            reason,
            assist: this.assistEvents[0] || null,
          });
          this.cpuThinkingLog = this.cpuThinkingLog.slice(0, 20);
          DebugEventLog.add(this.debugEventLog, "cpuDecision", {
            playerIndex: player.id,
            playerName: player.name,
            action,
            reason,
          });
        },

        endRoundForInvalidDraw(reason) {
          this.phase = "round-ended";
          this.callWindow = null;
          this.addLog(`${reason} 安全のため局を終了します。`);
          this.finishGameRecord({ type: "exhaustive_draw", reason });
          this.emitChange();
        },

        declareHumanRiichi() {
          const validation = this.validateAction("リーチ", ["waitingForDiscard"]);
          if (!validation.ok) {
            this.emitChange();
            return false;
          }
          if (this.phase !== "human-discard" || this.turnIndex !== this.humanPlayer.id) {
            this.addLog("現在はリーチできません。");
            this.emitChange();
            return;
          }
          const result = RiichiRules
            ? RiichiRules.declare(this, this.humanPlayer.id)
            : RiichiManager.declare(this, this.humanPlayer.id);
          this.addLog(result.reason);
          this.emitChange();
        }
  };
})(window);
