import { supabase } from './supabase';

/**
 * Сжимает и кадрирует изображение в квадратный формат для аватарки (256x256).
 * Это предотвращает переполнение LocalStorage (QuotaExceededError) и
 * обеспечивает мгновенную загрузку и синхронизацию по сети (~15-30 КБ).
 */
export async function compressAvatarFile(
  file: File,
  maxDimension = 256,
  quality = 0.85
): Promise<{ blob: Blob; dataUrl: string }> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Выбранный файл не является изображением'));
      return;
    }

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      // Квадратное кадрирование по центру (center crop)
      const size = Math.min(img.width, img.height);
      const startX = (img.width - size) / 2;
      const startY = (img.height - size) / 2;

      const targetSize = Math.min(size, maxDimension);

      const canvas = document.createElement('canvas');
      canvas.width = targetSize;
      canvas.height = targetSize;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Не удалось получить 2D контекст канваса'));
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      ctx.drawImage(img, startX, startY, size, size, 0, 0, targetSize, targetSize);

      const dataUrl = canvas.toDataURL('image/jpeg', quality);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve({ blob, dataUrl });
          } else {
            resolve({ blob: new Blob([dataUrl], { type: 'image/jpeg' }), dataUrl });
          }
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Не удалось прочитать изображение'));
    };

    img.src = objectUrl;
  });
}

/**
 * Обрабатывает и загружает аватарку:
 * 1. Сжимает в квадратный JPEG 256x256 (~20 КБ).
 * 2. Пробует сохранить в Supabase Storage (bucket 'chat-photos').
 * 3. Если Storage недоступен, возвращает компактный base64 dataUrl (гарантированно рабочий fallback).
 */
export async function processAndUploadAvatar(file: File, userId: string): Promise<string> {
  const { blob, dataUrl } = await compressAvatarFile(file, 256, 0.85);

  try {
    const timestamp = Date.now();
    const path = `avatars/${userId}-${timestamp}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from('chat-photos')
      .upload(path, blob, { contentType: 'image/jpeg', upsert: true });

    if (!uploadError) {
      const { data } = supabase.storage.from('chat-photos').getPublicUrl(path);
      if (data?.publicUrl) {
        return data.publicUrl;
      }
    }
  } catch (storageErr) {
    console.warn('Supabase storage upload fallback to dataUrl:', storageErr);
  }

  // Fallback: сжатый dataUrl (20-30 КБ отлично сохраняется в Supabase user_profiles и LocalStorage)
  return dataUrl;
}
