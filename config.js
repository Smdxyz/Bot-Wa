// config.js
module.exports = {
  botPrefix: '!',
  botName: 'Sann',
  adminNumber: '6281933038407,628xxxxxxxxxx', // Isi dengan nomor telepon Anda, pisahkan dengan koma (tanpa spasi setelah koma)
  botMode: 'private', // Bisa 'private' atau 'public'
  antiCall: true, // true untuk mengaktifkan anti-call, false untuk menonaktifkan
  energyCostPerCommand: 1,
  coinPerDay: 10,
  premiumTiers: {
    "Super Kere": { level: 1, multiplier: 1 },
    "Kere": { level: 2, multiplier: 1.2 },
    "biasa aja": { level: 3, multiplier: 1.5 },
    "menengah": { level: 4, multiplier: 1.7 },
    "Kaya": { level: 5, multiplier: 2 },
    "Sultan": { level: 6, multiplier: 2.5 },
  },
  premiumCommands: ['premium_command1', 'premium_command2'], // Daftar command premium (sesuai nama Callname)
  greetingMorning: "☀️ Selamat pagi!",
  greetingAfternoon: "🌤️ Selamat siang!",
  greetingEvening: "🌇 Selamat sore!",
  greetingNight: "🌙 Selamat malam!",
  greetingMidnight: "🌃 Selamat dini hari!",
  watermark: "© Sann 2024",
  menuImage: './assets/menu_image.jpg', // Path ke gambar menu
};