const multer = require("multer");
const cloudinaryService = require("../../utils/cloudinary.service");

const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"), false);
    }
  }
});

exports.uploadAndCompressImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No image file provided"
      });
    }

    const { folder = 'products', filename } = req.body;

    console.log(`🖼️ Processing image upload: ${req.file.originalname}`);
    console.log(`📁 Target folder: ${folder}`);
    console.log(`📏 File size: ${(req.file.size / 1024).toFixed(2)} KB`);

    const result = await cloudinaryService.uploadSingle(req.file.buffer, {
      folder,
      filename: filename || req.file.originalname.split('.')[0]
    });

    res.json({
      success: true,
      data: {
        url: result.url,
        publicId: result.publicId,
        format: result.format,
        width: result.width,
        height: result.height,
        bytes: result.bytes,
        originalFilename: req.file.originalname
      }
    });
  } catch (error) {
    console.error("❌ Error uploading image to Cloudinary:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to upload image"
    });
  }
};

exports.uploadAndCompressImages = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No image files provided"
      });
    }

    const { folder = 'products' } = req.body;

    console.log(`🖼️ Processing ${req.files.length} images for upload`);
    console.log(`📁 Target folder: ${folder}`);

    const buffers = req.files.map(file => file.buffer);
    const filenames = req.files.map(file => file.originalname.split('.')[0]);

    const results = await cloudinaryService.uploadMultiple(buffers, {
      folder,
      filenames
    });

    const successful = results.filter(r => !r.error);
    const failed = results.filter(r => r.error);

    console.log(`✅ Upload complete: ${successful.length} successful, ${failed.length} failed`);

    res.json({
      success: true,
      data: results,
      total: results.length,
      successful: successful.length,
      failed: failed.length
    });
  } catch (error) {
    console.error("❌ Error uploading images to Cloudinary:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to upload images"
    });
  }
};

exports.upload = upload;
