// ==========================================
//  SOLDARE.IO - Game Client (v3.0)
// ==========================================
(() => {
  // === Constants ===
  const GRID_SIZE = 100;
  const SOLDIER_RADIUS = 16;
  const BG_COLOR = '#12121f';
  const GRID_COLOR = '#1c1c32';
  
  // === Performance Optimization Settings ===
  const MAX_PARTICLES = 50; // Limit explosion particles
  const MAX_VISIBLE_ENTITIES = 200; // Limit rendered entities
  const CULLING_MARGIN = 200; // Off-screen culling margin
  const SKIN_CACHE_LIMIT = 100; // Limit skin canvas cache
  
  // Object pools for performance
  const bulletPool = [];
  const soldierPool = [];
  
  function getBulletFromPool() {
    return bulletPool.length > 0 ? bulletPool.pop() : {};
  }
  
  function returnBulletToPool(bullet) {
    if (bulletPool.length < 100) bulletPool.push(bullet);
  }

  // === Weapon Icons - Ultra Realistic ===
  const WEAPON_ICONS = {
    revolver: `
      <svg viewBox="0 0 64 48" width="34" height="34" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <!-- Simplified Revolver Icon based on reference image -->
        <!-- Barrel - long and thin -->
        <rect x="32" y="18" width="28" height="4" rx="2" fill="#8a8a8a" stroke="#6a6a6a" stroke-width="0.8"/>
        <rect x="33" y="18.5" width="26" height="3" rx="1.5" fill="#a8a8a8"/>
        
        <!-- Cylinder - dark gray drum -->
        <rect x="22" y="15" width="12" height="10" rx="2" fill="#3a3a3a" stroke="#2a2a2a" stroke-width="1"/>
        <rect x="23" y="16" width="10" height="8" rx="1.5" fill="#4a4a4a"/>
        <!-- Cylinder chambers indicator -->
        <line x1="24" y1="17" x2="24" y2="23" stroke="#2a2a2a" stroke-width="0.5"/>
        <line x1="26" y1="17" x2="26" y2="23" stroke="#2a2a2a" stroke-width="0.5"/>
        <line x1="28" y1="17" x2="28" y2="23" stroke="#2a2a2a" stroke-width="0.5"/>
        <line x1="30" y1="17" x2="30" y2="23" stroke="#2a2a2a" stroke-width="0.5"/>
        <line x1="32" y1="17" x2="32" y2="23" stroke="#2a2a2a" stroke-width="0.5"/>
        
        <!-- Frame - connecting piece -->
        <path d="M18 20 L22 20 L22 24 L18 30 L12 30 L12 24 Z" fill="#b8b8b8" stroke="#888888" stroke-width="0.8"/>
        <path d="M13 24 L20 24 L20 26 L13 26 Z" fill="#c8c8c8"/>
        
        <!-- Trigger -->
        <ellipse cx="15" cy="27" rx="1.5" ry="2.5" fill="#5a5a5a" stroke="#3a3a3a" stroke-width="0.6"/>
        
        <!-- Grip - brown/orange wood -->
        <rect x="8" y="25" width="8" height="16" rx="3" fill="#b87850" stroke="#8a5a38" stroke-width="1"/>
        <rect x="9" y="26" width="6" height="14" rx="2.5" fill="#c88860"/>
        <!-- Wood grain lines -->
        <path d="M10 28 Q11 33 10 38" stroke="#a86840" stroke-width="0.6" fill="none"/>
        <path d="M12 28 Q13 33 12 38" stroke="#a86840" stroke-width="0.6" fill="none"/>
        <path d="M14 28 Q13.5 33 14 38" stroke="#a86840" stroke-width="0.6" fill="none"/>
        
        <!-- Hammer -->
        <path d="M20 13 L22 15 L20 17" stroke="#6a6a6a" stroke-width="2" fill="none" stroke-linecap="round"/>
      </svg>
    `,
    
    ak47: `
      <svg viewBox="0 0 48 48" width="34" height="34" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <!-- Realistic AK-47 -->
        <!-- Barrel -->
        <rect x="29" y="15.5" width="15" height="2.5" rx="1.2" fill="#2a2a2a" stroke="#1a1a1a" stroke-width="0.7"/>
        <rect x="30" y="16" width="13" height="1.5" rx="0.8" fill="#3a3a3a"/>
        
        <!-- Muzzle brake (distinctive AK feature) -->
        <rect x="43" y="14.5" width="3" height="4.5" rx="0.5" fill="#1a1a1a"/>
        <line x1="44" y1="15.5" x2="44" y2="18.5" stroke="#3a3a3a" stroke-width="0.5"/>
        <line x1="45" y1="15.5" x2="45" y2="18.5" stroke="#3a3a3a" stroke-width="0.5"/>
        
        <!-- Gas tube (top of barrel) -->
        <rect x="28" y="14" width="12" height="1.2" rx="0.6" fill="#3a3a3a" stroke="#1a1a1a" stroke-width="0.5"/>
        
        <!-- Receiver -->
        <rect x="17" y="14" width="15" height="6" rx="1.5" fill="url(#ak47Gradient)" stroke="#1a1a1a" stroke-width="0.7"/>
        <rect x="18" y="15.5" width="12" height="3" rx="1" fill="#3a3a3a"/>
        
        <!-- Ejection port cover -->
        <rect x="23" y="14.5" width="5" height="2.5" rx="0.5" fill="#2a2a2a"/>
        
        <!-- Wood handguard (distinctive AK wood) -->
        <rect x="25" y="18" width="9" height="4" rx="1.5" fill="#8B4513" stroke="#654321" stroke-width="0.7"/>
        <!-- Wood grain details -->
        <line x1="26" y1="19.5" x2="33" y2="19.5" stroke="#654321" stroke-width="0.4" opacity="0.6"/>
        <line x1="26" y1="20.5" x2="33" y2="20.5" stroke="#654321" stroke-width="0.4" opacity="0.6"/>
        <path d="M26 19 Q28 20 26 21" stroke="#543311" stroke-width="0.5" fill="none"/>
        
        <!-- Wood stock -->
        <rect x="7" y="16" width="11" height="4" rx="2" fill="#8B4513" stroke="#654321" stroke-width="0.7"/>
        <rect x="8" y="17" width="8" height="2" rx="1" fill="#654321" opacity="0.6"/>
        <line x1="8.5" y1="17.5" x2="15" y2="17.5" stroke="#543311" stroke-width="0.5"/>
        
        <!-- Pistol grip (wood) -->
        <path d="M15 20 L15 28 L17.5 30 L20 28 L20 22 Z" fill="#8B4513" stroke="#654321" stroke-width="0.7"/>
        <rect x="16" y="24" width="3" height="1" rx="0.5" fill="#654321"/>
        <rect x="16" y="26" width="3" height="0.8" rx="0.4" fill="#543311"/>
        
        <!-- Trigger -->
        <path d="M17 26 Q16 27.5 17 28" stroke="#2a2a2a" stroke-width="1.5" fill="none" stroke-linecap="round"/>
        
        <!-- Trigger guard -->
        <path d="M16 24 Q14 26 16 28" stroke="#2a2a2a" stroke-width="1.2" fill="none"/>
        
        <!-- Magazine (curved banana mag) -->
        <path d="M18 20 L17 28 Q17 30 19 30.5 L20 30.5 Q22 30 22 28 L21 21 Z" fill="#3a3a3a" stroke="#1a1a1a" stroke-width="0.7"/>
        <path d="M18.5 22 L18 28 Q18 29 19.5 29.5 L20 29.5 Q21 29 21 28 L20.5 22 Z" fill="#2a2a2a"/>
        
        <!-- Front sight post -->
        <rect x="37" y="13" width="1.5" height="2.5" rx="0.4" fill="#2a2a2a"/>
        <circle cx="37.8" cy="13.5" r="0.5" fill="#3a3a3a"/>
        
        <!-- Rear sight -->
        <rect x="28" y="13" width="2" height="2" rx="0.5" fill="#2a2a2a"/>
        
        <defs>
          <linearGradient id="ak47Gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style="stop-color:#4a4a4a;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#2a2a2a;stop-opacity:1" />
          </linearGradient>
        </defs>
      </svg>
    `,
    
    smg: `
      <svg viewBox="0 0 60 48" width="34" height="34" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <!-- Simplified SMG Icon based on reference image -->
        <!-- Stock (left triangle) -->
        <path d="M4 16 L12 12 L12 28 L4 32 Z" fill="#7a7a7a" stroke="#5a5a5a" stroke-width="1"/>
        <path d="M6 18 L10 16 L10 26 L6 28 Z" fill="#9a9a9a"/>
        
        <!-- Main body/receiver (black) -->
        <rect x="12" y="15" width="32" height="10" rx="2" fill="#1a1a1a" stroke="#000000" stroke-width="1"/>
        <rect x="13" y="16" width="30" height="8" rx="1.5" fill="#2a2a2a"/>
        
        <!-- Barrel -->
        <rect x="44" y="17" width="14" height="6" rx="3" fill="#3a3a3a" stroke="#1a1a1a" stroke-width="0.8"/>
        <rect x="45" y="18" width="12" height="4" rx="2" fill="#4a4a4a"/>
        
        <!-- Magazine (vertical black rectangle) -->
        <rect x="24" y="25" width="6" height="14" rx="1.5" fill="#1a1a1a" stroke="#000000" stroke-width="0.8"/>
        <rect x="25" y="26" width="4" height="12" rx="1" fill="#2a2a2a"/>
        
        <!-- Pistol grip -->
        <path d="M18 25 L18 34 L20 36 L22 34 L22 27 Z" fill="#1a1a1a" stroke="#000000" stroke-width="0.8"/>
        <rect x="19" y="29" width="2" height="1" rx="0.5" fill="#2a2a2a"/>
        
        <!-- Trigger -->
        <ellipse cx="20" cy="30" rx="1" ry="1.5" fill="#3a3a3a"/>
        
        <!-- Trigger guard -->
        <path d="M19 27 Q17 30 19 33" stroke="#1a1a1a" stroke-width="1" fill="none"/>
        
        <!-- Foregrip detail -->
        <rect x="36" y="25" width="3" height="6" rx="1.5" fill="#2a2a2a" stroke="#1a1a1a" stroke-width="0.6"/>
      </svg>
    `,
    
    m4: `
      <svg viewBox="0 0 48 48" width="34" height="34" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <!-- Realistic M4 Carbine -->
        <!-- Barrel -->
        <rect x="27" y="15.5" width="15" height="2.5" rx="1.2" fill="#2a2a2a" stroke="#1a1a1a" stroke-width="0.7"/>
        <rect x="28" y="16" width="13" height="1.5" rx="0.8" fill="#3a3a3a"/>
        
        <!-- Flash hider -->
        <rect x="41" y="14.5" width="3.5" height="4.5" rx="0.5" fill="#1a1a1a"/>
        <rect x="41.5" y="15.5" width="2.5" height="2.5" rx="0.3" fill="#333"/>
        <line x1="42" y1="16" x2="43.5" y2="16" stroke="#2a2a2a" stroke-width="0.4"/>
        
        <!-- Receiver - Angular AR-15 style -->
        <rect x="16" y="14" width="14" height="6" rx="1.5" fill="url(#m4Gradient)" stroke="#1a1a1a" stroke-width="0.7"/>
        <rect x="17" y="15.5" width="11" height="3" rx="1" fill="#3a3a3a"/>
        
        <!-- Ejection port -->
        <rect x="23" y="14.5" width="4" height="3" rx="0.5" fill="#1a1a1a" opacity="0.9"/>
        <circle cx="25" cy="16" r="0.4" fill="#3a3a3a"/>
        
        <!-- Handguard with rail system -->
        <rect x="24" y="15" width="7" height="5" rx="1" fill="#3a3a3a" stroke="#1a1a1a" stroke-width="0.6"/>
        <!-- Picatinny rails -->
        <line x1="25" y1="16" x2="30" y2="16" stroke="#2a2a2a" stroke-width="0.4"/>
        <line x1="25" y1="17" x2="30" y2="17" stroke="#2a2a2a" stroke-width="0.4"/>
        <line x1="25" y1="18" x2="30" y2="18" stroke="#2a2a2a" stroke-width="0.4"/>
        
        <!-- Telescopic stock (collapsed) -->
        <rect x="7" y="15.5" width="10" height="3" rx="1.5" fill="#2a2a2a" stroke="#1a1a1a" stroke-width="0.6"/>
        <rect x="8" y="16" width="7" height="2" rx="1" fill="#1a1a1a"/>
        <!-- Buffer tube -->
        <rect x="5" y="16" width="4" height="1.5" rx="0.8" fill="#3a3a3a"/>
        <circle cx="5.5" cy="16.8" r="0.6" fill="#2a2a2a"/>
        
        <!-- Pistol grip -->
        <path d="M14 20 L14 27.5 L16.5 29.5 L19 27.5 L19 21.5 Z" fill="#2a2a2a" stroke="#1a1a1a" stroke-width="0.7"/>
        <rect x="15" y="23" width="3" height="1" rx="0.5" fill="#1a1a1a"/>
        <rect x="15" y="25" width="3" height="0.8" rx="0.4" fill="#1a1a1a"/>
        
        <!-- Trigger -->
        <path d="M16 25 Q15 26.5 16 27" stroke="#333" stroke-width="1.5" fill="none" stroke-linecap="round"/>
        
        <!-- Trigger guard -->
        <path d="M15 23 Q13 25.5 15 28" stroke="#2a2a2a" stroke-width="1.2" fill="none"/>
        
        <!-- Magazine - STANAG style -->
        <rect x="17" y="20" width="4" height="9" rx="1.5" fill="#3a3a3a" stroke="#1a1a1a" stroke-width="0.7"/>
        <rect x="18" y="22" width="2" height="6" rx="0.8" fill="#2a2a2a"/>
        
        <!-- ACOG scope -->
        <rect x="27" y="12" width="6" height="2.5" rx="1" fill="#2a2a2a" stroke="#1a1a1a" stroke-width="0.6"/>
        <circle cx="30" cy="13.2" r="0.8" fill="#4a9eff" opacity="0.8"/>
        <rect x="28" y="12.5" width="4" height="1.5" rx="0.5" fill="#3a3a3a"/>
        
        <!-- Front sight -->
        <rect x="36" y="13.5" width="1.5" height="2.5" rx="0.4" fill="#2a2a2a"/>
        
        <!-- Rear flip sight -->
        <rect x="27" y="13.5" width="1" height="1.5" rx="0.3" fill="#3a3a3a"/>
        
        <defs>
          <linearGradient id="m4Gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style="stop-color:#4a4a4a;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#2a2a2a;stop-opacity:1" />
          </linearGradient>
        </defs>
      </svg>
    `,
    
    minigun: `
      <svg viewBox="0 0 80 48" width="34" height="34" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <!-- Simplified Minigun Icon based on reference image -->
        <!-- Support triangle (left) -->
        <path d="M8 12 L20 12 L20 36 L8 36 Z" fill="#a8a8a8" stroke="#888888" stroke-width="1"/>
        <path d="M10 16 L18 24 L10 32 Z" fill="#c8c8c8"/>
        
        <!-- Motor/ammo box (center gray box) -->
        <rect x="20" y="12" width="18" height="24" rx="2" fill="#8a8a8a" stroke="#6a6a6a" stroke-width="1.2"/>
        <rect x="22" y="14" width="14" height="20" rx="1.5" fill="#6a6a6a"/>
        <!-- Wire/cable details -->
        <path d="M24 16 Q26 20 24 24 Q26 28 24 32" stroke="#c8c8c8" stroke-width="0.8" fill="none"/>
        <path d="M28 16 Q30 20 28 24 Q30 28 28 32" stroke="#c8c8c8" stroke-width="0.8" fill="none"/>
        <path d="M32 16 Q34 20 32 24 Q34 28 32 32" stroke="#c8c8c8" stroke-width="0.8" fill="none"/>
        
        <!-- 6 barrels (horizontal lines) -->
        <rect x="38" y="14" width="34" height="2" rx="1" fill="#9a9a9a" stroke="#7a7a7a" stroke-width="0.6"/>
        <rect x="38" y="18" width="34" height="2" rx="1" fill="#9a9a9a" stroke="#7a7a7a" stroke-width="0.6"/>
        <rect x="38" y="22" width="34" height="2" rx="1" fill="#9a9a9a" stroke="#7a7a7a" stroke-width="0.6"/>
        <rect x="38" y="26" width="34" height="2" rx="1" fill="#9a9a9a" stroke="#7a7a7a" stroke-width="0.6"/>
        <rect x="38" y="30" width="34" height="2" rx="1" fill="#9a9a9a" stroke="#7a7a7a" stroke-width="0.6"/>
        <rect x="38" y="34" width="34" height="2" rx="1" fill="#9a9a9a" stroke="#7a7a7a" stroke-width="0.6"/>
        
        <!-- Barrel ends (darker) -->
        <circle cx="72" cy="15" r="1" fill="#5a5a5a"/>
        <circle cx="72" cy="19" r="1" fill="#5a5a5a"/>
        <circle cx="72" cy="23" r="1" fill="#5a5a5a"/>
        <circle cx="72" cy="27" r="1" fill="#5a5a5a"/>
        <circle cx="72" cy="31" r="1" fill="#5a5a5a"/>
        <circle cx="72" cy="35" r="1" fill="#5a5a5a"/>
      </svg>
    `,
    
    missile: `
      <svg viewBox="0 0 100 48" width="34" height="34" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <!-- Simplified RPG Icon based on reference image -->
        <!-- Stock (left brown triangle) -->
        <path d="M4 14 L16 10 L16 30 L4 34 Z" fill="#b87850" stroke="#8a5a38" stroke-width="1"/>
        <path d="M6 16 L14 13 L14 27 L6 30 Z" fill="#c88860"/>
        
        <!-- Main tube (gray horizontal cylinder) -->
        <rect x="16" y="14" width="54" height="16" rx="8" fill="#b8b8b8" stroke="#888888" stroke-width="1.2"/>
        <rect x="17" y="15" width="52" height="14" rx="7" fill="#d8d8d8"/>
        <!-- Tube inner shadow -->
        <rect x="18" y="22" width="50" height="6" rx="3" fill="#7a7a7a" opacity="0.4"/>
        
        <!-- Warhead (right green diamond/cone) -->
        <path d="M70 20 L86 11 L94 20 L86 29 Z" fill="#4CAF50" stroke="#2d7a2d" stroke-width="1.2"/>
        <path d="M72 20 L86 13 L90 20 L86 27 Z" fill="#66BB6A"/>
        
        <!-- Warhead tip (orange) -->
        <path d="M86 15 L96 20 L86 25 Z" fill="#ff8844" stroke="#dd6622" stroke-width="0.8"/>
        <path d="M88 18 L94 20 L88 22 Z" fill="#ffaa66"/>
        
        <!-- Grip under tube (gray) -->
        <rect x="32" y="30" width="6" height="10" rx="3" fill="#8a8a8a" stroke="#6a6a6a" stroke-width="0.8"/>
        <rect x="33" y="31" width="4" height="8" rx="2" fill="#9a9a9a"/>
        
        <!-- Trigger -->
        <path d="M35 35 Q34 37 35 38" stroke="#5a5a5a" stroke-width="1.5" fill="none" stroke-linecap="round"/>
        
        <!-- Small details on tube -->
        <rect x="24" y="18" width="2" height="8" rx="1" fill="#7a7a7a" opacity="0.6"/>
        <rect x="32" y="18" width="2" height="8" rx="1" fill="#7a7a7a" opacity="0.6"/>
      </svg>
    `
  };
  
  function updateWeaponIcon(weapon) {
    const iconContainer = document.getElementById('currentWeaponIcon');
    if (iconContainer) {
      // Display the specified weapon icon
      const displayWeapon = weapon || 'revolver';
      
      if (WEAPON_ICONS[displayWeapon]) {
        iconContainer.innerHTML = WEAPON_ICONS[displayWeapon];
      }
    }
    
    // Update tooltip - always show what's actually in this slot
    const btn = document.getElementById('equipRevolverBtn');
    if (btn) {
      const weaponNames = {
        revolver: 'Revolver',
        ak47: 'AK-47',
        smg: 'SMG', 
        m4: 'M4 Carbine',
        minigun: 'Minigun',
        missile: 'RPG'
      };
      // For the revolver slot, always show appropriate weapon name
      btn.title = weaponNames[weapon] || 'Current Weapon';
    }
  }
  const I18N = {
    tr: {
      subtitle: "Ordunu kur. Haritaya hükmet.", placeholder: "İsmini gir...", play: "OYNA",
      mouse: "Fare", moveAim: "Hareket et & Nişan al", click: "Tıkla", shoot: "Ateş et",
      leaderboard: "🏆 SIRALAMA", reloading: "YENİDEN DOLDUR...", eliminated: "ELENDİN!", soldiers: "asker",
      color: "Renk Seç:", drawSkin: "Askerini Boya (8x8):", clear: "Temizle", eraser: "Silgi",
      customizeBtn: "Skin & Renk Özelleştir", reloadKey: "Şarjör doldurma", killCount: "Öldürme", soldierCountDeath: "Asker Sayısı", playersAlive: "Hayatta",
      newHighScore: "En Yüksek Skor!", emailLogin: "📧 E-posta Girişi", guestLogin: "👤 Misafir Girişi",
      loginBtn: "GİRİŞ", back: "← Geri", justColor: "Sadece Renk", drawSkinRadio: "Skin Çiz", signOut: "Çıkış Yap",
      store: "Mağaza", rpgName: "RPG", rpgDesc: "5 tek kullanımlık roket. Geniş alan hasarı.", buyRpgPack: "Satın Al (100 🪙 · x5)", 
      bonusDurationName: "+10 Süre", bonusDurationDesc: "Kalkan ve silahlara +10sn ek süre.", buyBonusDuration1h: "1 Saatlik (100 🪙)", buyBonusDurationPerm: "Kalıcı",
      goldMultiplierName: "x2 Altın", goldMultiplierDesc: "Oyun sonunda 2 kat altın.", buyGoldMultiplier1h: "1 Saatlik (50 🪙)", buyGoldMultiplierPerm: "Kalıcı",
      permanent: "Kalıcı",
      buy: "Satın Al", notEnoughGold: "Yetersiz altın!",
      backToMenu: "Ana Menüye Dön", signIn: "Giriş Yap", logIn: "Log In", maxSoldiers: "En Yüksek Asker", yourSoldiers: "Askerlerin", purchased: "✓ Satın Alındı!",
      joinRoom: "ODAYA GİR", joinRoomTitle: "ODAYA GİR", roomCodePrompt: "Oda kodunu girin (6 haneli sayı)", 
      roomCodePlaceholder: "000000", joinRoomBtnText: "GİR", cancel: "İPTAL", roomCode: "Oda Kodu"
    },
    en: {
      subtitle: "Build your army. Dominate the map.", placeholder: "Enter name...", play: "PLAY",
      mouse: "Mouse", moveAim: "Move & Aim", click: "Click", shoot: "Shoot",
      leaderboard: "🏆 LEADERBOARD", reloading: "RELOADING...", eliminated: "ELIMINATED!", soldiers: "soldiers",
      color: "Color:", drawSkin: "Draw Skin (8x8):", clear: "Clear", eraser: "Eraser",
      customizeBtn: "Customize Skin & Color", reloadKey: "Reload", killCount: "Kills", soldierCountDeath: "Soldiers", playersAlive: "Alive",
      newHighScore: "New High Score!", emailLogin: "📧 Email Login", guestLogin: "👤 Guest Login",
      loginBtn: "LOGIN", back: "← Back", justColor: "Just Color", drawSkinRadio: "Draw Skin", signOut: "Log Out",
      store: "Store", rpgName: "RPG", rpgDesc: "5 single-use rockets. Area damage.", buyRpgPack: "Buy (100 🪙 · x5)",
      bonusDurationName: "+10 Duration", bonusDurationDesc: "+10s bonus for shields and weapons.", buyBonusDuration1h: "1 Hour (100 🪙)", buyBonusDurationPerm: "Permanent",
      goldMultiplierName: "x2 Gold", goldMultiplierDesc: "Double gold at game end.", buyGoldMultiplier1h: "1 Hour (50 🪙)", buyGoldMultiplierPerm: "Permanent",
      permanent: "Permanent",
      buy: "Buy", notEnoughGold: "Not enough gold!",
      backToMenu: "Back to Menu", signIn: "Sign In", logIn: "Log In", maxSoldiers: "Max Soldiers", yourSoldiers: "Your Soldiers", purchased: "✓ Purchased!",
      joinRoom: "JOIN ROOM", joinRoomTitle: "JOIN ROOM", roomCodePrompt: "Enter room code (6 digits)", 
      roomCodePlaceholder: "000000", joinRoomBtnText: "JOIN", cancel: "CANCEL", roomCode: "Room Code"
    },
    ru: {
      subtitle: "Создай армию. Доминируй на карте.", placeholder: "Введите имя...", play: "ИГРАТЬ",
      mouse: "Мышь", moveAim: "Движение и Прицел", click: "Клик", shoot: "Стрелять",
      leaderboard: "🏆 РЕЙТИНГ", reloading: "ПЕРЕЗАРЯДКА...", eliminated: "ВЫБЫЛ!", soldiers: "солдат",
      color: "Цвет:", drawSkin: "Рисовать скин:", clear: "Очистить", eraser: "Ластик",
      customizeBtn: "Настроить скин и цвет", reloadKey: "Перезарядка", killCount: "Убийства", soldierCountDeath: "Солдаты", playersAlive: "Живы",
      newHighScore: "Новый рекорд!", emailLogin: "📧 Вход по Email", guestLogin: "👤 Гостевой вход",
      loginBtn: "ВОЙТИ", back: "← Назад", justColor: "Только цвет", drawSkinRadio: "Рисовать скин", signOut: "Выйти",
      store: "Магазин", rpgName: "РПГ", rpgDesc: "5 одноразовых ракет. Урон по площади.", buyRpgPack: "Купить (100 🪙 · x5)",
      bonusDurationName: "+10 Длительность", bonusDurationDesc: "+10с бонус для щитов и оружия.", buyBonusDuration1h: "1 Час (100 🪙)", buyBonusDurationPerm: "Постоянно",
      goldMultiplierName: "x2 Золото", goldMultiplierDesc: "Удвоенное золото в конце игры.", buyGoldMultiplier1h: "1 Час (50 🪙)", buyGoldMultiplierPerm: "Постоянно",
      permanent: "Постоянно",
      buy: "Купить", notEnoughGold: "Недостаточно золота!",
      backToMenu: "В меню", signIn: "Войти", logIn: "Log In", maxSoldiers: "Макс. солдат", yourSoldiers: "Ваши солдаты", purchased: "✓ Куплено!",
      joinRoom: "ВОЙТИ В КОМНАТУ", joinRoomTitle: "ВОЙТИ В КОМНАТУ", roomCodePrompt: "Введите код комнаты (6 цифр)", 
      roomCodePlaceholder: "000000", joinRoomBtnText: "ВОЙТИ", cancel: "ОТМЕНА", roomCode: "Код Комнаты"
    },
    zh: {
      subtitle: "建立你的军队。统治地图。", placeholder: "输入名字...", play: "开始游戏",
      mouse: "鼠标", moveAim: "移动与瞄准", click: "点击", shoot: "射击",
      leaderboard: "🏆 排行榜", reloading: "重新装弹...", eliminated: "被淘汰！", soldiers: "士兵",
      color: "颜色:", drawSkin: "画皮肤(8x8):", clear: "清除", eraser: "橡皮擦",
      customizeBtn: "自定义皮肤和颜色", reloadKey: "重新装弹", killCount: "击杀", soldierCountDeath: "士兵数", playersAlive: "存活",
      newHighScore: "新最高分！", emailLogin: "📧 邮箱登录", guestLogin: "👤 游客登录",
      loginBtn: "登录", back: "← 返回", justColor: "仅颜色", drawSkinRadio: "画皮肤", signOut: "登出",
      store: "商店", rpgName: "RPG", rpgDesc: "5 枚一次性火箭弹，范围伤害。", buyRpgPack: "购买 (100 🪙 · x5)",
      bonusDurationName: "+10 持续时间", bonusDurationDesc: "护盾和武器+10秒加成。", buyBonusDuration1h: "1 小时 (100 🪙)", buyBonusDurationPerm: "永久",
      goldMultiplierName: "x2 金币", goldMultiplierDesc: "游戏结束时双倍金币。", buyGoldMultiplier1h: "1 小时 (50 🪙)", buyGoldMultiplierPerm: "永久",
      permanent: "永久",
      buy: "购买", notEnoughGold: "金币不足！",
      backToMenu: "返回菜单", signIn: "登录", logIn: "Log In", maxSoldiers: "最高士兵", yourSoldiers: "你的士兵", purchased: "✓ 已购买！",
      joinRoom: "加入房间", joinRoomTitle: "加入房间", roomCodePrompt: "输入房间代码 (6位数字)", 
      roomCodePlaceholder: "000000", joinRoomBtnText: "加入", cancel: "取消", roomCode: "房间代码"
    },
    de: {
      subtitle: "Baue deine Armee auf. Beherrsche die Karte.", placeholder: "Name eingeben...", play: "SPIELEN",
      mouse: "Maus", moveAim: "Bewegen & Zielen", click: "Klick", shoot: "Schießen",
      leaderboard: "🏆 BESTENLISTE", reloading: "NACHLADEN...", eliminated: "ELIMINIERT!", soldiers: "Soldaten",
      color: "Farbe:", drawSkin: "Skin zeichnen:", clear: "Klar", eraser: "Radiergummi",
      customizeBtn: "Skin & Farbe anpassen", reloadKey: "Nachladen", killCount: "Kills", soldierCountDeath: "Soldaten", playersAlive: "Lebend",
      newHighScore: "Neuer Rekord!", emailLogin: "📧 E-Mail Login", guestLogin: "👤 Gast Login",
      loginBtn: "EINLOGGEN", back: "← Zurück", justColor: "Nur Farbe", drawSkinRadio: "Skin zeichnen", signOut: "Abmelden",
      store: "Geschäft", rpgName: "RPG", rpgDesc: "5 Einweg-Raketen. Flächenschaden.", buyRpgPack: "Kaufen (100 🪙 · x5)",
      bonusDurationName: "+10 Dauer", bonusDurationDesc: "+10s Bonus für Schilde und Waffen.", buyBonusDuration1h: "1 Stunde (100 🪙)", buyBonusDurationPerm: "Permanent",
      goldMultiplierName: "x2 Gold", goldMultiplierDesc: "Doppeltes Gold am Spielende.", buyGoldMultiplier1h: "1 Stunde (50 🪙)", buyGoldMultiplierPerm: "Permanent",
      permanent: "Permanent",
      buy: "Kaufen", notEnoughGold: "Nicht genug Gold!",
      backToMenu: "Zurück zum Menü", signIn: "Anmelden", logIn: "Log In", maxSoldiers: "Max. Soldaten", yourSoldiers: "Deine Soldaten", purchased: "✓ Gekauft!",
      joinRoom: "RAUM BEITRETEN", joinRoomTitle: "RAUM BEITRETEN", roomCodePrompt: "Raumcode eingeben (6 Ziffern)", 
      roomCodePlaceholder: "000000", joinRoomBtnText: "BEITRETEN", cancel: "ABBRECHEN", roomCode: "Raumcode"
    },
    fr: {
      subtitle: "Construisez votre armée. Dominez la carte.", placeholder: "Entrez votre nom...", play: "JOUER",
      mouse: "Souris", moveAim: "Bouger & Viser", click: "Clic", shoot: "Tirer",
      leaderboard: "🏆 CLASSEMENT", reloading: "RECHARGEMENT...", eliminated: "ÉLIMINÉ!", soldiers: "soldats",
      color: "Couleur:", drawSkin: "Dessiner la peau:", clear: "Effacer", eraser: "Gomme",
      customizeBtn: "Personnaliser la peau et la couleur", reloadKey: "Recharger", killCount: "Tués", soldierCountDeath: "Soldats", playersAlive: "En vie",
      newHighScore: "Nouveau record !", emailLogin: "📧 Connexion Email", guestLogin: "👤 Mode Invité",
      loginBtn: "CONNEXION", back: "← Retour", justColor: "Juste couleur", drawSkinRadio: "Dessiner la peau", signOut: "Déconnexion",
      store: "Boutique", rpgName: "RPG", rpgDesc: "5 roquettes à usage unique. Dégâts de zone.", buyRpgPack: "Acheter (100 🪙 · x5)",
      bonusDurationName: "+10 Durée", bonusDurationDesc: "+10s bonus pour boucliers et armes.", buyBonusDuration1h: "1 Heure (100 🪙)", buyBonusDurationPerm: "Permanent ($2.99)",
      goldMultiplierName: "x2 Or", goldMultiplierDesc: "Double or en fin de partie.", buyGoldMultiplier1h: "1 Heure (50 🪙)", buyGoldMultiplierPerm: "Permanent ($2.99)",
      buy: "Acheter", notEnoughGold: "Pas assez d'or!",
      backToMenu: "Retour au menu", signIn: "Se connecter", logIn: "Log In", maxSoldiers: "Max. soldats", yourSoldiers: "Vos soldats", purchased: "✓ Acheté!",
      joinRoom: "REJOINDRE SALLE", joinRoomTitle: "REJOINDRE SALLE", roomCodePrompt: "Entrez le code de la salle (6 chiffres)", 
      roomCodePlaceholder: "000000", joinRoomBtnText: "REJOINDRE", cancel: "ANNULER", roomCode: "Code de Salle"
    }
  };

  let currentLang = 'en';

  // === Canvas ===
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d', {
    alpha: false,
    desynchronized: true,
    willReadFrequently: false
  });

  // === DOM Elements ===
  const startScreen = document.getElementById('startScreen');
  const nameInput = document.getElementById('nameInput');
  const playBtn = document.getElementById('playBtn');
  const leaderboardEl = document.getElementById('leaderboard');
  const lbList = document.getElementById('lbList');
  const weaponHud = document.getElementById('weaponHud');
  const bottomRightHud = document.getElementById('bottomRightHud');
  const weaponSlotsHud = document.getElementById('weaponSlotsHud');
  const missileSlotWrap = document.getElementById('missileSlotWrap');
  const weaponNameEl = document.getElementById('weaponName');
  const ammoFill = document.getElementById('ammoFill');
  const ammoText = document.getElementById('ammoText');
  const reloadIndicator = document.getElementById('reloadIndicator');
  const weaponTimerEl = document.getElementById('weaponTimer');
  const shieldHud = document.getElementById('shieldHud');
  const shieldTimerEl = document.getElementById('shieldTimer');
  const eliminatedOverlay = document.getElementById('eliminatedOverlay');
  const soldierCountEl = document.getElementById('soldierCount');
  const myCountEl = document.getElementById('myCount');
  const langSelect = document.getElementById('langSelect');
  const colorPalette = document.getElementById('colorPalette');
  const colorBtns = document.querySelectorAll('.color-btn');
  const toggleCustomBtn = document.getElementById('toggleCustomBtn');
  const customizationPanel = document.getElementById('customizationPanel');
  const toggleStoreBtn = document.getElementById('toggleStoreBtn');
  const storePanel = document.getElementById('storePanel');
  const buyMissileBtn = document.getElementById('buyMissileBtn');
  const missileCountVal = document.getElementById('missileCountVal');
  const equipMissileBtn = document.getElementById('equipMissileBtn');
  const equipRevolverBtn = document.getElementById('equipRevolverBtn');
  const storedPickupBadge = document.getElementById('storedPickupBadge');
  
  const topCenterHud = document.getElementById('topCenterHud');
  const topKillsVal = document.getElementById('topKillsVal');
  const topAliveVal = document.getElementById('topAliveVal');
  const deathKillsVal = document.getElementById('deathKillsVal');
  const deathSoldierVal = document.getElementById('deathSoldierVal');
  const deathMaxSoldiersVal = document.getElementById('deathMaxSoldiersVal');
  const deathHighScore = document.getElementById('deathHighScore');

  // Login elements
  const loginScreen = document.getElementById('loginScreen');
  const guestLoginBtn = document.getElementById('guestLoginBtn');
  const loginButtonsSection = document.getElementById('loginButtonsSection');
  const loginError = document.getElementById('loginError');

  let userEmail = null;
  let userHighScore = 0;
  let isGuest = false;
  let previousMissileCount = 0;
  
  let activeExplosions = [];
  
  const deathScreen = document.getElementById('deathScreen');
  const respawnBtn = document.getElementById('respawnBtn');
  const backToMenuBtn = document.getElementById('backToMenuBtn');
  const deathNameInput = document.getElementById('deathNameInput');
  const deathToggleCustomBtn = document.getElementById('deathToggleCustomBtn');
  const deathCustomizationPanel = document.getElementById('deathCustomizationPanel');
  
  const customModeRadios = document.querySelectorAll('input[name="customMode"]');
  const colorModeWrap = document.getElementById('colorModeWrap');
  const skinModeWrap = document.getElementById('skinModeWrap');

  const deathCustomModeRadios = document.querySelectorAll('input[name="deathCustomMode"]');
  const deathColorModeWrap = document.getElementById('deathColorModeWrap');
  const deathSkinModeWrap = document.getElementById('deathSkinModeWrap');

  let selectedColor = null; 
  let selectedPaintColor = '#ff3333';

  toggleCustomBtn.addEventListener('click', () => {
    customizationPanel.classList.toggle('hidden');
    storePanel.classList.add('hidden');
  });

  toggleStoreBtn.addEventListener('click', () => {
    storePanel.classList.toggle('hidden');
    customizationPanel.classList.add('hidden');
    
    // Update prices when store opens
    if (!storePanel.classList.contains('hidden')) {
      updateRegionalPrices();
    }
  });

  buyMissileBtn.addEventListener('click', () => {
    console.log('💰 Buy missile button clicked');
    Network.buyItem('missile');
  });

  const buyBonusDurationBtn = document.getElementById('buyBonusDurationBtn');
  const buyGoldMultiplierBtn = document.getElementById('buyGoldMultiplierBtn');
  const buyBonusDurationPermBtn = document.getElementById('buyBonusDurationPermBtn');
  const buyGoldMultiplierPermBtn = document.getElementById('buyGoldMultiplierPermBtn');
  
  console.log('🔍 Button elements:', {
    buyBonusDurationPermBtn: buyBonusDurationPermBtn,
    buyGoldMultiplierPermBtn: buyGoldMultiplierPermBtn
  });

  if (buyBonusDurationBtn) {
    buyBonusDurationBtn.addEventListener('click', () => {
      console.log('💰 Buy bonus duration button clicked');
      Network.buyItem('bonusDuration10s');
    });
  }

  if (buyGoldMultiplierBtn) {
    buyGoldMultiplierBtn.addEventListener('click', () => {
      console.log('💰 Buy gold multiplier button clicked');
      Network.buyItem('goldMultiplier');
    });
  }

  if (buyBonusDurationPermBtn) {
    buyBonusDurationPermBtn.addEventListener('click', () => {
      console.log('💰 Buy permanent bonus duration button clicked');
      if (!userEmail || isGuest) {
        alert('Kalıcı satın almalar için Google hesabıyla giriş yapmalısınız!');
        return;
      }
      openXsollaPayment('bonusDuration');
    });
  }

  if (buyGoldMultiplierPermBtn) {
    buyGoldMultiplierPermBtn.addEventListener('click', () => {
      console.log('💰 Buy permanent gold multiplier button clicked');
      if (!userEmail || isGuest) {
        alert('Kalıcı satın almalar için Google hesabıyla giriş yapmalısınız!');
        return;
      }
      openXsollaPayment('goldMultiplier');
    });
  }

  // Regional Pricing Update Function
  let regionalPriceData = null;
  
  function updateRegionalPrices() {
    console.log('💰 Fetching regional prices...');
    
    const backendUrl = typeof BACKEND_URL !== 'undefined' ? BACKEND_URL : window.location.origin;
    
    fetch(`${backendUrl}/api/get-regional-price`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          regionalPriceData = data;
          console.log(`🌍 Regional pricing loaded: ${data.formattedPrice}`);
          
          // Update price spans only (keep translations intact)
          const bonusPriceText = document.getElementById('bonusPriceText');
          const goldPriceText = document.getElementById('goldPriceText');
          
          if (bonusPriceText) {
            bonusPriceText.textContent = ` (${data.formattedPrice})`;
          }
          if (goldPriceText) {
            goldPriceText.textContent = ` (${data.formattedPrice})`;
          }
        }
      })
      .catch(err => {
        console.error('❌ Failed to load regional prices:', err);
      });
  }

  // Xsolla Payment Function
  function openXsollaPayment(itemType) {
    console.log('💳 Opening Xsolla payment for:', itemType);
    
    // Check if XPayStationWidget is available
    if (typeof XPayStationWidget === 'undefined') {
      console.error('❌ Xsolla widget not loaded');
      alert('Ödeme sistemi yüklenemedi. Lütfen sayfayı yenileyin.');
      return;
    }
    
    // Backend URL
    const backendUrl = typeof BACKEND_URL !== 'undefined' ? BACKEND_URL : window.location.origin;
    
    // Create order on server first (server will determine price from IP)
    fetch(`${backendUrl}/api/create-xsolla-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: userEmail,
        itemType: itemType
      })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success && data.token) {
        console.log('✅ Payment token received:', data.token);
        
        // Open Xsolla Pay Station
        const options = {
          access_token: data.token,
          sandbox: true, // Test mode - production'da false yapın
          lightbox: {
            width: '740px',
            height: '760px',
            closeByClick: true,
            closeByKeyboard: true,
            spinner: 'round'
          }
        };
        
        const s = new XPayStationWidget();
        s.open(options);
        
        // Listen for payment completion
        s.on(XPayStationWidget.eventTypes.STATUS, function (event, data) {
          console.log('💳 Payment status:', event, data);
          if (event === 'done') {
            console.log('✅ Payment successful!');
            // Notify server about successful payment
            Network.buyItem('permanent' + itemType.charAt(0).toUpperCase() + itemType.slice(1));
            alert('✅ Ödeme başarılı! Satın alımınız hesabınıza tanımlandı.');
          } else if (event === 'close') {
            console.log('❌ Payment window closed');
          }
        });
      } else {
        console.error('❌ Failed to create payment token:', data);
        alert('Ödeme başlatılamadı: ' + (data.error || 'Bilinmeyen hata'));
      }
    })
    .catch(err => {
      console.error('❌ Payment error:', err);
      alert('Ödeme sistemi hatası. Lütfen daha sonra tekrar deneyin.');
    });
  }

  equipMissileBtn.addEventListener('click', () => {
    Network.equipMissile();
  });

  let lastEquipRevolverTime = 0;
  equipRevolverBtn.addEventListener('click', () => {
    const now = Date.now();
    // Prevent rapid clicking (300ms debounce)
    if (now - lastEquipRevolverTime < 300) {
      console.log('🚫 equipRevolver: Too rapid clicking, ignored');
      return;
    }
    lastEquipRevolverTime = now;
    console.log('🔫 equipRevolver: Button clicked');
    Network.equipRevolver();
  });

  deathToggleCustomBtn.addEventListener('click', () => {
    deathCustomizationPanel.classList.toggle('hidden');
  });

  customModeRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      if(e.target.value === 'color') {
        colorModeWrap.classList.remove('hidden');
        skinModeWrap.classList.add('hidden');
      } else {
        colorModeWrap.classList.add('hidden');
        skinModeWrap.classList.remove('hidden');
      }
    });
  });

  deathCustomModeRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      if(e.target.value === 'color') {
        deathColorModeWrap.classList.remove('hidden');
        deathSkinModeWrap.classList.add('hidden');
      } else {
        deathColorModeWrap.classList.add('hidden');
        deathSkinModeWrap.classList.remove('hidden');
      }
    });
  });

  colorBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      colorBtns.forEach(b => b.classList.remove('selected'));
      document.querySelectorAll('.color-btn-d').forEach(b => b.classList.remove('selected'));
      e.target.classList.add('selected');
      selectedColor = e.target.getAttribute('data-color');
    });
  });

  const deathColorBtns = document.querySelectorAll('.color-btn-d');
  deathColorBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      deathColorBtns.forEach(b => b.classList.remove('selected'));
      colorBtns.forEach(b => b.classList.remove('selected'));
      e.target.classList.add('selected');
      selectedColor = e.target.getAttribute('data-color');
    });
  });

  const paintBtns = document.querySelectorAll('.paint-btn');
  const deathPaintBtns = document.querySelectorAll('.paint-btn-d');

  function updatePaintSelection(colorStr, targetBtn) {
    paintBtns.forEach(b => b.classList.remove('selected'));
    deathPaintBtns.forEach(b => b.classList.remove('selected'));
    targetBtn.classList.add('selected');
    selectedPaintColor = colorStr;
    useEraser = false;
  }

  paintBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      updatePaintSelection(e.target.getAttribute('data-color'), e.target);
    });
  });

  deathPaintBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      updatePaintSelection(e.target.getAttribute('data-color'), e.target);
    });
  });

  // === Pixel Editor ===
  const pEditCanvas = document.getElementById('pixelEditor');
  const pEditCtx = pEditCanvas.getContext('2d');
  const deathPEditCanvas = document.getElementById('deathPixelEditor');
  const deathPEditCtx = deathPEditCanvas.getContext('2d');
  
  const PIXEL_RES = 8;
  const PIXEL_SIZE = pEditCanvas.width / PIXEL_RES;
  let skinData = new Array(PIXEL_RES * PIXEL_RES).fill('#ffffff'); // Default white
  let isDrawingSkin = false;
  let useEraser = false;

  function drawPixelEditor() {
    [ {ctx: pEditCtx, canvas: pEditCanvas}, {ctx: deathPEditCtx, canvas: deathPEditCanvas} ].forEach(({ctx, canvas}) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // Draw Grid
      ctx.strokeStyle = 'rgba(0,0,0,0.1)';
      for(let i=0; i<=PIXEL_RES; i++) {
        ctx.beginPath(); ctx.moveTo(i*PIXEL_SIZE, 0); ctx.lineTo(i*PIXEL_SIZE, canvas.height); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i*PIXEL_SIZE); ctx.lineTo(canvas.width, i*PIXEL_SIZE); ctx.stroke();
      }
      // Draw Pixels
      for(let i=0; i<skinData.length; i++) {
        if(skinData[i]) {
          const x = (i % PIXEL_RES) * PIXEL_SIZE;
          const y = Math.floor(i / PIXEL_RES) * PIXEL_SIZE;
          ctx.fillStyle = skinData[i];
          ctx.fillRect(x, y, PIXEL_SIZE, PIXEL_SIZE);
        }
      }
    });
  }

  function paintPixel(e, canvas) {
    if(!isDrawingSkin) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / PIXEL_SIZE);
    const y = Math.floor((e.clientY - rect.top) / PIXEL_SIZE);
    if(x >= 0 && x < PIXEL_RES && y >= 0 && y < PIXEL_RES) {
      const idx = y * PIXEL_RES + x;
      skinData[idx] = useEraser ? '#ffffff' : selectedPaintColor;
      drawPixelEditor();
    }
  }

  pEditCanvas.addEventListener('mousedown', (e) => { isDrawingSkin = true; paintPixel(e, pEditCanvas); });
  pEditCanvas.addEventListener('mousemove', (e) => paintPixel(e, pEditCanvas));
  
  deathPEditCanvas.addEventListener('mousedown', (e) => { isDrawingSkin = true; paintPixel(e, deathPEditCanvas); });
  deathPEditCanvas.addEventListener('mousemove', (e) => paintPixel(e, deathPEditCanvas));

  window.addEventListener('mouseup', () => { isDrawingSkin = false; });

  document.getElementById('clearSkinBtn').addEventListener('click', () => {
    skinData.fill('#ffffff');
    drawPixelEditor();
  });
  document.getElementById('deathClearSkinBtn').addEventListener('click', () => {
    skinData.fill('#ffffff');
    drawPixelEditor();
  });

  function toggleEraser(e) {
    useEraser = !useEraser;
    const bg = useEraser ? 'rgba(255,255,255,0.4)' : '';
    document.getElementById('eraserSkinBtn').style.background = bg;
    document.getElementById('deathEraserSkinBtn').style.background = bg;
  }
  document.getElementById('eraserSkinBtn').addEventListener('click', toggleEraser);
  document.getElementById('deathEraserSkinBtn').addEventListener('click', toggleEraser);

  drawPixelEditor(); // Init

  // Cache generated skin canvases
  const skinCanvasCache = {};
  let skinCacheSize = 0;

  function getSkinCanvas(playerId, skinArray) {
    if(!skinArray || skinArray.every(p => p === null)) return null;
    if(skinCanvasCache[playerId]) return skinCanvasCache[playerId];
    
    // Limit cache size for memory optimization
    if (skinCacheSize >= SKIN_CACHE_LIMIT) {
      const oldestKey = Object.keys(skinCanvasCache)[0];
      delete skinCanvasCache[oldestKey];
      skinCacheSize--;
    }
    
    const c = document.createElement('canvas');
    c.width = PIXEL_RES; c.height = PIXEL_RES;
    const cx = c.getContext('2d', { alpha: true, willReadFrequently: false });
    for(let i=0; i<skinArray.length; i++) {
      if(skinArray[i]) {
        const x = i % PIXEL_RES;
        const y = Math.floor(i / PIXEL_RES);
        cx.fillStyle = skinArray[i];
        cx.fillRect(x, y, 1, 1);
      }
    }
    skinCanvasCache[playerId] = c;
    skinCacheSize++;
    return c;
  }

  // === State ===
  let playing = false;
  let gameState = null;
  let camera = { x: 5000, y: 5000 };
  let zoom = 1.0;
  let mouseScreen = { x: 0, y: 0 };
  let smoothPositions = {};
  let lastTime = 0;
  let eliminatedTimer = 0;
  let isMouseDown = false;
  
  // Viewport culling cache
  let viewportBounds = { left: 0, right: 0, top: 0, bottom: 0 };
  
  function updateViewportBounds() {
    const viewW = canvas.width / zoom;
    const viewH = canvas.height / zoom;
    viewportBounds.left = camera.x - viewW / 2 - CULLING_MARGIN;
    viewportBounds.right = camera.x + viewW / 2 + CULLING_MARGIN;
    viewportBounds.top = camera.y - viewH / 2 - CULLING_MARGIN;
    viewportBounds.bottom = camera.y + viewH / 2 + CULLING_MARGIN;
  }
  
  function isInViewport(x, y) {
    return x >= viewportBounds.left && x <= viewportBounds.right &&
           y >= viewportBounds.top && y <= viewportBounds.bottom;
  }
  
  // Purchase notification
  let purchaseNotification = null;
  let purchaseNotificationTimer = 0;

  // === Update Language ===
  function updateLang() {
    const dict = I18N[currentLang];
    document.querySelectorAll('[data-i18n]').forEach(el => {
      if (dict[el.getAttribute('data-i18n')]) el.textContent = dict[el.getAttribute('data-i18n')];
    });
    document.querySelectorAll('[data-i18n-ph]').forEach(el => {
      if (dict[el.getAttribute('data-i18n-ph')]) el.placeholder = dict[el.getAttribute('data-i18n-ph')];
    });
  }
  langSelect.addEventListener('change', (e) => {
    currentLang = e.target.value;
    updateLang();
  });
  updateLang(); // Init

  // === Pickup / Weapon visuals ===
  const PICKUP_STYLES = {
    smg:     { color: '#42a5f5', label: 'SMG' },
    m4:      { color: '#66bb6a', label: 'M4' },
    ak47:    { color: '#ff7043', label: 'AK-47' },
    minigun: { color: '#ef5350', label: 'MINIGUN' },
    shield:  { color: '#26c6da', label: 'SHIELD' }
  };

  function drawWeaponIcon(ctx, type, x, y, size) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(size/20, size/20);
    ctx.fillStyle = '#fff';
    if (type === 'smg') {
      ctx.fillRect(-8, -4, 16, 6);
      ctx.fillRect(-2, 2, 4, 8);
      ctx.fillRect(-8, 2, 3, 6);
    } else if (type === 'm4') {
      ctx.fillRect(-10, -3, 20, 5);
      ctx.fillRect(-10, -5, 6, 2);
      ctx.fillRect(0, 2, 4, 7);
      ctx.fillRect(-6, 2, 3, 5);
    } else if (type === 'ak47') {
      ctx.fillStyle = '#e5a059'; 
      ctx.fillRect(-12, -4, 6, 4); 
      ctx.fillRect(4, -4, 8, 3);   
      ctx.fillStyle = '#bbb';
      ctx.fillRect(-6, -4, 10, 5); 
      ctx.fillRect(0, 1, 4, 8);    
      ctx.fillRect(-4, 1, 3, 5);   
      ctx.fillRect(12, -4, 8, 2);  
    } else if (type === 'minigun') {
      ctx.fillStyle = '#555';
      ctx.fillRect(-10, -6, 12, 12); 
      ctx.fillStyle = '#888';
      ctx.fillRect(2, -4, 14, 2); 
      ctx.fillRect(2, 0, 14, 2);  
      ctx.fillRect(2, 4, 14, 2);  
      ctx.fillStyle = '#333';
      ctx.fillRect(-4, -10, 4, 4); 
      ctx.fillRect(-4, 6, 4, 6); 
    } else if (type === 'shield') {
      ctx.beginPath();
      ctx.moveTo(0, -10);
      ctx.lineTo(8, -6);
      ctx.lineTo(8, 4);
      ctx.lineTo(0, 12);
      ctx.lineTo(-8, 4);
      ctx.lineTo(-8, -6);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  // === Resize ===
  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  function smooth(key, tx, ty, factor) {
    if (!smoothPositions[key]) smoothPositions[key] = { x: tx, y: ty };
    const p = smoothPositions[key];
    p.x += (tx - p.x) * factor;
    p.y += (ty - p.y) * factor;
    return p;
  }

  function drawCircle(sx, sy, r, fill, stroke, lineW) {
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lineW || 1.5; ctx.stroke(); }
  }

  function hexToRgba(hex, a) {
    if(!hex) return 'rgba(255,255,255,1)';
    if (hex.startsWith('hsl')) return hex.replace(')', `,${a})`).replace('hsl', 'hsla');
    const r = parseInt(hex.slice(1, 3), 16) || 255;
    const g = parseInt(hex.slice(3, 5), 16) || 255;
    const b = parseInt(hex.slice(5, 7), 16) || 255;
    return `rgba(${r},${g},${b},${a})`;
  }

  // === Draw Grid ===
  function drawGrid() {
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(zoom, zoom);
    ctx.translate(-camera.x, -camera.y);

    const mapSize = Network.getMapSize();
    const viewW = canvas.width / zoom;
    const viewH = canvas.height / zoom;
    const left = camera.x - viewW / 2;
    const top = camera.y - viewH / 2;
    const right = left + viewW;
    const bottom = top + viewH;

    const startX = Math.floor(left / GRID_SIZE) * GRID_SIZE;
    const startY = Math.floor(top / GRID_SIZE) * GRID_SIZE;

    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = startX; x <= right + GRID_SIZE; x += GRID_SIZE) {
      ctx.moveTo(x, top - 100);
      ctx.lineTo(x, bottom + 100);
    }
    for (let y = startY; y <= bottom + GRID_SIZE; y += GRID_SIZE) {
      ctx.moveTo(left - 100, y);
      ctx.lineTo(right + 100, y);
    }
    ctx.stroke();

    ctx.strokeStyle = '#2a2a50';
    ctx.lineWidth = 6;
    ctx.strokeRect(0, 0, mapSize, mapSize);

    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    if (left < 0) ctx.fillRect(left-100, top-100, -left+100, viewH+200);
    if (top < 0) ctx.fillRect(left-100, top-100, viewW+200, -top+100);
    if (right > mapSize) ctx.fillRect(mapSize, top-100, right-mapSize+100, viewH+200);
    if (bottom > mapSize) ctx.fillRect(left-100, mapSize, viewW+200, bottom-mapSize+100);

    ctx.restore();
  }

  function runInWorld(renderFn) {
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(zoom, zoom);
    ctx.translate(-camera.x, -camera.y);
    renderFn();
    ctx.restore();
  }

  function calculateScaleLevel(score) {
    if (score >= 250) return 14;
    if (score >= 200) return 13;
    if (score >= 150) return 12;
    if (score >= 120) return 11;
    if (score >= 100) return 10;
    return Math.floor(score / 10);
  }

  // === Draw Entities ===
  function drawPickups() {
    if (!gameState) return;
    const time = Date.now() / 1000;
    
    // Scale Pickups for me visually based on score
    const myId = Network.getId();
    const me = gameState.players[myId];
    let pickupScale = 1.0;
    if (me) {
      pickupScale = Math.pow(1.1, calculateScaleLevel(me.score));
    }

    for (const pk of gameState.pickups) {
      // Viewport culling
      if (!isInViewport(pk.x, pk.y)) continue;
      
      const style = PICKUP_STYLES[pk.type] || PICKUP_STYLES.smg;
      const pulse = 1 + Math.sin(time * 3 + pk.id) * 0.12;
      const finalScale = pulse * pickupScale;

      const grad = ctx.createRadialGradient(pk.x, pk.y, 0, pk.x, pk.y, 40 * finalScale);
      grad.addColorStop(0, hexToRgba(style.color, 0.25));
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.fillRect(pk.x - 50 * pickupScale, pk.y - 50 * pickupScale, 100 * pickupScale, 100 * pickupScale);

      drawCircle(pk.x, pk.y, 22 * finalScale, hexToRgba(style.color, 0.3), style.color, 2 * pickupScale);
      drawWeaponIcon(ctx, pk.type, pk.x, pk.y, 20 * finalScale);

      ctx.font = '700 12px Montserrat, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = style.color;
      ctx.fillText(style.label, pk.x, pk.y + 32 * pickupScale);
    }
  }

  function drawNeutrals() {
    if (!gameState) return;
    for (const ns of gameState.neutrals) {
      // Viewport culling
      if (!isInViewport(ns.x, ns.y)) continue;
      
      const pos = smooth(`n_${ns.id}`, ns.x, ns.y, 0.3);
      drawCircle(pos.x, pos.y, SOLDIER_RADIUS, '#d0d0d0', '#aaa', 1.5);
      if (ns.cs) {
        ctx.strokeStyle = '#ffd740';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(pos.x + SOLDIER_RADIUS - 2, pos.y);
        ctx.lineTo(pos.x + SOLDIER_RADIUS + 8, pos.y);
        ctx.stroke();
      }
    }
  }

  function drawSoldierUnit(sx, sy, color, canShoot, isMain, angle, skinCanvas) {
    const r = SOLDIER_RADIUS; // Same size for all

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(sx, sy + r * 0.6, r * 0.8, r * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body
    drawCircle(sx, sy, r, color, isMain ? '#fff' : hexToRgba('#000', 0.4), isMain ? 2 : 1.5);

    // Skin overlay
    if (skinCanvas) {
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(angle); // Rotate skin with aim
      // Draw pixel art stretched over the circle
      ctx.beginPath();
      ctx.arc(0, 0, r - 1, 0, Math.PI * 2);
      ctx.clip();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(skinCanvas, -r, -r, r*2, r*2);
      ctx.restore();
    } else {
      // Default Highlight if no skin
      const hlGrad = ctx.createRadialGradient(sx - r * 0.25, sy - r * 0.3, 0, sx, sy, r);
      hlGrad.addColorStop(0, 'rgba(255,255,255,0.3)');
      hlGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = hlGrad;
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Gun
    if (canShoot || isMain) {
      const a = angle || 0;
      ctx.strokeStyle = '#555';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(sx + Math.cos(a) * (r - 2), sy + Math.sin(a) * (r - 2));
      ctx.lineTo(sx + Math.cos(a) * (r + 10), sy + Math.sin(a) * (r + 10));
      ctx.stroke();
    }
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function drawPlayers() {
    if (!gameState) return;
    const myId = Network.getId();
    const playerIds = Object.keys(gameState.players);
    const sortedIds = playerIds.filter(id => id !== myId).concat(playerIds.filter(id => id === myId));

    for (const id of sortedIds) {
      const p = gameState.players[id];
      if (!p.alive) continue;

      const isMe = id === myId;
      const pos = smooth(`p_${id}`, p.x, p.y, isMe ? 0.35 : 0.2); // Main body
      const angle = p.angle || 0;
      const skinCnv = getSkinCanvas(id, p.skin);

      // Shield effect
      if (p.shieldActive) {
        const time = Date.now() / 1000;
        const shieldR = SOLDIER_RADIUS + 30 + p.soldiers.length * 4;
        const pulse = 1 + Math.sin(time * 4) * 0.05;

        ctx.save();
        ctx.globalAlpha = 0.2 + Math.sin(time * 3) * 0.05;
        const shieldGrad = ctx.createRadialGradient(pos.x, pos.y, shieldR * 0.5, pos.x, pos.y, shieldR * pulse);
        shieldGrad.addColorStop(0, 'rgba(38, 198, 218, 0.05)');
        shieldGrad.addColorStop(0.8, 'rgba(38, 198, 218, 0.25)');
        shieldGrad.addColorStop(1, 'rgba(38, 198, 218, 0)');
        ctx.fillStyle = shieldGrad;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, shieldR * pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(38, 198, 218, 0.6)';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.restore();
      }

      // Draw swarm soldiers
      for (let i = 0; i < p.soldiers.length; i++) {
        const sol = p.soldiers[i];
        const solPos = smooth(`s_${id}_${i}`, sol.x, sol.y, 0.25);
        const solAngle = Math.atan2(pos.y - sol.y, pos.x - sol.x);
        drawSoldierUnit(solPos.x, solPos.y, p.color, sol.cs, false, sol.cs ? angle : solAngle, skinCnv);
      }

      // Draw main soldier
      drawSoldierUnit(pos.x, pos.y, p.color, true, true, angle, skinCnv);

      // Name tag
      ctx.font = '800 16px Montserrat, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      const nameText = `${p.name} [${p.score}]`;
      const nameW = ctx.measureText(nameText).width + 16;
      const nameY = pos.y - SOLDIER_RADIUS - 16;
      
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      roundRect(ctx, pos.x - nameW / 2, nameY - 18, nameW, 22, 6);
      ctx.fill();
      ctx.fillStyle = isMe ? '#4fc3f7' : '#fff';
      ctx.fillText(nameText, pos.x, nameY + 2);
    }
  }

  function drawBullets() {
    if (!gameState) return;
    for (const b of gameState.bullets) {
      // Viewport culling
      if (!isInViewport(b.x, b.y)) continue;
      
      const pos = smooth(`b_${b.id}`, b.x, b.y, 0.4); 

      const trailGrad = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, 12);
      trailGrad.addColorStop(0, hexToRgba(b.c, 0.7));
      trailGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = trailGrad;
      ctx.fillRect(pos.x - 15, pos.y - 15, 30, 30);

      drawCircle(pos.x, pos.y, 4, '#fff', b.c, 1.5);
    }
  }

  function drawAimLine() {
    if (!gameState) return;
    const myId = Network.getId();
    const me = gameState.players[myId];
    if (!me || !me.alive) return;

    const pos = smooth(`p_${myId}`, me.x, me.y, 0.35);
    const wx = (mouseScreen.x - canvas.width / 2) / zoom + camera.x;
    const wy = (mouseScreen.y - canvas.height / 2) / zoom + camera.y;

    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 12]);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    ctx.lineTo(wx, wy);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    const r = 16;
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(wx, wy, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(wx - r - 6, wy); ctx.lineTo(wx - r + 4, wy);
    ctx.moveTo(wx + r - 4, wy); ctx.lineTo(wx + r + 6, wy);
    ctx.moveTo(wx, wy - r - 6); ctx.lineTo(wx, wy - r + 4);
    ctx.moveTo(wx, wy + r - 4); ctx.lineTo(wx, wy + r + 6);
    ctx.stroke();
  }

  function drawExplosions(dt) {
    // Limit active explosions for performance
    if (activeExplosions.length > MAX_PARTICLES) {
      activeExplosions = activeExplosions.slice(-MAX_PARTICLES);
    }
    
    for (let i = activeExplosions.length - 1; i >= 0; i--) {
      const ex = activeExplosions[i];
      
      // Viewport culling
      if (!isInViewport(ex.x, ex.y)) {
        continue;
      }
      
      ex.time += dt;
      const duration = 0.5; // half second explosion
      if (ex.time >= duration) {
        activeExplosions.splice(i, 1);
        continue;
      }
      const progress = ex.time / duration;
      const currentRadius = ex.r * (0.2 + progress * 0.8);
      const alpha = 1 - progress;

      ctx.save();
      ctx.globalAlpha = alpha;
      const grad = ctx.createRadialGradient(ex.x, ex.y, 0, ex.x, ex.y, currentRadius);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.2, '#ffea00');
      grad.addColorStop(0.5, '#ff5722');
      grad.addColorStop(1, 'transparent');
      
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(ex.x, ex.y, currentRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // === HUD Update ===
  function updateHUD() {
    if (!gameState) return;
    const myId = Network.getId();
    const me = gameState.players[myId];
    if (!me) return;

    lbList.innerHTML = '';
    for (let i = 0; i < gameState.leaderboard.length; i++) {
      const entry = gameState.leaderboard[i];
      const row = document.createElement('div');
      row.className = 'lb-row' + (entry.name === me.name ? ' me' : '');
      row.innerHTML = `
        <span class="lb-rank">${i + 1}.</span>
        <span class="lb-color" style="background:${entry.color}"></span>
        <span class="lb-name">${entry.name}</span>
        <span class="lb-score">${entry.score}</span>
      `;
      lbList.appendChild(row);
    }

    weaponNameEl.textContent = me.weaponName || 'REVOLVER';
    
    // Update weapon icon based on current weapon
    // IMPORTANT: Revolver slot should ALWAYS show revolver icon, never RPG!
    // RPG has its own separate slot (missileSlotWrap)
    const iconWeapon = (me.weapon === 'missile') ? 'revolver' : (me.weapon || 'revolver');
    updateWeaponIcon(iconWeapon);
    
    const pct = (me.ammo / me.maxAmmo) * 100;
    ammoFill.style.width = `${pct}%`;

    if (pct > 50) ammoFill.style.background = 'linear-gradient(90deg, #4fc3f7, #00e676)';
    else if (pct > 20) ammoFill.style.background = 'linear-gradient(90deg, #ffd740, #ff9800)';
    else ammoFill.style.background = 'linear-gradient(90deg, #ff5252, #ff1744)';

    ammoText.textContent = `${me.ammo} / ${me.maxAmmo}`;

    if (me.isReloading) reloadIndicator.classList.remove('hidden');
    else reloadIndicator.classList.add('hidden');

    if (me.weaponTimer > 0 && me.weapon !== 'revolver' && me.weapon !== 'missile') {
      weaponTimerEl.classList.remove('hidden');
      weaponTimerEl.textContent = `⏱ ${me.weaponTimer.toFixed(1)}s`;
    } else {
      weaponTimerEl.classList.add('hidden');
    }

    if (me.shieldActive) {
      shieldHud.classList.remove('hidden');
      shieldTimerEl.textContent = `${me.shieldTimer.toFixed(1)}s`;
    } else {
      shieldHud.classList.add('hidden');
    }

    myCountEl.textContent = me.score;
    topKillsVal.textContent = me.kills || 0;
    topAliveVal.textContent = gameState.totalPlayers || 0;

    const totalMissiles = me.totalMissiles !== undefined
      ? me.totalMissiles
      : (me.missiles || 0) + (me.isMissile ? 1 : 0);

    if (totalMissiles > 0 || me.isMissile) {
      missileSlotWrap.classList.remove('hidden');
      missileCountVal.textContent = totalMissiles;
      if (me.isMissile) {
        equipMissileBtn.classList.add('equipped');
      } else {
        equipMissileBtn.classList.remove('equipped');
      }
    } else {
      missileSlotWrap.classList.add('hidden');
      equipMissileBtn.classList.remove('equipped');
    }

    // Revolver slot is equipped when:
    // 1. Current weapon is revolver
    // 2. Current weapon is other weapons (SMG, AK47, M4, Minigun) but NOT missile
    const isRevolverSlotActive = me.weapon === 'revolver' ||
      (me.weapon !== 'missile' && me.weapon !== 'revolver');
    if (isRevolverSlotActive) {
      equipRevolverBtn.classList.add('equipped');
    } else {
      // When using RPG, revolver slot should NOT be equipped
      equipRevolverBtn.classList.remove('equipped');
    }

    if (me.hasStoredPickup) {
      equipRevolverBtn.classList.add('has-stored');
      storedPickupBadge.classList.remove('hidden');
      storedPickupBadge.textContent = '!'; // Just show exclamation mark, no weapon names
    } else {
      equipRevolverBtn.classList.remove('has-stored');
      storedPickupBadge.classList.add('hidden');
    }
  }

  function drawMinimap() {
    if (!gameState) return;
    const myId = Network.getId();
    const mapSize = Network.getMapSize();
    const mmSize = 160;
    const mmPad = 20;
    const mmX = mmPad;
    const mmY = canvas.height - mmSize - mmPad;
    const scale = mmSize / mapSize;

    ctx.fillStyle = 'rgba(10,10,30,0.85)';
    roundRect(ctx, mmX, mmY, mmSize, mmSize, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 2;
    ctx.stroke();

    for (const id in gameState.players) {
      const p = gameState.players[id];
      if (!p.alive) continue;
      const px = mmX + p.x * scale;
      const py = mmY + p.y * scale;
      const isMe = id === myId;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(px, py, isMe ? 4 : 2.5, 0, Math.PI * 2);
      ctx.fill();
      if (isMe) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }

    const viewW = canvas.width / zoom;
    const viewH = canvas.height / zoom;
    const vpX = mmX + (camera.x - viewW/2) * scale;
    const vpY = mmY + (camera.y - viewH/2) * scale;
    const vpW = viewW * scale;
    const vpH = viewH * scale;
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(vpX, vpY, vpW, vpH);
  }

  // === Main Render Loop ===
  let frameCounter = 0;
  let lastCleanupFrame = 0;

  function render(timestamp) {
    if (!gameState) {
      requestAnimationFrame(render);
      return;
    }

    frameCounter++;
    
    // Memory cleanup every 2 seconds (120 frames at 60fps)
    if (frameCounter - lastCleanupFrame >= 120) {
      const activeKeys = new Set();
      for (const id in gameState.players) {
        activeKeys.add(`p_${id}`);
        for (let i = 0; i < gameState.players[id].soldiers.length; i++) {
          activeKeys.add(`s_${id}_${i}`);
        }
      }
      for (const n of gameState.neutrals) activeKeys.add(`n_${n.id}`);
      for (const b of gameState.bullets) activeKeys.add(`b_${b.id}`);
      
      for (const key in smoothPositions) {
        if (!activeKeys.has(key)) delete smoothPositions[key];
      }
      
      lastCleanupFrame = frameCounter;
    }

    const dt = (timestamp - lastTime) / 1000;
    lastTime = timestamp;

    const myId = Network.getId();
    const me = gameState.players[myId];

    if (me && me.alive) {
      // Camera follows main body
      camera.x += (me.x - camera.x) * 0.1;
      camera.y += (me.y - camera.y) * 0.1;
      
      // Dynamic Zoom based on custom scale levels
      const scaleLevel = calculateScaleLevel(me.score);
      const targetZoom = 1.0 / Math.pow(1.1, scaleLevel);
      zoom += (targetZoom - zoom) * 0.05;
    }
    
    // Update viewport bounds for culling
    updateViewportBounds();

    if (eliminatedTimer > 0) {
      eliminatedTimer -= dt;
      if (eliminatedTimer <= 0) eliminatedOverlay.classList.add('hidden');
    }

    drawGrid();

    runInWorld(() => {
      drawPickups();
      drawNeutrals();
      drawBullets();
      drawPlayers();
      drawAimLine();
      drawExplosions(dt);
    });

    drawMinimap();
    updateHUD();
    
    // Draw purchase notification
    if (purchaseNotification && purchaseNotificationTimer > 0) {
      purchaseNotificationTimer -= dt;
      purchaseNotification.offsetY += dt * 30; // Float upwards
      purchaseNotification.alpha = purchaseNotificationTimer / 2; // Fade out
      
      const notifX = purchaseNotification.x;
      const notifY = purchaseNotification.y - purchaseNotification.offsetY;
      
      ctx.save();
      ctx.globalAlpha = purchaseNotification.alpha;
      ctx.font = 'bold 20px Russo One, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      const text = purchaseNotification.text;
      const metrics = ctx.measureText(text);
      const padding = 12;
      const boxW = metrics.width + padding * 2;
      const boxH = 30;
      
      // Green box
      ctx.fillStyle = 'rgba(0, 200, 0, 0.9)';
      ctx.beginPath();
      // Use roundRect with fallback
      if (ctx.roundRect) {
        ctx.roundRect(notifX - boxW/2, notifY - boxH/2, boxW, boxH, 8);
      } else {
        roundRect(ctx, notifX - boxW/2, notifY - boxH/2, boxW, boxH, 8);
      }
      ctx.fill();
      
      // White border
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Text
      ctx.fillStyle = '#fff';
      ctx.fillText(text, notifX, notifY);
      ctx.restore();
      
      if (purchaseNotificationTimer <= 0) {
        purchaseNotification = null;
      }
    }

    requestAnimationFrame(render);
  }

  // === Input Handling ===
  let mouseSendInterval = null;

  canvas.addEventListener('mousemove', (e) => {
    mouseScreen.x = e.clientX;
    mouseScreen.y = e.clientY;
  });

  canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0 && playing) {
      isMouseDown = true;
      Network.clickShoot();
      Network.startShooting();
    }
  });

  canvas.addEventListener('mouseup', (e) => {
    if (e.button === 0 && playing) {
      isMouseDown = false;
      Network.stopShooting();
    }
  });

  window.addEventListener('keydown', (e) => {
    if (playing && (e.key === 'r' || e.key === 'R')) {
      Network.manualReload();
    }
  });

  function sendMousePosition() {
    if (!playing) return;
    const wx = (mouseScreen.x - canvas.width / 2) / zoom + camera.x;
    const wy = (mouseScreen.y - canvas.height / 2) / zoom + camera.y;
    Network.sendMouse(wx, wy);
  }

  // === Login Flow ===
  Network.connect(); // Connect socket immediately for login
  
  // Register purchase success callback AFTER connect
  Network.onPurchaseSuccess((data) => {
    console.log('🎉 Purchase success event received!', data);
    
    // Show HTML notification at mouse position
    const notificationEl = document.getElementById('purchaseNotification');
    const currentMouseX = mouseScreen.x || window.innerWidth / 2;
    const currentMouseY = mouseScreen.y || window.innerHeight / 2;
    
    notificationEl.textContent = I18N[currentLang].purchased;
    notificationEl.style.left = currentMouseX + 'px';
    notificationEl.style.top = currentMouseY + 'px';
    notificationEl.classList.add('visible');
    
    // Hide after 2 seconds
    setTimeout(() => {
      notificationEl.classList.remove('visible');
    }, 2000);
    
    console.log('✅ Purchase notification shown at:', currentMouseX, currentMouseY);
  });

  // Register require Google login callback
  Network.onRequireGoogleLogin(() => {
    console.log('🔐 Google login required for permanent purchase');
    // Show login screen
    loginScreen.classList.remove('hidden');
    // Hide store panel
    storePanel.classList.add('hidden');
    // Show message
    alert('Kalıcı satın almak için Google ile giriş yapmalısınız.');
  });

  // Google Sign-In Callback
  window.handleCredentialResponse = (response) => {
    if (response.credential) {
      loginButtonsSection.classList.add('hidden');
      // Save token to localStorage for auto-login
      localStorage.setItem('soldierIOGoogleToken', response.credential);
      Network.googleLogin(response.credential);
    }
  };

  // Auto-login if token exists
  const savedToken = localStorage.getItem('soldierIOGoogleToken');
  const savedGuestId = sessionStorage.getItem('soldierIOGuestId');
  
  if (savedToken) {
    loginButtonsSection.classList.add('hidden');
    Network.googleLogin(savedToken);
  } else if (savedGuestId) {
    // Auto-login guest with stored session
    loginButtonsSection.classList.add('hidden');
    Network.guestLogin();
  }
  // DON'T auto-login as guest if no saved data
  // Let users choose: Google login, Guest login, or Sign In

  function renderGoogleButton() {
    if (typeof google !== 'undefined' && google.accounts) {
      google.accounts.id.initialize({
        client_id: typeof GOOGLE_CLIENT_ID !== 'undefined' && GOOGLE_CLIENT_ID ? GOOGLE_CLIENT_ID : 'invalid-client-id',
        callback: window.handleCredentialResponse
      });
      google.accounts.id.renderButton(
        document.getElementById("googleSignInBtn"),
        { 
          theme: "filled_blue", 
          size: "large", 
          type: "standard", 
          shape: "rectangular", 
          text: "signin_with", 
          logo_alignment: "left",
          width: 280
        }
      );
    } else {
      setTimeout(renderGoogleButton, 100);
    }
  }
  renderGoogleButton();

  guestLoginBtn.addEventListener('click', () => {
    Network.guestLogin();
  });

  const signOutBtn = document.getElementById('signOutBtn');
  const signInBtn = document.getElementById('signInBtn');
  const emailDropdown = document.getElementById('emailDropdown');
  const emailDisplay = document.getElementById('emailDisplay');
  const emailDropdownMenu = document.getElementById('emailDropdownMenu');
  const openRoomModalBtn = document.getElementById('openRoomModalBtn');
  const roomModal = document.getElementById('roomModal');
  const closeRoomModalBtn = document.getElementById('closeRoomModalBtn');
  const joinRoomBtn = document.getElementById('joinRoomBtn');
  const roomCodeInput = document.getElementById('roomCodeInput');

  // Room code input validation - only numbers
  roomCodeInput.addEventListener('input', (e) => {
    let value = e.target.value.replace(/\D/g, ''); // Remove non-digits
    if (value.length > 6) value = value.slice(0, 6); // Limit to 6 digits
    e.target.value = value;
  });

  // Room code input - auto-join on Enter key
  roomCodeInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      joinRoomBtn.click();
    }
  });

  // Sign In button click
  signInBtn.addEventListener('click', () => {
    startScreen.classList.add('hidden');
    loginScreen.classList.remove('hidden');
  });

  // Open Room Modal button click
  openRoomModalBtn.addEventListener('click', () => {
    roomModal.classList.remove('hidden');
  });

  // Close Room Modal button click
  closeRoomModalBtn.addEventListener('click', () => {
    roomModal.classList.add('hidden');
  });

  // Join Room button click (inside modal)
  joinRoomBtn.addEventListener('click', () => {
    const roomCode = roomCodeInput.value.trim();
    
    // Validate room code
    if (roomCode.length !== 6) {
      alert(I18N[currentLang].roomCodePrompt || 'Oda kodu 6 haneli olmalıdır');
      roomCodeInput.focus();
      return;
    }
    
    // Check if room code contains only numbers
    if (!/^\d{6}$/.test(roomCode)) {
      alert('Oda kodu sadece sayılardan oluşmalıdır');
      roomCodeInput.focus();
      return;
    }
    
    const name = nameInput.value.trim() || 'Soldier';
    let color = selectedColor;
    
    if (!color) {
      const colors = ['#ff3333', '#ffeb3b', '#ff9800', '#4caf50', '#2196f3', '#ff99cc', '#00bcd4', '#ffffff'];
      color = colors[Math.floor(Math.random() * colors.length)];
    }
    
    const modeSelector = 'input[name="customMode"]:checked';
    const mode = document.querySelector(modeSelector).value;
    const finalSkinData = mode === 'skin' ? skinData : null;

    roomModal.classList.add('hidden');
    Network.joinRoom(roomCode, name, color, finalSkinData);
  });

  // Email dropdown toggle
  emailDisplay.addEventListener('click', (e) => {
    e.stopPropagation();
    emailDropdownMenu.classList.toggle('hidden');
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!emailDropdown.contains(e.target)) {
      emailDropdownMenu.classList.add('hidden');
    }
  });

  signOutBtn.addEventListener('click', () => {
    // Clear localStorage token
    localStorage.removeItem('soldierIOGoogleToken');
    
    // Stop playing if in game
    playing = false;
    
    // Reload page to reset everything
    window.location.reload();
  });

  Network.onLoginSuccess((data) => {
    userEmail = data.email;
    userHighScore = data.highScore || 0;
    isGuest = data.isGuest || false;
    
    // Initialize previousMissileCount on login
    previousMissileCount = data.missiles || 0;
    
    // Store guest session data in sessionStorage
    if (isGuest && userEmail) {
      sessionStorage.setItem('soldierIOGuestId', userEmail);
      sessionStorage.setItem('soldierIOGuestGold', data.gold || 0);
      sessionStorage.setItem('soldierIOGuestMissiles', data.missiles || 0);
    }
    
    if (data.gold !== undefined) {
      document.getElementById('goldVal').textContent = data.gold;
    }
    
    loginScreen.classList.add('hidden');
    startScreen.classList.remove('hidden');
    
    // Show email dropdown if logged in with email, otherwise show Sign In button
    if (userEmail && !isGuest) {
      emailDropdown.classList.remove('hidden');
      signInBtn.classList.add('hidden');
      emailDisplay.textContent = userEmail;
    } else {
      emailDropdown.classList.add('hidden');
      signInBtn.classList.remove('hidden');
    }
    
    nameInput.focus();
    updateLang();
  });

  Network.onLoginError((data) => {
    // If auto-login failed, clear the invalid token
    localStorage.removeItem('soldierIOGoogleToken');
    
    loginError.textContent = data.message || 'Giriş başarısız.';
    loginError.classList.remove('hidden');
    loginButtonsSection.classList.remove('hidden');
  });

  Network.onRoomNotFound(() => {
    alert('Oda bulunamadı. Lütfen oda kodunu kontrol edin.');
  });

  Network.onRoomFull(() => {
    alert('Bu oda dolu. Başka bir oda kodu deneyin veya normal oyna butonuna tıklayın.');
  });

  // === Start Game ===
  // Register onJoined callback BEFORE any join/joinRoom calls
  Network.onJoined((data) => {
    startScreen.classList.add('hidden');
    deathScreen.classList.add('hidden');
    leaderboardEl.classList.remove('hidden');
    topCenterHud.classList.remove('hidden');
    bottomRightHud.classList.remove('hidden');
    soldierCountEl.classList.remove('hidden');
    eliminatedOverlay.classList.add('hidden');
    playing = true;

    // Show room code HUD if in a room
    if (data.roomCode) {
      document.getElementById('roomCodeDisplay').textContent = '#' + data.roomCode;
      document.getElementById('roomCodeHud').classList.remove('hidden');
    } else {
      document.getElementById('roomCodeHud').classList.add('hidden');
    }

    if (mouseSendInterval) clearInterval(mouseSendInterval);
    mouseSendInterval = setInterval(sendMousePosition, 50);
  });

  Network.onState((state) => {
    gameState = state;
    if (state.explosions && state.explosions.length > 0) {
      for (const ex of state.explosions) {
        activeExplosions.push({ x: ex.x, y: ex.y, r: ex.r, c: ex.c, time: 0 });
      }
    }
  });

  Network.onEliminated((data) => {
    deathScreen.classList.remove('hidden');
    const score = data && data.score ? data.score : 0;
    const kills = data && data.kills !== undefined ? data.kills : 0;
    const maxSoldiers = data && data.maxSoldiers !== undefined ? data.maxSoldiers : score;
    
    deathKillsVal.textContent = kills;
    deathMaxSoldiersVal.textContent = maxSoldiers;

    if (data && data.earnedGold !== undefined) {
      document.getElementById('deathEarnedGoldVal').textContent = data.earnedGold;
    }
    if (data && data.totalGold !== undefined) {
      document.getElementById('goldVal').textContent = data.totalGold;
      
      // Update sessionStorage for guests
      if (isGuest && userEmail) {
        sessionStorage.setItem('soldierIOGuestGold', data.totalGold);
      }
    }

    // High score check
    if (data && data.isNewHighScore) {
      deathHighScore.classList.remove('hidden');
      userHighScore = data.highScore;
    } else {
      deathHighScore.classList.add('hidden');
    }
    
    leaderboardEl.classList.add('hidden');
    topCenterHud.classList.add('hidden');
    bottomRightHud.classList.add('hidden');
    missileSlotWrap.classList.add('hidden');
    soldierCountEl.classList.add('hidden');
    document.getElementById('roomCodeHud').classList.add('hidden');

    Network.stopShooting();
    isMouseDown = false;
    playing = false;
    if (mouseSendInterval) clearInterval(mouseSendInterval);
  });

  Network.onServerFull(() => {
    alert("Sunucu dolu! / Server full!");
  });

  Network.onNotEnoughGold(() => {
    alert(I18N[currentLang].notEnoughGold);
  });

  Network.onPurchaseSuccess((data) => {
    console.log('✅ Purchase successful!', data);
    
    // Show success message
    alert(I18N[currentLang].purchased || '✓ Satın Alındı!');
    
    // Update gold display
    if (data.gold !== undefined) {
      document.getElementById('goldVal').textContent = data.gold;
      
      // Update sessionStorage for guests
      if (isGuest && userEmail) {
        sessionStorage.setItem('soldierIOGuestGold', data.gold);
      }
    }
    
    // Update missiles display
    if (data.missiles !== undefined) {
      missileCountVal.textContent = data.missiles;
      if (data.missiles > 0) {
        missileSlotWrap.classList.remove('hidden');
      }
    }
  });

  function startGame(isRespawn = false) {
    const inputEl = isRespawn ? deathNameInput : nameInput;
    const name = inputEl.value.trim() || 'Soldier';
    let color = selectedColor;
    
    // Pick random color if none selected
    if (!color) {
      const colors = ['#ff3333', '#ffeb3b', '#ff9800', '#4caf50', '#2196f3', '#ff99cc', '#00bcd4', '#ffffff'];
      color = colors[Math.floor(Math.random() * colors.length)];
    }
    
    const modeSelector = isRespawn ? 'input[name="deathCustomMode"]:checked' : 'input[name="customMode"]:checked';
    const mode = document.querySelector(modeSelector).value;
    const finalSkinData = mode === 'skin' ? skinData : null;

    Network.join(name, color, finalSkinData);
  }

  playBtn.addEventListener('click', () => startGame(false));
  respawnBtn.addEventListener('click', () => startGame(true));
  
  backToMenuBtn.addEventListener('click', () => {
    // Hide death screen, show start screen
    deathScreen.classList.add('hidden');
    startScreen.classList.remove('hidden');
    
    // Reset playing state
    playing = false;
    
    // Stop mouse sending
    if (mouseSendInterval) clearInterval(mouseSendInterval);
  });

  nameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') startGame(false);
  });
  deathNameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') startGame(true);
  });

  requestAnimationFrame(render);

})();

