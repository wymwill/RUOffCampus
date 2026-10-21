export const MAX_LISTING_IMAGES = 6;
const MAX_IMAGE_DIMENSION = 1600;

export async function filesToListingImages(fileList, maxCount = MAX_LISTING_IMAGES) {
  const imageFiles = Array.from(fileList)
    .filter((file) => file.type.startsWith("image/"))
    .slice(0, maxCount);

  return Promise.all(imageFiles.map((file) => createListingImageEntry(file)));
}

async function createListingImageEntry(file) {
  const dataUrl = await readFileAsDataUrl(file);
  const optimizedUrl = await optimizeImage(dataUrl, file.type);

  return {
    id: buildImageId(file.name),
    name: file.name,
    url: optimizedUrl,
  };
}

function buildImageId(name) {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${name}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error(`Could not read ${file.name}.`));
    reader.readAsDataURL(file);
  });
}

function optimizeImage(dataUrl, mimeType) {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => {
      const scale = Math.min(
        1,
        MAX_IMAGE_DIMENSION / Math.max(image.width, image.height)
      );
      const canvas = document.createElement("canvas");

      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));

      const context = canvas.getContext("2d");
      if (!context) {
        resolve(dataUrl);
        return;
      }

      context.drawImage(image, 0, 0, canvas.width, canvas.height);

      const outputType = mimeType === "image/png" ? "image/png" : "image/jpeg";
      const quality = outputType === "image/png" ? undefined : 0.84;

      try {
        resolve(canvas.toDataURL(outputType, quality));
      } catch (error) {
        reject(error);
      }
    };

    image.onerror = () => reject(new Error("Could not load the dropped image."));
    image.src = dataUrl;
  });
}

const AVATAR_SIZE = 256;

/** A square, center cropped JPEG data URL for a profile photo. */
export async function fileToAvatar(file) {
  if (!file?.type?.startsWith("image/")) throw new Error("Choose an image file.");
  const dataUrl = await readFileAsDataUrl(file);
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const side = Math.min(image.width, image.height);
      const canvas = document.createElement("canvas");
      canvas.width = AVATAR_SIZE;
      canvas.height = AVATAR_SIZE;
      const context = canvas.getContext("2d");
      if (!context) {
        reject(new Error("Could not process the photo."));
        return;
      }
      context.drawImage(
        image,
        (image.width - side) / 2,
        (image.height - side) / 2,
        side,
        side,
        0,
        0,
        AVATAR_SIZE,
        AVATAR_SIZE
      );
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    image.onerror = () => reject(new Error("Could not load that photo."));
    image.src = dataUrl;
  });
}
