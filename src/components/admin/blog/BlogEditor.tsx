"use client";

import { DocumentDuplicateIcon, PencilSquareIcon, TrashIcon } from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";
import { useEffect, useEffectEvent, useState, type KeyboardEvent, type ReactNode } from "react";
import { EntityHistory } from "../common/EntityHistory";
import { adminApi, type ApiFailure } from "../lib/api";
import { cx, formatDateTime, slugify } from "../lib/format";
import { invalidate, setQueryData } from "../lib/query";
import { useStaff } from "../shell/StaffProvider";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { confirmDialog } from "../ui/ConfirmDialog";
import { KebabMenu, type MenuItem } from "../ui/DropdownMenu";
import { FormActions, useDirty, useUnsavedWarning } from "../ui/Form";
import { Input, NumberInput, Textarea } from "../ui/Input";
import { Badge } from "../ui/Badge";
import { CopyButton, KeyValueList } from "../ui/KeyValue";
import { ImageField } from "../ui/media/ImageField";
import { Page, PageHeader } from "../ui/Page";
import { Select, type SelectOption } from "../ui/Select";
import { BlogStatusBadge } from "../ui/status";
import { TabPanel, Tabs } from "../ui/Tabs";
import { TagInput } from "../ui/TagInput";
import { toast, toastError } from "../ui/Toast";
import { TEXT, TONES } from "../ui/tokens";
import { ArticlePreview } from "./ArticlePreview";
import { AutoTextarea } from "./AutoTextarea";
import { BlockEditor } from "./BlockEditor";
import { isoToKyivLocal, kyivLocalToIso } from "./kyiv";
import { POST_ERRORS } from "./messages";
import {
  emptyForm,
  fieldErrorsOf,
  formFromPost,
  localErrors,
  mergeKeys,
  missingForPublish,
  needsPhrase,
  payloadOf,
  readingMinutesOf,
  type EditorBlock,
  type EditorForm,
  type FieldErrors,
} from "./model";
import { PublishCard, type PublishBusy } from "./PublishCard";
import { OldAddressNotice, SlugModal, takenOldAddress } from "./SlugModal";
import { BLOG_LIMITS, type BlogOptions, type BlogPostAnswer, type BlogPostDetail } from "./types";

// The article editor (/admin/blog/new and /admin/blog/<id>): the article on
// the left (its title in the page's own heading style, the card text, the
// body as blocks, or the same as a reader sees it), the settings on the
// right (publishing, cover, category, tags, address, SEO), a sticky save
// bar under both. Rendered only once the post (and the options) are
// loaded, keyed by the post id, so the form starts from the loaded values.
//
// Every write answers the whole post: the editor keeps it as `record` and
// rebuilds the form from it (keeping the keys of the blocks on screen),
// so what is shown is always what the server stored.

export const SITE_ORIGIN = "https://binar-2000.com";

type Busy = PublishBusy | "save" | "slug" | "duplicate" | "delete";

type Props = { post: BlogPostDetail | null; options: BlogOptions };

const enc = encodeURIComponent;

function samePayload(a: EditorForm, b: EditorForm): boolean {
  return JSON.stringify(payloadOf(a)) === JSON.stringify(payloadOf(b));
}

// Where a field error lives on the page, so the first one can be shown.
function focusFirstError(errors: FieldErrors, blocks: EditorBlock[]) {
  const keys = Object.keys(errors);
  if (keys.includes("title")) {
    document.querySelector<HTMLElement>('[data-field="title"]')?.focus();
    return;
  }
  const block = keys.map((key) => /^blocks\.(\d+)/.exec(key)).find(Boolean);
  if (block) {
    const entry = blocks[Number(block[1])];
    const card = entry ? document.querySelector<HTMLElement>(`[data-block-key="${CSS.escape(entry.key)}"]`) : null;
    if (card) {
      card.scrollIntoView({ block: "center", behavior: "smooth" });
      card.focus({ preventScroll: true });
      return;
    }
  }
  const places: [string, string][] = [
    ["excerpt", "blog-excerpt"],
    ["blocks", "blog-body"],
    ["image", "blog-card-cover"],
    ["coverAlt", "blog-card-cover"],
    ["category", "blog-card-category"],
    ["categoryLabel", "blog-card-category"],
    ["author", "blog-card-category"],
    ["readingMinutes", "blog-card-category"],
    ["tags", "blog-card-tags"],
    ["slug", "blog-card-slug"],
    ["seoTitle", "blog-card-seo"],
    ["seoDescription", "blog-card-seo"],
  ];
  const place = places.find(([name]) => keys.some((key) => key === name || key.startsWith(`${name}.`)));
  if (place) document.getElementById(place[1])?.scrollIntoView({ block: "center", behavior: "smooth" });
}

function MarkupHint() {
  const chip = "rounded-md bg-bg-cabinet px-1.5 py-0.5 text-[12px] font-semibold leading-4 text-neutral-800";
  return (
    <p className={cx(TEXT.caption, "mt-5 px-3 leading-5 min-[640px]:px-4")}>
      Виділення в тексті: <span className={chip}>**жирний**</span>, <span className={chip}>*курсив*</span> і посилання{" "}
      <span className={chip}>[текст](https://адреса)</span>. Enter в абзаці починає новий абзац.
    </p>
  );
}

// The search result the article makes, with the site's title template.
function SerpPreview({ title, description, slug }: { title: string; description: string; slug: string }) {
  return (
    <div className="rounded-2xl bg-bg-subtle px-4 py-3.5">
      <p className={TEXT.caption}>Так стаття виглядатиме в пошуку</p>
      <p className="mt-2 truncate text-[12px] leading-4 text-neutral-600">binar-2000.com/blog/{slug || "..."}</p>
      <p className="mt-1 line-clamp-2 text-[16px] font-medium leading-[22px]" style={{ color: TONES.indigo.text }}>
        {title.trim() ? `${title.trim()} | Binar 2000` : "Заголовок статті | Binar 2000"}
      </p>
      <p className={cx("mt-1 line-clamp-3 text-[13px] leading-[18px]", description.trim() ? "text-neutral-700" : "text-neutral-400")}>
        {description.trim() || "Опис з'явиться тут: напишіть вступ або опис для пошуку."}
      </p>
    </div>
  );
}

// The addresses the article had before a rename (read-only): while it is
// public, each one answers a permanent redirect to the current address.
function OldAddresses({ slugs, isPublic }: { slugs: readonly string[]; isPublic: boolean }) {
  return (
    <div className="mt-4 border-t border-stroke-subtle pt-4">
      <p className={TEXT.label}>Старі адреси, що переспрямовують сюди</p>
      <ul className="mt-2 flex flex-col gap-1">
        {slugs.map((old) => (
          <li key={old} className="text-[13px] leading-[18px] text-neutral-700 [overflow-wrap:anywhere]">
            /blog/{old}
          </li>
        ))}
      </ul>
      <p className={cx(TEXT.caption, "mt-2 leading-[18px]")}>
        {isPublic
          ? "Хто відкриє стару адресу, потрапить на цю статтю. Якщо дати таку адресу іншій статті, переспрямування з неї зникне."
          : "Поки стаття не опублікована, ці адреси відкривають сторінку «не знайдено»; після публікації переспрямування запрацюють знову."}
      </p>
    </div>
  );
}

// The settings of an article for a role that may only look: facts, not
// disabled controls.
function ReadOnlyDetails({ record, defaultAuthor }: { record: BlogPostDetail; defaultAuthor: string }) {
  const minutes = record.readingMinutes ?? record.readingMinutesAuto;
  return (
    <>
      <Card title="Відомості">
        <KeyValueList
          dense
          items={[
            { label: "Рубрика", value: record.category || "-" },
            { label: "Підпис на картці", value: record.categoryLabel || record.category || "-" },
            { label: "Опис обкладинки", value: record.image ? record.coverAlt || "Не вказано" : "Обкладинки немає" },
            { label: "Автор", value: record.author || defaultAuthor },
            { label: "Час читання", value: `${minutes} хв` },
            {
              label: "Теги",
              value:
                record.tags.length > 0 ? (
                  <span className="flex flex-wrap gap-1.5">
                    {record.tags.map((tag) => (
                      <Badge key={tag} tone="neutral">
                        {tag}
                      </Badge>
                    ))}
                  </span>
                ) : (
                  "-"
                ),
            },
            { label: "Адреса", value: `/blog/${record.id}`, copy: `${SITE_ORIGIN}/blog/${record.id}` },
            ...(record.previousSlugs.length > 0
              ? [
                  {
                    label: "Старі адреси, що переспрямовують сюди",
                    value: (
                      <span className="flex flex-col gap-1 [overflow-wrap:anywhere]">
                        {record.previousSlugs.map((old) => (
                          <span key={old}>/blog/{old}</span>
                        ))}
                      </span>
                    ),
                  },
                ]
              : []),
          ]}
        />
      </Card>
      <Card title="SEO">
        <SerpPreview title={record.seoTitle || record.title} description={record.seoDescription || record.excerpt} slug={record.id} />
      </Card>
    </>
  );
}

// The white sheet of the article; with the mode tabs above it, the sheet
// is their tab panel.
function ArticleFrame({ tabbed, tab, children }: { tabbed: boolean; tab: string; children: ReactNode }) {
  const sheet = <div className="rounded-3xl bg-white p-5 min-[640px]:p-8 min-[1024px]:px-10 min-[1024px]:py-9">{children}</div>;
  return tabbed ? (
    <TabPanel idBase="blog-editor" value={tab}>
      {sheet}
    </TabPanel>
  ) : (
    sheet
  );
}

export function BlogEditor({ post, options }: Props) {
  const router = useRouter();
  const { can } = useStaff();
  const canEdit = can("content.edit");
  const canPublish = canEdit && can("content.publish");

  const [record, setRecord] = useState<BlogPostDetail | null>(post);
  const [initial, setInitial] = useState<EditorForm>(() => (post ? formFromPost(post) : emptyForm(options)));
  const [form, setForm] = useState<EditorForm>(initial);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState<Busy | null>(null);
  const [tab, setTab] = useState<"edit" | "preview">(canEdit ? "edit" : "preview");
  const [attempted, setAttempted] = useState(false);
  const [scheduleAt, setScheduleAt] = useState(() => (post?.status === "scheduled" ? isoToKyivLocal(post.publishedAt) : ""));
  const [scheduleError, setScheduleError] = useState<string | undefined>(undefined);
  const [slugOpen, setSlugOpen] = useState(false);
  const [slugSession, setSlugSession] = useState(0);
  const [slugError, setSlugError] = useState<string | undefined>(undefined);
  const [customSlug, setCustomSlug] = useState("");

  const dirty = useDirty(payloadOf(initial), payloadOf(form));
  useUnsavedWarning(canEdit && dirty && busy === null);

  const isNew = record === null;
  const slug = record ? record.id : customSlug || slugify(form.title, BLOG_LIMITS.slug);
  // A new article whose address is another article's old one takes that
  // redirect away when it is created: the address card says so first.
  const newTakes = isNew && slug ? takenOldAddress(slug, null, options.oldAddresses) : null;
  const missing = missingForPublish(form);
  const autoMinutes = readingMinutesOf(form.blocks);

  // --- form state ---------------------------------------------------------------

  const clearError = (name: string) => {
    if (!Object.keys(errors).some((key) => key === name || key.startsWith(`${name}.`))) return;
    setErrors((current) => Object.fromEntries(Object.entries(current).filter(([key]) => key !== name && !key.startsWith(`${name}.`))));
  };

  const set = <K extends keyof EditorForm>(name: K, value: EditorForm[K]) => {
    setForm((current) => ({ ...current, [name]: value }));
    clearError(name);
  };

  const updateBlocks = (update: (blocks: EditorBlock[]) => EditorBlock[]) => {
    setForm((current) => ({ ...current, blocks: update(current.blocks) }));
    clearError("blocks");
  };

  // The server's answer becomes the record and, unless the writer typed
  // on meanwhile, the form.
  const applySaved = (saved: BlogPostDetail, sent: EditorForm) => {
    const fromServer = formFromPost(saved);
    setRecord(saved);
    setInitial(fromServer);
    setForm((current) => (samePayload(current, sent) ? mergeKeys(fromServer, current) : current));
    setErrors({});
    setQueryData<BlogPostAnswer>(`/blog/posts/${enc(saved.id)}`, { ok: true, post: saved });
    invalidate("/blog/posts?");
  };

  const applyRecord = (next: BlogPostDetail) => {
    setRecord(next);
    setQueryData<BlogPostAnswer>(`/blog/posts/${enc(next.id)}`, { ok: true, post: next });
    invalidate("/blog/posts?");
  };

  const refuse = (result: ApiFailure, sent: EditorForm) => {
    if (result.error === "fields") {
      const next = fieldErrorsOf(result.data.fields);
      setErrors(next);
      toast.error("Перевірте виділені поля.");
      focusFirstError(next, sent.blocks);
      return;
    }
    if (result.error === "exists") {
      const taken = customSlug || slugify(sent.title, BLOG_LIMITS.slug);
      setErrors({ slug: `Адреса /blog/${taken} уже зайнята іншою статтею. Задайте іншу.` });
      toast.error("Стаття з такою адресою вже існує. Задайте іншу адресу в картці «Адреса».");
      focusFirstError({ slug: "exists" }, sent.blocks);
      return;
    }
    toastError(result, POST_ERRORS);
  };

  // Saves what is on screen (creates the post when it is new). Resolves
  // to the stored post, or null when nothing could be saved.
  const persist = async (): Promise<BlogPostDetail | null> => {
    if (record && !dirty) return record;
    const local = localErrors(form);
    if (Object.keys(local).length > 0) {
      setErrors(local);
      toast.error(local.title ? "Напишіть заголовок: без нього статтю не зберегти." : "Додайте зображення в порожні блоки або видаліть їх.");
      focusFirstError(local, form.blocks);
      return null;
    }
    const sent = form;
    const body = payloadOf(sent);
    const result = record
      ? await adminApi<BlogPostAnswer>(`/blog/posts/${enc(record.id)}`, { method: "PATCH", body })
      : await adminApi<BlogPostAnswer>("/blog/posts", { method: "POST", body: customSlug ? { ...body, slug: customSlug } : body });
    if (!result.ok) {
      refuse(result, sent);
      return null;
    }
    applySaved(result.data.post, sent);
    // A new article may have taken another one's old address.
    if (!record) invalidate("/blog/options");
    return result.data.post;
  };

  // --- actions ------------------------------------------------------------------

  const save = async () => {
    if (busy !== null || !canEdit) return;
    const wasNew = isNew;
    setBusy("save");
    try {
      const saved = await persist();
      if (!saved) return;
      if (wasNew) {
        toast.success("Чернетку створено.");
        router.replace(`/admin/blog/${enc(saved.id)}`);
      } else {
        toast.success(saved.isPublic ? "Зміни збережено. На сайті вони вже видні." : "Зміни збережено.");
      }
    } finally {
      setBusy(null);
    }
  };

  const cancel = () => {
    setForm(initial);
    setErrors({});
    setAttempted(false);
  };

  const publish = async (at?: string) => {
    if (busy !== null) return;
    const wasNew = isNew;
    setBusy(at ? "schedule" : "publish");
    try {
      const saved = await persist();
      if (!saved) return;
      const result = await adminApi<BlogPostAnswer>(`/blog/posts/${enc(saved.id)}/publish`, { method: "POST", body: at ? { at } : {} });
      if (!result.ok) {
        if (result.error === "fields") {
          setAttempted(true);
          const fields = (result.data.fields ?? {}) as Record<string, string>;
          const next = fieldErrorsOf(fields);
          setErrors(next);
          toast.error(`Щоб опублікувати статтю, додайте: ${needsPhrase(Object.keys(fields))}.`);
          focusFirstError(next, form.blocks);
        } else {
          toastError(result, POST_ERRORS);
        }
        if (wasNew) router.replace(`/admin/blog/${enc(saved.id)}`);
        return;
      }
      const live = result.data.post;
      applyRecord(live);
      setAttempted(false);
      setScheduleError(undefined);
      if (live.status === "scheduled") {
        setScheduleAt(isoToKyivLocal(live.publishedAt));
        toast.success(`Публікацію заплановано на ${formatDateTime(live.publishedAt)}.`);
      } else {
        setScheduleAt("");
        toast.success("Статтю опубліковано: вона вже на сайті.", {
          action: { label: "Відкрити", onClick: () => window.open(live.href, "_blank", "noopener,noreferrer") },
        });
      }
      if (wasNew) router.replace(`/admin/blog/${enc(live.id)}`);
    } finally {
      setBusy(null);
    }
  };

  const publishNow = () => {
    if (missing.length > 0) {
      // Saved first anyway, so the server's list is the one shown.
      setAttempted(true);
    }
    void publish();
  };

  const schedule = () => {
    const iso = kyivLocalToIso(scheduleAt);
    if (!iso) {
      setScheduleError("Вкажіть дату і час публікації.");
      return;
    }
    if (Date.parse(iso) <= Date.now() + 60_000) {
      setScheduleError("Оберіть час у майбутньому. Щоб опублікувати одразу, натисніть «Опублікувати зараз».");
      return;
    }
    setScheduleError(undefined);
    void publish(iso);
  };

  const unpublish = async () => {
    if (!record || busy !== null) return;
    const scheduled = record.status === "scheduled";
    const ok = await confirmDialog(
      scheduled
        ? {
            title: "Скасувати заплановану публікацію?",
            text: "Стаття не з'явиться на сайті й повернеться в чернетки.",
            confirmLabel: "Скасувати планування",
            cancelLabel: "Залишити",
            tone: "danger",
          }
        : {
            title: "Зняти статтю з публікації?",
            text: "Стаття зникне з сайту, а посилання на неї вестимуть на сторінку «не знайдено». У панелі вона залишиться чернеткою.",
            confirmLabel: "Зняти з публікації",
            tone: "danger",
          },
    );
    if (!ok) return;
    setBusy("unpublish");
    try {
      const result = await adminApi<BlogPostAnswer>(`/blog/posts/${enc(record.id)}/unpublish`, { method: "POST", body: {} });
      if (!result.ok) {
        toastError(result, POST_ERRORS);
        return;
      }
      applyRecord(result.data.post);
      setScheduleAt("");
      toast.success(scheduled ? "Планування скасовано: стаття в чернетках." : "Статтю знято з публікації.");
    } finally {
      setBusy(null);
    }
  };

  const openSlug = () => {
    setSlugError(undefined);
    setSlugSession((value) => value + 1);
    setSlugOpen(true);
  };

  const rename = async (next: string) => {
    if (!record) {
      setCustomSlug(next === slugify(form.title, BLOG_LIMITS.slug) ? "" : next);
      clearError("slug");
      setSlugOpen(false);
      return;
    }
    if (next === record.id) {
      setSlugOpen(false);
      return;
    }
    setBusy("slug");
    try {
      const saved = await persist();
      if (!saved) {
        setSlugOpen(false);
        return;
      }
      const result = await adminApi<BlogPostAnswer>(`/blog/posts/${enc(saved.id)}/slug`, { method: "POST", body: { slug: next } });
      if (!result.ok) {
        if (result.error === "exists") setSlugError("Ця адреса вже зайнята іншою статтею.");
        else if (result.error === "fields") setSlugError(fieldErrorsOf(result.data.fields).slug ?? "Адреса не підходить.");
        else toastError(result, POST_ERRORS);
        return;
      }
      const moved = result.data.post;
      setQueryData<BlogPostAnswer>(`/blog/posts/${enc(moved.id)}`, { ok: true, post: moved });
      invalidate("/blog/posts?");
      // The old addresses moved: this one gained one, another may have lost one.
      invalidate("/blog/options");
      setSlugOpen(false);
      toast.success(`Адресу змінено: /blog/${moved.id}`);
      router.replace(`/admin/blog/${enc(moved.id)}`);
    } finally {
      setBusy(null);
    }
  };

  const duplicate = async () => {
    if (!record || busy !== null) return;
    setBusy("duplicate");
    try {
      const saved = await persist();
      if (!saved) return;
      const result = await adminApi<BlogPostAnswer>(`/blog/posts/${enc(saved.id)}/duplicate`, { method: "POST", body: {} });
      if (!result.ok) {
        toastError(result, POST_ERRORS);
        return;
      }
      const copy = result.data.post;
      setQueryData<BlogPostAnswer>(`/blog/posts/${enc(copy.id)}`, { ok: true, post: copy });
      invalidate("/blog/posts?");
      invalidate("/blog/options");
      toast.success("Створено копію статті. Вона в чернетках.");
      router.push(`/admin/blog/${enc(copy.id)}`);
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    if (!record || busy !== null) return;
    const ok = await confirmDialog({
      title: "Видалити статтю?",
      text: record.isPublic
        ? "Стаття зникне з сайту і з панелі. Відновити її не вийде."
        : "Стаття зникне з панелі. Відновити її не вийде.",
      confirmLabel: "Видалити",
      tone: "danger",
    });
    if (!ok) return;
    setBusy("delete");
    try {
      const result = await adminApi(`/blog/posts/${enc(record.id)}`, { method: "DELETE" });
      if (!result.ok) {
        toastError(result, POST_ERRORS);
        return;
      }
      invalidate("/blog/posts?");
      invalidate("/blog/options");
      toast.success(`Статтю «${record.title}» видалено.`);
      router.push("/admin/blog");
    } finally {
      setBusy(null);
    }
  };

  // Ctrl+S / Cmd+S saves, as in any editor.
  const onSaveKey = useEffectEvent((event: globalThis.KeyboardEvent) => {
    if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === "s") {
      event.preventDefault();
      if (dirty) void save();
    }
  });
  useEffect(() => {
    if (!canEdit) return;
    const listener = (event: globalThis.KeyboardEvent) => onSaveKey(event);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [canEdit]);

  // --- view ---------------------------------------------------------------------

  const categoryOptions: SelectOption<string>[] = options.categories.map((value) => ({ value, label: value }));
  if (form.category && !options.categories.includes(form.category)) {
    categoryOptions.push({ value: form.category, label: form.category, hint: "Цієї рубрики немає в налаштуваннях блогу" });
  }

  const onTitleKey = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.nativeEvent.isComposing) {
      event.preventDefault();
      document.getElementById("blog-excerpt")?.focus();
    }
  };

  const menu: MenuItem[] = [];
  if (record && canEdit) {
    menu.push({ key: "duplicate", label: "Дублювати", icon: DocumentDuplicateIcon, onSelect: () => void duplicate() });
    menu.push({ key: "slug", label: "Змінити адресу", icon: PencilSquareIcon, onSelect: openSlug, disabled: record.isPublic && !canPublish });
    menu.push({ key: "divider", divider: true });
    menu.push({
      key: "delete",
      label: "Видалити",
      icon: TrashIcon,
      tone: "danger",
      onSelect: () => void remove(),
      disabled: record.isPublic && !canPublish,
      hint: record.isPublic && !canPublish ? "потрібен дозвіл" : undefined,
    });
  }

  const updated = record?.updatedAt
    ? `Оновлено ${formatDateTime(record.updatedAt)}${record.updatedBy?.name ? `, ${record.updatedBy.name}` : ""}`
    : record
      ? "Ще не змінювалась у панелі"
      : "";

  // The byline exactly as the article page will print it.
  const preview = (
    <ArticlePreview
      title={form.title}
      category={form.category}
      image={form.image}
      coverAlt={form.coverAlt}
      blocks={form.blocks.map((entry) => entry.block)}
      byline={{
        author: form.author.trim() || options.defaultAuthor,
        publishedAt: record && record.status !== "draft" ? record.publishedAt : null,
        readingMinutes: form.readingMinutes ?? autoMinutes,
      }}
    />
  );

  return (
    <Page>
      <PageHeader
        back={{ href: "/admin/blog", label: "До списку статей" }}
        title={isNew ? "Нова стаття" : "Стаття"}
        light={isNew ? undefined : "у блозі"}
        meta={
          record ? (
            <>
              <BlogStatusBadge status={record.status} size="md" />
              <span className={TEXT.muted}>{updated}</span>
            </>
          ) : undefined
        }
        actions={menu.length > 0 ? <KebabMenu label="Дії зі статтею" items={menu} /> : undefined}
      />

      <div className="grid min-w-0 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_360px] 2xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="flex min-w-0 flex-col gap-3">
          {canEdit && (
            <Tabs
              label="Режим перегляду статті"
              idBase="blog-editor"
              value={tab}
              onChange={setTab}
              items={[
                { key: "edit", label: "Редагування" },
                { key: "preview", label: "Попередній перегляд" },
              ]}
            />
          )}
          <ArticleFrame tabbed={canEdit} tab={tab}>
            {tab === "preview" || !canEdit ? (
              preview
            ) : (
              <div className="flex min-w-0 flex-col">
                <AutoTextarea
                  value={form.title}
                  onChange={(title) => set("title", title.replace(/\n/g, " "))}
                  onKeyDown={onTitleKey}
                  aria-label="Заголовок статті"
                  placeholder="Заголовок статті"
                  maxLength={BLOG_LIMITS.title}
                  invalid={Boolean(errors.title)}
                  describedBy={errors.title ? "blog-title-error" : undefined}
                  data-field="title"
                  className="text-[28px] font-bold leading-[34px] tracking-[-0.02em] min-[640px]:text-[40px] min-[640px]:leading-[46px]"
                />
                {errors.title && (
                  <p id="blog-title-error" role="alert" className="mt-1.5 text-[12px] font-medium leading-4 text-negative">
                    {errors.title}
                  </p>
                )}
                <Textarea
                  id="blog-excerpt"
                  label="Вступ"
                  hint="Коротко, про що стаття: цей текст видно на картці в блозі та в результатах пошуку."
                  value={form.excerpt}
                  onChange={(excerpt) => set("excerpt", excerpt)}
                  rows={2}
                  autoGrow
                  maxLength={200}
                  showCount
                  error={errors.excerpt}
                  className="mt-6"
                />
                <div id="blog-body" className="mt-8 border-t border-stroke-subtle pt-6">
                  <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <h2 className={TEXT.cardTitle}>Текст статті</h2>
                    <span className={TEXT.caption}>Читання займе близько {autoMinutes} хв</span>
                  </div>
                  {record?.blocksFrom === "body" && (
                    <p className={cx(TEXT.caption, "mb-3 rounded-xl bg-bg-subtle px-3 py-2 leading-5")}>
                      Цю статтю написано до появи редактора блоків, тож її текст розкладено на блоки автоматично. Перевірте його: у
                      новому вигляді він збережеться з першим збереженням.
                    </p>
                  )}
                  {errors.blocks && (
                    <p role="alert" className="mb-3 text-[12px] font-medium leading-4 text-negative">
                      {errors.blocks}
                    </p>
                  )}
                  <div className="-mx-3 min-[640px]:-mx-4">
                    <BlockEditor blocks={form.blocks} onChange={updateBlocks} errors={errors} disabled={!canEdit} />
                  </div>
                  <MarkupHint />
                </div>
              </div>
            )}
          </ArticleFrame>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <PublishCard
            record={record}
            missing={missing}
            attempted={attempted}
            canPublish={canPublish}
            busy={busy === "publish" || busy === "schedule" || busy === "unpublish" ? busy : null}
            locked={busy !== null}
            scheduleAt={scheduleAt}
            onScheduleAt={(value) => {
              setScheduleAt(value);
              setScheduleError(undefined);
            }}
            scheduleError={scheduleError}
            onPublish={publishNow}
            onSchedule={schedule}
            onUnpublish={() => void unpublish()}
            canEdit={canEdit}
          />

          {!canEdit && record ? (
            <ReadOnlyDetails record={record} defaultAuthor={options.defaultAuthor} />
          ) : (
            <>
              <div id="blog-card-cover">
                <Card title="Обкладинка" subtitle="Велике фото на початку статті і на її картці в блозі.">
                  <ImageField
                    value={form.image}
                    onChange={(image) => set("image", image)}
                    alt={form.coverAlt}
                    onAltChange={(coverAlt) => set("coverAlt", coverAlt)}
                    folder="blog"
                    aspect="wide"
                    error={errors.image ?? errors.coverAlt}
                    disabled={!canEdit}
                  />
                </Card>
              </div>

              <div id="blog-card-category">
                <Card title="Рубрика">
                  <div className="flex flex-col gap-5">
                    <Select
                      label="Рубрика"
                      value={form.category}
                      onChange={(category) => set("category", category)}
                      options={categoryOptions}
                      error={errors.category}
                      disabled={!canEdit}
                    />
                    <Input
                      label="Підпис на картці"
                      optional
                      value={form.categoryLabel}
                      onChange={(categoryLabel) => set("categoryLabel", categoryLabel)}
                      placeholder={form.category}
                      hint="Коротка назва рубрики на картці статті. Порожнє поле - як рубрика."
                      maxLength={BLOG_LIMITS.categoryLabel}
                      error={errors.categoryLabel}
                      disabled={!canEdit}
                    />
                    <Input
                      label="Автор"
                      optional
                      value={form.author}
                      onChange={(author) => set("author", author)}
                      placeholder={options.defaultAuthor}
                      hint={`Порожнє поле - «${options.defaultAuthor}».`}
                      maxLength={BLOG_LIMITS.author}
                      error={errors.author}
                      disabled={!canEdit}
                    />
                    <NumberInput
                      label="Час читання"
                      value={form.readingMinutes}
                      onChange={(minutes) => set("readingMinutes", minutes)}
                      min={1}
                      max={BLOG_LIMITS.readingMinutesMax}
                      step={1}
                      precision={0}
                      suffix="хв"
                      placeholder={String(autoMinutes)}
                      hint={
                        form.readingMinutes === null
                          ? `Рахується з тексту: зараз ${autoMinutes} хв. Впишіть число, щоб задати своє.`
                          : `За текстом виходить ${autoMinutes} хв. Очистіть поле, щоб рахувати автоматично.`
                      }
                      error={errors.readingMinutes}
                      disabled={!canEdit}
                    />
                  </div>
                </Card>
              </div>

              <div id="blog-card-tags">
                <Card title="Теги">
                  <TagInput
                    aria-label="Теги статті"
                    value={form.tags}
                    onChange={(tags) => set("tags", tags)}
                    max={BLOG_LIMITS.tags}
                    maxLength={BLOG_LIMITS.tag}
                    placeholder="Додайте тег і натисніть Enter"
                    hint={`Показуються під статтею. До ${BLOG_LIMITS.tags} тегів.`}
                    error={errors.tags ?? Object.entries(errors).find(([key]) => key.startsWith("tags."))?.[1]}
                    disabled={!canEdit}
                  />
                </Card>
              </div>

              <div id="blog-card-slug">
                <Card
                  title="Адреса"
                  actions={
                    canEdit ? (
                      <Button variant="ghost" size="sm" onClick={openSlug} disabled={busy !== null || Boolean(record?.isPublic && !canPublish)}>
                        Змінити адресу
                      </Button>
                    ) : undefined
                  }
                >
                  <div className="flex min-w-0 items-center gap-2 rounded-2xl bg-bg-subtle py-2 pl-4 pr-2">
                    <span className="min-w-0 flex-1 text-[13px] leading-[18px] text-neutral-600 [overflow-wrap:anywhere]">
                      binar-2000.com/blog/<span className="font-semibold text-neutral-900">{slug || "..."}</span>
                    </span>
                    {record && <CopyButton text={`${SITE_ORIGIN}/blog/${record.id}`} label="адресу статті" />}
                  </div>
                  {errors.slug ? (
                    <p role="alert" className="mt-2 text-[12px] font-medium leading-4 text-negative">
                      {errors.slug}
                    </p>
                  ) : isNew ? (
                    <p className={cx(TEXT.caption, "mt-2")}>
                      {customSlug ? "Адресу задано вручну." : "Адреса складається із заголовка."} Її можна змінити й пізніше.
                    </p>
                  ) : record?.isPublic && !canPublish ? (
                    <p className={cx(TEXT.caption, "mt-2")}>Змінити адресу опублікованої статті може роль із дозволом на публікацію.</p>
                  ) : null}
                  {newTakes && <OldAddressNotice taken={newTakes} className="mt-3" />}
                  {record && record.previousSlugs.length > 0 && <OldAddresses slugs={record.previousSlugs} isPublic={record.isPublic} />}
                </Card>
              </div>

              <div id="blog-card-seo">
                <Card title="SEO" subtitle="Як стаття виглядає в пошуковиках. Порожні поля беруться із заголовка і вступу.">
                  <div className="flex flex-col gap-5">
                    <Textarea
                      label="Заголовок для пошуку"
                      optional
                      value={form.seoTitle}
                      onChange={(seoTitle) => set("seoTitle", seoTitle.replace(/\n/g, " "))}
                      rows={1}
                      autoGrow
                      maxLength={BLOG_LIMITS.seoTitle}
                      showCount
                      placeholder={form.title || "Як заголовок статті"}
                      hint="Пошуковики показують близько 60 символів."
                      error={errors.seoTitle}
                      disabled={!canEdit}
                    />
                    <Textarea
                      label="Опис для пошуку"
                      optional
                      value={form.seoDescription}
                      onChange={(seoDescription) => set("seoDescription", seoDescription)}
                      rows={2}
                      autoGrow
                      maxLength={BLOG_LIMITS.seoDescription}
                      showCount
                      placeholder={form.excerpt || "Як вступ статті"}
                      hint="Пошуковики показують близько 160 символів."
                      error={errors.seoDescription}
                      disabled={!canEdit}
                    />
                    <SerpPreview title={form.seoTitle || form.title} description={form.seoDescription || form.excerpt} slug={slug} />
                  </div>
                </Card>
              </div>
            </>
          )}
        </div>
      </div>

      {canEdit && (
        <FormActions
          sticky
          className="mt-4"
          status={
            busy === "save"
              ? "Зберігаємо..."
              : dirty
                ? isNew
                  ? "Нова стаття ще не збережена"
                  : "Є незбережені зміни"
                : isNew
                  ? "Почніть із заголовка"
                  : "Усі зміни збережено"
          }
        >
          <Button variant="secondary" onClick={cancel} disabled={!dirty || busy !== null}>
            Скасувати
          </Button>
          <Button onClick={() => void save()} loading={busy === "save"} disabled={!dirty || (busy !== null && busy !== "save")}>
            {isNew ? "Створити чернетку" : "Зберегти зміни"}
          </Button>
        </FormActions>
      )}

      {record && (
        <div className="mt-4">
          <EntityHistory type="blog_post" id={record.id} refreshKey={record.updatedAt ?? record.id} />
        </div>
      )}

      <SlugModal
        open={slugOpen}
        onClose={() => {
          if (busy !== "slug") setSlugOpen(false);
        }}
        session={slugSession}
        busy={busy === "slug"}
        current={slug}
        title={form.title}
        isPublic={record?.isPublic ?? false}
        mode={record ? "rename" : "new"}
        postId={record?.id ?? null}
        oldAddresses={options.oldAddresses}
        error={slugError}
        onSubmit={(next) => void rename(next)}
      />
    </Page>
  );
}
