// ── database.js ──
// Simpan dan ambil metadata foto dari Supabase

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY  // pakai service key (bukan anon) untuk write dari bot
);

const TABLE = 'photos';

/**
 * Simpan metadata foto baru ke database
 * @param {object} data - data foto
 * @returns {object}    - record yang tersimpan
 */
async function savePhotoToDatabase(data) {
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
}

/**
 * Ambil semua foto (dipakai untuk testing)
 */
async function getAllPhotos() {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Update jumlah like sebuah foto
 */
async function updateLikes(photoId, newCount) {
  const { error } = await supabase
    .from(TABLE)
    .update({ likes: newCount })
    .eq('id', photoId);

  if (error) throw error;
}

/**
 * Hapus foto dari database
 */
async function deletePhoto(photoId) {
  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq('id', photoId);

  if (error) throw error;
}

module.exports = { savePhotoToDatabase, getAllPhotos, updateLikes, deletePhoto };
