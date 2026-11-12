import { api, type ApiFailure, type ApiOptions, type ApiResult } from "@/lib/api/client";

// How the admin panel talks to its API (/api/admin/*). Same contract as
// the storefront's `api()` - JSON in, JSON out, never a thrown error - plus
// what every panel screen needs:
// - the path is given without the prefix: adminApi("/orders?page=2");
// - a lost session (401) sends the browser to the login page and back;
// - a generated password that was not replaced yet (403 "password-change")
//   sends it to the password page.
// A refused request still comes back as `{ ok: false, ... }`, so the caller
// can show it with `errorMessage(result)`.

export const ADMIN_API = "/api/admin";

export type { ApiFailure, ApiResult };

let leaving = false;

function leaveTo(path: string): void {
  if (leaving || typeof window === "undefined") return;
  leaving = true;
  window.location.assign(path);
}

function loginPath(): string {
  if (typeof window === "undefined") return "/admin/login";
  const here = `${window.location.pathname}${window.location.search}`;
  const next = here.startsWith("/admin") && !here.startsWith("/admin/login") ? `?next=${encodeURIComponent(here)}` : "";
  return `/admin/login${next}`;
}

function watch<T>(result: ApiResult<T>): ApiResult<T> {
  if (!result.ok) {
    if (result.status === 401 && result.error === "unauthorized") leaveTo(loginPath());
    else if (result.status === 403 && result.error === "password-change") leaveTo("/admin/password");
  }
  return result;
}

export async function adminApi<T = unknown>(path: string, options: ApiOptions = {}): Promise<ApiResult<T>> {
  return watch(await api<T>(`${ADMIN_API}${path}`, options));
}

export type UploadProgressOptions = {
  // 0..1 while the body goes out (the last call is 1, once the server has
  // answered). Given, the request goes by XMLHttpRequest: fetch reports no
  // upload progress.
  onProgress?: (fraction: number) => void;
  // Aborts the request; the answer is then { ok: false, error: "aborted" }.
  signal?: AbortSignal;
};

// The answer of a refused or broken request, in the shape of ApiResult.
function failed(status: number, error: string, data: Record<string, unknown> = {}): ApiFailure {
  return { ok: false, status, error, data };
}

// The XMLHttpRequest twin of the fetch below: same form, same answer
// shape, the same lost-session handling (watch), plus progress.
function uploadWithProgress<T>(path: string, form: FormData, { onProgress, signal }: UploadProgressOptions): Promise<ApiResult<T>> {
  return new Promise((resolve) => {
    if (signal?.aborted) {
      resolve(failed(0, "aborted"));
      return;
    }
    const request = new XMLHttpRequest();
    request.open("POST", `${ADMIN_API}${path}`);
    request.withCredentials = true;
    request.responseType = "json";
    request.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) onProgress?.(Math.min(1, event.loaded / event.total));
    };
    const onAbort = () => request.abort();
    signal?.addEventListener("abort", onAbort, { once: true });
    const finish = (result: ApiResult<T>) => {
      signal?.removeEventListener("abort", onAbort);
      resolve(result.ok ? result : watch(result));
    };
    request.onerror = () => finish(failed(0, "network"));
    request.onabort = () => finish(failed(0, signal?.aborted ? "aborted" : "network"));
    request.onload = () => {
      const body: unknown = request.response;
      const record = body !== null && typeof body === "object" ? (body as Record<string, unknown>) : {};
      if (request.status >= 200 && request.status < 300) {
        onProgress?.(1);
        finish({ ok: true, status: request.status, data: body as T });
        return;
      }
      const error = typeof record.error === "string" ? record.error : request.status >= 500 ? "server" : "http";
      finish(failed(request.status, error, record));
    };
    request.send(form);
  });
}

// Sends files (multipart/form-data): `form` holds the files and any plain
// fields the route expects. Same answer shape as `adminApi`. With
// `onProgress` (or `signal`) it reports how far the upload is.
export async function adminUpload<T = unknown>(path: string, form: FormData, options: UploadProgressOptions = {}): Promise<ApiResult<T>> {
  if (options.onProgress || options.signal) return uploadWithProgress<T>(path, form, options);
  let response: Response;
  try {
    response = await fetch(`${ADMIN_API}${path}`, {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
      body: form,
    });
  } catch {
    return { ok: false, status: 0, error: "network", data: {} };
  }
  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }
  if (response.ok) return { ok: true, status: response.status, data: data as T };
  const record = data !== null && typeof data === "object" ? (data as Record<string, unknown>) : {};
  return watch({
    ok: false,
    status: response.status,
    error: typeof record.error === "string" ? record.error : "http",
    data: record,
  });
}

// The address of an export / download route, for a plain <a href>.
export function adminUrl(path: string): string {
  return `${ADMIN_API}${path}`;
}

const MESSAGES: Record<string, string> = {
  network: "Немає зв'язку із сервером. Перевірте інтернет і спробуйте ще раз.",
  aborted: "Надсилання скасовано.",
  server: "Сталася помилка на сервері. Спробуйте ще раз.",
  http: "Сервер відповів помилкою. Спробуйте ще раз.",
  unauthorized: "Сесію завершено. Увійдіть ще раз.",
  forbidden: "Вашій ролі це не дозволено.",
  "not-found": "Запис не знайдено: можливо, його вже видалили.",
  "bad-request": "Перевірте введені дані.",
  fields: "Перевірте виділені поля.",
  json: "Не вдалося прочитати запит.",
  "too-large": "Файл або дані завеликі.",
  "content-type": "Непідтримуваний формат запиту.",
  exists: "Такий запис уже існує.",
  conflict: "Запис тим часом змінили. Оновіть сторінку.",
  state: "Цю дію зараз виконати не можна: стан запису змінився.",
  origin: "Запит відхилено з міркувань безпеки.",
  "secrets-key": "На сервері не налаштовано ключ шифрування секретів (SECRETS_KEY).",
  // Codes several sections share. A section with a more exact sentence
  // (what uses the record, how many orders) passes it in `own`.
  "in-use": "Запис використовується в інших місцях, тому видалити його не можна.",
  "has-orders": "Із записом пов'язані замовлення, тому видалити його не можна.",
  seed: "Це демонстраційний запис сайту: його не можна видалити.",
  system: "Це системний запис: його не можна змінити або видалити.",
  locked: "Цей запис захищено від змін.",
  limit: "Досягнуто дозволеної кількості.",
  empty: "Файл порожній.",
  type: "Такий тип файлу не підтримується.",
  self: "Цю дію не можна виконати зі своїм власним акаунтом.",
  "last-owner": "У панелі має лишитися хоча б один власник.",
  "owner-only": "Це може зробити лише власник.",
  current: "Це ваш поточний сеанс: щоб завершити його, вийдіть із панелі.",
  disabled: "Цю можливість вимкнено в налаштуваннях.",
  invalid: "Неправильний логін або пароль.",
  "np-not-configured": "Нову пошту ще не налаштовано: додайте ключ і відправника в розділі «Інтеграції».",
  "np-auth": "Нова пошта не прийняла ключ API. Перевірте його в розділі «Інтеграції».",
  "np-error": "Нова пошта відхилила запит.",
  "np-unavailable": "Нова пошта зараз не відповідає. Спробуйте за кілька хвилин.",
};

// A sentence for a refused request, good enough to show as it is. Routes
// with their own error codes pass the wording in `own`.
export function errorMessage(failure: ApiFailure, own: Record<string, string> = {}): string {
  if (own[failure.error]) return own[failure.error];
  if (failure.error === "rate") {
    const seconds = Number(failure.data.retryAfter);
    const minutes = Number.isFinite(seconds) ? Math.max(1, Math.ceil(seconds / 60)) : 1;
    return `Забагато спроб. Спробуйте через ${minutes} хв.`;
  }
  return MESSAGES[failure.error] ?? MESSAGES.http;
}
