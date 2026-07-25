// ==========================================
//  SOLDARE.IO - Network Layer
// ==========================================
const Network = (() => {
  let socket = null;
  let myId = null;
  let mapSize = 5000;
  let onStateCallback = null;
  let onJoinedCallback = null;
  let onEliminatedCallback = null;
  let onServerFullCallback = null;
  let onLoginSuccessCallback = null;
  let onLoginErrorCallback = null;
  let onNotEnoughGoldCallback = null;
  let onPurchaseSuccessCallback = null;
  let onRequireGoogleLoginCallback = null;
  let onRoomNotFoundCallback = null;
  let onRoomFullCallback = null;

  function connect() {
    if (socket) return; // Don't reconnect
    const backendUrl = typeof BACKEND_URL !== 'undefined' ? BACKEND_URL : window.location.origin;
    console.log('🔌 Connecting to backend:', backendUrl);
    socket = io(backendUrl, { transports: ['websocket', 'polling'] });

    socket.on('joined', (data) => {
      myId = data.id;
      mapSize = data.mapSize;
      if (onJoinedCallback) onJoinedCallback(data);
    });

    socket.on('gameState', (state) => {
      if (onStateCallback) onStateCallback(state);
    });

    socket.on('eliminated', (data) => {
      if (onEliminatedCallback) onEliminatedCallback(data);
    });

    socket.on('serverFull', () => {
      if (onServerFullCallback) onServerFullCallback();
    });

    socket.on('loginSuccess', (data) => {
      if (onLoginSuccessCallback) onLoginSuccessCallback(data);
    });

    socket.on('loginError', (data) => {
      if (onLoginErrorCallback) onLoginErrorCallback(data);
    });

    socket.on('notEnoughGold', () => {
      if (onNotEnoughGoldCallback) onNotEnoughGoldCallback();
    });

    socket.on('purchaseSuccess', (data) => {
      if (onPurchaseSuccessCallback) onPurchaseSuccessCallback(data);
      // Also trigger loginSuccess to update gold/missiles/bonus display
      if (onLoginSuccessCallback) onLoginSuccessCallback(data);
    });

    socket.on('requireGoogleLogin', () => {
      if (onRequireGoogleLoginCallback) onRequireGoogleLoginCallback();
    });

    socket.on('roomNotFound', () => {
      if (onRoomNotFoundCallback) onRoomNotFoundCallback();
    });

    socket.on('roomFull', () => {
      if (onRoomFullCallback) onRoomFullCallback();
    });
  }

  function googleLogin(credential) {
    if (socket) socket.emit('googleLogin', { credential });
  }

  function guestLogin() {
    if (socket) socket.emit('guestLogin');
  }

  function join(name, color, skin) {
    if (socket) {
      socket.emit('join', { name, color, skin });
    }
  }

  function joinRoom(roomCode, name, color, skin) {
    if (socket) {
      socket.emit('joinRoom', { roomCode, name, color, skin });
    }
  }

  function sendMouse(x, y) {
    if (socket) socket.volatile.emit('mouseMove', { x, y });
  }

  function startShooting() {
    if (socket) socket.emit('startShooting');
  }

  function stopShooting() {
    if (socket) socket.emit('stopShooting');
  }

  function clickShoot() {
    if (socket) socket.emit('clickShoot');
  }

  function buyItem(item) {
    if (socket) socket.emit('buyItem', { item });
  }

  function equipMissile() {
    if (socket) socket.emit('equipMissile');
  }

  function equipRevolver() {
    if (socket) socket.emit('equipRevolver');
  }

  function manualReload() {
    if (socket) socket.emit('manualReload');
  }

  function getId() { return myId; }
  function getMapSize() { return mapSize; }

  function onState(cb) { onStateCallback = cb; }
  function onJoined(cb) { onJoinedCallback = cb; }
  function onEliminated(cb) { onEliminatedCallback = cb; }
  function onServerFull(cb) { onServerFullCallback = cb; }
  function onLoginSuccess(cb) { onLoginSuccessCallback = cb; }
  function onLoginError(cb) { onLoginErrorCallback = cb; }
  function onNotEnoughGold(cb) { onNotEnoughGoldCallback = cb; }
  function onPurchaseSuccess(cb) { onPurchaseSuccessCallback = cb; }
  function onRequireGoogleLogin(cb) { onRequireGoogleLoginCallback = cb; }
  function onRoomNotFound(cb) { onRoomNotFoundCallback = cb; }
  function onRoomFull(cb) { onRoomFullCallback = cb; }

  return {
    connect, googleLogin, guestLogin, join, joinRoom, sendMouse, 
    startShooting, stopShooting, clickShoot, manualReload,
    buyItem, equipMissile, equipRevolver,
    getId, getMapSize,
    onState, onJoined, onEliminated, onServerFull, onLoginSuccess, onLoginError, onNotEnoughGold, onPurchaseSuccess, onRequireGoogleLogin, onRoomNotFound, onRoomFull
  };
})();
