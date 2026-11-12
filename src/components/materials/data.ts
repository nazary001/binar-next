// «Матеріали» content — Figma section «Матеріали B2C» (4635:33058):
// the landing (4634:63597) lists the material categories as folder
// cards, a category page (4634:64897) lists its files. The library itself
// lives in MongoDB (collections material_categories / material_files,
// read by src/server/repos/materials.ts and passed down as props); this
// module keeps the shapes the masters show (name with extension, size, a
// short description for the preview panel, a lock for files that need an
// account), the filter vocabularies and the pure helpers over the arrays
// the pages hand in. It must never import the dataset: it ships in the
// client bundle.

export type FileType = "pdf" | "doc" | "ppt" | "url" | "png";

// Filter vocabularies of the drawer (4635:33009): the three site
// directions and the five document types.
export const DIRECTIONS = [
  "Усе для готелів",
  "Засоби індивідуального захисту",
  "Засоби та інвентар для прибирання",
] as const;
export type Direction = (typeof DIRECTIONS)[number];

export const FILE_TYPE_LABELS: { value: FileType; label: string }[] = [
  { value: "pdf", label: "PDF" },
  { value: "doc", label: "DOC" },
  { value: "ppt", label: "Презентація" },
  { value: "url", label: "Посилання" },
  { value: "png", label: "Фото" },
];

export type MaterialCategory = {
  slug: string;
  title: string;
  // B2B only: the folder's note under the H2 of the partner folder page
  // (Figma «Превʼю + коментар» 4825:60565 draws a 14/24 #777779 line 8 px
  // under «Каталоги»; the plain folder frame 4377:61576 has none). The
  // public page ignores it.
  tagline?: string;
};

export type MaterialFile = {
  id: string;
  category: string;
  name: string;
  type: FileType;
  // Shown as «Розмір: 14 MB» verbatim from the feed.
  size: string;
  description: string;
  directions: Direction[];
  // «Завантажити після авторизації.» — the download needs an account.
  locked?: boolean;
  // B2B only: the partner's agreement does not cover this file, so the
  // signed-in partner gets the padlock of the B2B file card
  // (4378:63098, download=false -> «Lock» 4399:6262) instead of the
  // download. Placeholder until the CRM sends per-partner access.
  partnerLocked?: boolean;
  // Download target: the site's download route
  // (materialDownloadPath(id)), which checks the session and redirects
  // to the stored file; `url` files carry their external link instead.
  href: string;
  // The image the preview panel shows for a `png` file that every viewer
  // may download (the picture itself). Absent otherwise.
  preview?: string;
};

// The download route of a stored (non-`url`) file.
export function materialDownloadPath(id: string): string {
  return `/api/materials/files/${encodeURIComponent(id)}/download`;
}

// Who is looking: a guest, a retail (B2C) or a partner (B2B) account.
export type MaterialViewer = "b2b" | "b2c" | null;

// The download rule, one rule for the UI and the download route: a guest
// gets the files that are not `locked`, a B2C account everything, a B2B
// partner everything outside `partnerLocked`.
export function canDownloadMaterial(
  file: Pick<MaterialFile, "locked" | "partnerLocked">,
  viewer: MaterialViewer,
): boolean {
  if (viewer === "b2b") return !file.partnerLocked;
  if (viewer === "b2c") return true;
  return !file.locked;
}

export function findCategory(categories: MaterialCategory[], slug: string): MaterialCategory | undefined {
  return categories.find((c) => c.slug === slug);
}

export function filesOf(files: MaterialFile[], category: string): MaterialFile[] {
  return files.filter((f) => f.category === category);
}

// Ukrainian plural for «файл»: 1 файл / 2-4 файли / 5+ файлів (with
// the 11-14 exception). The master's «3 файлів» is a placeholder slip.
export function filesCount(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  const word =
    mod10 === 1 && mod100 !== 11
      ? "файл"
      : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)
        ? "файли"
        : "файлів";
  return `${n} ${word}`;
}

// Accusative plural for «категорія» after «Знайдено» (the phone filters
// sheet status): 1 категорію / 2-4 категорії / 5+ категорій (11-14 ->
// категорій).
export function categoriesCount(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  const word =
    mod10 === 1 && mod100 !== 11
      ? "категорію"
      : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)
        ? "категорії"
        : "категорій";
  return `${n} ${word}`;
}

export type MaterialsFilters = {
  directions: Direction[];
  types: FileType[];
};

export function matchesFilters(f: MaterialFile, filters: MaterialsFilters): boolean {
  if (filters.directions.length && !filters.directions.some((d) => f.directions.includes(d))) {
    return false;
  }
  if (filters.types.length && !filters.types.includes(f.type)) return false;
  return true;
}

export function matchesQuery(text: string, query: string): boolean {
  const q = query.trim().toLowerCase();
  return !q || text.toLowerCase().includes(q);
}

// The landing's folder cards: every category with the number of files
// that pass the filters and the search (a query matching the category
// name keeps all its files, otherwise it matches file names); empty
// folders drop out. Shared by the public and the partner landing.
export function categoryCards(
  files: MaterialFile[],
  categories: MaterialCategory[],
  filters: MaterialsFilters,
  query: string,
): { category: MaterialCategory; count: number }[] {
  return categories
    .map((category) => {
      const inFolder = files.filter((f) => f.category === category.slug && matchesFilters(f, filters));
      const byName = matchesQuery(category.title, query);
      const matching = byName ? inFolder : inFolder.filter((f) => matchesQuery(f.name, query));
      return { category, count: matching.length };
    })
    .filter((c) => c.count > 0);
}

// The files of one folder that pass the filters and match the name.
export function folderFiles(
  files: MaterialFile[],
  slug: string,
  filters: MaterialsFilters,
  query: string,
): MaterialFile[] {
  return filesOf(files, slug).filter((f) => matchesFilters(f, filters) && matchesQuery(f.name, query));
}

// Checkbox toggle for the filter lists.
export function toggleValue<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}
