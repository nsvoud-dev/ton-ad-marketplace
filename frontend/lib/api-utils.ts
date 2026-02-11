/**
 * Извлекает читаемое сообщение об ошибке из JSON-ответа API.
 * Бэкенд возвращает: { error: string } или { error: { fieldErrors, formErrors } } (zod flatten).
 */
export function getErrorMessage(data: unknown, fallback = 'Произошла ошибка'): string {
  if (!data || typeof data !== 'object') return fallback;
  const err = (data as { error?: unknown }).error;
  if (typeof err === 'string') return err;
  if (err && typeof err === 'object') {
    const o = err as { message?: string; formErrors?: string[]; fieldErrors?: Record<string, string[]> };
    if (o.message) return o.message;
    if (Array.isArray(o.formErrors) && o.formErrors[0]) return o.formErrors[0];
    if (o.fieldErrors && typeof o.fieldErrors === 'object') {
      const first = Object.values(o.fieldErrors).flat()[0];
      if (first) return first;
    }
  }
  return fallback;
}
