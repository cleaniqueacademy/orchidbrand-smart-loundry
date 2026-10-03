/**
 * Utility untuk memproses URL gambar Google Drive & URL gambar umum.
 * Google Drive file link (view/sharing) biasanya tidak bisa langsung dijadikan src <img> tanpa konversi ke URL thumbnail/direct-view CDN.
 */

export function parseGoogleDriveFileId(url: string): string | null {
  if (!url || typeof url !== "string") return null;

  // Format 1: https://drive.google.com/file/d/FILE_ID/view...
  const matchFileD = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (matchFileD && matchFileD[1]) return matchFileD[1];

  // Format 2: https://drive.google.com/open?id=FILE_ID or ?id=FILE_ID
  const matchIdParam = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (matchIdParam && matchIdParam[1]) return matchIdParam[1];

  // Format 3: https://drive.google.com/uc?id=FILE_ID
  const matchUc = url.match(/\/uc\?.*id=([a-zA-Z0-9_-]+)/);
  if (matchUc && matchUc[1]) return matchUc[1];

  // Format 4: lh3.googleusercontent.com/d/FILE_ID
  const matchLh3 = url.match(/googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/);
  if (matchLh3 && matchLh3[1]) return matchLh3[1];

  return null;
}

export function isGoogleDriveUrl(url: string): boolean {
  if (!url) return false;
  return url.includes("drive.google.com") || url.includes("googleusercontent.com");
}

/**
 * Menghasilkan URL direct image yang dapat langsung ditampilkan di tag <img src="..." />
 * Menggunakan CDN https://lh3.googleusercontent.com/d/{FILE_ID} yang cepat, handal, dan mendukung CORS.
 */
export function getDirectImageUrl(url: string): string {
  if (!url) return "";
  const trimmed = url.trim();

  const driveId = parseGoogleDriveFileId(trimmed);
  if (driveId) {
    // CDN Google User Content bekerja paling stabil untuk embedding file publik Google Drive
    return `https://lh3.googleusercontent.com/d/${driveId}`;
  }

  return trimmed;
}

/**
 * Menghasilkan URL fallback jika thumbnail CDN gagal dimuat
 */
export function getFallbackDriveThumbnailUrl(url: string): string {
  const driveId = parseGoogleDriveFileId(url);
  if (driveId) {
    return `https://drive.google.com/thumbnail?id=${driveId}&sz=w1000`;
  }
  return url;
}
