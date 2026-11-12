// The browser and the system of a session in plain words, from the user
// agent stored when the person signed in ("Chrome, Windows"): enough for a
// manager to tell two devices apart, not a full parser. The staff and the
// customer sections each had a copy of this; both can import it from here.
//
//   const device = describeDevice(session.userAgent);   // { label: "Safari, iPhone", mobile: true }
//
// No browser APIs: safe on the server and in checks.

export type Device = { label: string; mobile: boolean };

const BROWSERS: [RegExp, string][] = [
  // Order matters: Edge, Opera and the others also say "Chrome" and "Safari".
  [/Edg(e|A|iOS)?\//, "Edge"],
  [/OPR\/|Opera/, "Opera"],
  [/YaBrowser\//, "Яндекс Браузер"],
  [/SamsungBrowser\//, "Samsung Internet"],
  [/Firefox\/|FxiOS\//, "Firefox"],
  [/CriOS\/|HeadlessChrome\/|Chrome\//, "Chrome"],
  [/Version\/[\d.]+.*Safari\//, "Safari"],
];

const SYSTEMS: [RegExp, string][] = [
  [/iPhone/, "iPhone"],
  [/iPad/, "iPad"],
  [/Android/, "Android"],
  [/Windows NT|Windows/, "Windows"],
  [/CrOS/, "ChromeOS"],
  [/Mac OS X|Macintosh/, "macOS"],
  [/Linux/, "Linux"],
];

// Scripts and programs (an API check, a monitoring tool) sign in too.
const PROGRAMS = /^(node|undici|curl|wget|python|axios|got|okhttp|Go-http-client|PostmanRuntime)/i;

export function describeDevice(userAgent: string | null): Device {
  const ua = (userAgent ?? "").trim();
  if (!ua) return { label: "Невідомий пристрій", mobile: false };
  if (PROGRAMS.test(ua)) return { label: "Програма або скрипт", mobile: false };
  const browser = BROWSERS.find(([pattern]) => pattern.test(ua))?.[1] ?? null;
  const system = SYSTEMS.find(([pattern]) => pattern.test(ua))?.[1] ?? null;
  const mobile = /Mobi|iPhone|Android|iPad/.test(ua);
  if (!browser && !system) return { label: "Невідомий пристрій", mobile };
  return { label: [browser ?? "Браузер", system].filter(Boolean).join(", "), mobile };
}
