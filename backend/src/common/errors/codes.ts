// ErrorCode รวมศูนย์ — รูปแบบ MODULE-NNN
export const ErrorCode = {
  AUTH_INVALID_CREDENTIALS: "AUTH-001",
  AUTH_TOKEN_EXPIRED: "AUTH-002",
  AUTH_FORBIDDEN: "AUTH-003",

  COMMON_NOT_FOUND: "COMMON-001",
  COMMON_DUPLICATE: "COMMON-002",
  COMMON_VALIDATION: "COMMON-003",
  COMMON_CONFLICT: "COMMON-004",
  COMMON_RATE_LIMIT: "COMMON-005",
} as const;

export type ErrorCodeValue = (typeof ErrorCode)[keyof typeof ErrorCode];
