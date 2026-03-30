const ImageKit = require("imagekit");
const { v4: uuid } = require("uuid");

if (
  !process.env.IMAGE_KIT_PUBLIC_KEY ||
  !process.env.IMAGE_KIT_PRIVATE_KEY ||
  !process.env.IMAGE_KIT_URL_ENDPOINT
) {
  if (process.env.NODE_ENV !== "test") {
    throw new Error(
      "ImageKit configuration missing. Please set IMAGE_KIT_PUBLIC_KEY, IMAGE_KIT_PRIVATE_KEY, and IMAGE_KIT_URL_ENDPOINT environment variables.",
    );
  }
}

let imagekit = null;
if (
  process.env.IMAGE_KIT_PUBLIC_KEY &&
  process.env.IMAGE_KIT_PRIVATE_KEY &&
  process.env.IMAGE_KIT_URL_ENDPOINT
) {
  imagekit = new ImageKit({
    publicKey: process.env.IMAGE_KIT_PUBLIC_KEY,
    privateKey: process.env.IMAGE_KIT_PRIVATE_KEY,
    urlEndpoint: process.env.IMAGE_KIT_URL_ENDPOINT,
  });
} else {
  if (process.env.NODE_ENV !== "test") {
    console.warn("⚠️ ImageKit not configured. Running in fallback mode.");
  }
}

async function uploadImageBuffer({ buffer }) {
  if (!buffer) {
    throw new Error("File buffer missing");
  }

  if (!imagekit) {
    return {
      url: "mock-url",
      thumbnail: "mock-thumbnail",
      id: "mock-file-id",
    };
  }

  const result = await imagekit.upload({
    file: buffer,
    fileName: `${uuid()}.jpg`,
    folder: "NeuroCart_Products_Images",
  });

  // Return the URL and thumbnail URL of the uploaded image
  return {
    url: result.url,
    thumbnail: result.thumbnailUrl,
    id: result.fileId,
  };
}

module.exports = {
  uploadImageBuffer,
};
