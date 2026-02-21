type StringEnum<TValues extends string> = {
  readonly [K in TValues]: K;
};

function createStringEnum<const T extends readonly string[]>(values: T): StringEnum<T[number]> {
  return values.reduce((acc, value) => {
    (acc as Record<string, string>)[value] = value;
    return acc;
  }, {} as Record<T[number], T[number]>) as StringEnum<T[number]>;
}

function prefixed<const TPrefix extends string, const TSuffixes extends readonly string[]>(
  prefix: TPrefix,
  suffixes: TSuffixes,
): StringEnum<`${TPrefix}_${TSuffixes[number]}`> {
  const values = suffixes.map((suffix) => `${prefix}_${suffix}`) as unknown as readonly `${TPrefix}_${TSuffixes[number]}`[];
  return createStringEnum(values);
}

export const ErrorCode = {
  // General
  ...createStringEnum(['FORBIDDEN', 'INTERNAL_SERVER_ERROR', 'BAD_REQUEST'] as const),

  // Auth
  ...prefixed('AUTH', ['UNAUTHORIZED', 'SESSION_EXPIRED', 'INVALID_CREDENTIALS', 'OAUTH_ACCOUNT_ONLY', 'EMAIL_IN_USE'] as const),

  // Session
  ...prefixed('SESSION', ['NOT_FOUND', 'INVALID_OR_EXPIRED'] as const),

  // Workspace
  ...prefixed('WORKSPACE', ['SLUG_EXISTS', 'NOT_FOUND'] as const),

  // Project
  ...prefixed('PROJECT', ['KEY_EXISTS', 'NOT_FOUND'] as const),

  // Non-prefixed legacy-ish codes (kept for backwards compatibility)
  ...createStringEnum(['USER_ALREADY_MEMBER', 'INVALID_INVITE', 'EXPIRED_INVITE'] as const),

  // Validation
  VAL_ERROR: 'VALIDATION_ERROR',
  ...prefixed('VAL_ID', ['INVALID'] as const),
  ...prefixed('VAL_KEY', ['PATTERN_INVALID', 'LENGTH_INVALID'] as const),
  ...prefixed('VAL_NAME', ['EMPTY', 'NOT_STRING', 'TOO_SHORT'] as const),
  ...prefixed('VAL_SLUG', ['EMPTY', 'NOT_STRING', 'PATTERN_INVALID'] as const),
  ...prefixed('VAL_EMAIL', ['EMPTY', 'INVALID'] as const),
  ...prefixed('VAL_PASSWORD', ['EMPTY', 'WEAK'] as const),
  ...prefixed('VAL_ROLE', ['INVALID'] as const),
  ...prefixed('VAL_TOKEN', ['EMPTY'] as const),
  ...prefixed('VAL_IMAGE', ['NOT_STRING'] as const),
  ...prefixed('VAL_TITLE', ['EMPTY', 'NOT_STRING'] as const),
  ...prefixed('VAL_PRIORITY', ['EMPTY', 'INVALID'] as const),
  ...prefixed('VAL_ORDER', ['EMPTY', 'NOT_NUMBER'] as const),
  ...prefixed('VAL_COLUMN_ID', ['EMPTY', 'NOT_STRING'] as const),
  ...prefixed('VAL_PROJECT_ID', ['EMPTY', 'NOT_STRING'] as const),
  ...prefixed('VAL_DESCRIPTION', ['NOT_STRING'] as const),
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];
