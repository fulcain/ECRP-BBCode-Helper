const IMGBB_API_KEY = "2a766285de5b6f45d1dff4bf3d6b098f";
const IMGBB_UPLOAD_URL = "https://api.imgbb.com/1/upload";

export interface ImgBBResponse {
  success: boolean;
  data?: {
    id: string;
    title: string;
    url_viewer: string;
    url: string;
    display_url: string;
    size: number;
    time: number;
    expiration: number;
    image: {
      filename: string;
      name: string;
      mime: string;
      extension: string;
      url: string;
    };
    thumb: {
      filename: string;
      name: string;
      mime: string;
      extension: string;
      url: string;
    };
    medium: {
      filename: string;
      name: string;
      mime: string;
      extension: string;
      url: string;
    };
    delete_url: string;
  };
  error?: string;
  status_code?: number;
  status_txt?: string;
}

export interface ConversionResult {
  originalUrl: string;
  newUrl: string;
  success: boolean;
  error?: string;
}

/** ImgBB domains — skip these when converting */
const IMGBB_DOMAINS = ["i.ibb.co", "ibb.co"];

function isImgBBUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return IMGBB_DOMAINS.includes(host);
  } catch {
    return false;
  }
}

/** Find all image URLs inside [img]...[/img] tags, skipping ImgBB URLs */
export function findAllImgTagUrls(text: string): string[] {
  const urls: string[] = [];
  // Match [img]URL[/img] with optional whitespace
  const pattern = /\[img\]\s*(https?:\/\/[^\]\s]+)\s*\[\/img\]/gi;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    const url = match[1].trim();
    if (!isImgBBUrl(url) && !urls.includes(url)) {
      urls.push(url);
    }
  }
  return urls;
}

/** Upload an image URL to ImgBB */
export async function uploadToImgBB(
  imageUrl: string
): Promise<ImgBBResponse> {
  try {
    const formData = new FormData();
    formData.append("key", IMGBB_API_KEY);
    formData.append("image", imageUrl);

    const response = await fetch(IMGBB_UPLOAD_URL, {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (data.success) {
      return {
        success: true,
        data: data.data,
      };
    } else {
      return {
        success: false,
        error: data.error?.message || "Unknown error from ImgBB",
        status_code: data.status_code,
        status_txt: data.status_txt,
      };
    }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Network error uploading to ImgBB",
    };
  }
}

/** Upload a File/Blob to ImgBB */
export async function uploadFileToImgBB(
  file: File | Blob,
  filename?: string
): Promise<ImgBBResponse> {
  try {
    const formData = new FormData();
    formData.append("key", IMGBB_API_KEY);
    const name = filename || (file instanceof File ? file.name : "image.png");
    formData.append("image", file, name);

    const response = await fetch(IMGBB_UPLOAD_URL, {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (data.success) {
      return {
        success: true,
        data: data.data,
      };
    } else {
      return {
        success: false,
        error: data.error?.message || "Unknown error from ImgBB",
        status_code: data.status_code,
        status_txt: data.status_txt,
      };
    }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Network error uploading to ImgBB",
    };
  }
}

/** Result for the image converter page */
export interface ImageConvertResult {
  id: string;
  originalName: string;
  originalUrl?: string;
  thumbnailUrl: string;
  directUrl: string;
  bbCodeUrl: string;
  deleteUrl: string;
  size: number;
  success: boolean;
  error?: string;
}
