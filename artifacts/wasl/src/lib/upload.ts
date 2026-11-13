import { useState } from "react";
import { useRequestUploadUrl, UploadInputContentType } from "@workspace/api-client-react";
import { errMsg } from "./format";

const allowed = Object.values(UploadInputContentType) as string[];

export function useImageUpload() {
  const req = useRequestUploadUrl();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File): Promise<string | null> {
    setError(null);
    if (!allowed.includes(file.type)) {
      setError("الصيغ المسموحة: JPG أو PNG أو WEBP");
      return null;
    }
    if (file.size > 10485760) {
      setError("حجم الصورة يتجاوز 10 ميجابايت");
      return null;
    }
    setUploading(true);
    try {
      const res = await req.mutateAsync({
        data: { name: file.name.slice(0, 200), size: file.size, contentType: file.type as UploadInputContentType },
      });
      const put = await fetch(res.uploadURL, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      if (!put.ok) throw new Error(`تعذّر رفع الملف (${put.status} ${put.statusText})`);
      return `/api/storage${res.objectPath}`;
    } catch (e) {
      setError(errMsg(e));
      return null;
    } finally {
      setUploading(false);
    }
  }

  return { upload, uploading, error, clearError: () => setError(null) };
}
