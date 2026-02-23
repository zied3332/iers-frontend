const BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

export async function uploadCv(file: File, userId?: string) {
  const fd = new FormData();
  fd.append("file", file);
  if (userId) fd.append("userId", userId);

  const res = await fetch(`${BASE}/cv/upload`, {
    method: "POST",
    body: fd,
  });

  const text = await res.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  if (!res.ok) {
    const msg =
      typeof data === "string"
        ? data
        : Array.isArray(data?.message)
        ? data.message.join(", ")
        : data?.message || "Upload failed";
    throw new Error(msg);
  }

  return data;
}