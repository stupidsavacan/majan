(function attachKanFlow(global) {
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

  Sanma.KanFlow = {
        tryCpuKan(player) {
          const availability = KanRules.describeAvailability(this, player.id, this.ruleConfig);
          const option = (availability.options || []).find((candidate) => candidate.type !== "minkan");
          if (!availability.enabled || !option) return false;
          this.addCpuActionLog(player, "カン", option.label || option.type);
          if (!this.beginKanAttempt(player.id, option)) return false;
          if (this.phase === "cpu-running"
            && this.lastDrawContext
            && this.lastDrawContext.playerIndex === player.id
            && this.lastDrawContext.isRinshan
            && this.tryCpuTsumo(player)) {
            return true;
          }
          return this.phase === "human-call" || this.phase === "win-ended" || this.phase === "round-ended";
        },

        extractHumanKita(instanceId) {
          const validation = this.validateAction("北抜き", ["waitingForDiscard"]);
          if (!validation.ok) {
            this.emitChange();
            return false;
          }
          if (this.phase !== "human-discard" || this.turnIndex !== this.humanPlayer.id) {
            this.addLog("現在は北抜きできません。");
            this.emitChange();
            return;
          }
          const result = KitaManager.extract(this, this.humanPlayer.id, instanceId);
          this.addLog(result.reason);
          if (result.applied) {
            this.markOpeningInterrupted("北抜き");
            this.recordGameEvent("kita", {
              playerIndex: this.humanPlayer.id,
              playerName: this.humanPlayer.name,
              tile: this.tileSnapshot(result.extracted),
            });
            if (result.replacement) {
              this.recordGameEvent("draw", this.playerTileEvent(this.humanPlayer, result.replacement));
              this.recordAssist(AssistManager.evaluateDraw({
                state: this,
                ruleConfig: this.ruleConfig,
                player: this.humanPlayer,
                random: this.assistRandom,
              }));
            }
          }
          if (result.applied && !result.replacement) {
            this.phase = "round-ended";
            this.finishGameRecord({ type: "exhaustive_draw", reason: "抜き北の補充牌がありません。" });
          }
          this.emitChange();
        },

        requestHumanKan() {
          const validation = this.validateAction("カン", ["waitingForDiscard"]);
          if (!validation.ok) {
            this.emitChange();
            return false;
          }
          if (this.phase !== "human-discard" || this.turnIndex !== this.humanPlayer.id) {
            this.addLog("現在はカンできません。");
            this.emitChange();
            return;
          }
          const availability = KanRules
            ? KanRules.describeAvailability(this, this.humanPlayer.id, this.ruleConfig)
            : KanManager.describeAvailability(this, this.humanPlayer.id);
          if (!availability.enabled) {
            this.addLog(availability.reason);
            this.emitChange();
            return false;
          }
          if (availability.options.length > 1) {
            this.pendingKanChoice = {
              isOpen: true,
              playerIndex: this.humanPlayer.id,
              options: availability.options.slice(),
            };
            this.phase = "human-kan-choice";
            this.addLog("複数のカン候補があります。実行するカンを選択してください。");
            this.recordGameEvent("kan_choice_open", {
              playerIndex: this.humanPlayer.id,
              options: availability.options.map((option) => ({
                type: option.type,
                label: option.label,
                tile: option.tile ? TileUtil.getTileShortLabel(option.tile) : null,
              })),
            });
            this.emitChange();
            return true;
          }
          return this.applyHumanKan(availability.options[0]);
        },

        selectHumanKan(optionIndex) {
          const pending = this.pendingKanChoice;
          const index = Number(optionIndex);
          if (!pending || !pending.isOpen || !Number.isInteger(index) || !pending.options[index]) {
            this.addLog("選択されたカン候補は利用できません。");
            this.emitChange();
            return false;
          }
          const selected = pending.options[index];
          this.pendingKanChoice = null;
          this.phase = "human-discard";
          return this.applyHumanKan(selected);
        },

        cancelHumanKanChoice() {
          if (!this.pendingKanChoice || !this.pendingKanChoice.isOpen) {
            this.addLog("取り消せるカン選択はありません。");
            this.emitChange();
            return false;
          }
          this.recordGameEvent("kan_choice_cancel", { playerIndex: this.humanPlayer.id });
          this.pendingKanChoice = null;
          this.phase = "human-discard";
          this.addLog("カン選択を取り消しました。");
          this.emitChange();
          return true;
        },

        applyHumanKan(option) {
          if (!KanRules) {
            this.addLog("カンルール管理が読み込まれていません。");
            this.emitChange();
            return false;
          }
          this.pendingKanChoice = null;
          return this.beginKanAttempt(this.humanPlayer.id, option);
        },

        beginKanAttempt(playerIndex, option) {
          const attempt = KanRules.prepareKan({
            state: this,
            playerIndex,
            kanAction: option,
            ruleConfig: this.ruleConfig,
          });
          this.addLog(attempt.reason);
          if (!attempt.prepared) {
            this.emitChange();
            return false;
          }
          this.pendingKanAttempt = attempt;
          this.markOpeningInterrupted("カン宣言");
          this.recordGameEvent("kan_attempt", {
            playerIndex,
            playerName: this.players[playerIndex].name,
            kanType: attempt.kanType,
            tile: TileUtil.getTileShortLabel(attempt.declaredTile),
          });
          const interrupts = this.findChankanInterrupts(attempt);
          if (interrupts.length) return this.openOrResolveChankan(interrupts, attempt);
          return Boolean(this.finalizePendingKan().applied);
        },

        findChankanInterrupts(attempt) {
          if (!attempt || !["kakan", "ankan"].includes(attempt.kanType)) return [];
          const kanRules = (this.ruleConfig.advancedRules && this.ruleConfig.advancedRules.kan) || {};
          if (kanRules.chankan === false) return [];
          const declaredTile = attempt.declaredTile;
          const previousContext = this.pendingWinContext;
          const candidates = [];
          for (let offset = 1; offset < this.players.length; offset += 1) {
            const playerIndex = (attempt.playerIndex + offset) % this.players.length;
            const furiten = FuritenManager.checkRonEligibility({
              state: this,
              playerIndex,
              winningTile: declaredTile,
              sourcePlayerIndex: attempt.playerIndex,
              ruleConfig: this.ruleConfig,
            });
            if (!furiten.canRon) continue;
            const isAnkanKokushiException = attempt.kanType === "ankan";
            this.pendingWinContext = {
              isChankan: true,
              sourcePlayerIndex: attempt.playerIndex,
              winningTile: declaredTile,
              kanType: attempt.kanType,
              isAnkanKokushiException,
            };
            const analysis = ActionResolver.analyzeWin(
              this,
              playerIndex,
              "ron",
              declaredTile,
              attempt.playerIndex
            );
            const isKokushi = analysis.agariResult
              && analysis.agariResult.bestPattern
              && analysis.agariResult.bestPattern.type === "kokushi";
            if (analysis.scoreResult.isValidWin && (attempt.kanType === "kakan" || isKokushi)) {
              candidates.push({ playerIndex, analysis, isAnkanKokushiException, priorityOffset: offset });
            }
          }
          this.pendingWinContext = previousContext;
          return candidates.sort((left, right) => left.priorityOffset - right.priorityOffset);
        },

        findChankanInterrupt(attempt) {
          return this.findChankanInterrupts(attempt)[0] || null;
        },

        openOrResolveChankan(interrupts, attempt) {
          const ordered = (interrupts || []).slice().sort((left, right) => left.priorityOffset - right.priorityOffset);
          const priority = this.selectHeadBumpCandidates(ordered);
          const primary = priority.primary;
          const doubleRonEnabled = this.ruleConfig
            && this.ruleConfig.doubleRonPolicy
            && this.ruleConfig.doubleRonPolicy.allowed === true;
          const humanCandidate = ordered.find((interrupt) => this.players[interrupt.playerIndex].isHuman) || null;
          const offered = doubleRonEnabled
            ? ordered
            : primary && this.players[primary.playerIndex].isHuman && priority.fallbackCpu
            ? [primary, priority.fallbackCpu]
            : primary ? [primary] : [];
          offered.forEach((interrupt) => {
            const winner = this.players[interrupt.playerIndex];
            this.recordGameEvent("chankan_offer", {
              playerIndex: interrupt.playerIndex,
              playerName: winner.name,
              fromPlayerIndex: attempt.playerIndex,
              kanType: attempt.kanType,
              isAnkanKokushiException: interrupt.isAnkanKokushiException,
            });
          });
          if (!primary) return false;
          if (doubleRonEnabled && !humanCandidate && ordered.length > 1) {
            return this.resolveMultiRonWin(ordered, {
              isChankan: true,
              kanType: attempt.kanType,
              isAnkanKokushiException: ordered.some((interrupt) => interrupt.isAnkanKokushiException),
            });
          }
          if (doubleRonEnabled && humanCandidate) {
            const fallbackCpu = ordered.find((interrupt) => !this.players[interrupt.playerIndex].isHuman) || null;
            this.markOpeningInterrupted("槍槓選択窓");
            this.pendingWinContext = {
              isChankan: true,
              sourcePlayerIndex: attempt.playerIndex,
              winningTile: attempt.declaredTile,
              kanType: attempt.kanType,
              isAnkanKokushiException: humanCandidate.isAnkanKokushiException,
            };
            this.callWindow = {
              isOpen: true,
              kind: "chankan",
              playerIndex: humanCandidate.playerIndex,
              fromPlayerIndex: attempt.playerIndex,
              tile: attempt.declaredTile,
              kanType: attempt.kanType,
              isAnkanKokushiException: humanCandidate.isAnkanKokushiException,
              pendingCpuRonCandidate: fallbackCpu,
              ronCandidates: ordered,
              actions: [{
                id: "ron",
                label: "槍槓ロン",
                enabled: true,
                reason: "カン宣言牌でロン和了できます。",
                analysis: humanCandidate.analysis,
              }],
            };
            this.phase = "human-call";
            this.addLog("槍槓ロンを選択できます。");
            this.emitChange();
            return true;
          }
          if (!this.players[primary.playerIndex].isHuman) {
            return this.resolveRonWin(primary.playerIndex, primary.analysis, {
              isChankan: true,
              kanType: attempt.kanType,
              isAnkanKokushiException: primary.isAnkanKokushiException,
            });
          }
          this.markOpeningInterrupted("槍槓選択窓");
          this.pendingWinContext = {
            isChankan: true,
            sourcePlayerIndex: attempt.playerIndex,
            winningTile: attempt.declaredTile,
            kanType: attempt.kanType,
            isAnkanKokushiException: primary.isAnkanKokushiException,
          };
          this.callWindow = {
            isOpen: true,
            kind: "chankan",
            playerIndex: primary.playerIndex,
            fromPlayerIndex: attempt.playerIndex,
            tile: attempt.declaredTile,
            kanType: attempt.kanType,
            isAnkanKokushiException: primary.isAnkanKokushiException,
            pendingCpuRonCandidate: priority.fallbackCpu,
            ronCandidates: offered,
            actions: [{
              id: "ron",
              label: "槍槓ロン",
              enabled: true,
              reason: "カン宣言牌でロン和了できます。",
              analysis: primary.analysis,
            }],
          };
          this.phase = "human-call";
          this.addLog("槍槓ロンを選択できます。");
          this.emitChange();
          return true;
        },

        finalizePendingKan() {
          const attempt = this.pendingKanAttempt;
          if (!attempt) return { applied: false, reason: "確定待ちのカンがありません。" };
          const result = KanRules.finalizeKan({
            state: this,
            attempt,
            ruleConfig: this.ruleConfig,
          });
          this.addLog(result.reason);
          if (!result.applied) {
            this.emitChange();
            return result;
          }
          this.pendingKanAttempt = null;
          this.pendingWinContext = null;
          const player = this.players[attempt.playerIndex];
          this.turnIndex = attempt.playerIndex;
          this.phase = result.replacement
            ? (player.isHuman ? "human-discard" : "cpu-running")
            : "round-ended";
          this.recordGameEvent("kan", {
            playerIndex: attempt.playerIndex,
            playerName: player.name,
            kanType: result.kanType,
            tiles: result.meld.tiles.map((tile) => this.tileSnapshot(tile)),
            meldIndex: result.kanType === "kakan" ? attempt.requested.meldIndex : null,
            consumedTileInstanceIds: (attempt.requested.consumeInstanceIds || []).slice(),
            fromPlayerIndex: attempt.requested.fromPlayerIndex,
            calledTile: result.kanType === "minkan" ? this.tileSnapshot(attempt.requested.tile) : null,
          });
          if (result.replacement) {
            this.recordGameEvent("draw", this.playerTileEvent(player, result.replacement));
          } else {
            this.finishGameRecord({ type: "exhaustive_draw", reason: "嶺上牌を取得できませんでした。" });
          }
          this.emitChange();
          return result;
        }
  };
})(window);
