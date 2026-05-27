<template>
  <div class="opgg-panel" ref="opgg-panel">
    <div class="tabs-area">
      <a href="https://op.gg" :title="t('Opgg.toOpgg')" target="_blank">
        <OpggIcon class="opgg-icon" />
      </a>
      <NButton
        secondary
        class="square-button"
        :title="t('Opgg.refresh')"
        :loading="isLoading"
        @click="loadAll"
      >
        <template #icon>
          <NIcon><RefreshIcon /></NIcon>
        </template>
      </NButton>
      <NButton
        secondary
        class="square-button"
        :title="t('Opgg.settings.button')"
        @click="isSettingsLayerShow = true"
      >
        <template #icon>
          <NIcon><SettingsIcon /></NIcon>
        </template>
      </NButton>
      <NTabs class="tabs" v-model:value="currentTab" type="segment" size="small">
        <NTab name="tier" :tab="t('Opgg.tier')" />
        <NTab
          :title="t('Opgg.champion')"
          name="champion"
          :tab="
            championId
              ? lcs.gameData.champions[championId]?.name || t('Opgg.empty')
              : t('Opgg.empty')
          "
          :disabled="!championId"
        />
      </NTabs>
    </div>
    <div class="filters">
      <NSelect
        size="small"
        :placeholder="t('Opgg.mode')"
        :options="modeOptions"
        :value="mode"
        @update:value="handleModeChange"
        :render-label="renderLabel"
        style="width: 0; flex: 1"
        :consistent-menu-width="false"
        :disabled="isLoading"
      />
      <NSelect
        size="small"
        :placeholder="t('Opgg.region')"
        :options="regionOptions"
        :value="region"
        @update:value="handleRegionChange"
        :render-label="renderLabel"
        style="width: 0; flex: 1"
        :consistent-menu-width="false"
        :disabled="isLoading"
      />
      <NSelect
        size="small"
        :placeholder="t('Opgg.rankTier')"
        :options="tierOptions"
        :value="tier"
        @update:value="handleTierChange"
        :render-label="renderLabel"
        style="width: 0; flex: 1"
        :consistent-menu-width="false"
        :disabled="isLoading || mode === 'arena'"
      />
      <NSelect
        size="small"
        :placeholder="t('Opgg.position')"
        :options="positionOptions"
        :value="position"
        @update:value="handlePositionChange"
        style="width: 72px"
        :render-label="renderLabel"
        :consistent-menu-width="false"
        :disabled="isLoading || mode !== 'ranked'"
      />
      <NSelect
        size="small"
        :placeholder="t('Opgg.version')"
        :value="version"
        :options="versionOptions"
        @update:value="handleVersionChange"
        :render-label="renderLabel"
        style="width: 72px"
        :consistent-menu-width="false"
        :disabled="isLoading"
      />
    </div>
    <div class="counter-pick-panel" v-if="counterPickContext">
      <div class="panel-section enemy-section">
        <div class="champ-select-side-rows">
          <div class="champ-select-side-row">
            <div class="side-row-title">敌方候选</div>
            <div class="enemy-list">
              <div
                class="enemy-item"
                v-for="enemy of enemyChampionSlots"
                :key="enemy.position"
                :class="[
                  { active: enemy.championId === counterPickContext.targetEnemy?.championId },
                  { empty: !enemy.championId },
                  phaseCssClass(enemy.championId ? enemyChampionPhaseLabels.get(enemy.championId) : undefined)
                ]"
                :title="
                  enemy.championId
                    ? formatChampionPhaseTitle(
                        enemy.championId,
                        counterPickContext.positionLabel,
                        enemy.pickRate,
                        enemyChampionPhaseDetails.get(enemy.championId)
                      )
                    : `${t(`Opgg.positions.${enemy.position}`) || enemy.position} 未选择`
                "
                @click="enemy.championId && (selectedCounterPickEnemyId = enemy.championId)"
              >
                <ChampionIcon
                  v-if="enemy.championId"
                  class="mini-champion-icon"
                  :champion-id="enemy.championId"
                  round
                />
                <div v-else class="empty-champion-slot" />
                <span
                  v-if="enemy.championId"
                  class="pick-rate"
                  :class="phaseCssClass(enemyChampionPhaseLabels.get(enemy.championId))"
                  >{{ (enemy.pickRate * 100).toFixed(1) }}%</span
                >
              </div>
            </div>
          </div>
          <div class="champ-select-side-row" v-if="enemyPhaseAnalysis">
            <div class="side-row-title">敌方节奏</div>
            <div
              class="team-phase-card"
              :class="phaseCssClass(enemyPhaseAnalysis.phase)"
              :title="`前期 ${(enemyPhaseAnalysis.early * 100).toFixed(1)}%, 中期 ${(enemyPhaseAnalysis.mid * 100).toFixed(1)}%, 后期 ${(enemyPhaseAnalysis.late * 100).toFixed(1)}%`"
            >
              <span class="team-phase-label">{{ enemyPhaseAnalysis.label }}</span>
              <div class="team-phase-bars">
                <div
                  class="team-phase-bar early"
                  :style="{ width: `${enemyPhaseAnalysis.earlyScore}%` }"
                />
                <div
                  class="team-phase-bar mid"
                  :style="{ width: `${enemyPhaseAnalysis.midScore}%` }"
                />
                <div
                  class="team-phase-bar late"
                  :style="{ width: `${enemyPhaseAnalysis.lateScore}%` }"
                />
              </div>
              <span class="team-phase-value">{{ (enemyPhaseAnalysis.bestRate * 100).toFixed(1) }}%</span>
            </div>
          </div>
          <div class="champ-select-side-row">
            <div class="side-row-title">友方已选</div>
            <div class="ally-list" v-if="alliedSelectedChampions.length">
              <div
                class="ally-item"
                v-for="ally of allyChampionSlots"
                :key="ally.position"
                :class="[
                  { empty: !ally.championId },
                  phaseCssClass(ally.championId ? allyChampionPhaseLabels.get(ally.championId) : undefined)
                ]"
                :title="
                  ally.championId
                    ? formatChampionPhaseTitle(
                        ally.championId,
                        t(`Opgg.positions.${ally.position}`) || ally.position,
                        null,
                        allyChampionPhaseDetails.get(ally.championId)
                      )
                    : `${t(`Opgg.positions.${ally.position}`) || ally.position} 未选择`
                "
              >
                <ChampionIcon
                  v-if="ally.championId"
                  class="mini-champion-icon"
                  :champion-id="ally.championId"
                  round
                />
                <div v-else class="empty-champion-slot" />
              </div>
            </div>
          </div>
          <div class="champ-select-side-row" v-if="allyPhaseAnalysis">
            <div class="side-row-title">友方节奏</div>
            <div
              class="team-phase-card"
              :class="phaseCssClass(allyPhaseAnalysis.phase)"
              :title="`前期 ${(allyPhaseAnalysis.early * 100).toFixed(1)}%, 中期 ${(allyPhaseAnalysis.mid * 100).toFixed(1)}%, 后期 ${(allyPhaseAnalysis.late * 100).toFixed(1)}%`"
            >
              <span class="team-phase-label">{{ allyPhaseAnalysis.label }}</span>
              <div class="team-phase-bars">
                <div
                  class="team-phase-bar early"
                  :style="{ width: `${allyPhaseAnalysis.earlyScore}%` }"
                />
                <div
                  class="team-phase-bar mid"
                  :style="{ width: `${allyPhaseAnalysis.midScore}%` }"
                />
                <div
                  class="team-phase-bar late"
                  :style="{ width: `${allyPhaseAnalysis.lateScore}%` }"
                />
              </div>
              <span class="team-phase-value">{{ (allyPhaseAnalysis.bestRate * 100).toFixed(1) }}%</span>
            </div>
          </div>
        </div>
      </div>
      <div class="panel-section recommendation-section">
        <div class="section-title">
          <span class="section-main-title">推荐选择</span>
          <span class="section-subtitle" v-if="counterPickContext.targetEnemy">
            vs
            {{
              lcs.gameData.champions[counterPickContext.targetEnemy?.championId || -1]?.name ||
              counterPickContext.targetEnemy?.championId
            }}
          </span>
          <NButton
            quaternary
            circle
            size="tiny"
            class="expand-button"
            :title="isCounterPickExpanded ? '收起完整列表' : '展开完整列表'"
            @click="isCounterPickExpanded = !isCounterPickExpanded"
          >
            <template #icon>
              <NIcon>
                <ChevronUpIcon v-if="isCounterPickExpanded" />
                <ChevronDownIcon v-else />
              </NIcon>
            </template>
          </NButton>
        </div>
        <div
          class="counter-detail-loading"
          v-if="isCounterPickExpanded && isLoadingTargetEnemyCounters"
        >
          正在加载完整对位数据...
        </div>
        <div
          class="counter-detail-loading"
          v-if="isLoadingTeamSynergies && visibleTeamRecommendationItems.length === 0"
        >
          正在加载团队组合数据...
        </div>
        <div class="recommendation-groups" v-if="visibleRecommendationGroups.length">
          <div
            class="recommendation-group"
            v-for="group of visibleRecommendationGroups"
            :key="group.key"
          >
            <div class="recommendation-group-title">
              <span>{{ group.title }}</span>
              <span class="recommendation-group-desc">{{ group.description }}</span>
            </div>
            <div class="recommendation-list" :class="{ expanded: isCounterPickExpanded }">
              <div
                class="recommendation-item"
                :class="{ duo: Boolean(item.partnerChampionId) }"
                v-for="item of group.items"
                :key="`${group.key}-${item.championId}`"
                @click="() => handleToChampion(item.championId, false)"
                @contextmenu.prevent="(event) => openCounterPickMenu(event, item.championId)"
                :title="`${lcs.gameData.champions[item.championId]?.name || item.championId} 胜率 ${(item.matchupWinRate * 100).toFixed(2)}%, 熟练度 ${item.masteryPoints.toLocaleString()}`"
              >
                <div class="duo-icons" v-if="item.partnerChampionId">
                  <ChampionIcon
                    class="mini-champion-icon"
                    :champion-id="item.championId"
                    ring
                    round
                  />
                  <ChampionIcon
                    class="mini-champion-icon partner-icon"
                    :champion-id="item.partnerChampionId"
                    ring
                    round
                  />
                </div>
                <ChampionIcon
                  v-else
                  class="mini-champion-icon"
                  :champion-id="item.championId"
                  ring
                  round
                />
                <span class="recommendation-name">{{
                  lcs.gameData.champions[item.championId]?.name || item.championId
                }}</span>
                <span
                  class="matchup-win-rate"
                  :class="{
                    favorable: item.matchupWinRate > 0.5,
                    unfavorable: item.matchupWinRate < 0.5
                  }"
                  >{{ (item.matchupWinRate * 100).toFixed(1) }}%</span
                >
                <span class="mastery-points">{{
                  formatMasteryPoints(item.masteryPoints)
                }}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="recommendation-empty" v-else>暂无可用推荐数据</div>
      </div>
    </div>
    <NDropdown
      placement="bottom-start"
      trigger="manual"
      :x="counterPickMenu.x"
      :y="counterPickMenu.y"
      :show="counterPickMenu.show"
      :options="counterPickMenuOptions"
      @clickoutside="counterPickMenu.show = false"
      @select="handleCounterPickMenuSelect"
    />
    <div class="content">
      <OpggTier
        v-show="currentTab === 'tier'"
        :data="tierData"
        :mode="mode"
        :position="position"
        :region="region"
        :tier="tier"
        :loading="isLoading"
        :version="version || undefined"
        @to-champion="(id) => handleToChampion(id, false)"
        @cancel="cancelAll"
      />
      <OpggChampion
        v-show="currentTab === 'champion'"
        @show-champion="(id) => handleToChampion(id, false)"
        :data="champion"
        :champion="championItem"
        :loading="isLoading"
        :region="region"
        :position="position"
        :tier="tier"
        :mode="mode"
        :version="version || undefined"
        :is-able-to-add-to-item-set="isAbleToAddToItemSet"
        @set-runes="setRunes"
        @set-spells="setSummonerSpells"
        @set-summoner-spells="setSummonerSpells"
        @add-to-item-set="handleAddToItemSet"
        @cancel="cancelAll"
      />
    </div>
    <Transition name="fade">
      <div class="settings-overlay" v-if="isSettingsLayerShow">
        <div class="header">
          <span class="title">{{ t('Opgg.settings.title') }}</span>
          <div class="close-btn" @click="isSettingsLayerShow = false" :title="t('Opgg.close')">
            <NIcon class="close-icon"><CloseIcon /></NIcon>
          </div>
        </div>
        <div class="items">
          <ControlItem
            class="control-item-margin"
            style="justify-content: space-between"
            :label="t('Opgg.settings.flashPosition.label')"
            :label-description="t('Opgg.settings.flashPosition.description')"
            :label-width="300"
          >
            <NRadioGroup size="small" v-model:value="flashPosition">
              <NFlex style="gap: 4px" :vertical="isSmallWidth">
                <NRadio value="d" :title="t('Opgg.settings.flashPosition.options.d')">D</NRadio>
                <NRadio value="f" :title="t('Opgg.settings.flashPosition.options.f')">F</NRadio>
                <NRadio value="auto" :title="t('Opgg.settings.flashPosition.options.auto')">
                  {{ t('Opgg.settings.flashPosition.auto') }}
                </NRadio>
              </NFlex>
            </NRadioGroup>
          </ControlItem>
          <ControlItem
            class="control-item-margin"
            style="justify-content: space-between"
            :label="t('Opgg.settings.autoApplyRunes.label')"
            :label-description="t('Opgg.settings.autoApplyRunes.description')"
            :label-width="300"
          >
            <NSwitch v-model:value="os.frontendSettings.autoApplyRunes" size="small" />
          </ControlItem>
          <ControlItem
            class="control-item-margin"
            style="justify-content: space-between"
            :label="t('Opgg.settings.autoApplySpells.label')"
            :label-description="t('Opgg.settings.autoApplySpells.description')"
            :label-width="300"
          >
            <NSwitch v-model:value="os.frontendSettings.autoApplySpells" size="small" />
          </ControlItem>
          <ControlItem
            class="control-item-margin"
            style="justify-content: space-between"
            :label="t('Opgg.settings.autoApplyItems.label')"
            :label-description="t('Opgg.settings.autoApplyItems.description')"
            :label-width="300"
          >
            <NSwitch v-model:value="os.frontendSettings.autoApplyItems" size="small" />
          </ControlItem>
        </div>
      </div>
    </Transition>
    <NPopover v-if="ongoingChampions.length" raw placement="top-end" :show-arrow="false">
      <template #trigger>
        <ChampionIcon
          class="champion-icon float hover-fade"
          :champion-id="-1"
          ring
          ring-color="#fff8"
          round
        />
      </template>
      <div class="ongoing-champions">
        <ChampionIcon
          class="champion-icon"
          v-for="c of ongoingChampions"
          :key="c"
          :champion-id="c"
          ring
          ring-color="#fff4"
          round
          @click="handleToChampion(c, false)"
        />
      </div>
    </NPopover>
  </div>
</template>

<script lang="ts" setup>
import { useOpggStore } from '@opgg-window/shards/opgg/store'
import { restoreRecipe } from '@opgg-window/utils/recipe-restore'
import OpggIcon from '@renderer-shared/assets/icon/OpggIcon.vue'
import ControlItem from '@renderer-shared/components/ControlItem.vue'
import ChampionIcon from '@renderer-shared/components/widgets/ChampionIcon.vue'
import { useStableComputed } from '@renderer-shared/compositions/useStableComputed'
import { useInstance } from '@renderer-shared/shards'
import { useAppCommonStore } from '@renderer-shared/shards/app-common/store'
import { LeagueClientRenderer } from '@renderer-shared/shards/league-client'
import { useLeagueClientStore } from '@renderer-shared/shards/league-client/store'
import { LoggerRenderer } from '@renderer-shared/shards/logger'
import { useOpggWindowStore } from '@renderer-shared/shards/window-manager/store'
import { OpggDataApi } from '@shared/data-sources/opgg'
import {
  ModeType,
  OpggARAMChampionSummary,
  OpggArenaChampionSummary,
  OpggArenaModeChampion,
  OpggChampionSynergy,
  OpggNormalModeChampion,
  OpggRankedChampionsSummary,
  PositionType,
  RegionType,
  TierType
} from '@shared/data-sources/opgg/types'
import type { Mastery } from '@shared/types/league-client/champion-mastery'
import {
  ChevronDown as ChevronDownIcon,
  ChevronUp as ChevronUpIcon,
  Close as CloseIcon,
  RefreshSharp as RefreshIcon,
  Settings as SettingsIcon
} from '@vicons/ionicons5'
import { useLocalStorage, useMediaQuery, watchDebounced } from '@vueuse/core'
import { useTranslation } from 'i18next-vue'
import {
  MessageReactive,
  NButton,
  NDropdown,
  NFlex,
  NIcon,
  NPopover,
  NRadio,
  NRadioGroup,
  NSelect,
  NSwitch,
  NTab,
  NTabs,
  SelectRenderLabel,
  useMessage
} from 'naive-ui'
import { computed, h, onErrorCaptured, onMounted, ref, shallowRef, watch, watchEffect } from 'vue'

import OpggChampion from './OpggChampion.vue'
import OpggTier from './OpggTier.vue'

const { t } = useTranslation()

const currentTab = ref('tier')

const lcs = useLeagueClientStore()

const lc = useInstance(LeagueClientRenderer)
const log = useInstance(LoggerRenderer)

const as = useAppCommonStore()

// --- 自动应用 (粗糙版) ---
const ows = useOpggWindowStore()
const os = useOpggStore()

const savedPreferences = useLocalStorage('opgg-preferences', {
  mode: 'ranked',
  position: 'top',
  region: 'global',
  tier: 'all'
})

onErrorCaptured((error, _instance, info) => {
  log.warn('view:Opgg', `Component OP.GG error: ${info}`, error)
  return false
})

const isSmallWidth = useMediaQuery('(max-width: 572px)')

const renderLabel: SelectRenderLabel = (option) => {
  return h(
    'span',
    {
      style: {
        'font-size': '12px'
      }
    },
    option.label as string
  )
}

const championId = ref<number | null>(null)
const mode = ref<ModeType>(savedPreferences.value.mode as ModeType)
const position = ref<PositionType>(savedPreferences.value.position as PositionType)
const region = ref<RegionType>(savedPreferences.value.region as RegionType)
const tier = ref<TierType>(savedPreferences.value.tier as TierType)
const version = ref<string | null>(null)
type RecommendationItem = {
  championId: number
  partnerChampionId: number | null
  matchupWinRate: number
  matchupGames: number
  synergyWinRate: number | null
  synergyGames: number
  masteryLevel: number
  masteryPoints: number
}
const selectedCounterPickEnemyId = ref<number | null>(null)
const isCounterPickExpanded = ref(false)
const targetEnemyCounterDetails = shallowRef<{
  enemyChampionId: number
  counters: Array<{ champion_id: number; play: number; win: number }>
} | null>(null)
const teamSynergyDetails = shallowRef<
  Array<{
    partnerChampionId: number
    partnerPosition: PositionType
    selfPosition: PositionType
    synergies: OpggChampionSynergy[]
  }>
>([])
const allyPhaseChampionDetails = shallowRef<
  Array<{
    championId: number
    position: PositionType
    gameLengths: Array<{ game_length: number; rate: number; average: number; rank: number }>
  }>
>([])
const enemyPhaseChampionDetails = shallowRef<
  Array<{
    championId: number
    position: PositionType
    gameLengths: Array<{ game_length: number; rate: number; average: number; rank: number }>
  }>
>([])
const isLoadingTargetEnemyCounters = ref(false)
const isLoadingTeamSynergies = ref(false)
const counterPickMenu = ref({
  show: false,
  x: 0,
  y: 0,
  championId: null as number | null
})

const versions = shallowRef<string[]>([])

const api = new OpggDataApi()

watchEffect(async () => {
  if ((!version.value || !versions.value.includes(version.value)) && versions.value.length > 0) {
    version.value = versions.value[0]
  }
})

watch(
  () => as.settings.httpProxy,
  (httpProxy) => {
    if (httpProxy) {
      api.http.defaults.proxy = {
        host: httpProxy.host,
        port: httpProxy.port
      }
    } else {
      api.http.defaults.proxy = undefined
    }
  },
  { immediate: true }
)

const tierData = shallowRef<
  OpggARAMChampionSummary | OpggRankedChampionsSummary | OpggArenaChampionSummary | null
>(null)
const champion = shallowRef<OpggNormalModeChampion | OpggArenaModeChampion | null>(null)
const selfChampionMastery = shallowRef<Record<number, Mastery>>({})

const message = useMessage()

const isLoadingVersions = ref(false)
const isLoadingChampion = ref(false)
const isLoadingTier = ref(false)
const isSettingsLayerShow = ref(false)

// 标记当前加载的数据是否与模式匹配
const isModeMatch = ref(false)

const isLoading = computed(
  () => isLoadingVersions.value || isLoadingChampion.value || isLoadingTier.value
)

// 一些模式没有位置相关的数据，所以添加一个视觉上的效果以保证其不可选
watchEffect(() => {
  if (mode.value !== 'ranked') {
    position.value = 'none'
  } else {
    position.value = savedPreferences.value.position as PositionType
  }
})

watchEffect(() => {
  if (mode.value === 'arena') {
    tier.value = 'all'
  } else {
    tier.value = savedPreferences.value.tier as TierType
  }
})

// 以防万一, 我们需要一些丑陋的冗余逻辑
let loadVersionsController: AbortController | null = null
let loadTierController: AbortController | null = null
let loadChampionController: AbortController | null = null
let loadTargetEnemyCounterController: AbortController | null = null
let loadTeamSynergyController: AbortController | null = null
let loadAllyPhaseController: AbortController | null = null
let loadEnemyPhaseController: AbortController | null = null

const loadVersionsData = async () => {
  if (isLoadingVersions.value) {
    loadVersionsController?.abort()
  }

  isLoadingVersions.value = true
  loadVersionsController = new AbortController()

  try {
    versions.value = (
      await api.getVersions({
        region: region.value,
        mode: mode.value,
        signal: loadVersionsController.signal
      })
    ).data

    if ((!version.value || !versions.value.includes(version.value)) && versions.value.length > 0) {
      version.value = versions.value[0]
    }
  } catch (error) {
    if ((error as any).name === 'CanceledError') {
      return
    }

    message.warning(t('Opgg.loadVersionsFailedMessage', { reason: (error as any).message }))
    log.warn('view:Opgg', `获取版本数据失败: ${(error as any).message}`, error)
  } finally {
    isLoadingVersions.value = false
  }
}

const loadTierData = async () => {
  if (isLoadingTier.value) {
    loadTierController?.abort()
  }

  isLoadingTier.value = true
  loadTierController = new AbortController()

  try {
    tierData.value = await api.getChampionsTier({
      region: region.value,
      mode: mode.value,
      tier: tier.value,
      version: version.value ?? undefined,
      signal: loadTierController.signal
    })
  } catch (error) {
    if ((error as any).name === 'CanceledError') {
      return
    }

    message.warning(t('Opgg.loadTierFailedMessage', { reason: (error as any).message }))
    log.warn('view:Opgg', `获取 tier 数据失败: ${(error as any).message}`, error)
  } finally {
    isLoadingTier.value = false
  }
}

const loadChampionData = async (shouldAutoApply: boolean) => {
  if (!championId.value) {
    return
  }

  if (isLoadingChampion.value) {
    loadChampionController?.abort()
  }

  isLoadingChampion.value = true
  loadChampionController = new AbortController()

  try {
    champion.value = await api.getChampion({
      region: region.value,
      mode: mode.value,
      tier: tier.value,
      version: version.value ?? undefined,
      id: championId.value,
      position: position.value,
      signal: loadChampionController.signal
    })

    // 这段逻辑先耦合在这里, 以后可能会被移除
    if (
      shouldAutoApply &&
      automation.value?.championId === championId.value &&
      isModeMatch.value &&
      ows.show
    ) {
      // any 大法好
      const anyChampion = champion.value as any

      const spells = anyChampion.data.summoner_spells
      const runes = anyChampion.data.runes

      let spellToApply = spells?.[0]
      let runesToApply = runes?.[0]

      if (os.frontendSettings.autoApplyRunes && runesToApply) {
        await setRunes(runesToApply)
      }

      if (os.frontendSettings.autoApplySpells && spellToApply) {
        await setSummonerSpells(spellToApply.ids)
      }

      if (os.frontendSettings.autoApplyItems) {
        await handleAddToItemSet()
      }
    }
  } catch (error) {
    if ((error as any).name === 'CanceledError') {
      return
    }

    message.warning(t('Opgg.loadChampionFailedMessage', { reason: (error as any).message }))
    log.warn('view:Opgg', `获取英雄数据失败: ${(error as any).message}`, error)
  } finally {
    isLoadingChampion.value = false
  }
}

let shouldStopLoading = false
const loadAll = async () => {
  try {
    champion.value = null
    tierData.value = null
    versions.value = []
    shouldStopLoading = false

    if (!shouldStopLoading) {
      await loadVersionsData()
    }
    if (!shouldStopLoading) {
      await loadTierData()
    }
    if (!shouldStopLoading) {
      await loadChampionData(false)
    }
  } catch {
  } finally {
  }
}

const loadSelfChampionMastery = async () => {
  const puuid = lcs.summoner.me?.puuid

  if (!puuid || lcs.connectionState !== 'connected') {
    selfChampionMastery.value = {}
    return
  }

  try {
    const { data } = await lc.api.championMastery.getPlayerChampionMastery(puuid)
    selfChampionMastery.value = data.reduce(
      (acc, mastery) => {
        acc[mastery.championId] = mastery
        return acc
      },
      {} as Record<number, Mastery>
    )
  } catch (error) {
    log.warn('view:Opgg', `获取英雄熟练度失败: ${(error as any).message}`, error)
    selfChampionMastery.value = {}
  }
}

const cancelAll = () => {
  shouldStopLoading = true
  loadVersionsController?.abort()
  loadTierController?.abort()
  loadChampionController?.abort()
}

const handleVersionChange = async (v: string) => {
  try {
    version.value = v
    await loadAll()
  } catch {}
}

const handleModeChange = async (m: ModeType) => {
  mode.value = m
  savedPreferences.value.mode = m
  await loadAll()
}

const handleRegionChange = async (r: RegionType) => {
  region.value = r
  savedPreferences.value.region = r
  await loadAll()
}

const handleTierChange = async (t: TierType) => {
  tier.value = t
  savedPreferences.value.tier = t
  await loadAll()
}

const handlePositionChange = async (p: PositionType) => {
  position.value = p
  savedPreferences.value.position = p
  champion.value = null
  await loadChampionData(false)
}

const handleToChampion = async (id: number, shouldAutoApply: boolean) => {
  currentTab.value = 'champion'
  championId.value = id
  champion.value = null
  await loadChampionData(shouldAutoApply)
}

const handleSelectCounterChampion = async (targetChampionId: number) => {
  const session = lcs.champSelect.session

  if (!session) {
    message.warning('当前不在英雄选择阶段')
    return
  }

  if (!isChampionAvailableForRecommendation(targetChampionId)) {
    message.warning('该英雄当前不可选择')
    return
  }

  const selfCellId = session.localPlayerCellId
  const pickAction = session.actions
    .flat()
    .find((a) => a.actorCellId === selfCellId && a.type === 'pick' && !a.completed)

  if (!pickAction) {
    message.warning('当前没有可执行的选择动作')
    return
  }

  if (session.myTeam.some((p) => p.puuid === 'mock-self')) {
    const self = session.myTeam.find((p) => p.cellId === selfCellId)
    if (self) {
      self.championPickIntent = targetChampionId
    }
    message.success(`已模拟选择 ${lcs.gameData.champions[targetChampionId]?.name || targetChampionId}`)
    return
  }

  try {
    if (pickAction.isInProgress) {
      await lc.api.champSelect.pickOrBan(targetChampionId, false, 'pick', pickAction.id)
    } else {
      await lc.api.champSelect.intentChampion(pickAction.id, targetChampionId)
    }

    message.success(`已选择 ${lcs.gameData.champions[targetChampionId]?.name || targetChampionId}`)
  } catch (error) {
    log.warn('view:Opgg', `选择 counter 英雄失败: ${(error as any).message}`, error)
    message.warning(`选择失败: ${(error as any).message}`)
  }
}

const openCounterPickMenu = (event: MouseEvent, targetChampionId: number) => {
  counterPickMenu.value = {
    show: true,
    x: event.clientX,
    y: event.clientY,
    championId: targetChampionId
  }
}

const counterPickMenuOptions = computed(() => [
  {
    label: `选择 ${lcs.gameData.champions[counterPickMenu.value.championId || -1]?.name || counterPickMenu.value.championId || ''}`,
    key: 'select'
  },
  {
    label: '查看详情',
    key: 'detail'
  }
])

const handleCounterPickMenuSelect = async (key: string) => {
  const targetChampionId = counterPickMenu.value.championId
  counterPickMenu.value.show = false

  if (!targetChampionId) {
    return
  }

  if (key === 'select') {
    await handleSelectCounterChampion(targetChampionId)
  } else if (key === 'detail') {
    await handleToChampion(targetChampionId, false)
  }
}

onMounted(() => {
  loadAll()
  loadSelfChampionMastery()
})

watch(
  () => [lcs.connectionState, lcs.summoner.me?.puuid] as const,
  () => loadSelfChampionMastery(),
  { immediate: false }
)

const championItem = computed(() => {
  return tierData.value?.data.find((c) => c.id === championId.value)
})

const modeOptions = computed(() => [
  { label: t('Opgg.modes.ranked'), value: 'ranked' },
  { label: t('Opgg.modes.aram'), value: 'aram' },
  { label: t('Opgg.modes.arena'), value: 'arena' },
  { label: t('Opgg.modes.nexus_blitz'), value: 'nexus_blitz' },
  { label: t('Opgg.modes.urf'), value: 'urf' }
])

const positionOptions = computed(() => [
  { label: t('Opgg.positions.top'), value: 'top' },
  { label: t('Opgg.positions.jungle'), value: 'jungle' },
  { label: t('Opgg.positions.mid'), value: 'mid' },
  { label: t('Opgg.positions.adc'), value: 'adc' },
  { label: t('Opgg.positions.support'), value: 'support' },
  { label: t('Opgg.positions.none'), value: 'none', disabled: mode.value === 'ranked' }
])

const regionOptions = computed(() => [
  { label: t('Opgg.regions.global'), value: 'global' },
  { label: t('Opgg.regions.na'), value: 'na' },
  { label: t('Opgg.regions.euw'), value: 'euw' },
  { label: t('Opgg.regions.kr'), value: 'kr' },
  { label: t('Opgg.regions.br'), value: 'br' },
  { label: t('Opgg.regions.eune'), value: 'eune' },
  { label: t('Opgg.regions.jp'), value: 'jp' },
  { label: t('Opgg.regions.lan'), value: 'lan' },
  { label: t('Opgg.regions.las'), value: 'las' },
  { label: t('Opgg.regions.oce'), value: 'oce' },
  { label: t('Opgg.regions.tr'), value: 'tr' },
  { label: t('Opgg.regions.ru'), value: 'ru' },
  { label: t('Opgg.regions.sg'), value: 'sg' },
  { label: t('Opgg.regions.id'), value: 'id' },
  { label: t('Opgg.regions.ph'), value: 'ph' },
  { label: t('Opgg.regions.th'), value: 'th' },
  { label: t('Opgg.regions.vn'), value: 'vn' },
  { label: t('Opgg.regions.tw'), value: 'tw' },
  { label: t('Opgg.regions.me'), value: 'me' }
])

const tierOptions = computed(() => [
  { label: t('Opgg.tiers.all'), value: 'all' },
  { label: '黑铁', value: 'iron' },
  { label: '青铜', value: 'bronze' },
  { label: '白银', value: 'silver' },
  { label: '黄金', value: 'gold' },
  { label: '铂金', value: 'platinum' },
  { label: '翡翠', value: 'emerald' },
  { label: '钻石', value: 'diamond' },
  { label: t('Opgg.tiers.master'), value: 'master' },
  { label: t('Opgg.tiers.grandmaster'), value: 'grandmaster' },
  { label: t('Opgg.tiers.challenger'), value: 'challenger' }
])

const versionOptions = computed(() => {
  return versions.value.map((v) => ({ label: v, value: v }))
})

const getPositionName = (p: PositionType | string | null | undefined) => {
  if (!p) {
    return null
  }

  switch (p) {
    case 'top':
      return 'TOP'
    case 'jungle':
      return 'JUNGLE'
    case 'mid':
    case 'middle':
      return 'MID'
    case 'adc':
    case 'bottom':
      return 'ADC'
    case 'support':
    case 'utility':
      return 'SUPPORT'
    default:
      return null
  }
}

const toPositionTypeFromAssignedPosition = (
  assignedPosition: string | null | undefined
): PositionType | null => {
  switch (assignedPosition) {
    case 'top':
      return 'top'
    case 'jungle':
      return 'jungle'
    case 'middle':
    case 'mid':
      return 'mid'
    case 'bottom':
    case 'adc':
      return 'adc'
    case 'utility':
    case 'support':
      return 'support'
    default:
      return null
  }
}

const getPositionData = (championRow: any, targetPosition: PositionType | string) => {
  const positionName = getPositionName(targetPosition)

  if (!positionName || !championRow?.positions) {
    return null
  }

  return (
    championRow.positions.find((p: any) => p.name?.toUpperCase() === positionName) || null
  )
}

const isChampionAvailableForRecommendation = (championId: number) => {
  const session = lcs.champSelect.session

  if (!session) {
    return true
  }

  if (
    lcs.champSelect.currentPickableChampionIds.size &&
    !lcs.champSelect.currentPickableChampionIds.has(championId)
  ) {
    return false
  }

  const selectedChampionIds = [...session.myTeam, ...session.theirTeam]
    .flatMap((p) => [p.championId, p.championPickIntent])
    .filter((id) => id > 0)

  const bannedChampionIds = [...session.bans.myTeamBans, ...session.bans.theirTeamBans].filter(
    (id) => id > 0
  )

  return !selectedChampionIds.includes(championId) && !bannedChampionIds.includes(championId)
}

const formatMasteryPoints = (points: number) => {
  if (points >= 100000) {
    return `${Math.round(points / 1000)}k`
  }

  if (points >= 10000) {
    return `${(points / 1000).toFixed(1)}k`
  }

  return points.toString()
}

const toCounterChampionWinRate = (counter: { win?: number; play?: number } | null | undefined) => {
  if (!counter || !counter.play) {
    return 0
  }

  return 1 - (counter.win || 0) / counter.play
}

const POSITION_SLOT_ORDER: PositionType[] = ['top', 'jungle', 'mid', 'adc', 'support']

const counterPickEnemies = computed(() => {
  if (
    mode.value !== 'ranked' ||
    position.value === 'none' ||
    position.value === 'all' ||
    !tierData.value ||
    !lcs.champSelect.session
  ) {
    return []
  }

  const championRows = tierData.value.data as any[]
  const championRowById = new Map<number, any>(championRows.map((row) => [row.id, row]))
  const enemyChampionIds = [
    ...new Set(
      lcs.champSelect.session.theirTeam
        .map((p) => p.championId || p.championPickIntent)
        .filter((id) => id > 0)
    )
  ]

  return enemyChampionIds
    .map((championId) => {
      const row = championRowById.get(championId)
      const positionData = getPositionData(row, position.value)

      return {
        championId,
        pickRate: positionData?.stats?.pick_rate || 0
      }
    })
    .toSorted((a, b) => b.pickRate - a.pickRate)
})

const getChampionPositionPickRate = (championId: number, targetPosition: PositionType) => {
  if (!tierData.value) {
    return 0
  }

  const championRow = (tierData.value.data as any[]).find((row) => row.id === championId)
  const positionData = getPositionData(championRow, targetPosition)

  return positionData?.stats?.pick_rate || 0
}

const enemyChampionSlots = computed(() => {
  const session = lcs.champSelect.session

  return POSITION_SLOT_ORDER.map((slotPosition) => {
    const player = session?.theirTeam.find(
      (item) => toPositionTypeFromAssignedPosition(item.assignedPosition) === slotPosition
    )
    const championId = player?.championId || player?.championPickIntent || null

    return {
      position: slotPosition,
      championId,
      pickRate: championId ? getChampionPositionPickRate(championId, position.value) : 0
    }
  })
})

const allyChampionSlots = computed(() => {
  const session = lcs.champSelect.session

  return POSITION_SLOT_ORDER.map((slotPosition) => {
    const player = session?.myTeam.find((item) => {
      if (item.cellId === session.localPlayerCellId) {
        return position.value === slotPosition
      }

      return toPositionTypeFromAssignedPosition(item.assignedPosition) === slotPosition
    })
    const championId = player?.championId || player?.championPickIntent || null

    return {
      position: slotPosition,
      championId
    }
  })
})

const counterPickTargetEnemyId = computed(() => {
  const enemies = counterPickEnemies.value

  const selectedEnemy = enemies.find((enemy) => enemy.championId === selectedCounterPickEnemyId.value)
  if (selectedEnemy) {
    return selectedEnemy.championId
  }

  if (enemyBotLanePeer.value) {
    return enemyBotLanePeer.value.championId
  }

  return (
    enemies[0]?.championId ||
    null
  )
})

const botLanePartner = computed(() => {
  const session = lcs.champSelect.session

  if (!session || (position.value !== 'adc' && position.value !== 'support')) {
    return null
  }

  const selfCellId = session.localPlayerCellId
  const team = session.myTeam.filter((player) => player.cellId !== selfCellId)
  const partner =
    position.value === 'adc'
      ? team.find((player) => player.assignedPosition === 'utility')
      : team.find((player) => player.assignedPosition === 'bottom')

  const championId = partner?.championId || partner?.championPickIntent || 0

  if (!partner || championId <= 0) {
    return null
  }

  return {
    championId,
    position: position.value === 'adc' ? ('support' as PositionType) : ('adc' as PositionType),
    selfPosition: position.value
  }
})

const enemyBotLanePeer = computed(() => {
  const session = lcs.champSelect.session

  if (!session || (position.value !== 'adc' && position.value !== 'support')) {
    return null
  }

  const targetAssignedPosition = position.value === 'adc' ? 'bottom' : 'utility'
  const peer = session.theirTeam.find((player) => player.assignedPosition === targetAssignedPosition)
  const championId = peer?.championId || peer?.championPickIntent || 0

  if (!peer || championId <= 0) {
    return null
  }

  return {
    championId,
    position: position.value
  }
})

const alliedSelectedChampions = computed(() => {
  const session = lcs.champSelect.session

  if (
    !session ||
    mode.value !== 'ranked' ||
    position.value === 'none' ||
    position.value === 'all'
  ) {
    return []
  }

  return session.myTeam
    .filter((player) => player.cellId !== session.localPlayerCellId)
    .map((player) => {
      const championId = player.championId || player.championPickIntent || 0
      const partnerPosition = toPositionTypeFromAssignedPosition(player.assignedPosition)

      if (championId <= 0 || !partnerPosition) {
        return null
      }

      return {
        championId,
        partnerPosition,
        selfPosition: position.value
      }
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
})

const selectedTeamChampionsForPhase = computed(() => {
  const session = lcs.champSelect.session

  if (
    !session ||
    mode.value !== 'ranked' ||
    position.value === 'none' ||
    position.value === 'all'
  ) {
    return []
  }

  return session.myTeam
    .map((player) => {
      const championId = player.championId || player.championPickIntent || 0
      const championPosition =
        player.cellId === session.localPlayerCellId
          ? position.value
          : toPositionTypeFromAssignedPosition(player.assignedPosition)

      if (championId <= 0 || !championPosition) {
        return null
      }

      return {
        championId,
        position: championPosition
      }
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
})

const selectedEnemyChampionsForPhase = computed(() => {
  const session = lcs.champSelect.session

  if (
    !session ||
    mode.value !== 'ranked' ||
    position.value === 'none' ||
    position.value === 'all'
  ) {
    return []
  }

  return session.theirTeam
    .map((player) => {
      const championId = player.championId || player.championPickIntent || 0
      const championPosition = toPositionTypeFromAssignedPosition(player.assignedPosition)

      if (championId <= 0 || !championPosition) {
        return null
      }

      return {
        championId,
        position: championPosition
      }
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
})

const analyzePhaseProfiles = (
  profiles: Array<{
    gameLengths: Array<{ game_length: number; rate: number; average: number; rank: number }>
  }>
) => {
  const validProfiles = profiles.filter((profile) => profile.gameLengths.length)

  if (!validProfiles.length) {
    return null
  }

  const averageRate = (predicate: (gameLength: number) => boolean) => {
    const rates = validProfiles.flatMap((profile) =>
      profile.gameLengths
        .filter((item) => predicate(item.game_length))
        .map((item) => item.rate)
    )

    if (!rates.length) {
      return 0
    }

    return rates.reduce((sum, rate) => sum + rate, 0) / rates.length
  }

  const early = averageRate((gameLength) => gameLength <= 25)
  const mid = averageRate((gameLength) => gameLength > 25 && gameLength <= 35)
  const late = averageRate((gameLength) => gameLength > 35)
  const values = [
    { key: 'early', label: '前期阵容', value: early },
    { key: 'mid', label: '中期阵容', value: mid },
    { key: 'late', label: '后期阵容', value: late }
  ]
  const sorted = values.toSorted((a, b) => b.value - a.value)
  const spread = sorted[0].value - sorted[2].value
  const label = spread < 0.012 ? '均衡阵容' : sorted[0].label
  const minRate = Math.min(early, mid, late)
  const normalized = [early, mid, late].map((rate) => Math.max(0.08, rate - minRate + 0.02))
  const total = normalized.reduce((sum, rate) => sum + rate, 0)

  return {
    label,
    phase: toShortPhaseLabel(label),
    early,
    mid,
    late,
    bestRate: sorted[0].value,
    earlyScore: (normalized[0] / total) * 100,
    midScore: (normalized[1] / total) * 100,
    lateScore: (normalized[2] / total) * 100
  }
}

const toShortPhaseLabel = (label: string): { key: 'early' | 'mid' | 'late' | 'balanced'; label: string } => {
  if (label.includes('前期')) {
    return { key: 'early', label: '前' }
  }

  if (label.includes('中期')) {
    return { key: 'mid', label: '中' }
  }

  if (label.includes('后期')) {
    return { key: 'late', label: '后' }
  }

  return { key: 'balanced', label: '均' }
}

const phaseCssClass = (phase?: ReturnType<typeof toShortPhaseLabel>) =>
  phase ? `phase-${phase.key}` : ''

const allyPhaseAnalysis = computed(() => analyzePhaseProfiles(allyPhaseChampionDetails.value))

const enemyPhaseAnalysis = computed(() => analyzePhaseProfiles(enemyPhaseChampionDetails.value))

const allyChampionPhaseLabels = computed(() => {
  const labels = new Map<number, ReturnType<typeof toShortPhaseLabel>>()

  allyPhaseChampionDetails.value.forEach((profile) => {
    const analysis = analyzePhaseProfiles([profile])

    if (analysis) {
      labels.set(profile.championId, toShortPhaseLabel(analysis.label))
    }
  })

  return labels
})

const enemyChampionPhaseLabels = computed(() => {
  const labels = new Map<number, ReturnType<typeof toShortPhaseLabel>>()

  enemyPhaseChampionDetails.value.forEach((profile) => {
    const analysis = analyzePhaseProfiles([profile])

    if (analysis) {
      labels.set(profile.championId, toShortPhaseLabel(analysis.label))
    }
  })

  return labels
})

const allyChampionPhaseDetails = computed(() => {
  const details = new Map<number, NonNullable<ReturnType<typeof analyzePhaseProfiles>>>()

  allyPhaseChampionDetails.value.forEach((profile) => {
    const analysis = analyzePhaseProfiles([profile])

    if (analysis) {
      details.set(profile.championId, analysis)
    }
  })

  return details
})

const enemyChampionPhaseDetails = computed(() => {
  const details = new Map<number, NonNullable<ReturnType<typeof analyzePhaseProfiles>>>()

  enemyPhaseChampionDetails.value.forEach((profile) => {
    const analysis = analyzePhaseProfiles([profile])

    if (analysis) {
      details.set(profile.championId, analysis)
    }
  })

  return details
})

const formatChampionPhaseTitle = (
  championId: number,
  positionLabel: string,
  pickRate: number | null,
  phase: NonNullable<ReturnType<typeof analyzePhaseProfiles>> | undefined
) => {
  const name = lcs.gameData.champions[championId]?.name || championId
  const pickRateText = pickRate === null ? '' : ` pick rate ${(pickRate * 100).toFixed(2)}%`

  if (!phase) {
    return `${name} ${positionLabel}${pickRateText}`
  }

  return `${name} ${positionLabel}${pickRateText} | ${phase.label}：前期 ${(phase.early * 100).toFixed(1)}%，中期 ${(phase.mid * 100).toFixed(1)}%，后期 ${(phase.late * 100).toFixed(1)}%`
}

const teamSynergyPartnerPositions = computed(() => {
  switch (position.value) {
    case 'top':
      return new Set<PositionType>(['jungle'])
    case 'jungle':
      return new Set<PositionType>(['top', 'mid'])
    case 'mid':
      return new Set<PositionType>(['jungle'])
    case 'adc':
      return new Set<PositionType>(['support'])
    case 'support':
      return new Set<PositionType>(['adc'])
    default:
      return new Set<PositionType>()
  }
})

const teamSynergyPartnerLabel = computed(() => {
  switch (position.value) {
    case 'top':
      return '上野'
    case 'jungle':
      return '野中上'
    case 'mid':
      return '中野'
    case 'adc':
      return '下辅'
    case 'support':
      return '辅射'
    default:
      return '团队'
  }
})

const alliedSynergyPartners = computed(() => {
  const partnerPositions = teamSynergyPartnerPositions.value

  if (!partnerPositions.size) {
    return []
  }

  return alliedSelectedChampions.value.filter((ally) => partnerPositions.has(ally.partnerPosition))
})

const teamRecommendationContext = computed(() => {
  if (
    mode.value !== 'ranked' ||
    position.value === 'none' ||
    position.value === 'all' ||
    !tierData.value ||
    !lcs.champSelect.session
  ) {
    return null
  }

  const aggregated = new Map<
    number,
    {
      championId: number
      partnerChampionId: number | null
      matchupWinRate: number
      matchupGames: number
      synergyWinRate: number | null
      synergyGames: number
      masteryLevel: number
      masteryPoints: number
      partnerCount: number
      bestPartnerWinRate: number
    }
  >()

  teamSynergyDetails.value.forEach((detail) => {
    if (detail.selfPosition !== position.value) {
      return
    }

    detail.synergies.forEach((synergy) => {
      const championId = synergy.synergy_champion_id

      if (!isChampionAvailableForRecommendation(championId)) {
        return
      }

      const mastery = selfChampionMastery.value[championId]
      const current = aggregated.get(championId)
      const play = synergy.play || 0
      const weightedWinRate = synergy.win_rate * Math.max(1, play)

      if (current) {
        const nextGames = current.synergyGames + play
        current.synergyWinRate =
          nextGames > 0
            ? ((current.synergyWinRate || 0) * current.synergyGames + weightedWinRate) / nextGames
            : Math.max(current.synergyWinRate || 0, synergy.win_rate)
        current.matchupWinRate = current.synergyWinRate || current.matchupWinRate
        current.synergyGames = nextGames
        current.matchupGames = nextGames
        current.partnerCount += 1

        if (synergy.win_rate > current.bestPartnerWinRate) {
          current.partnerChampionId = detail.partnerChampionId
          current.bestPartnerWinRate = synergy.win_rate
        }
      } else {
        aggregated.set(championId, {
          championId,
          partnerChampionId: detail.partnerChampionId,
          matchupWinRate: synergy.win_rate,
          matchupGames: play,
          synergyWinRate: synergy.win_rate,
          synergyGames: play,
          masteryLevel: mastery?.championLevel || 0,
          masteryPoints: mastery?.championPoints || 0,
          partnerCount: 1,
          bestPartnerWinRate: synergy.win_rate
        })
      }
    })
  })

  const recommendations = Array.from(aggregated.values()).toSorted((a, b) => {
    if ((b.synergyWinRate || 0) !== (a.synergyWinRate || 0)) {
      return (b.synergyWinRate || 0) - (a.synergyWinRate || 0)
    }

    return b.synergyGames - a.synergyGames
  })

  return {
    recommendations
  }
})

const counterPickContext = computed(() => {
  if (
    mode.value !== 'ranked' ||
    position.value === 'none' ||
    position.value === 'all' ||
    !tierData.value ||
    !lcs.champSelect.session
  ) {
    return null
  }

  const positionLabel = t(`Opgg.positions.${position.value}`) || position.value
  const championRows = tierData.value.data as any[]
  const championRowById = new Map<number, any>(championRows.map((row) => [row.id, row]))
  const enemies = counterPickEnemies.value
  const targetEnemy = enemies.find((enemy) => enemy.championId === counterPickTargetEnemyId.value)

  if (!targetEnemy) {
    return {
      positionLabel,
      enemies,
      targetEnemy: null,
      counters: [],
      recommendations: [],
      visibleCounters: []
    }
  }

  const targetEnemyRow = championRowById.get(targetEnemy.championId)
  const targetEnemyPositionData = getPositionData(targetEnemyRow, position.value)
  const synergyMap = new Map<number, OpggChampionSynergy>()
  teamSynergyDetails.value
    .filter((detail) => detail.selfPosition === position.value)
    .forEach((detail) => {
      detail.synergies.forEach((synergy) => {
        const existing = synergyMap.get(synergy.synergy_champion_id)

        if (!existing || synergy.win_rate > existing.win_rate) {
          synergyMap.set(synergy.synergy_champion_id, synergy)
        }
      })
    })

  const summaryCounters = ((targetEnemyPositionData?.counters || []) as Array<{
    champion_id: number
    play: number
    win: number
  }>)
    .map((counter) => {
      const matchupWinRate = toCounterChampionWinRate(counter)
      const mastery = selfChampionMastery.value[counter.champion_id]
      const synergy = synergyMap.get(counter.champion_id)

      return {
        championId: counter.champion_id,
        partnerChampionId: null,
        matchupWinRate,
        matchupGames: counter?.play || 0,
        synergyWinRate: synergy?.win_rate || null,
        synergyGames: synergy?.play || 0,
        masteryLevel: mastery?.championLevel || 0,
        masteryPoints: mastery?.championPoints || 0
      }
    })
    .filter((item) => item.matchupGames > 0)

  const detailedCounters =
    targetEnemyCounterDetails.value?.enemyChampionId === targetEnemy.championId
      ? targetEnemyCounterDetails.value.counters
      : []

  const expandedCounters = detailedCounters
    .map((counter) => {
      const mastery = selfChampionMastery.value[counter.champion_id]
      const synergy = synergyMap.get(counter.champion_id)

      return {
        championId: counter.champion_id,
        partnerChampionId: null,
        matchupWinRate: toCounterChampionWinRate(counter),
        matchupGames: counter.play || 0,
        synergyWinRate: synergy?.win_rate || null,
        synergyGames: synergy?.play || 0,
        masteryLevel: mastery?.championLevel || 0,
        masteryPoints: mastery?.championPoints || 0
      }
    })
    .filter((item) => item.matchupGames > 0)
    .toSorted((a, b) => {
      if (b.matchupWinRate !== a.matchupWinRate) {
        return b.matchupWinRate - a.matchupWinRate
      }

      return b.matchupGames - a.matchupGames
    })

  const recommendationSourceCounters = expandedCounters.length ? expandedCounters : summaryCounters

  const rankedCounters = recommendationSourceCounters.toSorted((a, b) => {
    if (b.matchupWinRate !== a.matchupWinRate) {
      return b.matchupWinRate - a.matchupWinRate
    }

    return b.matchupGames - a.matchupGames
  })

  const pickableCounters = rankedCounters.filter((item) =>
    isChampionAvailableForRecommendation(item.championId)
  )
  const highWinRateCandidates = pickableCounters.filter((item) => item.matchupWinRate >= 0.52)

  const hasMeaningfulMastery = highWinRateCandidates.some(
    (item) => item.masteryPoints >= 30000 || item.masteryLevel >= 4
  )

  const recommendations = (
    hasMeaningfulMastery
      ? highWinRateCandidates
          .map((item) => {
            const masteryBonus = Math.min(
              0.04,
              Math.log10(item.masteryPoints + 1) / 150 + item.masteryLevel / 1000
            )
            const synergyBonus =
              item.synergyWinRate !== null ? Math.max(-0.04, Math.min(0.04, item.synergyWinRate - 0.5)) : 0

            return {
              ...item,
              score: item.matchupWinRate * 0.65 + (item.synergyWinRate || 0.5) * 0.35 + masteryBonus + synergyBonus
            }
          })
          .toSorted((a, b) => {
            if (b.score !== a.score) {
              return b.score - a.score
            }

            if (b.matchupWinRate !== a.matchupWinRate) {
              return b.matchupWinRate - a.matchupWinRate
            }

            return b.masteryPoints - a.masteryPoints
          })
      : pickableCounters.length
        ? pickableCounters
            .map((item) => ({
              ...item,
              score: item.matchupWinRate * 0.65 + (item.synergyWinRate || 0.5) * 0.35
            }))
            .toSorted((a, b) => {
              if (b.score !== a.score) {
                return b.score - a.score
              }

              return b.matchupWinRate - a.matchupWinRate
            })
        : rankedCounters
  ).slice(0, 6)

  return {
    positionLabel,
    enemies,
    targetEnemy,
    counters: expandedCounters,
    recommendations,
    visibleCounters: isCounterPickExpanded.value ? expandedCounters : recommendations
  }
})

const tierFallbackRecommendationItems = computed(() => {
  if (!tierData.value || position.value === 'none' || position.value === 'all') {
    return []
  }

  return (tierData.value.data as any[])
    .map((row) => {
      const positionData = getPositionData(row, position.value)
      const stats = positionData?.stats
      const mastery = selfChampionMastery.value[row.id]

      return {
        championId: row.id,
        partnerChampionId: null,
        matchupWinRate: stats?.win_rate || 0,
        matchupGames: 0,
        synergyWinRate: null,
        synergyGames: 0,
        masteryLevel: mastery?.championLevel || 0,
        masteryPoints: mastery?.championPoints || 0,
        tier: stats?.tier_data?.tier ?? Infinity,
        rank: stats?.tier_data?.rank ?? Infinity,
        pickRate: stats?.pick_rate || 0
      }
    })
    .filter(
      (item) =>
        item.matchupWinRate > 0 &&
        item.tier <= 1 &&
        isChampionAvailableForRecommendation(item.championId)
    )
    .toSorted((a, b) => {
      if (a.tier !== b.tier) {
        return a.tier - b.tier
      }

      if (a.rank !== b.rank) {
        return a.rank - b.rank
      }

      return b.pickRate - a.pickRate
    })
})

const visibleSoloRecommendationItems = computed(() => {
  const context = counterPickContext.value

  if (context?.visibleCounters.length) {
    return isCounterPickExpanded.value ? context.visibleCounters : context.visibleCounters.slice(0, 6)
  }

  const fallback = tierFallbackRecommendationItems.value
  return isCounterPickExpanded.value ? fallback.slice(0, 20) : fallback.slice(0, 6)
})

const visibleTeamRecommendationItems = computed(() => {
  const items = teamRecommendationContext.value?.recommendations || []
  return isCounterPickExpanded.value ? items.slice(0, 20) : items.slice(0, 6)
})

const visibleRecommendationGroups = computed(() => {
  const groups: Array<{
    key: string
    title: string
    description: string
    items: RecommendationItem[]
  }> = []
  const soloItems = visibleSoloRecommendationItems.value
  const teamItems = visibleTeamRecommendationItems.value
  const targetEnemy = counterPickContext.value?.targetEnemy

  if (soloItems.length) {
    groups.push({
      key: 'solo',
      title: '单人推荐',
      description: targetEnemy
        ? `基于 ${lcs.gameData.champions[targetEnemy.championId]?.name || targetEnemy.championId} 对位`
        : '基于当前分路 T0/T1',
      items: soloItems
    })
  }

  if (teamItems.length) {
    groups.push({
      key: 'team',
      title: `团队推荐（${teamSynergyPartnerLabel.value}）`,
      description: `基于 ${alliedSynergyPartners.value.length} 个相关友方英雄组合`,
      items: teamItems
    })
  }

  return groups
})

watch(
  () => counterPickEnemies.value.map((enemy) => enemy.championId).join(','),
  () => {
    const enemies = counterPickEnemies.value

    if (
      selectedCounterPickEnemyId.value &&
      !enemies.some((enemy) => enemy.championId === selectedCounterPickEnemyId.value)
    ) {
      selectedCounterPickEnemyId.value = null
    }
  }
)

watch(
  () =>
    [
      counterPickTargetEnemyId.value,
      mode.value,
      position.value,
      region.value,
      tier.value,
      version.value
    ] as const,
  async ([targetEnemyChampionId]) => {
    loadTargetEnemyCounterController?.abort()
    targetEnemyCounterDetails.value = null
    isLoadingTargetEnemyCounters.value = false

    if (
      !targetEnemyChampionId ||
      mode.value !== 'ranked' ||
      position.value === 'none' ||
      position.value === 'all'
    ) {
      return
    }

    const controller = new AbortController()
    loadTargetEnemyCounterController = controller
    isLoadingTargetEnemyCounters.value = true

    try {
      const data = await api.getChampion({
        region: region.value,
        mode: mode.value,
        tier: tier.value,
        version: version.value ?? undefined,
        id: targetEnemyChampionId,
        position: position.value,
        signal: controller.signal
      })

      targetEnemyCounterDetails.value = {
        enemyChampionId: targetEnemyChampionId,
        counters: ((data as any).data?.counters || []) as Array<{
          champion_id: number
          play: number
          win: number
        }>
      }
    } catch (error) {
      if ((error as any).name === 'CanceledError') {
        return
      }

      log.warn('view:Opgg', `获取完整 counter 数据失败: ${(error as any).message}`, error)
    } finally {
      if (loadTargetEnemyCounterController === controller) {
        loadTargetEnemyCounterController = null
        isLoadingTargetEnemyCounters.value = false
      }
    }
  },
  { immediate: true }
)

watch(
  () =>
    [
      alliedSynergyPartners.value
        .map((partner) => `${partner.championId}:${partner.partnerPosition}:${partner.selfPosition}`)
        .join(','),
      mode.value,
      position.value,
      region.value,
      tier.value,
      version.value
    ] as const,
  async () => {
    loadTeamSynergyController?.abort()
    teamSynergyDetails.value = []
    isLoadingTeamSynergies.value = false

    const partners = alliedSynergyPartners.value

    if (
      !partners.length ||
      mode.value !== 'ranked' ||
      position.value === 'none' ||
      position.value === 'all'
    ) {
      return
    }

    const controller = new AbortController()
    loadTeamSynergyController = controller
    isLoadingTeamSynergies.value = true

    try {
      const selfPositionName = getPositionName(position.value)
      const results = await Promise.all(
        partners.map(async (partner) => {
          const data = await api.getChampionSynergies({
            region: region.value,
            tier: tier.value,
            version: version.value ?? undefined,
            id: partner.championId,
            position: partner.partnerPosition,
            signal: controller.signal
          })

          return {
            partnerChampionId: partner.championId,
            partnerPosition: partner.partnerPosition,
            selfPosition: partner.selfPosition,
            synergies: data.data.filter(
              (synergy) => synergy.synergy_position.toUpperCase() === selfPositionName
            )
          }
        })
      )

      if (loadTeamSynergyController === controller) {
        teamSynergyDetails.value = results
      }
    } catch (error) {
      if ((error as any).name === 'CanceledError') {
        return
      }

      log.warn('view:Opgg', `获取团队组合数据失败: ${(error as any).message}`, error)
    } finally {
      if (loadTeamSynergyController === controller) {
        loadTeamSynergyController = null
        isLoadingTeamSynergies.value = false
      }
    }
  },
  { immediate: true }
)

watch(
  () =>
    [
      selectedTeamChampionsForPhase.value
        .map((champion) => `${champion.championId}:${champion.position}`)
        .join(','),
      mode.value,
      region.value,
      tier.value,
      version.value
    ] as const,
  async () => {
    loadAllyPhaseController?.abort()
    allyPhaseChampionDetails.value = []

    const champions = selectedTeamChampionsForPhase.value

    if (!champions.length || mode.value !== 'ranked') {
      return
    }

    const controller = new AbortController()
    loadAllyPhaseController = controller

    try {
      const results = await Promise.all(
        champions.map(async (champion) => {
          const data = await api.getChampion({
            region: region.value,
            mode: mode.value,
            tier: tier.value,
            version: version.value ?? undefined,
            id: champion.championId,
            position: champion.position,
            signal: controller.signal
          })

          return {
            championId: champion.championId,
            position: champion.position,
            gameLengths: ((data as any).data?.game_lengths || []) as Array<{
              game_length: number
              rate: number
              average: number
              rank: number
            }>
          }
        })
      )

      if (loadAllyPhaseController === controller) {
        allyPhaseChampionDetails.value = results
      }
    } catch (error) {
      if ((error as any).name === 'CanceledError') {
        return
      }

      log.warn('view:Opgg', `获取阵容节奏数据失败: ${(error as any).message}`, error)
    } finally {
      if (loadAllyPhaseController === controller) {
        loadAllyPhaseController = null
      }
    }
  },
  { immediate: true }
)

watch(
  () =>
    [
      selectedEnemyChampionsForPhase.value
        .map((champion) => `${champion.championId}:${champion.position}`)
        .join(','),
      mode.value,
      region.value,
      tier.value,
      version.value
    ] as const,
  async () => {
    loadEnemyPhaseController?.abort()
    enemyPhaseChampionDetails.value = []

    const champions = selectedEnemyChampionsForPhase.value

    if (!champions.length || mode.value !== 'ranked') {
      return
    }

    const controller = new AbortController()
    loadEnemyPhaseController = controller

    try {
      const results = await Promise.all(
        champions.map(async (champion) => {
          const data = await api.getChampion({
            region: region.value,
            mode: mode.value,
            tier: tier.value,
            version: version.value ?? undefined,
            id: champion.championId,
            position: champion.position,
            signal: controller.signal
          })

          return {
            championId: champion.championId,
            position: champion.position,
            gameLengths: ((data as any).data?.game_lengths || []) as Array<{
              game_length: number
              rate: number
              average: number
              rank: number
            }>
          }
        })
      )

      if (loadEnemyPhaseController === controller) {
        enemyPhaseChampionDetails.value = results
      }
    } catch (error) {
      if ((error as any).name === 'CanceledError') {
        return
      }

      log.warn('view:Opgg', `获取敌方阵容节奏数据失败: ${(error as any).message}`, error)
    } finally {
      if (loadEnemyPhaseController === controller) {
        loadEnemyPhaseController = null
      }
    }
  },
  { immediate: true }
)

if (import.meta.env.DEV) {
  ;(window as any).__akariOpggMockCounterPick = (options?: {
    position?: PositionType
    enemyChampionId?: number
    enemyChampionIds?: number[]
    allyChampionIds?: number[]
  }) => {
    const targetPosition = options?.position || 'top'
    const enemyChampionIds = options?.enemyChampionIds || [
      options?.enemyChampionId || 106, // Volibear
      267, // Nami
      18, // Tristana
      157, // Yasuo
      54 // Malphite
    ]

    mode.value = 'ranked'
    position.value = targetPosition

    const mockChampSelect = lcs.champSelect as any
    const allyChampionByPosition = new Map<string, number>([
      ['top', 86], // Garen
      ['jungle', 64], // Lee Sin
      ['middle', 103], // Ahri
      ['bottom', 18], // Tristana
      ['utility', 267] // Nami
    ])
    const allyPositions = ['top', 'jungle', 'middle', 'bottom', 'utility'].filter(
      (assignedPosition) =>
        toPositionTypeFromAssignedPosition(assignedPosition) !== targetPosition
    )
    options?.allyChampionIds?.forEach((championId, index) => {
      if (allyPositions[index]) {
        allyChampionByPosition.set(allyPositions[index], championId)
      }
    })
    const makeMockPlayer = (
      assignedPosition: string,
      cellId: number,
      championId: number,
      puuid: string
    ) => ({
      assignedPosition,
      cellId,
      championId,
      championPickIntent: 0,
      entitledFeatureType: '',
      nameVisibilityType: '',
      obfuscatedPuuid: '',
      obfuscatedSummonerId: 0,
      playerType: 'PLAYER',
      puuid,
      selectedSkinId: 0,
      spell1Id: 4,
      spell2Id: assignedPosition === 'utility' ? 14 : 12,
      summonerId: cellId,
      team: 1,
      wardSkinId: 0
    })
    const mockAllies = allyPositions.map((assignedPosition, index) =>
      makeMockPlayer(
        assignedPosition,
        2 + index,
        allyChampionByPosition.get(assignedPosition) || 0,
        `mock-ally-${assignedPosition}`
      )
    )

    mockChampSelect.session = {
      allowDuplicatePicks: false,
      allowLockedEvents: false,
      allowBattleBoost: false,
      allowRerolling: false,
      allowSkinSelection: true,
      allowSubsetChampionPicks: false,
      benchChampions: [],
      benchEnabled: false,
      boostableSkinCount: 0,
      counter: 0,
      entitledFeatureState: {
        additionalRerolls: 0,
        unlockedSkinIds: []
      },
      gameId: 1,
      lockedEventIndex: -1,
      pickOrderSwaps: [],
      recoveryCounter: 0,
      rerollsRemaining: 0,
      skipChampionSelect: false,
      hasSimultaneousBans: false,
      hasSimultaneousPicks: false,
      isCustomGame: false,
      isSpectating: false,
      localPlayerCellId: 1,
      actions: [
        [
          {
            actorCellId: 1,
            championId: 0,
            completed: false,
            id: 1,
            isAllyAction: true,
            isInProgress: true,
            pickTurn: 1,
            type: 'pick'
          }
        ]
      ],
      bans: {
        myTeamBans: [],
        theirTeamBans: [],
        numBans: 0
      },
      chatDetails: {
        chatRoomName: '',
        chatRoomPassword: '',
        multiUserChatJWT: ''
      },
      myTeam: [
        {
          assignedPosition: targetPosition,
          cellId: 1,
          championId: 0,
          championPickIntent: 0,
          entitledFeatureType: '',
          nameVisibilityType: '',
          obfuscatedPuuid: '',
          obfuscatedSummonerId: 0,
          playerType: 'PLAYER',
          puuid: 'mock-self',
          selectedSkinId: 0,
          spell1Id: 4,
          spell2Id: 12,
          summonerId: 1,
          team: 1,
          wardSkinId: 0
        },
        ...mockAllies
      ],
      theirTeam: enemyChampionIds.map((championId, index) => ({
        assignedPosition: ['top', 'utility', 'bottom', 'middle', 'jungle'][index] || '',
        cellId: 6 + index,
        championId,
        championPickIntent: 0,
        entitledFeatureType: '',
        nameVisibilityType: '',
        obfuscatedPuuid: '',
        obfuscatedSummonerId: 0,
        playerType: 'PLAYER',
        puuid: `mock-enemy-${index}`,
        selectedSkinId: 0,
        spell1Id: 4,
        spell2Id: 12,
        summonerId: 6 + index,
        team: 2,
        wardSkinId: 0
      })),
      timer: {
        adjustedTimeLeftInPhase: 30000,
        internalNowInEpochMs: Date.now(),
        isInfinite: false,
        phase: 'BAN_PICK',
        totalTimeInPhase: 30000
      },
      trades: []
    }

    mockChampSelect.currentPickableChampionIds = new Set()
    mockChampSelect.disabledChampionIds = new Set()
    selectedCounterPickEnemyId.value = null
  }

  ;(window as any).__akariOpggMockCounterPickWithFakeData = (options?: {
    position?: PositionType
    enemyChampionId?: number
    enemyChampionIds?: number[]
    allyChampionIds?: number[]
  }) => {
    ;(window as any).__akariOpggMockCounterPick(options)

    const targetPosition = options?.position || 'top'
    const enemyChampionIds = options?.enemyChampionIds || [
      options?.enemyChampionId || 106,
      267,
      18,
      157,
      54
    ]

    const makeRankedChampion = (
      id: number,
      pickRate: number,
      counters: Array<{ champion_id: number; play: number; win: number }>
    ) => ({
      id,
      is_rotation: false,
      is_rip: false,
      average_stats: {
        win_rate: 0.5,
        pick_rate: pickRate,
        ban_rate: 0,
        kda: 2,
        tier: 3,
        rank: id
      },
      positions: [
        {
          name: getPositionName(targetPosition) || 'TOP',
          stats: {
            win_rate: 0.5,
            pick_rate: pickRate,
            role_rate: 1,
            ban_rate: 0,
            kda: 2,
            tier_data: {
              tier: 3,
              rank: id,
              rank_prev: id,
              rank_prev_patch: id
            }
          },
          roles: [],
          counters
        }
      ],
      roles: []
    })

    const makeCounters = (basePlay: number, baseWinRate: number) =>
      enemyChampionIds.map((championId, index) => {
        const play = Math.max(200, basePlay - index * 180)
        const winRate = Math.max(0.45, baseWinRate - index * 0.012)

        return {
          champion_id: championId,
          play,
          win: Math.round(play * winRate)
        }
      })

    tierData.value = {
      data: [
        makeRankedChampion(106, 0.068, []),
        makeRankedChampion(54, 0.052, []),
        makeRankedChampion(157, 0.018, []),
        makeRankedChampion(18, 0.006, []),
        makeRankedChampion(267, 0.001, []),
        makeRankedChampion(67, 0.021, makeCounters(1320, 0.557)),
        makeRankedChampion(133, 0.018, makeCounters(860, 0.541)),
        makeRankedChampion(10, 0.031, makeCounters(2410, 0.524)),
        makeRankedChampion(86, 0.075, makeCounters(6100, 0.511)),
        makeRankedChampion(516, 0.041, makeCounters(4200, 0.53))
      ],
      meta: {
        version: 'dev-mock',
        cached_at: new Date().toISOString(),
        match_count: 999999,
        analyzed_at: new Date().toISOString()
      }
    } as OpggRankedChampionsSummary

    selfChampionMastery.value = {
      67: { championId: 67, championLevel: 7, championPoints: 130000 } as Mastery,
      133: { championId: 133, championLevel: 3, championPoints: 12000 } as Mastery,
      10: { championId: 10, championLevel: 4, championPoints: 36000 } as Mastery,
      86: { championId: 86, championLevel: 1, championPoints: 1000 } as Mastery,
      516: { championId: 516, championLevel: 5, championPoints: 51000 } as Mastery
    }
  }

  ;(window as any).__akariOpggClearMockCounterPick = () => {
    const mockChampSelect = lcs.champSelect as any

    mockChampSelect.session = null
    mockChampSelect.currentPickableChampionIds = new Set()
    mockChampSelect.disabledChampionIds = new Set()
    selectedCounterPickEnemyId.value = null
  }
}

// 这将实时锁定正在选择的英雄
const automation = useStableComputed(() => {
  if (!lcs.champSelect.session || !lcs.gameflow.session) {
    return
  }

  const selfCellId = lcs.champSelect.session.localPlayerCellId
  const self = lcs.champSelect.session.myTeam.find((p) => p.cellId === selfCellId)
  const selfActionChampionId = lcs.champSelect.session.actions
    .flat(1)
    .find((a) => a.actorCellId === selfCellId && a.type === 'pick' && a.championId)?.championId

  if (!self && !selfActionChampionId) {
    return
  }

  return {
    championId: self?.championId || selfActionChampionId,
    assignedPosition: self?.assignedPosition,
    gameMode: lcs.gameflow.session.gameData.queue.gameMode
  }
})

watchDebounced(
  automation,
  async (atm) => {
    if (!atm) {
      return
    }

    // set to assigned position
    if (atm.assignedPosition) {
      switch (atm.assignedPosition) {
        case 'top':
          position.value = 'top'
          break
        case 'jungle':
          position.value = 'jungle'
          break
        case 'middle':
          position.value = 'mid'
          break
        case 'bottom':
          position.value = 'adc'
          break
        case 'utility':
          position.value = 'support'
          break
      }
    }

    isModeMatch.value = true

    switch (atm.gameMode) {
      case 'CLASSIC':
        mode.value = 'ranked'
        break
      case 'ARAM':
        mode.value = 'aram'
        position.value = 'none'
        break
      case 'CHERRY':
        mode.value = 'arena'
        break
      case 'NEXUSBLITZ':
        mode.value = 'nexus_blitz'
        break
      case 'URF':
      case 'ARURF':
        mode.value = 'urf'
        break
      default:
        isModeMatch.value = false
    }

    await loadAll()

    if (
      atm.championId &&
      atm.championId !== -3 &&
      !lcs.champSelect.disabledChampionIds.has(atm.championId)
    ) {
      await handleToChampion(atm.championId, true)
    }
  },
  { immediate: true, debounce: 500 }
)

const flashPosition = useLocalStorage('opgg-flash-position', 'auto')

const SUMMONER_SPELL_FLASH_ID = 4

const setSummonerSpells = async (ids: number[]) => {
  try {
    const selection = (await lc.api.champSelect.getMySelections()).data

    const [oldSpell1Id, oldSpell2Id] = [selection.spell1Id, selection.spell2Id]
    let [newSpell1Id, newSpell2Id] = ids

    // 有闪现的情况且不为 auto 时, 优先按照偏好闪现位置, 否则强制按照 auto
    if (
      flashPosition.value !== 'auto' &&
      (newSpell1Id === SUMMONER_SPELL_FLASH_ID || newSpell2Id === SUMMONER_SPELL_FLASH_ID)
    ) {
      if (newSpell2Id === SUMMONER_SPELL_FLASH_ID) {
        if (flashPosition.value === 'd') {
          ;[newSpell1Id, newSpell2Id] = [newSpell2Id, newSpell1Id]
        }
      } else if (newSpell1Id === SUMMONER_SPELL_FLASH_ID) {
        if (flashPosition.value === 'f') {
          ;[newSpell1Id, newSpell2Id] = [newSpell2Id, newSpell1Id]
        }
      }
    } else {
      if (newSpell1Id === oldSpell2Id || newSpell2Id === oldSpell1Id) {
        ;[newSpell1Id, newSpell2Id] = [newSpell2Id, newSpell1Id]
      }
    }

    await lc.api.champSelect.setSummonerSpells({
      spell1Id: newSpell1Id,
      spell2Id: newSpell2Id
    })
    message.success(() =>
      t('Opgg.success', {
        reason: t('Opgg.summonerSpells')
      })
    )

    if (lcs.chat.conversations.championSelect) {
      lc.api.chat
        .chatSend(
          lcs.chat.conversations.championSelect.id,
          t('Opgg.spellsSet', {
            spell1: lcs.gameData.summonerSpells[newSpell1Id]?.name || newSpell1Id,
            spell2: lcs.gameData.summonerSpells[newSpell2Id]?.name || newSpell2Id
          }),
          'celebration'
        )
        .catch(() => {})
    }
  } catch (error) {
    log.warn('view:Opgg', `设置召唤师技能失败: ${(error as any).message}`, error)
    message.warning(t('Opgg.setSpellsFailedMessage', { reason: (error as any).message }))
  }
}

const setRunes = async (r: {
  primary_page_id: number
  secondary_page_id: number
  primary_rune_ids: number[]
  secondary_rune_ids: number[]
  stat_mod_ids: number[]
}) => {
  try {
    const inventory = (await lc.api.perks.getPerkInventory()).data
    let addedNew = false
    const positionName =
      position.value && position.value !== 'none' ? t(`Opgg.positions.${position.value}`) || '' : ''

    if (inventory.canAddCustomPage) {
      const { data: added } = await lc.api.perks.postPerkPage({
        name: `[OP.GG] ${lcs.gameData.champions[championId?.value || -1]?.name || '-'}${positionName ? ` - ${positionName}` : ''}`,
        isEditable: true,
        primaryStyleId: r.primary_page_id.toString()
      })
      await lc.api.perks.putPage({
        id: added.id,
        isRecommendationOverride: false,
        isTemporary: false,
        name: `[OP.GG] ${lcs.gameData.champions[championId?.value || -1]?.name || '-'}${positionName ? ` - ${positionName}` : ''}`,
        primaryStyleId: r.primary_page_id,
        selectedPerkIds: [...r.primary_rune_ids, ...r.secondary_rune_ids, ...r.stat_mod_ids],
        subStyleId: r.secondary_page_id
      })
      await lc.api.perks.putCurrentPage(added.id)
      addedNew = true
    } else {
      const pages = (await lc.api.perks.getPerkPages()).data
      if (!pages.length) {
        return
      }

      const page1 = pages[0]
      await lc.api.perks.putPage({
        id: page1.id,
        isRecommendationOverride: false,
        isTemporary: false,
        name: `[OP.GG] ${lcs.gameData.champions[championId?.value || -1]?.name || '-'}${positionName ? ` - ${positionName}` : ''}`,
        primaryStyleId: r.primary_page_id,
        selectedPerkIds: [...r.primary_rune_ids, ...r.secondary_rune_ids, ...r.stat_mod_ids],
        subStyleId: r.secondary_page_id
      })
      await lc.api.perks.putCurrentPage(page1.id)
    }

    message.success(() =>
      t('Opgg.success', {
        reason: t('Opgg.runes')
      })
    )

    if (lcs.chat.conversations.championSelect) {
      lc.api.chat.chatSend(
        lcs.chat.conversations.championSelect.id,
        t('Opgg.runesSet', {
          name: `[OP.GG] ${lcs.gameData.champions[championId?.value || -1]?.name || '-'}${positionName ? ` - ${positionName}` : ''}`,
          action: addedNew ? t('Opgg.create') : t('Opgg.replace')
        }),
        'celebration'
      )
    }
  } catch (error) {
    log.warn('view:Opgg', `设置符文配法失败: ${(error as any).message}`, error)
    message.warning(t('Opgg.setRunesFailedMessage', { reason: (error as any).message }))
  }
}

const isAbleToAddToItemSet = computed(() => {
  if (!champion.value) {
    return false
  }

  let result = false

  if (champion.value.data.boots && champion.value.data.boots.length) {
    result = true
  }

  if (champion.value.data.starter_items && champion.value.data.starter_items.length) {
    result = true
  }

  if (champion.value.data.core_items && champion.value.data.core_items.length) {
    result = true
  }

  if (champion.value.data.last_items && champion.value.data.last_items.length) {
    result = true
  }

  // @ts-ignore
  if (champion.value.data.prism_items && champion.value.data.prism_items.length) {
    result = true
  }

  return result
})

// 防止添加一大堆重复内容
// akari1 用于标记为本软件生成的装备集
const toItemSetsUid = (traits: {
  championId: number
  mode?: string
  region?: string
  tier?: string
  position?: string
  version?: string
}) => {
  return `akari1-${traits.championId}-${traits.mode || '_'}-${traits.region || '_'}-${traits.tier || '_'}-${traits.position || '_'}-${traits.version || '_'}`
}

const handleAddToItemSet = async () => {
  if (!champion.value || !isAbleToAddToItemSet.value) {
    return
  }

  try {
    const itemGroups: Array<{ title: string; items: number[] }> = []
    const positionName =
      position.value && position.value !== 'none' ? t(`Opgg.positions.${position.value}`) || '' : ''

    const newUid = toItemSetsUid({
      championId: championItem.value?.id || -1,
      mode: mode.value,
      region: region.value,
      tier: tier.value,
      position: position.value,
      version: version.value || '0'
    })

    if (champion.value.data.starter_items && champion.value.data.starter_items.length) {
      champion.value.data.starter_items.slice(0, 3).forEach((s: any, i: number) => {
        itemGroups.push({
          title: t('OpggChampion.starterItem', {
            index: i + 1,
            pickRate: (s.pick_rate * 100).toFixed(2)
          }),
          items: s.ids
        })
      })
    }

    if (champion.value.data.boots && champion.value.data.boots.length) {
      itemGroups.push({
        title: t('OpggChampion.bootsDesc'),
        items: champion.value.data.boots.reduce((acc: number[], cur: any) => {
          acc.push(...cur.ids)
          return acc
        }, [])
      })
    }

    // @ts-ignore
    if (champion.value.data?.prism_items && champion.value.data?.prism_items.length) {
      itemGroups.push({
        title: t('OpggChampion.prismItemsDesc'),
        // @ts-ignore
        items: champion.value.data?.prism_items.reduce((acc: number[], cur: any) => {
          acc.push(...cur.ids)
          return acc
        }, [])
      })
    }

    if (champion.value.data.core_items && champion.value.data.core_items.length) {
      champion.value.data.core_items.slice(0, 4).forEach((s: any, i: number) => {
        itemGroups.push({
          title: t('OpggChampion.coreItem', {
            index: i + 1,
            pickRate: (s.pick_rate * 100).toFixed(2)
          }),
          items: s.ids
        })
      })
    }

    if (champion.value.data.last_items && champion.value.data.last_items.length) {
      itemGroups.push({
        title: t('OpggChampion.itemsDesc'),
        items: champion.value.data.last_items.reduce((acc: number[], cur: any) => {
          acc.push(...cur.ids)
          return acc
        }, [])
      })
    }

    await lc.writeItemSetsToDisk([
      {
        uid: newUid,
        title: `[OP.GG] ${lcs.gameData.champions[championItem.value?.id || -1]?.name || '-'}${positionName ? ` - ${positionName}` : ''}${mode.value === 'arena' || mode.value === 'nexus_blitz' ? ` ${t(`Opgg.modes.${position.value}`)}` : ''}`,
        sortrank: 0,
        type: 'global',
        map: 'any',
        mode: 'any',
        blocks: itemGroups.map((g) => ({
          type: g.title,
          items: g.items.map((i) => ({
            id: restoreRecipe(i).toString(),
            count: 1
          }))
        })),
        associatedChampions: [],
        associatedMaps: [],
        preferredItemSlots: []
      }
    ])

    message.success(t('OpggChampion.writtenToDisk'))

    if (lcs.chat.conversations.championSelect) {
      lc.api.chat
        .chatSend(
          lcs.chat.conversations.championSelect.id,
          t('OpggChampion.writeToDisk', {
            name: `[OP.GG] ${lcs.gameData.champions[championItem.value?.id || -1]?.name || '-'}${positionName ? ` - ${positionName}` : ''}`
          }),
          'celebration'
        )
        .catch(() => {})
    }
  } catch (error) {
    log.warn('view:OpggChampion', `[OP.GG] 添加到物品集失败: ${(error as any).message}`, error)
    message.warning(
      t('OpggChampion.writeFileFailedMessage', {
        error: (error as any).message
      })
    )
  }
}

const ongoingChampions = computed(() => {
  const gSession = lcs.gameflow.session

  if (!gSession) {
    return []
  }

  if (gSession.phase === 'ChampSelect') {
    const cSession = lcs.champSelect.session

    if (!cSession) {
      return []
    }

    const c1 = cSession.myTeam.map((t) => t.championId || t.championPickIntent).filter((c) => c > 0)
    const c2 = cSession.theirTeam
      .map((t) => t.championId || t.championPickIntent)
      .filter((c) => c > 0)

    return [...new Set([...c1, ...c2])]
  } else if (
    gSession.phase === 'GameStart' ||
    gSession.phase === 'InProgress' ||
    gSession.phase === 'WaitingForStats' ||
    gSession.phase === 'PreEndOfGame' ||
    gSession.phase === 'EndOfGame' ||
    gSession.phase === 'Reconnect'
  ) {
    const c1 = gSession.gameData.teamOne.map((t) => t.championId).filter((c) => c > 0)
    const c2 = gSession.gameData.teamTwo.map((t) => t.championId).filter((c) => c > 0)

    return [...new Set([...c1, ...c2])]
  }

  return []
})

const notConnectedMessageRef = shallowRef<MessageReactive | null>(null)
watch(
  () => lcs.isConnected,
  (isConnected) => {
    if (isConnected) {
      notConnectedMessageRef.value?.destroy()
    } else {
      notConnectedMessageRef.value?.destroy()
      notConnectedMessageRef.value = message.warning(() => t('Opgg.notConnected'), {
        duration: 0
      })
    }
  },
  { immediate: true }
)
</script>

<style lang="less" scoped>
.opgg-panel {
  position: relative;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  padding: 2px 8px 8px 8px;
  height: 100%;
  min-width: 480px;

  .tabs-area {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-bottom: 4px;
  }

  .opgg-icon {
    display: block;
    height: 32px;
    width: 32px;
    color: #fff;
  }

  .square-button {
    width: 32px;
    height: 32px;
  }

  .filters {
    display: flex;
    gap: 4px;
    margin-bottom: 4px;
  }

  .counter-pick-panel {
    display: grid;
    grid-template-columns: 172px minmax(300px, 1fr);
    gap: 4px;
    margin-bottom: 4px;
  }

  .panel-section {
    border: 1px solid #37373c;
    border-radius: 2px;
    padding: 6px;
    min-width: 0;
  }

  .section-title {
    display: flex;
    align-items: center;
    gap: 6px;
    min-height: 18px;
    margin-bottom: 4px;
    font-size: 12px;
    font-weight: bold;
    color: #d6d6d6;
  }

  .section-main-title {
    flex-shrink: 0;
  }

  .section-subtitle {
    min-width: 0;
    color: #9ea4ac;
    font-size: 11px;
    font-weight: normal;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .expand-button {
    margin-left: 0;
    flex-shrink: 0;
  }

  .champ-select-side-rows {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .champ-select-side-row {
    min-width: 0;
  }

  .side-row-title {
    margin-bottom: 3px;
    font-size: 11px;
    font-weight: bold;
    color: #d6d6d6;
  }

  .enemy-list,
  .ally-list,
  .recommendation-list {
    display: grid;
    grid-template-columns: repeat(3, minmax(120px, 1fr));
    gap: 4px;
    min-width: 0;
  }

  .enemy-list,
  .ally-list {
    display: grid;
    grid-template-columns: repeat(5, 28px);
    justify-content: space-between;
  }

  .recommendation-groups {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .recommendation-group {
    min-width: 0;
  }

  .recommendation-group-title {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 3px;
    font-size: 11px;
    font-weight: bold;
    color: #d6d6d6;
  }

  .recommendation-group-desc {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 10px;
    font-weight: normal;
    color: #9ea4ac;
  }

  .recommendation-list.expanded {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(154px, 1fr));
    max-height: 138px;
    overflow: auto;
    padding-right: 2px;
  }

  .enemy-item,
  .ally-item,
  .recommendation-item {
    display: grid;
    align-items: center;
    min-width: 0;
    height: 30px;
    background-color: #ffffff0c;
    border: 1px solid transparent;
    border-radius: 2px;
  }

  .enemy-item,
  .ally-item {
    grid-template-columns: 22px;
    grid-template-rows: 22px 10px;
    justify-items: center;
    width: 28px;
    height: 36px;
    box-sizing: border-box;
    padding: 2px 3px;
    cursor: pointer;

    &.active {
      border-color: #d6b56d88;
      background-color: #d6b56d18;
    }

    &.phase-early {
      border-color: #6fbf8faa;
      box-shadow: inset 0 0 0 1px #6fbf8f33;
    }

    &.phase-mid {
      border-color: #d6b56daa;
      box-shadow: inset 0 0 0 1px #d6b56d33;
    }

    &.phase-late {
      border-color: #d75a5aaa;
      box-shadow: inset 0 0 0 1px #d75a5a33;
    }

    &.phase-balanced {
      border-color: #9ea4ac88;
      box-shadow: inset 0 0 0 1px #9ea4ac22;
    }

    &.empty {
      border-color: #ffffff18;
      background-color: #ffffff08;
      box-shadow: none;
    }
  }

  .ally-item {
    grid-template-rows: 22px;
    width: 28px;
    height: 28px;
    padding: 3px;
    cursor: default;
  }

  .ally-item .mini-champion-icon {
    width: 22px;
    height: 22px;
  }

  .recommendation-item {
    grid-template-columns: 24px minmax(44px, 1fr) 42px 42px;
    padding: 0 5px;
    cursor: pointer;
    transition:
      background-color 0.2s,
      filter 0.2s;

    &:hover {
      background-color: #ffffff18;
      filter: brightness(1.08);
    }

    &.duo {
      grid-template-columns: 36px minmax(44px, 1fr) 42px 42px;
    }
  }

  .mini-champion-icon {
    width: 22px;
    height: 22px;
  }

  .empty-champion-slot {
    width: 22px;
    height: 22px;
    border-radius: 999px;
    background-color: #ffffff10;
    border: 1px dashed #ffffff22;
    box-sizing: border-box;
  }

  .duo-icons {
    position: relative;
    width: 34px;
    height: 22px;

    .mini-champion-icon {
      position: absolute;
      left: 0;
      top: 1px;
    }

    .partner-icon {
      left: 14px;
      top: 1px;
    }
  }

  .enemy-name,
  .recommendation-name {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 12px;
    color: #e2e2e2;
  }

  .pick-rate,
  .mastery-points {
    text-align: right;
    font-size: 11px;
    color: #aeb4bc;
  }

  .enemy-item .pick-rate,
  .ally-item .pick-rate {
    grid-column: 1;
    width: 100%;
    text-align: center;
    font-size: 9px;
    line-height: 10px;
  }

  .pick-rate.phase-early {
    color: #6fbf8f;
  }

  .pick-rate.phase-mid {
    color: #d6b56d;
  }

  .pick-rate.phase-late {
    color: #d75a5a;
  }

  .pick-rate.phase-balanced {
    color: #9ea4ac;
  }

  .ally-empty {
    height: 34px;
    font-size: 11px;
    color: #9ea4ac;
    display: flex;
    align-items: center;
  }

  .team-phase-card {
    display: grid;
    grid-template-columns: 54px minmax(0, 1fr) 42px;
    align-items: center;
    gap: 6px;
    height: 28px;
    padding: 0 6px;
    background-color: #ffffff0c;
    border: 1px solid #ffffff12;
    border-radius: 2px;

    &.phase-early {
      border-color: #6fbf8faa;
      background-color: #6fbf8f14;
    }

    &.phase-mid {
      border-color: #d6b56daa;
      background-color: #d6b56d14;
    }

    &.phase-late {
      border-color: #d75a5aaa;
      background-color: #d75a5a14;
    }

    &.phase-balanced {
      border-color: #9ea4ac88;
      background-color: #9ea4ac12;
    }
  }

  .team-phase-label {
    font-size: 11px;
    color: #e2e2e2;
    white-space: nowrap;
  }

  .team-phase-bars {
    display: flex;
    height: 6px;
    min-width: 0;
    overflow: hidden;
    background-color: #ffffff12;
    border-radius: 999px;
  }

  .team-phase-bar {
    height: 100%;

    &.early {
      background-color: #6fbf8f;
    }

    &.mid {
      background-color: #d6b56d;
    }

    &.late {
      background-color: #d75a5a;
    }
  }

  .team-phase-value {
    text-align: right;
    font-size: 11px;
    font-weight: bold;
    color: #d6d6d6;
  }

  .matchup-win-rate {
    text-align: right;
    font-size: 12px;
    font-weight: bold;
    color: #aeb4bc;

    &.favorable {
      color: #d75a5a;
    }

    &.unfavorable {
      color: #8ec6ff;
    }
  }

  .recommendation-empty {
    display: flex;
    align-items: center;
    height: 30px;
    font-size: 12px;
    color: #9ea4ac;
  }

  .counter-detail-loading {
    height: 18px;
    margin-bottom: 4px;
    font-size: 11px;
    color: #9ea4ac;
  }

  .content {
    flex: 1;
    height: 0;
    overflow: auto;
  }

  .settings-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: #202020d8;
    backdrop-filter: blur(8px);
    z-index: 100;
    padding: 24px 36px;

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;

      .title {
        font-size: 24px;
        font-weight: bold;
        color: white;
      }

      .close-btn {
        display: flex;
        height: 36px;
        width: 36px;
        cursor: pointer;
        font-size: 22px;
        background-color: rgba(255, 255, 255, 0.04);
        border-radius: 4px;
        transition: background-color 0.2s;

        &:hover {
          background-color: rgba(255, 255, 255, 0.1);
        }

        &:active {
          background-color: rgba(255, 255, 255, 0.08);
        }

        &:hover .close-icon {
          transform: rotateZ(90deg);
        }
      }

      .close-icon {
        transition: transform 0.3s;
        margin: auto;
      }
    }

    .items {
      margin-top: 24px;
    }
  }
}

.settings-aux-window-only {
  font-size: 12px;
  font-weight: bold;
  color: #62deb4;
}

.ongoing-champions {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
  background-color: #202020a0;
  backdrop-filter: blur(8px);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 12px;
}

.float {
  position: absolute;
  bottom: 20px;
  right: 20px;
}

.champion-icon {
  width: 36px;
  height: 36px;
  cursor: pointer;

  &.hover-fade {
    opacity: 0.2;
    transition: opacity 0.2s;

    &:hover {
      opacity: 0.8;
    }
  }
}

.fade-enter-active {
  transition: opacity 0.2s;
}

.fade-leave-active {
  transition:
    opacity 0.3s,
    transform 0.3s,
    filter 0.3s;
}

.fade-enter-from {
  opacity: 0;
}

.fade-leave-to {
  transform: scale(1.02);
  filter: blur(4px);
  opacity: 0;
}

.fade-enter-to,
.fade-leave-from {
  opacity: 1;
}
</style>
