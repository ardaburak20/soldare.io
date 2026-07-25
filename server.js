// ==========================================
//  SOLDARE.IO - Game Server (v3.0)
// ==========================================
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// GeoIP for country detection (optional - falls back to USD if not available)
let geoip;
try {
  geoip = require('geoip-lite');
  console.log('✅ GeoIP module loaded');
} catch (err) {
  console.log('⚠️ GeoIP module not found, using default USD pricing');
}

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { 
    origin: ['http://localhost:3000', 'https://soldareio.web.app', 'https://soldareio.firebaseapp.com', 'https://soldare-io-backend.onrender.com'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json()); // JSON body parser for API endpoints

// ==========================================
//  HIGH SCORE PERSISTENCE
// ==========================================
const HIGH_SCORE_FILE = path.join(__dirname, 'highscores.json');
let highScores = {};

function loadHighScores() {
  try {
    if (fs.existsSync(HIGH_SCORE_FILE)) {
      const data = JSON.parse(fs.readFileSync(HIGH_SCORE_FILE, 'utf8'));
      for (const key in data) {
        if (typeof data[key] === 'number') {
          highScores[key] = { highScore: data[key], gold: 0 };
        } else {
          highScores[key] = data[key];
        }
      }
    }
  } catch (e) {
    console.log('Could not load high scores, starting fresh.');
    highScores = {};
  }
}

function saveHighScores() {
  try {
    fs.writeFileSync(HIGH_SCORE_FILE, JSON.stringify(highScores, null, 2));
  } catch (e) {
    console.log('Could not save high scores.');
  }
}

loadHighScores();

function ensurePlayerSave(email) {
  if (!email) return null;
  if (!highScores[email]) {
    highScores[email] = { 
      highScore: 0, 
      gold: 0, 
      missiles: 0, 
      missileAmmo: 0, 
      bonusDuration10s: 0, 
      bonusDuration10sEndTime: null,
      goldMultiplier: 1, 
      goldMultiplierEndTime: null,
      permanentBonusDuration: false,
      permanentGoldMultiplier: false
    };
  }
  if (highScores[email].missiles === undefined) highScores[email].missiles = 0;
  if (highScores[email].missileAmmo === undefined) highScores[email].missileAmmo = 0;
  if (highScores[email].bonusDuration10s === undefined) highScores[email].bonusDuration10s = 0;
  if (highScores[email].bonusDuration10sEndTime === undefined) highScores[email].bonusDuration10sEndTime = null;
  if (highScores[email].goldMultiplier === undefined) highScores[email].goldMultiplier = 1;
  if (highScores[email].goldMultiplierEndTime === undefined) highScores[email].goldMultiplierEndTime = null;
  if (highScores[email].permanentBonusDuration === undefined) highScores[email].permanentBonusDuration = false;
  if (highScores[email].permanentGoldMultiplier === undefined) highScores[email].permanentGoldMultiplier = false;
  return highScores[email];
}

// Generate unique guest session ID
function generateGuestId() {
  return 'guest_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
}

function applyStoreStateToPlayer(player, email) {
  if (!email) return;
  const save = ensurePlayerSave(email);
  if (!save) return;
  player.missiles = save.missiles || 0;
  
  // Handle bonus duration (check expiration)
  if (save.permanentBonusDuration) {
    player.bonusDuration10s = 999999; // Permanent
  } else if (save.bonusDuration10sEndTime && Date.now() > save.bonusDuration10sEndTime) {
    player.bonusDuration10s = 0;
    save.bonusDuration10s = 0;
    save.bonusDuration10sEndTime = null;
    saveHighScores();
  } else {
    player.bonusDuration10s = save.bonusDuration10s || 0;
  }
  
  // Handle gold multiplier (check expiration)
  if (save.permanentGoldMultiplier) {
    player.goldMultiplier = 2; // Permanent
  } else if (save.goldMultiplierEndTime && Date.now() > save.goldMultiplierEndTime) {
    player.goldMultiplier = 1;
    save.goldMultiplier = 1;
    save.goldMultiplierEndTime = null;
    saveHighScores();
  } else {
    player.goldMultiplier = save.goldMultiplier || 1;
  }
  
  // Always start with revolver, never with RPG
  // Players can manually equip RPG if they have missiles
}

function switchToRevolver(player) {
  // Store current revolver ammo if switching from revolver
  if (player.weapon === 'revolver') {
    player.storedRevolverAmmo = player.ammo;
  }
  
  player.weapon = 'revolver';
  // Restore previous revolver ammo if available, otherwise full mag
  player.ammo = player.storedRevolverAmmo !== undefined ? player.storedRevolverAmmo : WEAPONS.revolver.magSize;
  player.weaponTimer = 0;
  player.isReloading = false;
  player.fireTimer = 0;
}

function returnLoadedMissile(player) {
  if (player.weapon === 'missile' && player.ammo > 0) {
    player.missiles = (player.missiles || 0) + 1;
    player.ammo = 0;
  }
}

function activateStoredPickup(player) {
  if (!player.storedPickup) return false;
  const { type, ammo } = player.storedPickup;
  player.storedPickup = null;
  
  // Store current revolver ammo if switching from revolver
  if (player.weapon === 'revolver') {
    player.storedRevolverAmmo = player.ammo;
  }
  
  player.weapon = type;
  player.ammo = ammo;
  player.weaponTimer = WEAPONS[type].duration + (player.bonusDuration10s > 0 ? 10 : 0);
  player.isReloading = false;
  player.fireTimer = 0;
  return true;
}

function getTotalMissileCount(player) {
  return (player.missiles || 0) + (player.weapon === 'missile' && player.ammo > 0 ? 1 : 0);
}

function persistMissileState(email, player) {
  if (!email || !player) return;
  const save = ensurePlayerSave(email);
  save.missiles = player.missiles || 0;
  if (player.weapon === 'missile' && player.ammo > 0) {
    save.missileAmmo = player.ammo;
  } else {
    save.missileAmmo = 0;
  }
  saveHighScores();
}

function getSoldierBulletRanges(player, aimAngle) {
  const aimDirX = Math.cos(aimAngle);
  const aimDirY = Math.sin(aimAngle);
  const ranges = new Map();
  let minForward = Infinity;

  for (const s of player.soldiers) {
    if (!s.canShoot) continue;
    const forwardDepth = (s.x - player.x) * aimDirX + (s.y - player.y) * aimDirY;
    ranges.set(s, forwardDepth);
    if (forwardDepth < minForward) minForward = forwardDepth;
  }

  if (!Number.isFinite(minForward)) minForward = 0;

  const maxDistBySoldier = new Map();
  for (const [s, forwardDepth] of ranges) {
    const rangeBonus = Math.max(0, forwardDepth - minForward);
    maxDistBySoldier.set(s, MAX_BULLET_DIST + rangeBonus);
  }
  return maxDistBySoldier;
}

// ==========================================
//  GOOGLE AUTHENTICATION
// ==========================================
const { OAuth2Client } = require('google-auth-library');

let config = { GOOGLE_CLIENT_ID: '' };
try {
  config = require('./config.json');
} catch (e) {
  console.log('No config.json found.');
}

// Environment variable has priority
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || config.GOOGLE_CLIENT_ID || '1234567890-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com';
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

console.log('🔑 Google Client ID loaded:', GOOGLE_CLIENT_ID ? '✅ Valid' : '❌ Missing');

// Serve the client ID to the frontend
app.get('/config.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.send(`const GOOGLE_CLIENT_ID = "${GOOGLE_CLIENT_ID}";`);
});

// Map socket.id -> email (null for guests)
const socketEmails = {};

// ==========================================
//  CONSTANTS
// ==========================================
const PORT = process.env.PORT || 3000; // Render uses process.env.PORT
const MAP_SIZE = 10000; 
const TICK_RATE = 20;
const TICK_MS = 1000 / TICK_RATE;
const PLAYER_SPEED = 250;
const BULLET_SPEED = 800;
const MAX_BULLET_DIST = 900;
const SOLDIER_RADIUS = 16;
const BULLET_RADIUS = 4;
const PICKUP_RADIUS = 25;
const MAX_NEUTRALS = 600;
const MAX_PICKUPS = 60;
const MAX_PLAYERS = 50;
const PAD = 200;
const RECRUIT_RADIUS = 40;
const MAX_ROOMS = 10000;
const MIN_PLAYERS_FOR_NO_BOTS = 5; // 5'ten az oyuncu varsa bot ekle
const MAX_BOTS = 5; // Maksimum bot sayısı
const BOT_NAMES = ['Michael', 'Adam', 'Jessica', 'Enes', 'Fatih', 'Soul', 'Walter', 'Ellie', 'Arda', 'Sophia'];
const BOT_COLORS = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#6c5ce7', '#fd79a8', '#00b894', '#fdcb6e', '#e17055', '#74b9ff'];
const BOT_VISION_RANGE = 400; // Bot görüş mesafesi
const BOT_SHOOT_RANGE = 350; // Bot ateş etme mesafesi

// Room Management
const rooms = {};

function generateRoomCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function getOrCreateRoom() {
  // Find first room that has space (less than 50 players)
  for (const code in rooms) {
    const room = rooms[code];
    if (room.playerCount < MAX_PLAYERS) {
      return room;
    }
  }
  
  // All existing rooms are full, create a new one
  if (Object.keys(rooms).length >= MAX_ROOMS) {
    console.log('⚠️ Maximum number of rooms reached, cannot create more');
    return null; // Maximum number of rooms reached
  }
  
  const code = generateRoomCode();
  
  // Ensure room code is unique
  let attempts = 0;
  let uniqueCode = code;
  while (rooms[uniqueCode] && attempts < 100) {
    uniqueCode = generateRoomCode();
    attempts++;
  }
  
  if (attempts >= 100) {
    console.log('⚠️ Could not generate unique room code');
    return null;
  }
  
  rooms[uniqueCode] = {
    code: uniqueCode,
    players: {},
    playerCount: 0,
    bullets: [],
    neutralSoldiers: [],
    pickups: [],
    createdAt: Date.now(),
    lastActivity: Date.now()
  };
  
  console.log(`🏠 New room created: ${uniqueCode} (Total rooms: ${Object.keys(rooms).length}/${MAX_ROOMS})`);
  return rooms[uniqueCode];
}

// Function to get room statistics
function getRoomStats() {
  const totalRooms = Object.keys(rooms).length;
  const totalPlayers = Object.values(rooms).reduce((sum, room) => sum + room.playerCount, 0);
  const fullRooms = Object.values(rooms).filter(room => room.playerCount >= MAX_PLAYERS).length;
  
  return {
    totalRooms,
    totalPlayers,
    fullRooms,
    availableRooms: totalRooms - fullRooms,
    maxRooms: MAX_ROOMS
  };
}

function getRoomByCode(code) {
  return rooms[code] || null;
}

function calculateScaleLevel(score) {
  if (score >= 250) return 14;
  if (score >= 200) return 13;
  if (score >= 150) return 12;
  if (score >= 120) return 11;
  if (score >= 100) return 10;
  return Math.floor(score / 10);
}

// ==========================================
//  WEAPON DEFINITIONS
// ==========================================
const WEAPONS = {
  revolver: { name: 'Revolver', fireRate: 4, damage: 1, magSize: 6, reloadTime: 2, duration: Infinity, auto: false }, 
  smg:      { name: 'SMG',      fireRate: 6, damage: 0.5, magSize: 30, reloadTime: 1.5, duration: 20, auto: true },
  m4:       { name: 'M4',       fireRate: 4, damage: 1, magSize: 32, reloadTime: 1.5, duration: 20, auto: true },
  ak47:     { name: 'AK-47',    fireRate: 4, damage: 1, magSize: 32, reloadTime: 1.5, duration: 20, auto: true },
  minigun:  { name: 'Minigun',  fireRate: 10, damage: 1, magSize: 300, reloadTime: 5, duration: 20, auto: true },
  missile:  { name: 'RPG',      fireRate: 1, damage: 1, magSize: 1, reloadTime: 0, duration: Infinity, auto: false }
};

const MISSILES_PER_PURCHASE = 5;

const PICKUP_WEIGHTS = [
  { type: 'smg',     weight: 30 },
  { type: 'shield',  weight: 30 },
  { type: 'm4',      weight: 20 },
  { type: 'ak47',    weight: 15 },
  { type: 'minigun', weight: 5 }
];
const TOTAL_WEIGHT = PICKUP_WEIGHTS.reduce((s, p) => s + p.weight, 0);

// ==========================================
//  GAME STATE
// ==========================================
let nextId = 1;
// Global socket to room mapping
const socketToRoom = {};

// ==========================================
//  UTILITY
// ==========================================
function uid() { return nextId++; }
function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function randRange(min, max) { return Math.random() * (max - min) + min; }
function randPos() { return { x: randRange(PAD, MAP_SIZE - PAD), y: randRange(PAD, MAP_SIZE - PAD) }; }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function weightedRandom() {
  let r = Math.random() * TOTAL_WEIGHT;
  for (const p of PICKUP_WEIGHTS) {
    r -= p.weight;
    if (r <= 0) return p.type;
  }
  return PICKUP_WEIGHTS[0].type;
}

// ==========================================
//  FORMATION
// ==========================================
function computeFormation(count, stretch = 1.0, angle = 0) {
  const positions = [];
  let ring = 1, placed = 0;
  while (placed < count) {
    const cap = ring * 6;
    const radius = ring * 30; // Spacing for soldiers
    const toPlace = Math.min(cap, count - placed);
    for (let i = 0; i < toPlace; i++) {
      const a = (i / cap) * Math.PI * 2 + (ring % 2) * 0.25;
      
      let ox = Math.cos(a) * radius;
      let oy = Math.sin(a) * radius;
      
      // Stretch ellipse
      ox *= stretch;
      oy /= Math.sqrt(stretch); // Preserve somewhat similar volume

      // Rotate to match movement direction
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const rx = ox * cos - oy * sin;
      const ry = ox * sin + oy * cos;

      positions.push({ ox: rx, oy: ry });
      placed++;
    }
    ring++;
  }
  return positions;
}


// ==========================================
//  SPAWN FUNCTIONS
// ==========================================
function spawnNeutralBatch(neutralSoldiers) {
  if (neutralSoldiers.length >= MAX_NEUTRALS) return;
  const toSpawn = Math.min(30, MAX_NEUTRALS - neutralSoldiers.length);
  for (let i = 0; i < toSpawn; i++) {
    const pos = randPos();
    const groupSize = Math.random() < 0.3 ? 2 : 1;
    for (let g = 0; g < groupSize; g++) {
      neutralSoldiers.push({
        id: uid(),
        x: pos.x + g * 25,
        y: pos.y + g * 10,
        canShoot: Math.random() < (1 / 3),
        hp: 1
      });
    }
  }
}

function spawnPickups(pickups) {
  if (pickups.length >= MAX_PICKUPS) return;
  const toSpawn = Math.min(15, MAX_PICKUPS - pickups.length);
  for (let i = 0; i < toSpawn; i++) {
    const pos = randPos();
    pickups.push({
      id: uid(),
      x: pos.x,
      y: pos.y,
      type: weightedRandom()
    });
  }
}

// Initial spawns removed - spawns now happen per room in game loop

// ==========================================
//  PLAYER HELPERS
// ==========================================
function createPlayer(id, name, color, skin) {
  const pos = randPos();
  const w = WEAPONS.revolver;
  return {
    id,
    name: name || 'Soldier',
    color: color || '#3498db',
    skin: skin || null, // Array of pixels
    x: pos.x, 
    y: pos.y,
    angle: 0,
    mouseX: pos.x,
    mouseY: pos.y,
    soldiers: [],
    weapon: 'revolver',
    ammo: w.magSize,
    storedRevolverAmmo: undefined, // Track revolver ammo separately, undefined = not stored yet
    isShooting: false,
    clickShoot: false,
    isReloading: false,
    reloadTimer: 0,
    fireTimer: 0,
    shieldActive: false,
    shieldTimer: 0,
    weaponTimer: 0,
    alive: true,
    kills: 0,
    missiles: 0,
    storedPickup: null,
    maxSoldiers: 1, // Track max soldiers reached
    bonusDuration10s: 0,
    goldMultiplier: 1,
    isBot: false // Bot flag
  };
}

function createBot(id, name, color) {
  const bot = createPlayer(id, name, color, null);
  bot.isBot = true;
  bot.botTarget = null; // Current target (neutral, pickup, or enemy)
  bot.botState = 'explore'; // States: explore, collect, attack
  bot.botThinkTimer = 0;
  return bot;
}

function respawnPlayer(player) {
  const pos = randPos();
  player.x = pos.x;
  player.y = pos.y;
  player.soldiers = [];
  player.weapon = 'revolver';
  player.ammo = WEAPONS.revolver.magSize;
  player.storedRevolverAmmo = undefined; // Reset revolver ammo storage
  player.isShooting = false;
  player.clickShoot = false;
  player.isReloading = false;
  player.reloadTimer = 0;
  player.fireTimer = 0;
  player.shieldActive = false;
  player.shieldTimer = 0;
  player.weaponTimer = 0;
  player.alive = true;
  player.maxSoldiers = 1; // Reset max soldiers
}

// ==========================================
//  BOT AI SYSTEM
// ==========================================
function updateBotAI(bot, room, dt) {
  if (!bot.alive || !bot.isBot) return;

  bot.botThinkTimer -= dt;
  if (bot.botThinkTimer > 0) return; // Think every 0.5 seconds
  bot.botThinkTimer = 0.5;

  const neutrals = room.neutralSoldiers;
  const pickups = room.pickups;
  const players = room.players;

  // Find closest neutral soldier
  let closestNeutral = null;
  let closestNeutralDist = Infinity;
  for (const n of neutrals) {
    const d = dist(bot, n);
    if (d < BOT_VISION_RANGE && d < closestNeutralDist) {
      closestNeutral = n;
      closestNeutralDist = d;
    }
  }

  // Find closest pickup
  let closestPickup = null;
  let closestPickupDist = Infinity;
  for (const p of pickups) {
    const d = dist(bot, p);
    if (d < BOT_VISION_RANGE && d < closestPickupDist) {
      closestPickup = p;
      closestPickupDist = d;
    }
  }

  // Find closest enemy
  let closestEnemy = null;
  let closestEnemyDist = Infinity;
  for (const id in players) {
    const enemy = players[id];
    if (enemy.id === bot.id || !enemy.alive) continue;
    const d = dist(bot, enemy);
    if (d < BOT_VISION_RANGE && d < closestEnemyDist) {
      closestEnemy = enemy;
      closestEnemyDist = d;
    }
  }

  // Decision making: Priority = Enemy > Pickup > Neutral
  if (closestEnemy && closestEnemyDist < BOT_SHOOT_RANGE) {
    // Attack enemy
    bot.botState = 'attack';
    bot.mouseX = closestEnemy.x;
    bot.mouseY = closestEnemy.y;
    bot.isShooting = true;
  } else if (closestPickup && closestPickupDist < closestNeutralDist) {
    // Collect pickup
    bot.botState = 'collect';
    bot.mouseX = closestPickup.x;
    bot.mouseY = closestPickup.y;
    bot.isShooting = false;
  } else if (closestNeutral) {
    // Collect neutral
    bot.botState = 'collect';
    bot.mouseX = closestNeutral.x;
    bot.mouseY = closestNeutral.y;
    bot.isShooting = false;
  } else {
    // Explore randomly
    bot.botState = 'explore';
    if (Math.random() < 0.3) {
      bot.mouseX = randRange(PAD, MAP_SIZE - PAD);
      bot.mouseY = randRange(PAD, MAP_SIZE - PAD);
    }
    bot.isShooting = false;
  }

  // Auto reload when ammo low
  if (bot.ammo <= 2 && !bot.isReloading && bot.weapon !== 'missile') {
    bot.isReloading = true;
    bot.reloadTimer = WEAPONS[bot.weapon].reloadTime;
    bot.isShooting = false;
  }
}

function manageBots(room) {
  const realPlayers = Object.values(room.players).filter(p => !p.isBot && p.alive).length;
  const bots = Object.values(room.players).filter(p => p.isBot);
  const aliveBots = bots.filter(b => b.alive).length;

  // Add bots if needed
  if (realPlayers < MIN_PLAYERS_FOR_NO_BOTS) {
    const neededBots = MAX_BOTS - aliveBots;
    const usedNames = bots.map(b => b.name); // Track already used names
    const availableNames = BOT_NAMES.filter(name => !usedNames.includes(name));
    
    for (let i = 0; i < neededBots; i++) {
      if (availableNames.length === 0) break; // No more unique names
      
      // Pick random name from available names
      const randomIndex = Math.floor(Math.random() * availableNames.length);
      const botName = availableNames.splice(randomIndex, 1)[0];
      
      const botId = `bot_${room.code}_${Date.now()}_${Math.random()}`;
      const botColor = BOT_COLORS[Math.floor(Math.random() * BOT_COLORS.length)];
      
      room.players[botId] = createBot(botId, botName, botColor);
      console.log(`🤖 Bot added to room ${room.code}: ${botName}`);
    }
  }

  // Remove excess bots if enough real players
  if (realPlayers >= MIN_PLAYERS_FOR_NO_BOTS && aliveBots > 0) {
    for (const id in room.players) {
      if (room.players[id].isBot) {
        delete room.players[id];
        console.log(`🤖 Bot removed from room ${room.code}`);
      }
    }
  }
}

// ==========================================
//  SOCKET HANDLERS
// ==========================================
io.on('connection', (socket) => {

  socket.on('googleLogin', async (data) => {
    try {
      const token = data.credential;
      if (!token) {
        socket.emit('loginError', { message: 'Token missing' });
        return;
      }
      
      const ticket = await googleClient.verifyIdToken({
        idToken: token,
        audience: GOOGLE_CLIENT_ID, 
      });
      const payload = ticket.getPayload();
      const email = payload.email.toLowerCase();

      socketEmails[socket.id] = email;
      const save = ensurePlayerSave(email);
      socket.emit('loginSuccess', { 
        email, 
        highScore: save.highScore, 
        gold: save.gold,
        missiles: save.missiles || 0,
        missileAmmo: save.missileAmmo || 0
      });
    } catch (error) {
      console.error('Google verification error:', error);
      socket.emit('loginError', { message: 'Google giriş doğrulanamadı. (Lütfen geçerli bir Client ID girdiğinizden emin olun)' });
    }
  });

  socket.on('guestLogin', () => {
    const guestId = generateGuestId();
    socketEmails[socket.id] = guestId;
    
    // Create temporary guest save in memory (not persisted to file)
    if (!highScores[guestId]) {
      highScores[guestId] = { highScore: 0, gold: 0, missiles: 0, missileAmmo: 0, isGuest: true };
    }
    
    socket.emit('loginSuccess', { 
      email: guestId, 
      highScore: 0, 
      gold: 0, 
      missiles: 0,
      isGuest: true 
    });
  });

  socket.on('buyItem', (data) => {
    console.log('🛒 buyItem request received:', data);
    
    const email = socketEmails[socket.id];
    console.log('📧 Email for socket:', email);
    
    if (!email) {
      console.log('❌ No email found for socket');
      return;
    }
    
    const save = ensurePlayerSave(email);
    if (!save && email.startsWith('guest_')) {
      // Create guest save if doesn't exist
      console.log('👤 Creating guest save for:', email);
      if (!highScores[email]) {
        highScores[email] = { highScore: 0, gold: 0, missiles: 0, missileAmmo: 0, bonusDuration10s: 0, goldMultiplier: 1, isGuest: true };
      }
    }
    
    const playerSave = highScores[email];
    console.log('💾 Player save:', playerSave);
    
    if (!playerSave) {
      console.log('❌ No player save found');
      return;
    }
    
    if (data.item === 'missile') {
      const price = 100;
      console.log(`💰 Missile purchase: gold=${playerSave.gold}, price=${price}`);
      
      if (playerSave.gold >= price) {
        playerSave.gold -= price;
        playerSave.missiles = (playerSave.missiles || 0) + MISSILES_PER_PURCHASE;
        
        console.log(`✅ Purchase successful! New gold: ${playerSave.gold}, New missiles: ${playerSave.missiles}`);
        
        // Only save to file if not guest
        if (!playerSave.isGuest) {
          saveHighScores();
        }
        
        const updateData = { 
          email, 
          highScore: playerSave.highScore, 
          gold: playerSave.gold,
          missiles: playerSave.missiles,
          missileAmmo: playerSave.missileAmmo || 0,
          isGuest: playerSave.isGuest || false
        };
        
        console.log('📤 Sending purchaseSuccess:', updateData);
        
        // Send purchaseSuccess event for notification
        socket.emit('purchaseSuccess', updateData);
        
        // Update room player if in a room
        const roomCode = socketToRoom[socket.id];
        if (roomCode && rooms[roomCode] && rooms[roomCode].players[socket.id]) {
          rooms[roomCode].players[socket.id].missiles = playerSave.missiles;
          console.log('🔄 Updated missiles in room');
        }
      } else {
        console.log('❌ Not enough gold for missile purchase');
        socket.emit('notEnoughGold');
      }
    } else if (data.item === 'bonusDuration10s') {
      const price = 100;
      console.log(`💰 Bonus duration purchase: gold=${playerSave.gold}, price=${price}`);
      
      if (playerSave.gold >= price) {
        playerSave.gold -= price;
        playerSave.bonusDuration10s = (playerSave.bonusDuration10s || 0) + 3600; // 1 hour in seconds
        playerSave.bonusDuration10sEndTime = Date.now() + 3600000; // 1 hour in ms
        
        console.log(`✅ Bonus duration purchased! New gold: ${playerSave.gold}`);
        
        if (!playerSave.isGuest) {
          saveHighScores();
        }
        
        const updateData = { 
          email, 
          highScore: playerSave.highScore, 
          gold: playerSave.gold,
          missiles: playerSave.missiles || 0,
          missileAmmo: playerSave.missileAmmo || 0,
          bonusDuration10s: playerSave.bonusDuration10s,
          isGuest: playerSave.isGuest || false
        };
        
        console.log('📤 Sending purchaseSuccess for bonus duration:', updateData);
        socket.emit('purchaseSuccess', updateData);
      } else {
        console.log('❌ Not enough gold for bonus duration');
        socket.emit('notEnoughGold');
      }
    } else if (data.item === 'permanentBonusDuration') {
      // Permanent purchase - requires Google login
      if (playerSave.isGuest) {
        socket.emit('requireGoogleLogin');
        return;
      }
      const price = 299; // $2.99 in cents (placeholder)
      // For now, just mark as permanent (real payment integration would go here)
      playerSave.permanentBonusDuration = true;
      playerSave.bonusDuration10s = 999999;
      
      saveHighScores();
      
      const updateData = { 
        email, 
        highScore: playerSave.highScore, 
        gold: playerSave.gold,
        missiles: playerSave.missiles || 0,
        missileAmmo: playerSave.missileAmmo || 0,
        bonusDuration10s: playerSave.bonusDuration10s,
        isGuest: playerSave.isGuest || false
      };
      
      socket.emit('purchaseSuccess', updateData);
    } else if (data.item === 'goldMultiplier') {
      const price = 50;
      console.log(`💰 Gold multiplier purchase: gold=${playerSave.gold}, price=${price}`);
      
      if (playerSave.gold >= price) {
        playerSave.gold -= price;
        playerSave.goldMultiplier = 2;
        playerSave.goldMultiplierEndTime = Date.now() + 3600000; // 1 hour in ms
        
        console.log(`✅ Gold multiplier purchased! New gold: ${playerSave.gold}`);
        
        if (!playerSave.isGuest) {
          saveHighScores();
        }
        
        const updateData = { 
          email, 
          highScore: playerSave.highScore, 
          gold: playerSave.gold,
          missiles: playerSave.missiles || 0,
          missileAmmo: playerSave.missileAmmo || 0,
          goldMultiplier: playerSave.goldMultiplier,
          isGuest: playerSave.isGuest || false
        };
        
        console.log('📤 Sending purchaseSuccess for gold multiplier:', updateData);
        socket.emit('purchaseSuccess', updateData);
      } else {
        console.log('❌ Not enough gold for gold multiplier');
        socket.emit('notEnoughGold');
      }
    } else if (data.item === 'permanentGoldMultiplier') {
      // Permanent purchase - requires Google login
      if (playerSave.isGuest) {
        socket.emit('requireGoogleLogin');
        return;
      }
      const price = 299; // $2.99 in cents (placeholder)
      // For now, just mark as permanent (real payment integration would go here)
      playerSave.permanentGoldMultiplier = true;
      playerSave.goldMultiplier = 2;
      
      saveHighScores();
      
      const updateData = { 
        email, 
        highScore: playerSave.highScore, 
        gold: playerSave.gold,
        missiles: playerSave.missiles || 0,
        missileAmmo: playerSave.missileAmmo || 0,
        goldMultiplier: playerSave.goldMultiplier,
        isGuest: playerSave.isGuest || false
      };
      
      socket.emit('purchaseSuccess', updateData);
    }
  });

  socket.on('equipMissile', () => {
    const roomCode = socketToRoom[socket.id];
    if (!roomCode) return;
    const room = rooms[roomCode];
    if (!room) return;
    
    const p = room.players[socket.id];
    if (p && p.alive && p.missiles > 0 && p.weapon !== 'missile') {
      // Store current revolver ammo if switching from revolver
      if (p.weapon === 'revolver') {
        p.storedRevolverAmmo = p.ammo;
      }
      
      p.missiles--;
      p.weapon = 'missile';
      p.ammo = 1;
      p.isReloading = false;
      p.fireTimer = 0;
      p.weaponTimer = 0;
      p.isShooting = false;
      const email = socketEmails[socket.id];
      persistMissileState(email, p);
    }
  });

  socket.on('equipRevolver', () => {
    const roomCode = socketToRoom[socket.id];
    if (!roomCode) return;
    const room = rooms[roomCode];
    if (!room) return;
    
    const p = room.players[socket.id];
    if (!p || !p.alive) return;
    const email = socketEmails[socket.id];

    console.log(`🔫 equipRevolver called - current weapon: ${p.weapon}, ammo: ${p.ammo}, storedPickup: ${!!p.storedPickup}`);

    if (p.storedPickup) {
      console.log(`📦 Using stored pickup: ${p.storedPickup.type}`);
      returnLoadedMissile(p);
      activateStoredPickup(p);
      if (email) persistMissileState(email, p);
      return;
    }

    if (p.weapon === 'missile') {
      console.log(`🚀 Switching from missile to revolver`);
      // Always return loaded missile if any, regardless of ammo count
      returnLoadedMissile(p);
      // Switch to revolver regardless of whether missile had ammo or not
      p.weapon = 'revolver';
      p.ammo = p.storedRevolverAmmo !== undefined ? p.storedRevolverAmmo : WEAPONS.revolver.magSize;
      p.weaponTimer = 0;
      p.isReloading = false;
      p.fireTimer = 0;
      if (email) persistMissileState(email, p);
      console.log(`✅ Switched to revolver - ammo: ${p.ammo}`);
      return;
    }

    if (p.weapon !== 'revolver') {
      console.log(`🔄 Switching from ${p.weapon} to revolver`);
      switchToRevolver(p);
    }

    console.log(`⚠️ equipRevolver: Already using revolver or no action needed`);
  });

  socket.on('join', (data) => {
    const room = getOrCreateRoom();
    if (!room) {
      socket.emit('serverFull');
      return;
    }
    const name = (data.name || 'Soldier').substring(0, 16);
    // Allow custom color and skin
    room.players[socket.id] = createPlayer(socket.id, name, data.color, data.skin);
    socketToRoom[socket.id] = room.code;
    const email = socketEmails[socket.id];
    applyStoreStateToPlayer(room.players[socket.id], email);
    room.playerCount++;
    room.lastActivity = Date.now();

    console.log(`👤 Player ${name} auto-joined room ${room.code} (${room.playerCount}/${MAX_PLAYERS})`);
    io.to(socket.id).emit('joined', { id: socket.id, mapSize: MAP_SIZE, roomCode: room.code });
  });

  socket.on('joinRoom', (data) => {
    const roomCode = data.roomCode;
    
    // Validate room code format
    if (!roomCode || !/^\d{6}$/.test(roomCode)) {
      socket.emit('roomNotFound');
      return;
    }
    
    let room = getRoomByCode(roomCode);
    
    // If room doesn't exist, create it with the specified code
    if (!room) {
      if (Object.keys(rooms).length >= MAX_ROOMS) {
        socket.emit('roomNotFound'); // Too many rooms
        return;
      }
      
      rooms[roomCode] = {
        code: roomCode,
        players: {},
        playerCount: 0,
        bullets: [],
        neutralSoldiers: [],
        pickups: [],
        createdAt: Date.now(),
        lastActivity: Date.now()
      };
      
      room = rooms[roomCode];
      console.log(`🏠 New room created with code: ${roomCode} (Total rooms: ${Object.keys(rooms).length}/${MAX_ROOMS})`);
    }
    
    if (room.playerCount >= MAX_PLAYERS) {
      socket.emit('roomFull');
      return;
    }
    
    const name = (data.name || 'Soldier').substring(0, 16);
    room.players[socket.id] = createPlayer(socket.id, name, data.color, data.skin);
    socketToRoom[socket.id] = room.code;
    const email = socketEmails[socket.id];
    applyStoreStateToPlayer(room.players[socket.id], email);
    room.playerCount++;
    room.lastActivity = Date.now();

    console.log(`👤 Player ${name} joined room ${roomCode} (${room.playerCount}/${MAX_PLAYERS})`);
    io.to(socket.id).emit('joined', { id: socket.id, mapSize: MAP_SIZE, roomCode: room.code });
  });

  socket.on('mouseMove', (data) => {
    const roomCode = socketToRoom[socket.id];
    if (!roomCode) return;
    const room = rooms[roomCode];
    if (!room) return;
    const p = room.players[socket.id];
    if (p && data) {
      p.mouseX = clamp(data.x || 0, 0, MAP_SIZE);
      p.mouseY = clamp(data.y || 0, 0, MAP_SIZE);
    }
  });

  socket.on('startShooting', () => {
    const roomCode = socketToRoom[socket.id];
    if (!roomCode) return;
    const room = rooms[roomCode];
    if (!room) return;
    const p = room.players[socket.id];
    if (p && p.alive) p.isShooting = true;
  });

  socket.on('stopShooting', () => {
    const roomCode = socketToRoom[socket.id];
    if (!roomCode) return;
    const room = rooms[roomCode];
    if (!room) return;
    const p = room.players[socket.id];
    if (p) p.isShooting = false;
  });

  socket.on('clickShoot', () => {
    const roomCode = socketToRoom[socket.id];
    if (!roomCode) return;
    const room = rooms[roomCode];
    if (!room) return;
    const p = room.players[socket.id];
    if (p && p.alive) p.clickShoot = true;
  });

  socket.on('manualReload', () => {
    const roomCode = socketToRoom[socket.id];
    if (!roomCode) return;
    const room = rooms[roomCode];
    if (!room) return;
    const p = room.players[socket.id];
    if (p && p.alive && !p.isReloading && p.weapon !== 'missile' && p.ammo < WEAPONS[p.weapon].magSize) {
      p.isReloading = true;
      p.reloadTimer = WEAPONS[p.weapon].reloadTime;
      p.isShooting = false;
    }
  });

  socket.on('disconnect', () => {
    const roomCode = socketToRoom[socket.id];
    if (roomCode && rooms[roomCode]) {
      const room = rooms[roomCode];
      const email = socketEmails[socket.id];
      const p = room.players[socket.id];
      if (p && email) persistMissileState(email, p);
      
      // Clean up guest data from memory when they disconnect
      if (email && email.startsWith('guest_') && highScores[email]) {
        delete highScores[email];
      }
      
      if (p) {
        delete room.players[socket.id];
        room.playerCount = Math.max(0, room.playerCount - 1);
        room.lastActivity = Date.now();
        console.log(`👋 Player left room ${roomCode} (${room.playerCount}/${MAX_PLAYERS} remaining)`);
      }
      
      // Delete empty room after 30 seconds to prevent immediate recreation
      if (room.playerCount === 0) {
        setTimeout(() => {
          if (rooms[roomCode] && rooms[roomCode].playerCount === 0) {
            console.log(`🗑️ Cleaning up empty room: ${roomCode}`);
            delete rooms[roomCode];
          }
        }, 30000);
      }
    }
    delete socketToRoom[socket.id];
    delete socketEmails[socket.id];
  });
});

// ==========================================
//  GAME LOOP
// ==========================================
let spawnTickNeutral = 0;
let spawnTickPickup = 0;

function gameLoop() {
  const dt = 1 / TICK_RATE;

  // Process each room
  for (const roomCode in rooms) {
    const room = rooms[roomCode];
    const players = room.players;
    const bullets = room.bullets;
    const neutralSoldiers = room.neutralSoldiers;
    const pickups = room.pickups;

    // Manage bots (add/remove based on player count)
    manageBots(room);

    // --- Update Players ---
    for (const id in players) {
      const p = players[id];
      if (!p.alive) continue;

      // Update bot AI
      if (p.isBot) {
        updateBotAI(p, room, dt);
      }

      // Main player body moves toward mouse
      const dx = p.mouseX - p.x;
      const dy = p.mouseY - p.y;
      const d = Math.hypot(dx, dy);
      let isMoving = false;
      if (d > 5) {
        isMoving = true;
        const speed = PLAYER_SPEED * dt;
        p.x += (dx / d) * speed;
        p.y += (dy / d) * speed;
        p.angle = Math.atan2(dy, dx);
      }
      p.x = clamp(p.x, SOLDIER_RADIUS, MAP_SIZE - SOLDIER_RADIUS);
      p.y = clamp(p.y, SOLDIER_RADIUS, MAP_SIZE - SOLDIER_RADIUS);

      if (p.stretch === undefined) p.stretch = 1.0;
      const targetStretch = isMoving ? 1.8 : 1.0;
      p.stretch += (targetStretch - p.stretch) * 0.05;

      // Update maxSoldiers tracker
      const currentSoldierCount = p.soldiers.length + 1;
      if (currentSoldierCount > p.maxSoldiers) {
        p.maxSoldiers = currentSoldierCount;
      }

      // --- FORMATION (Rings around player) ---
      const formation = computeFormation(p.soldiers.length, p.stretch, p.angle);
      for (let i = 0; i < p.soldiers.length; i++) {
        const s = p.soldiers[i];
        const targetX = p.x + formation[i].ox;
        const targetY = p.y + formation[i].oy;
        
        const sdx = targetX - s.x;
        const sdy = targetY - s.y;
        const sd = Math.hypot(sdx, sdy);
      
      if (sd > 100) {
        // Far away: Move smoothly but fast towards position
        const moveSpd = PLAYER_SPEED * 3 * dt;
        s.x += (sdx / sd) * moveSpd;
        s.y += (sdy / sd) * moveSpd;
      } else {
        // Close: Lerp tightly to maintain shape
        s.x += sdx * 0.3;
        s.y += sdy * 0.3;
      }
    }

    // Proximity Recruit (Neutral soldiers) - check main body AND all soldiers
    for (let j = neutralSoldiers.length - 1; j >= 0; j--) {
      const ns = neutralSoldiers[j];
      let recruited = false;

      if (dist({x: p.x, y: p.y}, ns) < RECRUIT_RADIUS) recruited = true;
      else {
        for (const s of p.soldiers) {
          if (dist(s, ns) < RECRUIT_RADIUS) { recruited = true; break; }
        }
      }

      if (recruited) {
        p.soldiers.push({
          id: uid(), x: ns.x, y: ns.y,
          canShoot: ns.canShoot, hp: 1, fireTimer: 0
        });
        neutralSoldiers.splice(j, 1);
        // Update max soldiers
        const currentSoldierCount = p.soldiers.length + 1;
        if (currentSoldierCount > p.maxSoldiers) {
          p.maxSoldiers = currentSoldierCount;
        }
      }
    }

    // Timers
    if (p.weaponTimer > 0) {
      p.weaponTimer -= dt;
      if (p.weaponTimer <= 0) {
        p.weapon = 'revolver';
        // Restore previous revolver ammo if available, otherwise full mag
        p.ammo = p.storedRevolverAmmo !== undefined ? p.storedRevolverAmmo : WEAPONS.revolver.magSize;
        p.weaponTimer = 0;
        p.isReloading = false;
      }
    }

    if (p.shieldActive) {
      p.shieldTimer -= dt;
      if (p.shieldTimer <= 0) {
        p.shieldActive = false;
        p.shieldTimer = 0;
      }
    }

    if (p.isReloading) {
      p.reloadTimer -= dt;
      if (p.reloadTimer <= 0) {
        p.isReloading = false;
        p.ammo = WEAPONS[p.weapon].magSize;
        p.reloadTimer = 0;
      }
    }

    p.fireTimer -= dt;

    // Shooting Logic
    const wDef = WEAPONS[p.weapon];
    const wantsToShoot = wDef.auto ? p.isShooting : p.clickShoot;

    if (wantsToShoot && !p.isReloading && p.ammo > 0 && p.fireTimer <= 0) {
      // Main player shoots
      const angle = Math.atan2(p.mouseY - p.y, p.mouseX - p.x);
      const distToMouse = Math.hypot(p.mouseX - p.x, p.mouseY - p.y);
      const isMissile = (p.weapon === 'missile');
      const scaleMultiplier = Math.pow(1.1, calculateScaleLevel(p.score));
      const maxD = isMissile ? distToMouse : MAX_BULLET_DIST * scaleMultiplier;

      bullets.push({
        id: uid(),
        ownerId: p.id,
        color: p.color,
        weapon: p.weapon,
        x: p.x + Math.cos(angle) * (SOLDIER_RADIUS + 4),
        y: p.y + Math.sin(angle) * (SOLDIER_RADIUS + 4),
        vx: Math.cos(angle) * BULLET_SPEED,
        vy: Math.sin(angle) * BULLET_SPEED,
        damage: wDef.damage,
        traveled: 0,
        maxDist: maxD
      });
      p.ammo--;
      p.fireTimer = 1 / wDef.fireRate;

      const email = socketEmails[p.id];
      if (isMissile && email) persistMissileState(email, p);

      // Armed soldiers shoot (Cap to 25 to prevent bullet-hell lag)
      if (!isMissile) {
        let shooters = 0;
        const soldierRanges = getSoldierBulletRanges(p, angle);
        for (const s of p.soldiers) {
          if (!s.canShoot) continue;
          if (shooters >= 25) break; 
          shooters++;
  
          const sAngle = Math.atan2(p.mouseY - s.y, p.mouseX - s.x);
          bullets.push({
            id: uid(),
            ownerId: p.id,
            color: p.color,
            weapon: 'revolver',
            x: s.x + Math.cos(sAngle) * (SOLDIER_RADIUS + 2),
            y: s.y + Math.sin(sAngle) * (SOLDIER_RADIUS + 2),
            vx: Math.cos(sAngle) * BULLET_SPEED,
            vy: Math.sin(sAngle) * BULLET_SPEED,
            damage: WEAPONS.revolver.damage,
            traveled: 0,
            maxDist: soldierRanges.get(s) || MAX_BULLET_DIST
          });
        }
      }

      if (p.ammo <= 0) {
        p.isShooting = false;
        if (p.weapon === 'missile') {
          switchToRevolver(p);
          if (email) persistMissileState(email, p);
        } else {
          p.isReloading = true;
          p.reloadTimer = wDef.reloadTime;
        }
      }
    }
    p.clickShoot = false; // Reset click shoot

    // Pickup collision (Army-wide)
    for (let i = pickups.length - 1; i >= 0; i--) {
      const pk = pickups[i];
      let collected = false;
      
      if (dist({x: p.x, y: p.y}, pk) < SOLDIER_RADIUS + PICKUP_RADIUS) {
        collected = true;
      } else {
        for (const s of p.soldiers) {
          if (dist(s, pk) < SOLDIER_RADIUS + PICKUP_RADIUS) { collected = true; break; }
        }
      }

      if (collected) {
        if (pk.type === 'shield') {
          p.shieldActive = true;
          p.shieldTimer = 10 + (p.bonusDuration10s > 0 ? 10 : 0);
        } else {
          const w = WEAPONS[pk.type];
          if (p.weapon === 'missile') {
            p.storedPickup = { type: pk.type, ammo: w.magSize };
          } else {
            // Store current revolver ammo if switching from revolver
            if (p.weapon === 'revolver') {
              p.storedRevolverAmmo = p.ammo;
            }
            
            p.weapon = pk.type;
            p.ammo = w.magSize;
            p.weaponTimer = w.duration + (p.bonusDuration10s > 0 ? 10 : 0);
            p.isReloading = false;
            p.fireTimer = 0;
          }
        }
        pickups.splice(i, 1);
      }
    }
  }

  // --- Melee Collision Removed ---
  // (Players no longer die by touching each other)

  // --- Update Bullets & Collisions ---
  let explosions = [];
  
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    const step = BULLET_SPEED * dt;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.traveled += step;

    const maxD = b.maxDist || MAX_BULLET_DIST;
    let hitExplode = false;

    if (b.traveled >= maxD || b.x < 0 || b.x > MAP_SIZE || b.y < 0 || b.y > MAP_SIZE) {
      if (b.weapon === 'missile') hitExplode = true;
      else {
        bullets.splice(i, 1);
        continue;
      }
    }

    if (!hitExplode) {
      const shooter = players[b.ownerId];
      let hit = false;
      for (const pid in players) {
        if (pid === b.ownerId) continue;
        const enemy = players[pid];
        if (!enemy.alive) continue;

        const armyRadius = Math.ceil(Math.sqrt((enemy.soldiers.length || 1) / 3)) * 30 + 80;
        if (dist(b, {x: enemy.x, y: enemy.y}) > armyRadius) continue;

        if (b.weapon === 'missile') {
          if (dist(b, {x: enemy.x, y: enemy.y}) < SOLDIER_RADIUS + BULLET_RADIUS) { hitExplode = true; break; }
          for (const s of enemy.soldiers) {
            if (dist(b, s) < SOLDIER_RADIUS + BULLET_RADIUS) { hitExplode = true; break; }
          }
          if (hitExplode) break;
        } else {
          // NORMAL BULLET
          if (enemy.shieldActive) {
            let nearShield = false;
            if (dist(b, {x: enemy.x, y: enemy.y}) < SOLDIER_RADIUS + BULLET_RADIUS + 5) nearShield = true;
            for (const s of enemy.soldiers) {
              if (dist(b, s) < SOLDIER_RADIUS + BULLET_RADIUS + 5) { nearShield = true; break; }
            }
            if (nearShield) { hit = true; break; }
            continue;
          }

          for (let j = enemy.soldiers.length - 1; j >= 0; j--) {
            const es = enemy.soldiers[j];
            if (dist(b, es) < SOLDIER_RADIUS + BULLET_RADIUS) {
              es.hp = (es.hp || 1) - b.damage;
              if (es.hp <= 0) {
                const taken = enemy.soldiers.splice(j, 1)[0];
                if (shooter) { taken.hp = 1; taken.fireTimer = 0; shooter.soldiers.push(taken); }
              }
              hit = true; break;
            }
          }
          if (hit) break;

          if (dist(b, {x: enemy.x, y: enemy.y}) < SOLDIER_RADIUS + BULLET_RADIUS) {
            const soldierCount = enemy.soldiers.length + 1;
            const enemyKills = enemy.kills || 0;
            const enemyMaxSoldiers = enemy.maxSoldiers || soldierCount;
            if (shooter) {
              for (const s of enemy.soldiers) { s.hp = 1; s.fireTimer = 0; shooter.soldiers.push(s); }
              // Update max soldiers for shooter
              const shooterSoldierCount = shooter.soldiers.length + 1;
              if (shooterSoldierCount > shooter.maxSoldiers) {
                shooter.maxSoldiers = shooterSoldierCount;
              }
            }
            if (shooter && shooter !== enemy) shooter.kills = (shooter.kills || 0) + 1;
            
            enemy.alive = false;
            enemy.soldiers = [];
            
            const enemyEmail = socketEmails[enemy.id];
            persistMissileState(enemyEmail, enemy);
            const earnedGold = enemyMaxSoldiers + (enemyKills * 50); // Updated: maxSoldiers + (kills * 50)
            
            // Apply gold multiplier for shooter
            const shooterEmail = shooter ? socketEmails[shooter.id] : null;
            const multiplier = shooter && shooter.goldMultiplier ? shooter.goldMultiplier : 1;
            const finalGold = earnedGold * multiplier;
            
            let isNewHighScore = false;
            let prevHighScore = 0;
            let totalGold = finalGold;
            
            // Only process high scores for real players
            if (enemyEmail && !enemy.isBot) {
              if (!highScores[enemyEmail]) {
                highScores[enemyEmail] = { highScore: 0, gold: 0, missiles: 0, isGuest: enemyEmail.startsWith('guest_') };
              }
              prevHighScore = highScores[enemyEmail].highScore;
              if (soldierCount > prevHighScore) { 
                highScores[enemyEmail].highScore = soldierCount; 
                isNewHighScore = true; 
              }
              highScores[enemyEmail].gold += finalGold;
              totalGold = highScores[enemyEmail].gold;
              
              // Only save to file if not guest
              if (!highScores[enemyEmail].isGuest) {
                saveHighScores();
              }
            }
            
            // Send eliminated event only to real players
            if (!enemy.isBot) {
              io.to(pid).emit('eliminated', { 
                score: soldierCount, 
                kills: enemyKills || 0, 
                maxSoldiers: enemyMaxSoldiers || soldierCount,
                isNewHighScore, 
                highScore: enemyEmail ? highScores[enemyEmail].highScore : Math.max(prevHighScore, soldierCount), 
                earnedGold: finalGold || 0, 
                totalGold: totalGold || 0
              });
            } else {
              // Bot respawn after 3 seconds
              setTimeout(() => {
                if (players[pid] && players[pid].isBot) {
                  respawnPlayer(players[pid]);
                  console.log(`🤖 Bot respawned: ${players[pid].name}`);
                }
              }, 3000);
            }
            hit = true; break;
          }
        }
      }
      if (hit && !hitExplode) { bullets.splice(i, 1); continue; }
    }

    if (hitExplode) {
      const radius = SOLDIER_RADIUS * 12; // Optimized for ~30 soldiers kill range
      explosions.push({ x: b.x, y: b.y, r: radius, c: '#ffaa00' });
      const shooter = players[b.ownerId];

      // Damage Neutrals
      for (let n = neutralSoldiers.length - 1; n >= 0; n--) {
        if (dist(b, neutralSoldiers[n]) <= radius) {
          neutralSoldiers.splice(n, 1);
        }
      }

      // Damage Players and their soldiers (store weapons never harm the shooter)
      for (const pid in players) {
        if (pid === b.ownerId) continue;
        const enemy = players[pid];
        if (!enemy.alive) continue;
        
        // Transfer killed soldiers to shooter
        for (let j = enemy.soldiers.length - 1; j >= 0; j--) {
          if (dist(b, enemy.soldiers[j]) <= radius) {
            const killedSoldier = enemy.soldiers.splice(j, 1)[0];
            if (shooter && shooter.alive) {
              killedSoldier.hp = 1;
              killedSoldier.fireTimer = 0;
              shooter.soldiers.push(killedSoldier);
            }
          }
        }
        
        if (dist(b, {x: enemy.x, y: enemy.y}) <= radius) {
          const soldierCount = enemy.soldiers.length + 1;
          const enemyKills = enemy.kills || 0;
          const enemyMaxSoldiers = enemy.maxSoldiers || soldierCount;
          
          // Transfer remaining soldiers to shooter before elimination
          if (shooter && shooter.alive && shooter !== enemy) {
            for (const s of enemy.soldiers) {
              s.hp = 1;
              s.fireTimer = 0;
              shooter.soldiers.push(s);
            }
            // Update max soldiers for shooter
            const shooterSoldierCount = shooter.soldiers.length + 1;
            if (shooterSoldierCount > shooter.maxSoldiers) {
              shooter.maxSoldiers = shooterSoldierCount;
            }
          }
          
          enemy.alive = false;
          enemy.soldiers = [];
          if (shooter && shooter !== enemy) shooter.kills = (shooter.kills || 0) + 1;
          
          const enemyEmail = socketEmails[enemy.id];
          persistMissileState(enemyEmail, enemy);
          const earnedGold = enemyMaxSoldiers + (enemyKills * 50); // Updated: maxSoldiers + (kills * 50)
          
          // Apply gold multiplier for shooter
          const shooterEmail = shooter ? socketEmails[shooter.id] : null;
          const multiplier = shooter && shooter.goldMultiplier ? shooter.goldMultiplier : 1;
          const finalGold = earnedGold * multiplier;
          
          let isNewHighScore = false;
          let prevHighScore = 0;
          let totalGold = finalGold;
          
          // Only process high scores for real players
          if (enemyEmail && !enemy.isBot) {
            if (!highScores[enemyEmail]) {
              highScores[enemyEmail] = { highScore: 0, gold: 0, missiles: 0, isGuest: enemyEmail.startsWith('guest_') };
            }
            prevHighScore = highScores[enemyEmail].highScore;
            if (soldierCount > prevHighScore) { 
              highScores[enemyEmail].highScore = soldierCount; 
              isNewHighScore = true; 
            }
            highScores[enemyEmail].gold += finalGold;
            totalGold = highScores[enemyEmail].gold;
            
            // Only save to file if not guest
            if (!highScores[enemyEmail].isGuest) {
              saveHighScores();
            }
          }
          
          // Send eliminated event only to real players
          if (!enemy.isBot) {
            io.to(pid).emit('eliminated', { 
              score: soldierCount, 
              kills: enemyKills || 0, 
              maxSoldiers: enemyMaxSoldiers || soldierCount,
              isNewHighScore, 
              highScore: enemyEmail ? highScores[enemyEmail].highScore : Math.max(prevHighScore, soldierCount), 
              earnedGold: finalGold || 0, 
              totalGold: totalGold || 0
            });
          } else {
            // Bot respawn after 3 seconds
            setTimeout(() => {
              if (players[pid] && players[pid].isBot) {
                respawnPlayer(players[pid]);
                console.log(`🤖 Bot respawned: ${players[pid].name}`);
              }
            }, 3000);
          }
        }
      }
      bullets.splice(i, 1);
    }
  }

  // --- Spawning ---
  spawnTickNeutral++;
  if (spawnTickNeutral >= TICK_RATE * 1.5) { 
    spawnNeutralBatch(neutralSoldiers);
    spawnTickNeutral = 0;
  }

  spawnTickPickup++;
  if (spawnTickPickup >= TICK_RATE * 4) { 
    spawnPickups(pickups);
    spawnTickPickup = 0;
  }

  // --- Build & Send State ---
  const leaderboard = Object.values(players)
    .filter(p => p.alive)
    .map(p => ({ name: p.name, score: p.soldiers.length + 1, color: p.color }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  const playerData = {};
  for (const id in players) {
    const p = players[id];
    playerData[id] = {
      id: p.id,
      name: p.name,
      color: p.color,
      skin: p.skin, // Send skin data
      x: p.x, 
      y: p.y,
      angle: p.angle,
      soldiers: p.soldiers.map(s => ({ x: s.x, y: s.y, cs: s.canShoot })),
      weapon: p.weapon,
      weaponName: WEAPONS[p.weapon].name,
      ammo: p.ammo,
      maxAmmo: WEAPONS[p.weapon].magSize,
      isReloading: p.isReloading,
      reloadTimer: p.reloadTimer,
      reloadTime: WEAPONS[p.weapon].reloadTime,
      shieldActive: p.shieldActive,
      shieldTimer: p.shieldTimer,
      weaponTimer: p.weaponTimer,
      score: p.soldiers.length + 1,
      alive: p.alive,
      kills: p.kills || 0,
      missiles: p.missiles || 0,
      totalMissiles: getTotalMissileCount(p),
      isMissile: p.weapon === 'missile',
      hasStoredPickup: !!p.storedPickup,
      storedPickupName: p.storedPickup ? WEAPONS[p.storedPickup.type].name : null
    };
  }

  const bulletData = bullets.map(b => ({ id: b.id, x: b.x, y: b.y, c: b.color }));
  const neutralData = neutralSoldiers.map(n => ({ id: n.id, x: n.x, y: n.y, cs: n.canShoot }));
  const pickupData = pickups.map(pk => ({ id: pk.id, x: pk.x, y: pk.y, type: pk.type }));

  const totalPlayers = Object.values(players).filter(p => p.alive).length;

  const state = {
    players: playerData,
    neutrals: neutralData,
    pickups: pickupData,
    bullets: bulletData,
    explosions,
    leaderboard,
    totalPlayers,
    roomCode: roomCode
  };

  for (const id in players) {
    io.to(id).emit('gameState', state);
  }
  } // End room loop
}

setInterval(gameLoop, TICK_MS);

// Periodic room cleanup and statistics logging
setInterval(() => {
  const now = Date.now();
  const ROOM_TIMEOUT = 5 * 60 * 1000; // 5 minutes of inactivity
  
  // Clean up inactive empty rooms
  for (const code in rooms) {
    const room = rooms[code];
    if (room.playerCount === 0 && (now - room.lastActivity) > ROOM_TIMEOUT) {
      console.log(`🗑️ Cleaning up inactive room: ${code}`);
      delete rooms[code];
    }
  }
  
  // Log room statistics every 5 minutes
  const stats = getRoomStats();
  if (stats.totalRooms > 0) {
    console.log(`📊 Room Stats: ${stats.totalPlayers} players in ${stats.totalRooms} rooms (${stats.fullRooms} full, ${stats.availableRooms} available)`);
  }
}, 5 * 60 * 1000); // Every 5 minutes

// ==========================================
//  XSOLLA PAYMENT INTEGRATION
// ==========================================

// Load Xsolla configuration
let XSOLLA_PROJECT_ID = 'YOUR_XSOLLA_PROJECT_ID';
let XSOLLA_MERCHANT_ID = 'YOUR_XSOLLA_MERCHANT_ID';
let XSOLLA_API_KEY = 'YOUR_XSOLLA_API_KEY';

try {
  const configFile = fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8');
  const config = JSON.parse(configFile);
  if (config.XSOLLA_PROJECT_ID) XSOLLA_PROJECT_ID = config.XSOLLA_PROJECT_ID;
  if (config.XSOLLA_MERCHANT_ID) XSOLLA_MERCHANT_ID = config.XSOLLA_MERCHANT_ID;
  if (config.XSOLLA_API_KEY) XSOLLA_API_KEY = config.XSOLLA_API_KEY;
} catch (err) {
  console.log('⚠️ Xsolla config not found, using placeholder values');
}

// Environment variables have priority (for Render deployment)
XSOLLA_PROJECT_ID = process.env.XSOLLA_PROJECT_ID || XSOLLA_PROJECT_ID;
XSOLLA_MERCHANT_ID = process.env.XSOLLA_MERCHANT_ID || XSOLLA_MERCHANT_ID;
XSOLLA_API_KEY = process.env.XSOLLA_API_KEY || XSOLLA_API_KEY;

console.log('💳 Xsolla configured:', XSOLLA_PROJECT_ID !== 'YOUR_XSOLLA_PROJECT_ID' ? '✅' : '❌');

// Regional Pricing System
const REGIONAL_PRICES = {
  // Türkiye - TRY (Türk Lirası) - SENİN FİYATIN
  'TR': { currency: 'TRY', price: 30, symbol: '₺' },
  
  // Amerika - USD
  'US': { currency: 'USD', price: 2.99, symbol: '$' },
  
  // Avrupa - EUR - SENİN FİYATIN
  'DE': { currency: 'EUR', price: 2.99, symbol: '€' },
  'FR': { currency: 'EUR', price: 2.99, symbol: '€' },
  'IT': { currency: 'EUR', price: 2.99, symbol: '€' },
  'ES': { currency: 'EUR', price: 2.99, symbol: '€' },
  'NL': { currency: 'EUR', price: 2.99, symbol: '€' },
  'BE': { currency: 'EUR', price: 2.99, symbol: '€' },
  'AT': { currency: 'EUR', price: 2.99, symbol: '€' },
  'PT': { currency: 'EUR', price: 2.99, symbol: '€' },
  'GR': { currency: 'EUR', price: 2.99, symbol: '€' },
  'IE': { currency: 'EUR', price: 2.99, symbol: '€' },
  'FI': { currency: 'EUR', price: 2.99, symbol: '€' },
  
  // İngiltere - GBP
  'GB': { currency: 'GBP', price: 2.49, symbol: '£' },
  
  // Rusya - RUB - SENİN FİYATIN
  'RU': { currency: 'RUB', price: 150, symbol: '₽' },
  
  // Çin - CNY - SENİN FİYATIN
  'CN': { currency: 'CNY', price: 15, symbol: '¥' },
  
  // Brezilya - BRL
  'BR': { currency: 'BRL', price: 14.99, symbol: 'R$' },
  
  // Hindistan - INR
  'IN': { currency: 'INR', price: 249, symbol: '₹' },
  
  // Meksika - MXN
  'MX': { currency: 'MXN', price: 54.99, symbol: '$' },
  
  // Arjantin - ARS
  'AR': { currency: 'ARS', price: 2499, symbol: '$' },
  
  // Polonya - PLN
  'PL': { currency: 'PLN', price: 12.99, symbol: 'zł' },
  
  // Japonya - JPY
  'JP': { currency: 'JPY', price: 440, symbol: '¥' },
  
  // Güney Kore - KRW
  'KR': { currency: 'KRW', price: 3990, symbol: '₩' },
  
  // Avustralya - AUD
  'AU': { currency: 'AUD', price: 4.49, symbol: 'A$' },
  
  // Kanada - CAD
  'CA': { currency: 'CAD', price: 3.99, symbol: 'C$' },
  
  // Yeni Zelanda - NZD
  'NZ': { currency: 'NZD', price: 4.99, symbol: 'NZ$' },
  
  // Singapur - SGD
  'SG': { currency: 'SGD', price: 3.99, symbol: 'S$' },
  
  // Hong Kong - HKD
  'HK': { currency: 'HKD', price: 23.50, symbol: 'HK$' },
  
  // İsveç - SEK
  'SE': { currency: 'SEK', price: 32.99, symbol: 'kr' },
  
  // Norveç - NOK
  'NO': { currency: 'NOK', price: 32.99, symbol: 'kr' },
  
  // Danimarka - DKK
  'DK': { currency: 'DKK', price: 21.99, symbol: 'kr' },
  
  // İsviçre - CHF
  'CH': { currency: 'CHF', price: 2.79, symbol: 'CHF' },
  
  // DEFAULT - USD
  'DEFAULT': { currency: 'USD', price: 2.99, symbol: '$' }
};

// Get user's country from IP
function getCountryFromIP(ip) {
  if (!geoip) {
    return 'DEFAULT';
  }
  
  // Handle localhost
  if (ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1') {
    return 'TR'; // Default to Turkey for localhost testing
  }
  
  const geo = geoip.lookup(ip);
  if (geo && geo.country) {
    console.log(`🌍 IP ${ip} detected as ${geo.country}`);
    return geo.country;
  }
  
  return 'DEFAULT';
}

// Get pricing for country
function getPricingForCountry(countryCode) {
  return REGIONAL_PRICES[countryCode] || REGIONAL_PRICES['DEFAULT'];
}

// Format price based on country
function formatPrice(pricing, countryCode) {
  if (countryCode === 'TR') {
    return `${pricing.price} TL`; // Türkiye için "30 TL"
  } else if (countryCode === 'RU') {
    return `${pricing.price} ₽`; // Rusya için "150 ₽"
  } else if (countryCode === 'CN') {
    return `${pricing.price} ¥`; // Çin için "15 ¥"
  } else if (['DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'PT', 'GR', 'IE', 'FI'].includes(countryCode)) {
    return `${pricing.price} €`; // Avrupa için "2.99 €"
  } else if (countryCode === 'GB') {
    return `£${pricing.price}`; // İngiltere için "£2.49"
  } else {
    return `$${pricing.price}`; // Amerika ve diğerleri için "$2.99"
  }
}

// API endpoint to get user's regional price
app.get('/api/get-regional-price', (req, res) => {
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress;
  const countryCode = getCountryFromIP(ip);
  const pricing = getPricingForCountry(countryCode);
  const formattedPrice = formatPrice(pricing, countryCode);
  
  console.log(`💰 Regional price for ${countryCode}: ${formattedPrice}`);
  
  res.json({
    success: true,
    countryCode: countryCode,
    currency: pricing.currency,
    price: pricing.price,
    symbol: pricing.symbol,
    formattedPrice: formattedPrice
  });
});

// Create payment token endpoint
app.post('/api/create-xsolla-payment', async (req, res) => {
  console.log('💳 Creating Xsolla payment token...');
  
  const { email, itemType } = req.body;
  
  if (!email || !itemType) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }
  
  // Get user's IP and determine regional pricing
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress;
  const countryCode = getCountryFromIP(ip);
  const pricing = getPricingForCountry(countryCode);
  
  console.log(`🌍 User from ${countryCode}: ${pricing.symbol}${pricing.price} ${pricing.currency}`);
  
  // Define items with regional pricing
  const items = {
    bonusDuration: {
      sku: 'BONUS_DURATION_PERM',
      name: '+10 Süre (Kalıcı)',
      description: 'Kalkan ve silahlara kalıcı +10sn bonus',
      price: pricing.price,
      currency: pricing.currency
    },
    goldMultiplier: {
      sku: 'GOLD_MULTIPLIER_PERM',
      name: 'x2 Altın (Kalıcı)',
      description: 'Oyun sonunda kalıcı 2 kat altın',
      price: pricing.price,
      currency: pricing.currency
    }
  };
  
  const item = items[itemType];
  if (!item) {
    return res.status(400).json({ success: false, error: 'Invalid item type' });
  }
  
  try {
    // Generate unique order ID
    const orderId = `order_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    
    // Create Xsolla token request
    const https = require('https');
    
    const tokenData = JSON.stringify({
      user: {
        id: { value: email },
        email: { value: email }
      },
      settings: {
        project_id: parseInt(XSOLLA_PROJECT_ID),
        currency: item.currency,
        language: 'tr',
        return_url: `http://localhost:${PORT}`,
        ui: {
          theme: 'dark',
          size: 'large'
        }
      },
      purchase: {
        checkout: {
          amount: item.price,
          currency: item.currency
        },
        virtual_items: {
          items: [{
            sku: item.sku,
            name: item.name,
            description: item.description,
            amount: 1,
            price: item.price
          }]
        }
      },
      custom_parameters: {
        email: email,
        itemType: itemType,
        orderId: orderId
      }
    });
    
    const options = {
      hostname: 'store.xsolla.com',
      port: 443,
      path: '/api/v2/paystation/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': tokenData.length,
        'Authorization': `Basic ${Buffer.from(`${XSOLLA_MERCHANT_ID}:${XSOLLA_API_KEY}`).toString('base64')}`
      }
    };
    
    const xsollaReq = https.request(options, (xsollaRes) => {
      let data = '';
      
      xsollaRes.on('data', (chunk) => {
        data += chunk;
      });
      
      xsollaRes.on('end', () => {
        try {
          const response = JSON.parse(data);
          
          if (response.token) {
            console.log('✅ Xsolla token created:', response.token);
            res.json({ success: true, token: response.token });
          } else {
            console.error('❌ Xsolla error:', response);
            res.status(400).json({ success: false, error: response.message || 'Token creation failed' });
          }
        } catch (err) {
          console.error('❌ JSON parse error:', err);
          res.status(500).json({ success: false, error: 'Invalid response from Xsolla' });
        }
      });
    });
    
    xsollaReq.on('error', (err) => {
      console.error('❌ Xsolla request error:', err);
      res.status(500).json({ success: false, error: err.message });
    });
    
    xsollaReq.write(tokenData);
    xsollaReq.end();
    
  } catch (err) {
    console.error('❌ Payment creation error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Xsolla webhook endpoint (for payment confirmation)
app.post('/api/xsolla-webhook', (req, res) => {
  console.log('🔔 Xsolla webhook received:', req.body);
  
  const { notification_type, user, purchase } = req.body;
  
  if (notification_type === 'payment') {
    const email = user?.id?.value || user?.email?.value;
    const customParams = purchase?.custom_parameters || req.body.custom_parameters;
    const itemType = customParams?.itemType;
    
    console.log(`💰 Payment confirmed for ${email}: ${itemType}`);
    
    // Update player's permanent purchase
    if (email && highScores[email]) {
      if (itemType === 'bonusDuration') {
        highScores[email].permanentBonusDuration = true;
        highScores[email].bonusDuration10s = 999999;
      } else if (itemType === 'goldMultiplier') {
        highScores[email].permanentGoldMultiplier = true;
        highScores[email].goldMultiplier = 2;
      }
      
      if (!highScores[email].isGuest) {
        saveHighScores();
      }
      
      console.log(`✅ Permanent ${itemType} granted to ${email}`);
    }
    
    res.status(204).send();
  } else {
    res.status(400).json({ error: 'Invalid notification type' });
  }
});

server.listen(PORT, () => {
  console.log(`Soldare.IO server running on http://localhost:${PORT}`);
});
