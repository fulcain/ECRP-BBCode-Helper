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

/** Extract direct image URL from an imgur link */
export function extractImgurUrl(input: string): string | null {
  // Handle various imgur formats:
  // https://imgur.com/abc123
  // https://imgur.com/abc123.jpg
  // https://i.imgur.com/abc123.jpg
  // https://i.imgur.com/abc123.png
  // http://imgur.com/abc123

  const patterns = [
    /https?:\/\/(?:i\.)?imgur\.com\/([a-zA-Z0-9]+)(?:\.[a-zA-Z]+)?/,
    /https?:\/\/imgur\.com\/([a-zA-Z0-9]+)/,
    /https?:\/\/i\.imgur\.com\/([a-zA-Z0-9]+(?:\.[a-zA-Z]+)?)/,
  ];

  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match) {
      const id = match[1].replace(/\.[a-zA-Z]+$/, "");
      return `https://i.imgur.com/${id}.png`;
    }
  }

  return null;
}

/** Find all imgur URLs in a text string */
export function findAllImgurUrls(text: string): string[] {
  const urls: string[] = [];
  const pattern = /https?:\/\/(?:i\.)?imgur\.com\/[a-zA-Z0-9]+(?:\.[a-zA-Z]+)?/g;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    const normalized = extractImgurUrl(match[0]);
    if (normalized && !urls.includes(normalized)) {
      urls.push(normalized);
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

/** Convert all imgur URLs in a text to imgbb URLs */
export async function convertImgurToImgBB(
  text: string,
  onProgress?: (current: number, total: number, result: ConversionResult) => void
): Promise<{ text: string; results: ConversionResult[] }> {
  const imgurUrls = findAllImgurUrls(text);
  const results: ConversionResult[] = [];
  let newText = text;

  for (let i = 0; i < imgurUrls.length; i++) {
    const url = imgurUrls[i];
    const response = await uploadToImgBB(url);

    if (response.success && response.data) {
      const result: ConversionResult = {
        originalUrl: url,
        newUrl: response.data.url,
        success: true,
      };
      results.push(result);
      newText = newText.split(url).join(response.data.url);
    } else {
      const result: ConversionResult = {
        originalUrl: url,
        newUrl: url,
        success: false,
        error: response.error,
      };
      results.push(result);
    }

    onProgress?.(i + 1, imgurUrls.length, results[results.length - 1]);
  }

  return { text: newText, results };
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
