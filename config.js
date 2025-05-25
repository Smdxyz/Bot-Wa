// config.js
module.exports = {
  // Info Bot Dasar
  botName: 'Szyrine Bots ID',
  botPrefix: '.',
  adminNumber: '6281933038407',
  botMode: 'private',
  logLevel: 'info',

  // Pengaturan Koneksi & Autentikasi
  autoAuth: true,
  botPhoneNumber: '6283125905220',
  enableCommandWatcher: true,
  processOwnMessages: false,
  useBaileysProAlias: false,
  baileysProAliasTarget: '@fizzxydev/baileys-pro',

  // Fitur Bot
  antiCall: true,

  // Ekonomi & Game
  defaultMaxEnergy: 100,
  energyCostPerCommand: 1,
  coinPerDay: 25,
  expPerMessage: 0.25,
  levelUpRewards: {
      coinPerLevel: 75,
      energyPerLevel: 30,
  },

  // Tier Premium & Keuntungannya
  premiumTiers: {
    "Super Kere": { level: 1, multiplier: 1, dailyCoin: 10, maxEnergy: 100, energyRegenAmount: 5, coinRegenAmount: 1, maxRegenCoin: 50, displayName: "Rakyat Jelata 🚶" },
    "Kere": { level: 2, multiplier: 1.2, dailyCoin: 25, maxEnergy: 120, energyRegenAmount: 7, coinRegenAmount: 2, maxRegenCoin: 100, displayName: "Kaum Rebahan 🛌" },
    "Biasa Aja": { level: 3, multiplier: 1.5, dailyCoin: 50, maxEnergy: 150, energyRegenAmount: 10, coinRegenAmount: 3, maxRegenCoin: 150, displayName: "Warga Normal 🧑‍💼" },
    "Menengah": { level: 4, multiplier: 1.7, dailyCoin: 75, maxEnergy: 180, energyRegenAmount: 12, coinRegenAmount: 4, maxRegenCoin: 200, displayName: "Juragan Muda 💼" },
    "Kaya": { level: 5, multiplier: 2, dailyCoin: 100, maxEnergy: 220, energyRegenAmount: 15, coinRegenAmount: 5, maxRegenCoin: 250, displayName: "Crazy Rich 💰" },
    "Sultan": { level: 6, multiplier: 2.5, dailyCoin: 200, maxEnergy: 300, energyRegenAmount: 20, coinRegenAmount: 10, maxRegenCoin: 500, displayName: "Sultan Mah Bebas 👑" },
  },
  premiumCommands: ['premium_cmd_contoh'],

  // Regenerasi Koin & Energi
  coinRegenSettings: { enabled: true, intervalMinutes: 60 },
  energyRegenSettings: { enabled: true, intervalMinutes: 5 },

  // Pengaturan Achievement
  achievementSettings: { notifyUserOnUnlock: true },

  // Tampilan & Pesan
  greetingMessages: [
      "Yo, balik lagi nih!", "Siap tempur, bosku!", "Ada perlu apa, gan?",
      "Menu spesial buat lo!", "Bot udah on fire, nih!"
  ],
  watermark: `© ${new Date().getFullYear()} SannKeceBotV5`,
  
  linkChannel: 'https://whatsapp.com/channel/YOUR_CHANNEL_ID_HERE',
  newsletterJidForMenu: '120363285859178588@newsletter',
  newsletterNameForMenu: 'Szyrine',
  linkGroupSupport: 'https://chat.whatsapp.com/YOUR_GROUP_INVITE_LINK_HERE',

  botLogoPath: './assets/bot_logo.jpg',
  menuDocumentPath: './assets/menu_details.txt',
  menuImage: './assets/menu_image.jpg',
  sendMenuWithImage: false,

  useAnimatedMenu: false,
  menuAnimationDelay: 700,
  menuAnimationFrames: 3,

  enableAdReply: true,
  adReplyConfig: {
    title: 'SannKeceBot ✨',
    body: 'Asisten WhatsApp Cerdas & Gaul Abis!',
    localThumbnailPath: './assets/menu_image.jpg',
    thumbnailUrl: 'https://i.ibb.co/BNstCbg/file-29.jpg',
    mediaUrl: "http://ẉa.me/628xxxxxxxxxx/"+Math.floor(Math.random() * 100000000000000000),
    sourceUrl: 'https://github.com/Smdxyz',
    mediaType: 1,
    renderLargerThumbnail: true,
  },

  defaultReply: "Waduh, command apaan tuh? Gak kenal euy. Coba ketik !menu biar gak salah jalan.",
  waitMessage: "⏳ Bentar ya, lagi diproses sama si Bot kece...",
  errorMessage: "🚫 Anjir, error nih bro! Kayaknya ada jin kesasar di server. Coba lagi ntar, atau laporin ke Big Boss kalo penting banget.",
  adminOnlyMessage: "Wih, ini mah menu rahasia para suhu admin, bro! Lo bukan salah satunya, kan? 😉",
  ownerOnlyMessage: "Eits, stop! Ini area terlarang buat selain Big Boss! 🤫 Mundur alon-alon...",
  groupOnlyMessage: "Command ini cuma nampol di grup, cuy. Jangan di chat pribadi, ya.",
  pcOnlyMessage: "Buat command ini, kita ngobrol di chat pribadi aja, lebih intim. 😉",
  userBannedMessage: "Yah, akun lo kena segel ban dari admin, bro. Gabisa pake bot dulu sampe negara api menyerah.",
  notEnoughCoinMessage: "Dompet lo lagi kempes, bos! Cari koin lagi gih atau minta sumbangan ke Sultan. 💸",
  notEnoughEnergyMessage: "Energi lo udah kayak HP sekarat, bro! Istirahat dulu, minum es teh, atau top-up! ⚡",
  premiumOnlyMessage: "Ups, fitur ini cuma buat kaum elit premium nih. Mau join circle sultan? Upgrade dulu, gan!"

  // HAPUS ATAU KOMENTARI JIKA ADA API KEY DI SINI SEBELUMNYA
  // Contoh: API_KEY_UPLOAD: 'RAMADHAN7_DARI_CONFIG',
};