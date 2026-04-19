// Client-side image resize + upload to Supabase Storage
// Path convention: reports/{project_id}/{timestamp}-{slot}.jpg
//
// Target: ~200-400 KB per image, hard cap 800 KB
// Based on 56 projects × 5 acts × 3 reports × 2 imgs ≈ 1,680 imgs → fits free 1 GB

import { getSupabase } from "./supabase";

const MAX_DIM = 1280; // longest side (px)
const QUALITY = 0.8; // JPEG quality 0-1
const MAX_FINAL_BYTES = 800 * 1024; // 800 KB hard cap after compression
const MAX_INPUT_BYTES = 10 * 1024 * 1024; // 10 MB input max

export interface UploadResult {
  url: string;
  size: number; // bytes (after compression)
  originalSize: number;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("ไม่สามารถโหลดรูปได้"));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error("อ่านไฟล์ไม่ได้"));
    reader.readAsDataURL(file);
  });
}

async function compressImage(
  file: File,
  maxDim = MAX_DIM,
  quality = QUALITY
): Promise<Blob> {
  const img = await loadImage(file);
  let { width, height } = img;
  const longSide = Math.max(width, height);
  if (longSide > maxDim) {
    const scale = maxDim / longSide;
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas ไม่พร้อมใช้งาน");
  // White background (for PNG with transparency → JPEG)
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("แปลงรูปไม่สำเร็จ")),
      "image/jpeg",
      quality
    );
  });
}

export async function uploadReportImage(
  file: File,
  projectId: string,
  slotIndex: number
): Promise<UploadResult> {
  if (!file.type.startsWith("image/")) {
    throw new Error("กรุณาเลือกไฟล์รูปภาพเท่านั้น");
  }
  if (file.size > MAX_INPUT_BYTES) {
    throw new Error(
      `ไฟล์ใหญ่เกินไป (ต้องไม่เกิน ${MAX_INPUT_BYTES / 1024 / 1024} MB)`
    );
  }

  // Compress; if still too big, retry at lower quality/smaller size
  let blob = await compressImage(file, MAX_DIM, QUALITY);
  if (blob.size > MAX_FINAL_BYTES) {
    blob = await compressImage(file, 1024, 0.7);
  }
  if (blob.size > MAX_FINAL_BYTES) {
    blob = await compressImage(file, 800, 0.6);
  }
  if (blob.size > MAX_FINAL_BYTES) {
    throw new Error("รูปขนาดใหญ่เกินไป (บีบอัดแล้วยังเกิน 800 KB)");
  }

  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase ยังไม่ตั้งค่า");

  const ts = Date.now();
  const safeProjectId = projectId.replace(/[^a-zA-Z0-9_-]/g, "_");
  const path = `reports/${safeProjectId}/${ts}-${slotIndex}.jpg`;

  const { error } = await supabase.storage.from("images").upload(path, blob, {
    contentType: "image/jpeg",
    cacheControl: "31536000",
    upsert: false,
  });

  if (error) {
    throw new Error(`อัปโหลดล้มเหลว: ${error.message}`);
  }

  const { data: urlData } = supabase.storage.from("images").getPublicUrl(path);

  return {
    url: urlData.publicUrl,
    size: blob.size,
    originalSize: file.size,
  };
}
