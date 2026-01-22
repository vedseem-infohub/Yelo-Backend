const { cloudinary, config } = require('../config/cloudinary.config');
const streamifier = require('streamifier');

async function uploadSingle(buffer, options = {}) {
  const {
    folder = config.folder,
    filename,
    resourceType = 'image',
    transformation = {
      quality: 'auto',
      fetch_format: 'auto',
      width: 1200,
      crop: 'limit'
    }
  } = options;

  console.log(`Uploading image to Cloudinary...`);
  console.log(` Folder: ${folder}`);
  console.log(`Original size: ${(buffer.length / 1024).toFixed(2)} KB`);

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType,
        transformation,
        public_id: filename,
        use_filename: filename ? true : false,
        unique_filename: !filename
      },
      (error, result) => {
        if (error) {
          console.error(' Cloudinary upload failed:', error.message);
          return reject(error);
        }

        console.log(` Image uploaded successfully!`);
        console.log(` Public ID: ${result.public_id}`);
        console.log(`URL: ${result.secure_url}`);
        console.log(` Format: ${result.format}`);
        console.log(` Dimensions: ${result.width}x${result.height}`);
        console.log(` Size: ${(result.bytes / 1024).toFixed(2)} KB`);

        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          format: result.format,
          width: result.width,
          height: result.height,
          bytes: result.bytes,
          createdAt: result.created_at
        });
      }
    );

    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
}

async function uploadMultiple(buffers, options = {}) {
  const {
    folder = config.folder,
    filenames = []
  } = options;

  console.log(`Uploading ${buffers.length} images to Cloudinary in parallel...`);

  const uploadPromises = buffers.map((buffer, index) => {
    const filename = filenames[index];
    return uploadSingle(buffer, { folder, filename })
      .then(result => {
        console.log(` Image ${index + 1}/${buffers.length} uploaded`);
        return result;
      })
      .catch(error => {
        console.error(` Image ${index + 1}/${buffers.length} upload failed:`, error.message);
        return {
          error: error.message,
          index
        };
      });
  });

  const results = await Promise.all(uploadPromises);

  const successful = results.filter(r => !r.error);
  const failed = results.filter(r => r.error);

  console.log(`Uploaded ${successful.length}/${buffers.length} images successfully`);
  if (failed.length > 0) {
    console.log(` Failed uploads: ${failed.length}`);
  }

  return results;
}

async function deleteImage(publicId) {
  console.log(` Deleting image: ${publicId}`);

  try {
    const result = await cloudinary.uploader.destroy(publicId);

    if (result.result === 'ok') {
      console.log(`Image deleted successfully: ${publicId}`);
      return { success: true, publicId };
    } else {
      console.log(` Image deletion result: ${result.result}`);
      return { success: false, publicId, result: result.result };
    }
  } catch (error) {
    console.error(` Error deleting image:`, error.message);
    throw error;
  }
}

function generateSignedUrl(publicId, options = {}) {
  const {
    expiresIn = 3600,
    transformation = {}
  } = options;

  const timestamp = Math.floor(Date.now() / 1000) + expiresIn;

  const signedUrl = cloudinary.url(publicId, {
    sign_url: true,
    expires_at: timestamp,
    transformation,
    secure: true
  });

  console.log(` Generated signed URL for: ${publicId}`);
  console.log(`Expires at: ${new Date(timestamp * 1000).toISOString()}`);

  return signedUrl;
}

module.exports = {
  uploadSingle,
  uploadMultiple,
  deleteImage,
  generateSignedUrl
};
