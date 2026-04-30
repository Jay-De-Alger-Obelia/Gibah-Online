// ══════════════════════════════════════════════════════
//  GIBAH ONLINE — Discord Bot
//  Upload foto di Discord → otomatis muncul di website
//
//  Stack: discord.js v14 · Cloudinary · Supabase
// ══════════════════════════════════════════════════════

require('dotenv').config();
const { Client, GatewayIntentBits, Events } = require('discord.js');
const { uploadToCloudinary }                = require('./cloudinary');
const { savePhotoToDatabase }               = require('./database');

// ── Inisialisasi Discord Client ──
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// ── Konfigurasi Channel ──
// Isi dengan ID channel Discord yang ingin dipantau
// Cara cari ID: klik kanan channel → Copy Channel ID
//              (aktifkan Developer Mode di Discord Settings > Advanced)
const WATCHED_CHANNELS = (process.env.DISCORD_CHANNEL_IDS || '1499370164527960066').split(',').map(s => s.trim()).filter(Boolean);

// ── Mapping kategori berdasarkan nama channel ──
// Sesuaikan dengan nama channel Discord-mu
const CATEGORY_MAP = {
  'galeri-sumbing'  : 'sumbing',
  'galeri-hangout'  : 'hangout',
  'general'   : 'random',
  'MEDIA'          : 'random',  // default
};

// ── Bot siap ──
client.once(Events.ClientReady, (c) => {
  console.log(`\n✅ Bot aktif sebagai: ${c.user.tag}`);
  console.log(`📡 Memantau channel: ${WATCHED_CHANNELS.join(', ') || '(semua channel)'}`);
  console.log('──────────────────────────────────────\n');
});

// ── Event: pesan baru masuk ──
client.on(Events.MessageCreate, async (message) => {
  // Abaikan pesan dari bot lain
  if (message.author.bot) return;

  // Cek apakah channel ini dipantau
  const isWatched = WATCHED_CHANNELS.length === 0
    || WATCHED_CHANNELS.includes(message.channelId);
  if (!isWatched) return;

  // Cek apakah ada attachment (foto / gambar)
  const imageAttachments = message.attachments.filter(att =>
    att.contentType && att.contentType.startsWith('image/')
  );
  if (imageAttachments.size === 0) return;

  // Tentukan kategori dari nama channel
  const channelName = message.channel.name || '';
  const category    = CATEGORY_MAP[channelName] || 'random';

  // Ambil caption dari isi pesan (jika ada)
  const caption = message.content.trim() || null;

  console.log(`📸 Foto baru di #${channelName} dari ${message.author.username}`);

  // Proses setiap foto yang diupload
  for (const [, attachment] of imageAttachments) {
    try {
      console.log(`   ⬆  Upload: ${attachment.name}`);

      // 1. Upload ke Cloudinary
      const cloudinaryResult = await uploadToCloudinary(attachment.url, {
        folder   : 'gibah-online',
        tags     : ['discord', category],
      });

      // 2. Simpan metadata ke Supabase
      const photo = await savePhotoToDatabase({
        title         : caption || generateTitle(attachment.name),
        category      : category,
        imageUrl      : cloudinaryResult.secure_url,
        cloudinaryId  : cloudinaryResult.public_id,
        width         : cloudinaryResult.width,
        height        : cloudinaryResult.height,
        uploadedBy    : message.author.username,
        discordMsgId  : message.id,
        discordChannel: message.channel.name,
        date          : new Date().toISOString(),
      });

      // 3. Konfirmasi di Discord
      await message.react('✅');
      await message.reply({
        content: `📸 **Foto berhasil ditambahkan ke galeri!**\n` +
                 `🏷 Judul: ${photo.title}\n` +
                 `📂 Kategori: ${photo.category}\n` +
                 `🔗 [Lihat di website](${process.env.WEBSITE_URL || 'https://gibah-online.vercel.app'}/galeri-lengkap.html)`,
        allowedMentions: { repliedUser: false },
      });

      console.log(`   ✅ Berhasil! ID: ${photo.id}`);

    } catch (err) {
      console.error(`   ❌ Gagal proses foto:`, err.message);
      await message.react('❌');
    }
  }
});

// ── Helper: generate judul dari nama file ──
function generateTitle(filename) {
  return filename
    .replace(/\.(webp|jpg|jpeg|png|gif)$/i, '')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .slice(0, 60);
}

// ── Login bot ──
client.login(process.env.DISCORD_BOT_TOKEN);
