import type { ImageHost } from "@/lib/storage";

const IMGBB_API_KEY = "2a766285de5b6f45d1dff4bf3d6b098f";
const IMGBB_UPLOAD_URL = "https://api.imgbb.com/1/upload";

// Basic-auth upload key. The account's public key (public_Zye+Nh4qfcUidz4Cbd0H96ISlfk=)
// is only used by the JS SDK auth-endpoint flow, not direct API uploads like these.
const IMAGEKIT_PRIVATE_KEY = "private_QA0OpZdArMbptvsK2909Xd+5ivI=";
const IMAGEKIT_UPLOAD_URL = "https://upload.imagekit.io/api/v1/files/upload";

export const IMAGE_HOST_LABELS: Record<ImageHost, string> = {
  imgbb: "ImgBB",
  imagekit: "ImageKit",
};

/** Normalized upload result, identical shape for both hosts */
export interface HostUploadData {
  id: string;
  title: string;
  url: string;
  thumbUrl: string;
  size: number;
  deleteUrl?: string;
}

export interface HostUploadResult {
  success: boolean;
  data?: HostUploadData;
  error?: string;
  /** Host that produced this result (may differ from the preferred host on fallback) */
  host: ImageHost;
}

export interface ConversionResult {
  originalUrl: string;
  newUrl: string;
  success: boolean;
  error?: string;
}

/** Domains already on one of our hosts — skip these when converting */
const HOSTED_DOMAINS = ["i.ibb.co", "ibb.co", "ik.imagekit.io"];

function isHostedUrl(url: string): boolean {
  try {
    return HOSTED_DOMAINS.includes(new URL(url).hostname);
  } catch {
    return false;
  }
}

/** Find all image URLs inside [img]...[/img] or [fimg]...[/fimg] tags, skipping already-hosted URLs */
export function findAllImgTagUrls(text: string): string[] {
  const urls: string[] = [];
  const imgPattern = /\[img\]\s*(https?:\/\/[^\]\s]+)\s*\[\/img\]/gi;
  let match;
  while ((match = imgPattern.exec(text)) !== null) {
    const url = match[1].trim();
    if (!isHostedUrl(url) && !urls.includes(url)) {
      urls.push(url);
    }
  }
  const fimgPattern = /\[fimg=[^\]]*\]\s*(https?:\/\/[^\]\s]+)\s*\[\/fimg\]/gi;
  while ((match = fimgPattern.exec(text)) !== null) {
    const url = match[1].trim();
    if (!isHostedUrl(url) && !urls.includes(url)) {
      urls.push(url);
    }
  }
  return urls;
}

// ─── ImgBB ──────────────────────────────────────────────────────────────────

async function uploadToImgBB(imageUrl: string): Promise<HostUploadResult> {
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
        host: "imgbb",
        data: {
          id: data.data.id,
          title: data.data.title,
          url: data.data.url,
          thumbUrl: data.data.thumb?.url || data.data.url,
          size: data.data.size,
          deleteUrl: data.data.delete_url,
        },
      };
    }
    return {
      success: false,
      host: "imgbb",
      error: data.error?.message || "Unknown error from ImgBB",
    };
  } catch (error) {
    return {
      success: false,
      host: "imgbb",
      error:
        error instanceof Error
          ? error.message
          : "Network error uploading to ImgBB",
    };
  }
}

async function uploadFileToImgBB(
  file: File | Blob,
  filename?: string
): Promise<HostUploadResult> {
  try {
    const name = filename || (file instanceof File ? file.name : "image.png");
    const formData = new FormData();
    formData.append("key", IMGBB_API_KEY);
    formData.append("image", file, name);

    const response = await fetch(IMGBB_UPLOAD_URL, {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (data.success) {
      return {
        success: true,
        host: "imgbb",
        data: {
          id: data.data.id,
          title: data.data.title || name,
          url: data.data.url,
          thumbUrl: data.data.thumb?.url || data.data.url,
          size: data.data.size,
          deleteUrl: data.data.delete_url,
        },
      };
    }
    return {
      success: false,
      host: "imgbb",
      error: data.error?.message || "Unknown error from ImgBB",
    };
  } catch (error) {
    return {
      success: false,
      host: "imgbb",
      error:
        error instanceof Error
          ? error.message
          : "Network error uploading to ImgBB",
    };
  }
}

// ─── ImageKit ───────────────────────────────────────────────────────────────

function imagekitAuthHeader(): string | null {
  if (!IMAGEKIT_PRIVATE_KEY || IMAGEKIT_PRIVATE_KEY.startsWith("YOUR_")) {
    return null;
  }
  // Basic auth: base64(privateKey + ":")
  return `Basic ${btoa(IMAGEKIT_PRIVATE_KEY + ":")}`;
}

// Unique filenames so ImageKit doesn't treat re-uploads as duplicates
function uniqueName(name: string): string {
  const dot = name.lastIndexOf(".");
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : ".png";
  return `${base}-${Date.now().toString(36)}${ext}`;
}

function normalizeImageKit(
  data: Record<string, unknown>,
  fallbackName: string
): HostUploadResult {
  const url = typeof data.url === "string" ? data.url : "";
  if (url) {
    return {
      success: true,
      host: "imagekit",
      data: {
        id: String(data.fileId ?? ""),
        title: (data.name as string) || fallbackName,
        url,
        // ImageKit URL transformations double as thumbnails
        thumbUrl: `${url}${url.includes("?") ? "&" : "?"}tr=w-320,h-200`,
        size: typeof data.size === "number" ? data.size : 0,
      },
    };
  }
  return {
    success: false,
    host: "imagekit",
    error:
      (data.message as string) ||
      (data.help as string) ||
      "Unknown error from ImageKit",
  };
}

async function uploadToImageKit(imageUrl: string): Promise<HostUploadResult> {
  try {
    const auth = imagekitAuthHeader();
    if (!auth) {
      return {
        success: false,
        host: "imagekit",
        error: "ImageKit private key not configured in lib/imagehost.ts",
      };
    }

    const path = new URL(imageUrl).pathname.split("/").filter(Boolean).pop();
    const name = uniqueName(decodeURIComponent(path || "image.png"));

    const formData = new FormData();
    formData.append("file", imageUrl);
    formData.append("fileName", name);

    const response = await fetch(IMAGEKIT_UPLOAD_URL, {
      method: "POST",
      headers: { Authorization: auth },
      body: formData,
    });

    const data = await response.json();
    return normalizeImageKit(data, name);
  } catch (error) {
    return {
      success: false,
      host: "imagekit",
      error:
        error instanceof Error
          ? error.message
          : "Network error uploading to ImageKit",
    };
  }
}

async function uploadFileToImageKit(
  file: File | Blob,
  filename?: string
): Promise<HostUploadResult> {
  try {
    const auth = imagekitAuthHeader();
    if (!auth) {
      return {
        success: false,
        host: "imagekit",
        error: "ImageKit private key not configured in lib/imagehost.ts",
      };
    }

    const name = uniqueName(
      filename || (file instanceof File ? file.name : "image.png")
    );

    const formData = new FormData();
    formData.append("file", file, name);
    formData.append("fileName", name);

    const response = await fetch(IMAGEKIT_UPLOAD_URL, {
      method: "POST",
      headers: { Authorization: auth },
      body: formData,
    });

    const data = await response.json();
    return normalizeImageKit(data, name);
  } catch (error) {
    return {
      success: false,
      host: "imagekit",
      error:
        error instanceof Error
          ? error.message
          : "Network error uploading to ImageKit",
    };
  }
}

// ─── Unified upload with automatic fallback ────────────────────────────────

/**
 * Upload to the preferred host; if it fails, automatically retry with the other.
 * Returns the combined error if both hosts fail.
 */
export async function uploadImage(opts: {
  url?: string;
  file?: File | Blob;
  filename?: string;
  preferred: ImageHost;
}): Promise<HostUploadResult> {
  const order: ImageHost[] =
    opts.preferred === "imagekit" ? ["imagekit", "imgbb"] : ["imgbb", "imagekit"];

  const errors: string[] = [];
  for (const host of order) {
    const result = opts.file
      ? host === "imgbb"
        ? await uploadFileToImgBB(opts.file, opts.filename)
        : await uploadFileToImageKit(opts.file, opts.filename)
      : host === "imgbb"
        ? await uploadToImgBB(opts.url!)
        : await uploadToImageKit(opts.url!);

    if (result.success) return result;
    errors.push(`${IMAGE_HOST_LABELS[host]}: ${result.error}`);
  }

  return {
    success: false,
    host: order[order.length - 1],
    error: errors.join(" | "),
  };
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
