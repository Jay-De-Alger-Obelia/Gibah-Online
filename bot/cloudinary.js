// ── cloudinary.js ──
// Upload foto dari URL Discord ke Cloudinary

const cloudinary = require('cloudinary').v2;

// Konfigurasi otomatis dari CLOUDINARY_URL di .env
cloudinary.config({
  cloud_name : process.env.CLOUDINARY_CLOUD_NAME,
  api_key    : process.env.CLOUDINARY_API_KEY,
  api_secret : process.env.CLOUDINARY_API_SECRET,
  secure     : true,
});

/**
 * Upload gambar dari URL eksternal (Discord CDN) ke Cloudinary
 * @param {string} imageUrl  - URL gambar dari Discord
 * @param {object} options   - folder, tags, transformation, dsb
 * @returns {object}         - hasil upload dari Cloudinary
 */
async function uploadToCloudinary(imageUrl, options = {}) {
  const result = await cloudinary.uploader.upload(imageUrl, {
    folder         : options.folder || 'gibah-online',
    tags           : options.tags   || [],
    // Auto-optimize: konversi ke WebP, resize max 1920px
    transformation : [
      { width: 1920, height: 1920, crop: 'limit' },
      { quality: 'auto', fetch_format: 'auto' },
    ],
    // Simpan metadata asli
    use_filename      : true,
    unique_filename   : true,
    overwrite         : false,
  });

  return result;
}

/**
 * Hapus foto dari Cloudinary (opsional, untuk fitur delete)
 * @param {string} publicId  - public_id dari Cloudinary
 */
async function deleteFromCloudinary(publicId) {
  return cloudinary.uploader.destroy(publicId);
}

module.exports = { uploadToCloudinary, deleteFromCloudinary };
