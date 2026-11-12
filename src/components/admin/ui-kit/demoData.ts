import type { Channel, OrderStatus, PaymentStatus } from "../ui/status";

// Sample data of the kit's gallery: realistic, fixed (built once from a
// seeded generator at module load, never during render) and Ukrainian.

function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const random = seeded(20261112);
const pick = <T,>(list: readonly T[]): T => list[Math.floor(random() * list.length)];

export const COMPANIES = [
  "ТОВ «Готель Дністер»",
  "ПП «Карпатські зорі»",
  "Готель «Едельвейс»",
  "ТОВ «Хостел Поділ»",
  "СПА-комплекс «Верховина»",
  "ФОП Коваленко Олена Василівна",
  "ТОВ «Одеса Палас»",
  "Апарт-готель «Львівська брама»",
  "ТОВ «Чиста зміна»",
  "Мережа хостелів «Липа»",
] as const;

export const CITIES = ["Київ", "Львів", "Одеса", "Дніпро", "Харків", "Івано-Франківськ", "Ужгород", "Чернівці", "Вінниця", "Полтава"] as const;

export const MANAGERS = ["Олена Коваль", "Андрій Мельник", "Ірина Бондар", "Тарас Шевчук"] as const;

const STATUSES: OrderStatus[] = ["new", "new", "inProgress", "inProgress", "shipped", "received", "completed", "completed", "blocked", "cancelled"];
const PAYMENTS: PaymentStatus[] = ["awaiting", "paid", "paid", "partial", "overdue"];

export type DemoOrder = {
  id: string;
  number: string;
  company: string;
  city: string;
  manager: string;
  createdAt: string;
  status: OrderStatus;
  payment: PaymentStatus;
  channel: Channel;
  items: number;
  total: number;
};

export const ORDERS: DemoOrder[] = Array.from({ length: 57 }, (_, index) => {
  const day = 1 + Math.floor(random() * 40);
  const date = new Date(Date.UTC(2026, 9, 1, 7 + Math.floor(random() * 10), Math.floor(random() * 60)));
  date.setUTCDate(date.getUTCDate() + day);
  const channel: Channel = random() < 0.7 ? "b2b" : "retail";
  return {
    id: `order-${index + 1}`,
    number: String(10042300 + index * 7 + Math.floor(random() * 5)),
    company: channel === "b2b" ? pick(COMPANIES) : pick(["Марія Ткаченко", "Оксана Литвин", "Дмитро Гнатюк", "Петро Савчук"]),
    city: pick(CITIES),
    manager: pick(MANAGERS),
    createdAt: date.toISOString(),
    status: pick(STATUSES),
    payment: pick(PAYMENTS),
    channel,
    items: 1 + Math.floor(random() * 24),
    total: Math.round((800 + random() * 64000) * 100) / 100,
  };
});

// Twelve weeks of revenue and orders (the dashboard's main chart).
export const WEEKS = Array.from({ length: 12 }, (_, index) => {
  const date = new Date(Date.UTC(2026, 7, 24 + index * 7));
  const b2b = Math.round(110000 + index * 7000 + random() * 40000);
  const retail = Math.round(38000 + index * 2500 + random() * 18000);
  return { x: date.toISOString().slice(0, 10), b2b, retail, revenue: b2b + retail };
});

export const WEEKDAYS = [
  { label: "Пн", value: 42 },
  { label: "Вт", value: 57 },
  { label: "Ср", value: 61 },
  { label: "Чт", value: 48 },
  { label: "Пт", value: 66 },
  { label: "Сб", value: 18 },
  { label: "Нд", value: 9 },
];

export const CATEGORIES = [
  { label: "Косметика для готелів", value: 412300 },
  { label: "Засоби індивідуального захисту", value: 268900 },
  { label: "Хімія для прибирання", value: 214500 },
  { label: "Одноразовий посуд і пакування", value: 132700 },
  { label: "Текстиль і рушники", value: 88400 },
];

// What the combobox demo "searches": Nova Poshta style cities.
export type DemoCity = { ref: string; name: string; region: string };

export const NP_CITIES: DemoCity[] = [
  { ref: "kyiv", name: "Київ", region: "Київська обл." },
  { ref: "lviv", name: "Львів", region: "Львівська обл." },
  { ref: "odesa", name: "Одеса", region: "Одеська обл." },
  { ref: "dnipro", name: "Дніпро", region: "Дніпропетровська обл." },
  { ref: "kharkiv", name: "Харків", region: "Харківська обл." },
  { ref: "if", name: "Івано-Франківськ", region: "Івано-Франківська обл." },
  { ref: "uzh", name: "Ужгород", region: "Закарпатська обл." },
  { ref: "chern", name: "Чернівці", region: "Чернівецька обл." },
  { ref: "vin", name: "Вінниця", region: "Вінницька обл." },
  { ref: "pol", name: "Полтава", region: "Полтавська обл." },
  { ref: "bukovel", name: "Буковель", region: "Івано-Франківська обл." },
  { ref: "truskavets", name: "Трускавець", region: "Львівська обл." },
  { ref: "yaremche", name: "Яремче", region: "Івано-Франківська обл." },
];

// A search that answers after a short pause, as the server would; "помилка"
// in the query makes it fail, so the list's retry state can be seen.
export function searchCities(query: string): Promise<DemoCity[]> {
  return new Promise((resolve, reject) => {
    window.setTimeout(() => {
      const needle = query.trim().toLocaleLowerCase("uk");
      if (needle.includes("помилка")) {
        reject(new Error("demo"));
        return;
      }
      resolve(NP_CITIES.filter((city) => city.name.toLocaleLowerCase("uk").includes(needle)));
    }, 450);
  });
}

// Small inline pictures for the media and avatar samples (no network).
function svgData(background: string, foreground: string, label: string): string {
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='600' height='600' viewBox='0 0 600 600'>` +
    `<rect width='600' height='600' fill='${background}'/>` +
    `<circle cx='300' cy='250' r='120' fill='${foreground}' opacity='0.9'/>` +
    `<rect x='170' y='400' width='260' height='40' rx='20' fill='${foreground}' opacity='0.6'/>` +
    `<text x='300' y='540' font-family='Arial' font-size='36' text-anchor='middle' fill='${foreground}'>${label}</text>` +
    `</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export const SAMPLE_IMAGES = [
  svgData("#e8f7ff", "#0a6f9e", "Shampoo 30 ml"),
  svgData("#fff1eb", "#d94e0b", "Soap 15 g"),
  svgData("#e8f8f4", "#178d72", "Gloves M"),
  svgData("#eef2ff", "#4569d4", "Towel 50x90"),
  svgData("#fff5dd", "#805300", "Cleaner 5 l"),
];
