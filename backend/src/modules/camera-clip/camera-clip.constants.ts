// Storage convention: <UPLOAD_DIR>/camera/<poleName>/<YYYY-MM-DD>/<file>.mp4
export const CAMERA_CLIP_ENTITY = "camera_clip" as const;
export const CAMERA_CLIP_DIR = "camera" as const;
export const CAMERA_CLIP_MIME = "video/mp4" as const;
export const CAMERA_CLIP_EXT = ".mp4" as const;
export const CAMERA_CLIP_MAX_BYTES = 500 * 1024 * 1024; // 500 MB
