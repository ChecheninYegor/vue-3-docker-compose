import { createStore } from 'vuex'

const TOWER_LEVELS = [
  { level: 1, damage: 15,  hp: 100, fireRate: 2000, range: 125, cost: 50,  upgradeCost: 75  },
  { level: 2, damage: 25,  hp: 180, fireRate: 1600, range: 155, cost: 50,  upgradeCost: 120 },
  { level: 3, damage: 40,  hp: 280, fireRate: 1200, range: 190, cost: 50,  upgradeCost: 200 },
  { level: 4, damage: 60,  hp: 400, fireRate: 900,  range: 230, cost: 50,  upgradeCost: 300 },
  { level: 5, damage: 85,  hp: 550, fireRate: 600,  range: 280, cost: 50,  upgradeCost: null },
]

const ENEMY_TYPES = [
  { type: 'light',   hp: 60,  reward: 35, color: '#4cc514' },
  { type: 'medium', hp: 100, reward: 25, color: '#dbc236' },
  { type: 'heavy',   hp: 200, reward: 60, color: '#cc1717' },
]

const LEVELS = [
  {
    id: 1,
    name: 'Лесная тропа',
    bgColor: '#2d4a1e',
    mapWidth: 900,
    mapHeight: 600,
    path: [
      { x: 0,   y: 100 },
      { x: 200, y: 100 },
      { x: 200, y: 400 },
      { x: 500, y: 400 },
      { x: 500, y: 200 },
      { x: 750, y: 200 },
      { x: 750, y: 500 },
      { x: 900, y: 500 },
    ],
    towerSlots: [
      { id: 's1', x: 100, y: 250 },
      { id: 's2', x: 350, y: 250 },
      { id: 's3', x: 350, y: 500 },
      { id: 's4', x: 650, y: 350 },
      { id: 's5', x: 850, y: 350 },
    ],
    enemySpawns: [
      { x: 80,  y: 100 },
      { x: 160, y: 100 },
    ],
    waves: [
      [
        { type: 'medium' },
        { type: 'medium' },
        { type: 'light' },
        { type: 'medium' },
        { type: 'heavy' }
      ],
      [
        { type: 'medium' },
        { type: 'light' },
        { type: 'heavy' },
        { type: 'medium' },
        { type: 'medium' }
      ],
    ],
  },
  {
    id: 2,
    name: 'Пустынный перевал',
    bgColor: '#c2a165',
    mapWidth: 900,
    mapHeight: 600,
    path: [
      { x: 0,   y: 300 },
      { x: 150, y: 300 },
      { x: 150, y: 100 },
      { x: 400, y: 100 },
      { x: 400, y: 500 },
      { x: 650, y: 500 },
      { x: 650, y: 200 },
      { x: 900, y: 200 },
    ],
    towerSlots: [
      { id: 's1', x: 280, y: 200 },
      { id: 's2', x: 280, y: 400 },
      { id: 's3', x: 530, y: 300 },
      { id: 's4', x: 780, y: 350 },
    ],
    enemySpawns: [
      { x: 50,  y: 300 },
      { x: 120, y: 300 },
      { x: 50,  y: 360 },
    ],
    waves: [
      [
        { type: 'light' },
        { type: 'light' },
        { type: 'medium' },
        { type: 'heavy' },
        { type: 'light' }
      ],
      [
        { type: 'heavy' },
        { type: 'heavy' },
        { type: 'light' },
        { type: 'medium' },
        { type: 'light' }
      ],
    ],
  },
]

let _enemyIdCounter = 1

export default createStore({
  state: () => ({
    gold: 300,
    initialGold: 300,
    currentLevelId: 1,
    towers: {},
    enemies: [],
    selectedTowerSlotId: null,
    draggingEnemyId: null,
    gameOver: false,
    currentWave: 0,
    waveInProgress: false,
  }),

  getters: {
    currentLevel: s => LEVELS.find(l => l.id === s.currentLevelId),
    allLevels: () => LEVELS,
    towerLevelsConfig: () => TOWER_LEVELS,
    enemyTypes: () => ENEMY_TYPES,
    towerInSlot: s => slotId => s.towers[slotId] || null,
    selectedTower: s => s.towers[s.selectedTowerSlotId] || null,
    selectedSlotId: s => s.selectedTowerSlotId,
    currentWaves: s => LEVELS.find(l => l.id === s.currentLevelId)?.waves ?? [],
  },

  mutations: {
    SET_LEVEL (state, levelId) {
      state.currentLevelId = levelId
      state.towers = {}
      state.selectedTowerSlotId = null
      state.gameOver = false
      state.currentWave = 0
      state.waveInProgress = false
      state.gold = state.initialGold
      state.enemies = []
    },

    BUILD_TOWER (state, slotId) {
      if (state.gold < TOWER_LEVELS[0].cost) return
      if (state.towers[slotId]) return
      state.gold -= TOWER_LEVELS[0].cost
      state.towers[slotId] = {
        slotId,
        level: 1,
        ...TOWER_LEVELS[0],
      }
    },

    UPGRADE_TOWER (state, slotId) {
      const tower = state.towers[slotId]
      if (!tower) return
      const nextCfg = TOWER_LEVELS[tower.level]
      if (!nextCfg) return
      if (state.gold < nextCfg.upgradeCost) return
      state.gold -= nextCfg.upgradeCost ?? 0
      state.towers[slotId] = {
        slotId,
        level: nextCfg.level,
        ...nextCfg,
      }
    },

    REMOVE_TOWER (state, slotId) {
      if (!state.towers[slotId]) return
      state.gold += Math.floor(TOWER_LEVELS[0].cost / 2)
      delete state.towers[slotId]
      if (state.selectedTowerSlotId === slotId) state.selectedTowerSlotId = null
    },

    SELECT_SLOT (state, slotId) {
      state.selectedTowerSlotId = state.selectedTowerSlotId === slotId ? null : slotId
    },

    MOVE_ENEMY_KEYBOARD (state, { id, dx, dy }) {
      const e = state.enemies.find(e => e.id === id)
      if (!e) return
      e.x += dx
      e.y += dy
    },

    MOVE_ENEMY_DRAG (state, { id, x, y }) {
      const e = state.enemies.find(e => e.id === id)
      if (!e) return
      e.x = x
      e.y = y
    },

    DAMAGE_ENEMY (state, { id, damage }) {
      const e = state.enemies.find(e => e.id === id)
      if (!e) return
      e.hp = Math.max(0, e.hp - damage)
    },

    SET_DRAGGING_ENEMY (state, id) {
      state.draggingEnemyId = id
    },

    ADD_ENEMY (state) {
      const lvl = LEVELS.find(l => l.id === state.currentLevelId)
      state.enemies.push({
        id: _enemyIdCounter++,
        x: lvl.path[0].x + 10,
        y: lvl.path[0].y,
        hp: 100,
        maxHp: 100,
        reward: 35,
        color: '#dbc236',
        pathIndex: 0,
        progress: 0,
      })
    },

    REMOVE_ENEMY (state, id) {
      state.enemies = state.enemies.filter(e => e.id !== id)
    },

    KILL_REWARD (state, reward) {
      state.gold += reward
    },

    ADD_GOLD (state, amount) {
      state.gold += amount
    },

    MOVE_ENEMY_PATH (state, { id, x, y, pathIndex, progress }) {
      const e = state.enemies.find(e => e.id === id)
      if (!e) return
      e.x = x
      e.y = y
      e.pathIndex = pathIndex
      e.progress = progress
    },

    SET_GAME_OVER (state) {
      state.gameOver = true
    },

    SPAWN_WAVE (state) {
      const lvl = LEVELS.find(l => l.id === state.currentLevelId)
      const waves = lvl?.waves ?? []
      if (state.currentWave >= waves.length) return
      const wave = waves[state.currentWave]
      wave.forEach((cfg, i) => {
        const typeCfg = ENEMY_TYPES.find(t => t.type === cfg.type) ?? ENEMY_TYPES[0]
        state.enemies.push({
          id: _enemyIdCounter++,
          x: lvl.path[0].x - (i + 1) * 60,
          y: lvl.path[0].y,
          hp: typeCfg.hp,
          maxHp: typeCfg.hp,
          reward: typeCfg.reward,
          color: typeCfg.color,
          pathIndex: 0,
          progress: -(i * 60),
        })
      })
      state.currentWave += 1
      state.waveInProgress = true
    },

    SET_WAVE_DONE (state) {
      state.waveInProgress = false
    },

    TICK_ENEMIES (state, { path, draggingEnemyId }) {
      if (path.length < 2) return
      const dist = (ax, ay, bx, by) => Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2)
      let shouldGameOver = false
      state.enemies.forEach(enemy => {
        if (draggingEnemyId === enemy.id) return
        let { x, y, pathIndex, progress } = enemy
        if (pathIndex >= path.length - 1) { shouldGameOver = true; return }
        progress += 0.5
        const segLen = dist(path[pathIndex].x, path[pathIndex].y, path[pathIndex + 1].x, path[pathIndex + 1].y)
        if (progress >= segLen) {
          progress = 0
          pathIndex += 1
          if (pathIndex >= path.length - 1) { shouldGameOver = true; return }
        }
        const from = path[pathIndex]
        const to = path[pathIndex + 1]
        const t = progress / dist(from.x, from.y, to.x, to.y)
        x = from.x + (to.x - from.x) * t
        y = from.y + (to.y - from.y) * t
        Object.assign(enemy, { x, y, pathIndex, progress })
      })
      if (shouldGameOver) state.gameOver = true
    },

    PROCESS_BULLET_HIT (state, { enemyId, damage }) {
      const enemy = state.enemies.find(e => e.id === enemyId)
      if (!enemy) return
      enemy.hp = Math.max(0, enemy.hp - damage)
      if (enemy.hp <= 0) {
        state.gold += enemy.reward ?? 25
        state.enemies = state.enemies.filter(e => e.id !== enemyId)
      }
    }
  },

  actions: {
    loadLevel: ({ commit }, levelId) => commit('SET_LEVEL', levelId),
    buildTower: ({ commit }, slotId) => commit('BUILD_TOWER', slotId),
    upgradeTower: ({ commit }, slotId) => commit('UPGRADE_TOWER', slotId),
    removeTower: ({ commit }, slotId) => commit('REMOVE_TOWER', slotId),
    selectSlot: ({ commit }, slotId) => commit('SELECT_SLOT', slotId),
    moveEnemyKeyboard: ({ commit }, payload) => commit('MOVE_ENEMY_KEYBOARD', payload),
    moveEnemyDrag: ({ commit }, payload) => commit('MOVE_ENEMY_DRAG', payload),
    setDraggingEnemy: ({ commit }, id) => commit('SET_DRAGGING_ENEMY', id),
    addEnemy: ({ commit }) => commit('ADD_ENEMY'),
    removeEnemy: ({ commit }, id) => commit('REMOVE_ENEMY', id),
    damageEnemy: ({ commit }, payload) => commit('DAMAGE_ENEMY', payload),
    cheatGold: ({ commit }) => commit('ADD_GOLD', 200),
    moveEnemyPath: ({ commit }, payload) => commit('MOVE_ENEMY_PATH', payload),
    setGameOver: ({ commit }) => commit('SET_GAME_OVER'),
    spawnWave: ({ commit }) => commit('SPAWN_WAVE'),
    setWaveDone: ({ commit }) => commit('SET_WAVE_DONE'),
    tickEnemies: ({ commit }, payload) => commit('TICK_ENEMIES', payload),
    processBulletHit: ({ commit }, payload) => commit('PROCESS_BULLET_HIT', payload),
  },
})