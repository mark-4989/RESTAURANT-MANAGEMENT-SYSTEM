// server/config/cloudinary.js
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure Multer Storage for Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'dinesmart/menu-items', // Folder name in Cloudinary
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
    transformation: [
      {
        width: 800,
        height: 600,
        crop: 'fill',
        quality: 'auto:good',
        fetch_format: 'auto'
      }
    ]
  }
});

// Create multer upload instance
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Check file type
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Helper function to delete image from Cloudinary
const deleteImage = async (imageUrl) => {
  try {
    if (!imageUrl || !imageUrl.includes('cloudinary.com')) {
      return { success: false, message: 'Not a Cloudinary image' };
    }

    // Extract public_id from URL
    const urlParts = imageUrl.split('/');
    const fileNameWithExt = urlParts[urlParts.length - 1];
    const fileName = fileNameWithExt.split('.')[0];
    const folder = 'dinesmart/menu-items';
    const publicId = `${folder}/${fileName}`;

    const result = await cloudinary.uploader.destroy(publicId);
    
    return {
      success: result.result === 'ok',
      message: result.result === 'ok' ? 'Image deleted' : 'Image not found'
    };
  } catch (error) {
    console.error('Error deleting image:', error);
    return { success: false, message: error.message };
  }
};

module.exports = {
  cloudinary,
  upload,
  deleteImage
};