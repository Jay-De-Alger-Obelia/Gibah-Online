// ══════════════════════════════════════════════════════
//  GIBAH ONLINE — Discord Bot
//  Upload foto di Discord → otomatis muncul di website
// ══════════════════════════════════════════════════════

require('dotenv').config();
const { Client, GatewayIntentBits, Events } = require('discord.js');
const { uploadToCloudinary }                = require('./cloudinary');
const { savePhotoToDatabase }               = require('./database');

// ── Validasi ENV saat startup ──
const REQUIRED_ENV = [
  'DISCORD_BOT_TOKEN',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_KEY',
];
const missingEnv = REQUIRED_ENV.filter(k => !process.env[k]);
if (missingEnv.length > 0) {
  console.error('\n❌ ENV TIDAK LENGKAP! Variabel berikut belum diisi di .env:');
  missingEnv.forEach(k => console.error(`   - ${k}`));
  process.exit(1);
}

// ── Inisialisasi Discord Client ──
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// ── Konfigurasi Channel ──
const WATCHED_CHANNELS = (process.env.DISCORD_CHANNEL_IDS || '')
  .split(',').map(s => s.trim()).filter(Boolean);

// ── Mapping kategori berdasarkan nama channel ──
const CATEGORY_MAP = {
  'galeri-sumbing' : 'sumbing',
  'galeri-hangout' : 'hangout',
  'galeri-random'  : 'random',
  'general'        : 'random',
  'media'          : 'random',
};

// ── Bot siap ──
client.once(Events.ClientReady, (c) => {
  console.log(`\n✅ Bot aktif sebagai: ${c.user.tag}`);
  if (WATCHED_CHANNELS.length > 0) {
    console.log(`📡 Memantau channel ID: ${WATCHED_CHANNELS.join(', ')}`);
  } else {
    console.log(`📡 Memantau: SEMUA channel`);
  }
  console.log('──────────────────────────────────────\n');
});

// ── Helper: kumpulkan semua gambar dari pesan (termasuk forward & reply) ──
function collectImages(message) {
  const images = [];

  // 1. Attachment langsung di pesan ini
  for (const [, att] of message.attachments) {
    if (att.contentType && att.contentType.startsWith('image/')) {
      images.push({ url: att.url, name: att.name, source: 'direct' });
    }
  }

  // 2. Embeds (muncul saat pesan di-forward via tombol Forward di Discord)
  //    Discord forward = MessageSnapshot, tapi juga bisa muncul sebagai embed
  for (const embed of message.embeds) {
    if (embed.image?.url) {
      images.push({ url: embed.image.url, name: 'forwarded-image.png', source: 'embed' });
    }
    if (embed.thumbnail?.url && !embed.image?.url) {
      images.push({ url: embed.thumbnail.url, name: 'forwarded-thumb.png', source: 'embed' });
    }
  }

  // 3. Message Snapshots = pesan yang di-forward via tombol Forward (discord.js v14.16+)
  //    Field: message.messageSnapshots
  if (message.messageSnapshots?.size > 0) {
    for (const [, snapshot] of message.messageSnapshots) {
      for (const att of snapshot.attachments?.values?.() ?? []) {
        if (att.contentType && att.contentType.startsWith('image/')) {
          images.push({ url: att.url, name: att.name, source: 'forward' });
        }
      }
    }
  }

  // 4. Referenced message (pesan yang di-reply, jika ada gambarnya)
  if (message.reference && message.referencedMessage) {
    for (const [, att] of message.referencedMessage.attachments) {
      if (att.contentType && att.contentType.startsWith('image/')) {
        images.push({ url: att.url, name: att.name, source: 'reply' });
      }
    }
  }

  // Hilangkan duplikat berdasarkan URL
  const seen = new Set();
  return images.filter(img => {
    if (seen.has(img.url)) return false;
    seen.add(img.url);
    return true;
  });
}

// ── Event: pesan baru masuk ──
client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;

  const isWatched = WATCHED_CHANNELS.length === 0
    || WATCHED_CHANNELS.includes(message.channelId);
  if (!isWatched) return;

  // Fetch referenced message jika ada (untuk deteksi reply dengan gambar)
  if (message.reference?.messageId && !message.referencedMessage) {
    try {
      message.referencedMessage = await message.channel.messages.fetch(
        message.reference.messageId
      );
    } catch (_) { /* pesan asli mungkin sudah dihapus */ }
  }

  const images = collectImages(message);
  if (images.length === 0) return;

  const channelName = message.channel.name || '';
  const category    = CATEGORY_MAP[channelName] || 'random';
  const caption     = message.content.trim() || null;

  const sourceLabel = {
    direct  : '📎 langsung',
    embed   : '↪️  forward (embed)',
    forward : '↪️  forward',
    reply   : '💬 reply',
  };

  console.log(`📸 Foto baru di #${channelName} dari ${message.author.username} [${images.length} gambar]`);

  for (const image of images) {
    try {
      console.log(`   ⬆  Upload: ${image.name} (${sourceLabel[image.source] || image.source})`);

      const cloudinaryResult = await uploadToCloudinary(image.url, {
        folder : 'gibah-online',
        tags   : ['discord', category, image.source],
      });
      console.log(`   ☁  Cloudinary OK: ${cloudinaryResult.public_id}`);

      const photo = await savePhotoToDatabase({
        title         : caption || generateTitle(image.name),
        category      : category,
        imageUrl      : cloudinaryResult.secure_url,
        cloudinaryId  : cloudinaryResult.public_id,
        width         : cloudinaryResult.width,
        height        : cloudinaryResult.height,
        uploadedBy    : message.author.username,
        discordMsgId  : message.id,
        discordChannel: channelName,
        date          : new Date().toISOString(),
      });
      console.log(`   🗄  Supabase OK: ID ${photo.id}`);

      try {
        await message.react('✅');
        await message.reply({
          content: `📸 **Foto berhasil ditambahkan ke galeri!**\n` +
                   `🏷 Judul: ${photo.title}\n` +
                   `📂 Kategori: ${photo.category}\n` +
                   `🔗 [Lihat di website](${process.env.WEBSITE_URL || 'https://gibah-online.vercel.app'}/galeri-lengkap.html)`,
          allowedMentions: { repliedUser: false },
        });
      } catch (_) { /* abaikan jika react/reply gagal */ }

      console.log(`   ✅ Berhasil!\n`);

    } catch (err) {
      const errMsg = err?.message || JSON.stringify(err) || 'unknown error';
      console.error(`   ❌ Gagal: ${errMsg}`);
      if (err?.http_code) console.error(`      Cloudinary HTTP ${err.http_code}:`, err.error?.message);
      if (err?.stack)     console.error(`      Stack: ${err.stack.split('\n')[1]?.trim()}`);
      try { await message.react('❌'); } catch (_) {}
    }
  }
});

// ── Helper: generate judul dari nama file ──
function generateTitle(filename) {
  return (filename || 'foto')
    .replace(/\.(webp|jpg|jpeg|png|gif)$/i, '')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .slice(0, 60);
}

// ── Login bot ──
client.login(process.env.DISCORD_BOT_TOKEN);
