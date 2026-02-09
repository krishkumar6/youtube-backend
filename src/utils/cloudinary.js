import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

// config cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;

    // upload file to cloudinary
    const result = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto"
    });

    console.log("File uploaded on Cloudinary:", result.url);

    // delete local file after successful upload
    fs.unlinkSync(localFilePath);

    return result;
  } catch (error) {
    // delete local file if upload fails
    fs.unlinkSync(localFilePath);
    console.log("Cloudinary upload error:", error);
    return null;
  }
};

export { uploadOnCloudinary };
