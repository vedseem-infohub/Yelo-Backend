const cloudinary = require('cloudinary').v2;

const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;
const CLOUDINARY_FOLDER = process.env.CLOUDINARY_FOLDER || 'yeahlo-images';
const CLOUDINARY_SECURE = process.env.CLOUDINARY_SECURE === 'true' || true;

if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
  console.error('Cloudinary credentials missing in .env file');
  console.error('Required: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET');
  throw new Error('Cloudinary configuration is incomplete');
}

cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
  secure: CLOUDINARY_SECURE
});

console.log(' Cloudinary configured successfully');
console.log(`Default folder: ${CLOUDINARY_FOLDER}`);
console.log(` Secure URLs: ${CLOUDINARY_SECURE}`);

module.exports = {
  cloudinary,
  config: {
    cloudName: CLOUDINARY_CLOUD_NAME,
    folder: CLOUDINARY_FOLDER,
    secure: CLOUDINARY_SECURE
  }
};
