export class ApiError extends Error {
  constructor(message, code, status, fields = null) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.fields = fields;
  }
}

export function normalizeError(err) {
  if (err instanceof ApiError) {
    return err;
  }

  const message = extractErrorMessage(err);
  const code = extractErrorCode(err);
  const status = err?.status ?? null;
  const fields = err?.data?.fields ?? null;

  return new ApiError(message, code, status, fields);
}

function extractErrorMessage(err) {
  if (typeof err === 'string') {
    return err;
  }
  if (err?.data?.error) {
    return err.data.error;
  }
  if (err?.message) {
    return err.message;
  }
  if (err?.data?.message) {
    return err.data.message;
  }
  if (err?.status) {
    return `http_${err.status}`;
  }
  return '请求失败，请稍后重试';
}

function extractErrorCode(err) {
  if (err?.data?.code) {
    return err.data.code;
  }
  if (err?.code) {
    return err.code;
  }
  return null;
}
