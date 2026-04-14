// Input validation utilities for security

// Validation constants
export const MAX_ROOM_CODE_LENGTH = 20;
export const MAX_DISPLAY_NAME_LENGTH = 50;
export const MAX_MESSAGE_LENGTH = 5000;
export const MAX_AVATAR_URL_LENGTH = 500;
export const MAX_FILE_NAME_LENGTH = 255;
export const MAX_FILE_CONTENT_LENGTH = 1000000; // 1MB of text
export const ROOM_CODE_REGEX = /^[A-Z0-9]{1,20}$/;

// Validate room code format (alphanumeric uppercase, 1-20 chars)
export const isValidRoomCode = (code: string): boolean => {
  return ROOM_CODE_REGEX.test(code);
};

// Sanitize room code input (uppercase and restrict to alphanumeric)
export const sanitizeRoomCode = (input: string): string => {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, MAX_ROOM_CODE_LENGTH);
};

// Validate display name
export const isValidDisplayName = (name: string): boolean => {
  return name.length <= MAX_DISPLAY_NAME_LENGTH;
};

// Sanitize display name (trim and limit length)
export const sanitizeDisplayName = (input: string): string => {
  return input.trim().slice(0, MAX_DISPLAY_NAME_LENGTH);
};

// Validate avatar URL (must be http/https, within length limit)
export const isValidAvatarUrl = (url: string): boolean => {
  if (!url) return true; // Empty is valid (optional field)
  if (url.length > MAX_AVATAR_URL_LENGTH) return false;
  
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
};

// Sanitize avatar URL (validate and return safe URL or empty string)
export const sanitizeAvatarUrl = (url: string): string => {
  const trimmed = url.trim().slice(0, MAX_AVATAR_URL_LENGTH);
  if (!trimmed) return '';
  
  try {
    const parsed = new URL(trimmed);
    if (['http:', 'https:'].includes(parsed.protocol)) {
      return trimmed;
    }
  } catch {
    // Invalid URL
  }
  return '';
};

// Validate message content
export const isValidMessage = (content: string): boolean => {
  const trimmed = content.trim();
  return trimmed.length > 0 && trimmed.length <= MAX_MESSAGE_LENGTH;
};

// Sanitize message content
export const sanitizeMessage = (content: string): string => {
  return content.trim().slice(0, MAX_MESSAGE_LENGTH);
};

// Validate file name
export const isValidFileName = (name: string): boolean => {
  if (!name || name.length > MAX_FILE_NAME_LENGTH) return false;
  // Prevent path traversal and invalid characters
  const invalidChars = /[<>:"/\\|?*\x00-\x1f]/;
  return !invalidChars.test(name) && !name.includes('..');
};

// Sanitize file name (no slashes allowed)
export const sanitizeFileName = (name: string): string => {
  return name
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '')
    .replace(/\.\./g, '')
    .slice(0, MAX_FILE_NAME_LENGTH);
};

// Sanitize file path (allows forward slashes for folder structure)
export const sanitizeFilePath = (path: string): string => {
  return path
    .trim()
    .replace(/[<>:"\\|?*\x00-\x1f]/g, '') // Allow forward slash
    .replace(/\.\./g, '')
    .replace(/\/+/g, '/') // Normalize multiple slashes
    .replace(/^\/|\/$/g, '') // Remove leading/trailing slashes
    .slice(0, MAX_FILE_NAME_LENGTH * 4); // Allow longer paths
};

// Validate file content length
export const isValidFileContent = (content: string): boolean => {
  return content.length <= MAX_FILE_CONTENT_LENGTH;
};

// Truncate file content if too long
export const sanitizeFileContent = (content: string): string => {
  return content.slice(0, MAX_FILE_CONTENT_LENGTH);
};

// Escape SQL LIKE wildcards to prevent unintended pattern matching
export const escapeSqlLike = (str: string): string => {
  return str.replace(/[%_]/g, '\\$&');
};
