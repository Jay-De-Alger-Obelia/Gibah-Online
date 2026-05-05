// ── database.js ──
const { createClient } = require('@supabase/supabase-js');

function getClient() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );
}

// Retry helper — coba ulang sampai 3x jika fetch failed
async function withRetry(fn, label = 'Supabase', maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const isFetchFailed = err?.message?.includes('fetch failed')
        || err?.message?.includes('TypeError');
      if (isFetchFailed && attempt < maxRetries) {
        const delay = attempt * 1000; // 1s, 2s
        console.warn(`   ⚠️  ${label} gagal (attempt ${attempt}/${maxRetries}), retry dalam ${delay/1000}s...`);
        await new Promise(r => setTimeout(r, delay));
      } else {
        throw err;
      }
    }
  }
}

const TABLE = 'photos';

async function savePhotoToDatabase(data) {
  return withRetry(async () => {
    const supabase = getClient();
    const { data: record, error } = await supabase
      .from(TABLE)
      .insert([{
        title          : data.title,
        category       : data.category,
        image_url      : data.imageUrl,
        cloudinary_id  : data.cloudinaryId,
        width          : data.width,
        height         : data.height,
        uploaded_by    : data.uploadedBy,
        discord_msg_id : data.discordMsgId,
        discord_channel: data.discordChannel,
        likes          : 0,
        created_at     : data.date || new Date().toISOString(),
      }])
      .select()
      .single();

    if (error) throw new Error(`Supabase insert gagal: ${error.message}`);
    return record;
  }, 'Supabase insert');
}

async function getAllPhotos() {
  return withRetry(async () => {
    const supabase = getClient();
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  });
}

async function updateLikes(photoId, newCount) {
  return withRetry(async () => {
    const supabase = getClient();
    const { error } = await supabase
      .from(TABLE)
      .update({ likes: newCount })
      .eq('id', photoId);
    if (error) throw error;
  });
}

async function deletePhoto(photoId) {
  return withRetry(async () => {
    const supabase = getClient();
    const { error } = await supabase
      .from(TABLE)
      .delete()
      .eq('id', photoId);
    if (error) throw error;
  });
}

module.exports = { savePhotoToDatabase, getAllPhotos, updateLikes, deletePhoto };
