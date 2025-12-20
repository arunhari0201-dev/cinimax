import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';

// Environment variables should be loaded by the main index.js before this module is imported

const requiredCloudinaryVars = [
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
];

const missingCloudinaryVars = requiredCloudinaryVars.filter((key) => !process.env[key]);

if (missingCloudinaryVars.length) {
  throw new Error(
    `Missing Cloudinary environment variables: ${missingCloudinaryVars.join(', ')}`
  );
}

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure Cloudinary storage for multer
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'cinema-movies', // Folder name in Cloudinary
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
    transformation: [
      { width: 600, height: 900, crop: 'fill' }, // Movie poster dimensions
      { quality: 'auto' }
    ],
  },
});

// Create multer upload middleware
export const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Check file type
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  },
});

export default cloudinary;