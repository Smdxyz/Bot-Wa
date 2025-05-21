// commands/saveTube.js
const axios = require('axios');
const crypto = require('crypto');

const BASE_URL = "https://media.savetube.me/api";
const ENDPOINTS = {
  cdn: "/random-cdn",
  info: "/v2/info",
  download: "/download"
};

const savetube = {
  NamaFitur: 'YouTube Downloader',
  Callname: 'savetube',
  Kategori: 'Downloader',
  SubKategori: 'YouTube',
  ReqEnergy: 1,
  ReqTier: null,
  ReqCoin: 'n',
  CostCoin: 0,
  Deskripsi: 'Download audio/video dari YouTube dengan kualitas pilihan.',

  headers: {
    'accept': '*/*',
    'content-type': 'application/json',
    'origin': 'https://yt.savetube.me',
    'referer': 'https://yt.savetube.me/',
    'user-agent': 'Postify/1.0.0'
  },
  formats: ['144', '240', '360', '480', '720', '1080', 'mp3'],

  crypto: {
    hexToBuffer: (hexString) => {
      const matches = hexString.match(/.{1,2}/g);
      return Buffer.from(matches.join(''), 'hex');
    },

    decrypt: async (enc) => {
      try {
        const secretKey = 'C5D58EF67A7584E4A29F6C35BBC4EB12';
        const data = Buffer.from(enc, 'base64');
        const iv = data.slice(0, 16);
        const content = data.slice(16);
        const key = savetube.crypto.hexToBuffer(secretKey);
        
        const decipher = crypto.createDecipheriv('aes-128-cbc', key, iv);
        let decrypted = decipher.update(content);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        
        return JSON.parse(decrypted.toString());
      } catch (error) {
        throw new Error(`${error.message}`);
      }
    }
  },

  request: async (endpoint, data = {}, method = 'post') => {
    try {
      const { data: response } = await axios({
        method,
        url: `${endpoint.startsWith('http') ? '' : BASE_URL}${endpoint}`,
        data: method === 'post' ? data : undefined,
        params: method === 'get' ? data : undefined,
        headers: savetube.headers
      });
      return {
        status: true,
        code: 200,
        data: response
      };
    } catch (error) {
      return {
        status: false,
        code: error.response?.status || 500,
        error: error.message
      };
    }
  },

  getCDN: async () => {
    const response = await savetube.request(ENDPOINTS.cdn, {}, 'get');
    if (!response.status) return response;
    return {
      status: true,
      code: 200,
      data: response.data.cdn
    };
  },

  download: async (link, format) => {
    return { status: false, error: 'Function not implemented yet' };
  },

  execute: async function (sock, msg, commands, { isActive, tier, multiplier, mediaType }) {
    const jid = msg.key.remoteJid;
    const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || "";
    const args = text.split(' ');
    const link = args[1];
    const format = args[2];

    if (!link || !format) {
      return await sock.sendMessage(jid, { text: 'Format salah! Gunakan: .savetube <link> <format>' });
    }

    try {
      const result = await savetube.download(link, format);
      if (!result.status) {
        return await sock.sendMessage(jid, { text: `❌ Error: ${result.error}` });
      }
      await sock.sendMessage(jid, { text: `✅ Download Ready: ${result.result.download}` });
    } catch (error) {
      await sock.sendMessage(jid, { text: '❌ Error: ' + error.message });
    }
  }
};

module.exports = savetube;
