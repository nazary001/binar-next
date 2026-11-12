"use client";

import {
  ArrowDownIcon,
  ArrowTopRightOnSquareIcon,
  ArrowUpIcon,
  ArrowsUpDownIcon,
  BarsArrowUpIcon,
  DocumentDuplicateIcon,
  EyeSlashIcon,
  GlobeAltIcon,
  NewspaperIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import { adminApi } from "../lib/api";
import { cx, formatDate, formatDateTime, formatNumber } from "../lib/format";
import { invalidate, setQueryData, useAdminQuery } from "../lib/query";
import { useStaff } from "../shell/StaffProvider";
import { Button, IconButton } from "../ui/Button";
import { confirmDialog } from "../ui/ConfirmDialog";
import { DataTable, DateCell, type Column } from "../ui/DataTable";
import { KebabMenu, type MenuItem } from "../ui/DropdownMenu";
import { FilterBar, type FilterChipItem } from "../ui/FilterBar";
import { SearchInput } from "../ui/Input";
import { Page, PageHeader } from "../ui/Page";
import { Pagination } from "../ui/Pagination";
import { Select } from "../ui/Select";
import { EmptyState } from "../ui/States";
import { BLOG_STATUS, BlogStatusBadge } from "../ui/status";
import { LinkTabs } from "../ui/Tabs";
import { toast, toastError } from "../ui/Toast";
import { TEXT, TONES } from "../ui/tokens";
import { useListParams } from "../ui/useListParams";
import { ORDER_DISABLED_HINT, POST_ERRORS } from "./messages";
import { needsPhrase } from "./model";
import type { BlogOptionsAnswer, BlogPostAnswer, BlogPostRow, BlogPostsAnswer, BlogReorderAnswer } from "./types";

// /admin/blog: the articles in the order the site shows them, with tabs per
// status (?status=), a search (?q=) and a category filter (?category=), the
// same names the API takes. Editors move articles up and down here (the
// order of the public list); that needs the whole list in the site's
// order, so the controls rest while a search, a filter or another sort is
// on, and the screen says so.

const STATUSES = ["published", "scheduled", "draft"] as const;
type StatusTab = "all" | (typeof STATUSES)[number];

const SORT_LABELS: Record<string, string> = {
  title: "за назвою, А-Я",
  "-title": "за назвою, Я-А",
  "-updatedAt": "спершу змінені нещодавно",
  updatedAt: "спершу змінені давно",
};

const EMPTY_BY_STATUS: Record<Exclude<StatusTab, "all">, { title: string; text: string }> = {
  draft: { title: "Чернеток немає", text: "Нова стаття зберігається як чернетка, доки її не опублікують." },
  scheduled: { title: "Запланованих статей немає", text: "Статтю можна запланувати на потрібний час у її картці «Публікація»." },
  published: { title: "Опублікованих статей немає", text: "Опубліковані статті видно на сторінці /blog." },
};

// Phones get the up / down moves in the row menu (the arrow column is
// hidden there). Read through a store: no state is set in an effect.
const NARROW = "(max-width: 639px)";
function subscribeNarrow(listener: () => void) {
  const media = window.matchMedia(NARROW);
  media.addEventListener("change", listener);
  return () => media.removeEventListener("change", listener);
}
function useNarrow(): boolean {
  return useSyncExternalStore(
    subscribeNarrow,
    () => window.matchMedia(NARROW).matches,
    () => false,
  );
}

const enc = encodeURIComponent;

// The first public article of the site's order is also the big card over
// the photo at the top of /blog (src/app/blog/page.tsx).
const FEATURED_NOTE = "у картці вгорі блогу";

// The cover, the title and the address of a post. On phones the status
// column is hidden, so the second line says the status instead (with the
// date of a planned one).
function PostCell({ row, featured }: { row: BlogPostRow; featured: boolean }) {
  return (
    <span className="flex min-w-0 items-center gap-3">
      {row.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={row.image} alt="" loading="lazy" className="size-10 shrink-0 rounded-xl bg-bg-subtle object-cover" />
      ) : (
        <span aria-hidden className="size-10 shrink-0 rounded-xl bg-bg-cabinet" />
      )}
      <span className="flex min-w-0 flex-col">
        <span className="line-clamp-2 font-semibold text-neutral-900 min-[640px]:truncate">{row.title}</span>
        <span className={cx(TEXT.caption, "truncate max-[639px]:hidden")}>/blog/{row.id}</span>
        <span className={cx(TEXT.caption, "flex min-w-0 items-center gap-1.5 min-[640px]:hidden")}>
          <span aria-hidden className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: TONES[BLOG_STATUS[row.status].tone].dot }} />
          <span className="truncate">
            {row.status === "scheduled" ? `Заплановано на ${formatDateTime(row.publishedAt)}` : BLOG_STATUS[row.status].label}
            {featured && `, ${FEATURED_NOTE}`}
          </span>
        </span>
      </span>
    </span>
  );
}

export function BlogListScreen() {
  const router = useRouter();
  const search = useSearchParams();
  const { can } = useStaff();
  const canEdit = can("content.edit");
  const canPublish = canEdit && can("content.publish");
  const narrow = useNarrow();

  const list = useListParams({ defaults: { sort: "sort", limit: "50" } });
  const key = `/blog/posts?${list.queryString}`;
  const posts = useAdminQuery<BlogPostsAnswer>(key);
  const options = useAdminQuery<BlogOptionsAnswer>("/blog/options");

  const rawStatus = list.get("status");
  const status: StatusTab = (STATUSES as readonly string[]).includes(rawStatus) ? (rawStatus as StatusTab) : "all";
  const category = list.get("category");
  const sorted = list.sort !== "sort";
  const filtered = status !== "all" || Boolean(category) || Boolean(list.q);
  const canReorder = canEdit && !filtered && !sorted;


  const data = posts.data;
  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const lastPage = list.page * list.limit >= total;
  const defaultAuthor = options.data?.defaultAuthor ?? "";
  // Which row is the featured card of /blog: known only while the list
  // shows the site's order from its start (no search, rubric or other sort).
  const featuredId =
    !sorted && list.page === 1 && !category && !list.q && (status === "all" || status === "published")
      ? (items.find((item) => item.status === "published")?.id ?? null)
      : null;

  // --- the order ------------------------------------------------------------------

  // beforeId for a move one step up / down; undefined = not possible here
  // (the first row, or the neighbour is on another page).
  const upBefore = (index: number): string | undefined => (index > 0 ? items[index - 1].id : undefined);
  const downBefore = (index: number): string | null | undefined => {
    if (index + 2 < items.length) return items[index + 2].id;
    if (index + 1 < items.length) return lastPage ? null : undefined;
    return undefined;
  };

  const move = async (row: BlogPostRow, beforeId: string | null, focusId?: string) => {
    // The rows move at once; the answer of the server follows.
    if (data) {
      const rest = data.items.filter((item) => item.id !== row.id);
      const at = beforeId === null ? rest.length : rest.findIndex((item) => item.id === beforeId);
      if (at >= 0 || beforeId === null) {
        const next = [...rest.slice(0, at), row, ...rest.slice(at)];
        setQueryData<BlogPostsAnswer>(key, { ...data, items: next.slice(0, data.items.length) });
      }
    }
    if (focusId) requestAnimationFrame(() => document.getElementById(focusId)?.focus());
    const result = await adminApi<BlogReorderAnswer>("/blog/posts/reorder", { method: "POST", body: { id: row.id, beforeId } });
    if (!result.ok) toastError(result, POST_ERRORS);
    invalidate("/blog/posts?");
  };

  const toTop = async (row: BlogPostRow) => {
    let first = list.page === 1 ? items[0]?.id : undefined;
    if (!first) {
      const head = await adminApi<BlogPostsAnswer>("/blog/posts?limit=1&page=1&sort=sort");
      if (!head.ok) {
        toastError(head, POST_ERRORS);
        return;
      }
      first = head.data.items[0]?.id;
    }
    if (!first || first === row.id) return;
    await move(row, first);
    toast.success(`«${row.title}» тепер перша в блозі.`);
  };

  // --- row actions ------------------------------------------------------------------

  const publish = async (row: BlogPostRow) => {
    const result = await adminApi<BlogPostAnswer>(`/blog/posts/${enc(row.id)}/publish`, { method: "POST", body: {} });
    if (!result.ok) {
      if (result.error === "fields") {
        const fields = Object.keys((result.data.fields ?? {}) as Record<string, unknown>);
        toast.error(`Щоб опублікувати «${row.title}», додайте: ${needsPhrase(fields)}.`, {
          action: { label: "Відкрити статтю", onClick: () => router.push(`/admin/blog/${enc(row.id)}`) },
        });
      } else {
        toastError(result, POST_ERRORS);
      }
      return;
    }
    setQueryData<BlogPostAnswer>(`/blog/posts/${enc(row.id)}`, result.data);
    invalidate("/blog/posts?");
    toast.success(`Статтю «${row.title}» опубліковано.`);
  };

  const unpublish = async (row: BlogPostRow) => {
    const scheduled = row.status === "scheduled";
    const ok = await confirmDialog(
      scheduled
        ? {
            title: "Скасувати заплановану публікацію?",
            text: `Стаття «${row.title}» не з'явиться на сайті й повернеться в чернетки.`,
            confirmLabel: "Скасувати планування",
            cancelLabel: "Залишити",
            tone: "danger",
          }
        : {
            title: "Зняти статтю з публікації?",
            text: `Стаття «${row.title}» зникне з сайту, а посилання на неї вестимуть на сторінку «не знайдено».`,
            confirmLabel: "Зняти з публікації",
            tone: "danger",
          },
    );
    if (!ok) return;
    const result = await adminApi<BlogPostAnswer>(`/blog/posts/${enc(row.id)}/unpublish`, { method: "POST", body: {} });
    if (!result.ok) {
      toastError(result, POST_ERRORS);
      return;
    }
    setQueryData<BlogPostAnswer>(`/blog/posts/${enc(row.id)}`, result.data);
    invalidate("/blog/posts?");
    toast.success(scheduled ? "Планування скасовано: стаття в чернетках." : `Статтю «${row.title}» знято з публікації.`);
  };

  const duplicate = async (row: BlogPostRow) => {
    const result = await adminApi<BlogPostAnswer>(`/blog/posts/${enc(row.id)}/duplicate`, { method: "POST", body: {} });
    if (!result.ok) {
      toastError(result, POST_ERRORS);
      return;
    }
    const copy = result.data.post;
    setQueryData<BlogPostAnswer>(`/blog/posts/${enc(copy.id)}`, result.data);
    invalidate("/blog/posts?");
    invalidate("/blog/options");
    toast.success("Створено копію-чернетку. Вона перша в списку.", {
      action: { label: "Відкрити", onClick: () => router.push(`/admin/blog/${enc(copy.id)}`) },
    });
  };

  const remove = async (row: BlogPostRow) => {
    const ok = await confirmDialog({
      title: "Видалити статтю?",
      text:
        row.status === "published"
          ? `«${row.title}» зникне з сайту і з панелі. Відновити її не вийде.`
          : `«${row.title}» зникне з панелі. Відновити її не вийде.`,
      confirmLabel: "Видалити",
      tone: "danger",
    });
    if (!ok) return;
    const result = await adminApi(`/blog/posts/${enc(row.id)}`, { method: "DELETE" });
    if (!result.ok) {
      toastError(result, POST_ERRORS);
      return;
    }
    invalidate("/blog/posts?");
    // Its old addresses (if any) are free again.
    invalidate("/blog/options");
    toast.success(`Статтю «${row.title}» видалено.`);
  };

  const menuOf = (row: BlogPostRow, index: number): MenuItem[] => {
    const menu: MenuItem[] = [];
    if (row.status === "published") menu.push({ key: "site", label: "Відкрити на сайті", icon: ArrowTopRightOnSquareIcon, href: row.href });
    if (canEdit) menu.push({ key: "duplicate", label: "Дублювати", icon: DocumentDuplicateIcon, onSelect: () => void duplicate(row) });
    if (canPublish) {
      if (row.status === "published") {
        menu.push({ key: "unpublish", label: "Зняти з публікації", icon: EyeSlashIcon, onSelect: () => void unpublish(row) });
      } else {
        menu.push({
          key: "publish",
          label: row.status === "scheduled" ? "Опублікувати зараз" : "Опублікувати",
          icon: GlobeAltIcon,
          onSelect: () => void publish(row),
        });
        if (row.status === "scheduled") menu.push({ key: "unschedule", label: "Скасувати планування", icon: EyeSlashIcon, onSelect: () => void unpublish(row) });
      }
    }
    if (canEdit) {
      menu.push({ key: "order", divider: true });
      menu.push({
        key: "top",
        label: "На початок",
        icon: BarsArrowUpIcon,
        onSelect: () => void toTop(row),
        disabled: !canReorder || (list.page === 1 && index === 0),
        hint: canReorder ? undefined : "у повному списку",
      });
      if (narrow && canReorder) {
        const up = upBefore(index);
        const down = downBefore(index);
        menu.push({ key: "up", label: "Перемістити вище", icon: ArrowUpIcon, disabled: up === undefined, onSelect: () => up !== undefined && void move(row, up) });
        menu.push({ key: "down", label: "Перемістити нижче", icon: ArrowDownIcon, disabled: down === undefined, onSelect: () => down !== undefined && void move(row, down) });
      }
      const guarded = row.status === "published" && !canPublish;
      menu.push({ key: "danger", divider: true });
      menu.push({
        key: "delete",
        label: "Видалити",
        icon: TrashIcon,
        tone: "danger",
        disabled: guarded,
        hint: guarded ? "потрібен дозвіл" : undefined,
        onSelect: () => void remove(row),
      });
    }
    return menu;
  };

  // --- columns -----------------------------------------------------------------------

  const columns: Column<BlogPostRow>[] = [];
  if (canEdit) {
    columns.push({
      key: "order",
      header: "Порядок",
      width: 96,
      interactive: true,
      hideBelow: 640,
      cell: (row) => {
        const index = items.findIndex((item) => item.id === row.id);
        const up = canReorder ? upBefore(index) : undefined;
        const down = canReorder ? downBefore(index) : undefined;
        return (
          <span className="-ml-1.5 flex items-center">
            <IconButton
              id={`blog-up-${row.id}`}
              size="sm"
              icon={ArrowUpIcon}
              label={`Перемістити вище: ${row.title}`}
              disabled={up === undefined}
              onClick={() => up !== undefined && void move(row, up, `blog-up-${row.id}`)}
            />
            <IconButton
              id={`blog-down-${row.id}`}
              size="sm"
              icon={ArrowDownIcon}
              label={`Перемістити нижче: ${row.title}`}
              disabled={down === undefined}
              onClick={() => down !== undefined && void move(row, down, `blog-down-${row.id}`)}
            />
          </span>
        );
      },
    });
  }
  columns.push(
    {
      key: "title",
      header: "Стаття",
      sortKey: "title",
      // Takes the room the other columns leave; max-w-0 lets its two lines
      // truncate instead of pushing the other columns narrow.
      width: "100%",
      className: "max-w-0",
      cell: (row) => <PostCell row={row} featured={row.id === featuredId} />,
    },
    {
      key: "category",
      header: "Рубрика",
      hideBelow: 1024,
      className: "whitespace-nowrap",
      cell: (row) => row.categoryLabel || row.category || "-",
    },
    {
      key: "status",
      header: "Статус",
      hideBelow: 640,
      cell: (row) => (
        <span className="flex flex-col items-start gap-1">
          <BlogStatusBadge status={row.status} />
          {row.status === "scheduled" && <span className={cx(TEXT.caption, "whitespace-nowrap tabular-nums")}>на {formatDateTime(row.publishedAt)}</span>}
          {row.status === "published" && row.publishedAt && (
            <span className={cx(TEXT.caption, "whitespace-nowrap tabular-nums")}>з {formatDate(row.publishedAt)}</span>
          )}
          {row.id === featuredId && <span className={cx(TEXT.caption, "whitespace-nowrap text-brand")}>{FEATURED_NOTE}</span>}
        </span>
      ),
    },
    {
      key: "author",
      header: "Автор",
      hideBelow: 1280,
      className: "whitespace-nowrap",
      cell: (row) => (
        <span className={cx(!row.author && "text-neutral-500")} title={row.author ? undefined : "Автор за замовчуванням"}>
          {row.author || defaultAuthor || "-"}
        </span>
      ),
    },
    {
      key: "updated",
      header: "Оновлено",
      sortKey: "updatedAt",
      firstSort: "desc",
      hideBelow: 1024,
      cell: (row) => (row.updatedAt ? <DateCell value={row.updatedAt} withTime /> : <span className="text-neutral-400">-</span>),
    },
  );
  columns.push({
    key: "menu",
    header: <span className="sr-only">Дії</span>,
    width: 56,
    interactive: true,
    align: "right",
    cell: (row) => {
      const menu = menuOf(row, items.findIndex((item) => item.id === row.id));
      return menu.length > 0 ? <KebabMenu size="sm" label={`Дії зі статтею «${row.title}»`} items={menu} /> : null;
    },
  });

  // --- tabs, filters, states ------------------------------------------------------------

  const hrefFor = (tab: StatusTab) => {
    const params = new URLSearchParams(search.toString());
    params.delete("page");
    if (tab === "all") params.delete("status");
    else params.set("status", tab);
    params.sort();
    const query = params.toString();
    return query ? `/admin/blog?${query}` : "/admin/blog";
  };
  const counts = data?.counts;
  // On a phone the tab capsule scrolls sideways: keep the open tab in view
  // (a link from elsewhere may open "Чернетки", the last one). The counts
  // arrive after the tabs and widen them, so they count as a change too.
  const tabWidths = counts ? `${counts.all}:${counts.published}:${counts.scheduled}:${counts.draft}` : "";
  useEffect(() => {
    const reveal = () =>
      document
        .querySelector('nav[aria-label="Статус статей"] [aria-current="page"]')
        ?.scrollIntoView({ block: "nearest", inline: "nearest" });
    reveal();
    // The tabs widen once the web font is in: look again then.
    let live = true;
    void document.fonts?.ready.then(() => {
      if (live) reveal();
    });
    return () => {
      live = false;
    };
  }, [status, tabWidths]);
  const tabs = [
    { key: "all", label: "Усі", count: counts?.all },
    { key: "published", label: "Опубліковані", count: counts?.published },
    { key: "scheduled", label: "Заплановані", count: counts?.scheduled },
    { key: "draft", label: "Чернетки", count: counts?.draft },
  ].map((tab) => ({ ...tab, href: hrefFor(tab.key as StatusTab) }));

  const categoryOptions = (options.data?.categories ?? []).map((value) => ({ value, label: value }));
  if (category && !categoryOptions.some((option) => option.value === category)) categoryOptions.push({ value: category, label: category });

  const chips: FilterChipItem[] = [];
  if (category) chips.push({ key: "category", label: `Рубрика: ${category}`, onRemove: () => list.set({ category: null }) });
  if (list.q) chips.push({ key: "q", label: `Пошук: ${list.q}`, onRemove: () => list.set({ q: null }) });
  if (sorted) chips.push({ key: "sort", label: `Упорядковано ${SORT_LABELS[list.sort] ?? ""}`.trim(), onRemove: () => list.set({ sort: null }) });

  const nothingAtAll = data !== undefined && data.overall === 0;
  const empty = nothingAtAll ? (
    <EmptyState
      size="lg"
      icon={<NewspaperIcon aria-hidden className="size-6" strokeWidth={1.7} />}
      title="Статей ще немає"
      text="Статті блогу з'являються на сторінці /blog після публікації. Почніть із першої."
      action={
        canEdit ? (
          <Button href="/admin/blog/new" iconLeft={PlusIcon}>
            Написати статтю
          </Button>
        ) : undefined
      }
    />
  ) : status !== "all" && !category && !list.q ? (
    <EmptyState
      title={EMPTY_BY_STATUS[status].title}
      text={EMPTY_BY_STATUS[status].text}
      action={
        <Button variant="secondary" href="/admin/blog">
          Усі статті
        </Button>
      }
    />
  ) : (
    <EmptyState
      title="Нічого не знайдено"
      text="Жодна стаття не відповідає пошуку або рубриці. Змініть їх або скиньте фільтри."
      action={
        <Button variant="secondary" onClick={list.reset}>
          Скинути фільтри
        </Button>
      }
    />
  );

  return (
    <Page>
      <PageHeader
        title="Блог"
        light={data ? formatNumber(data.overall) : undefined}
        subtitle="Статті сторінки /blog. Порядок у цьому списку - це порядок на сайті; перша опублікована стаття ще й показується у великій картці вгорі блогу."
        actions={
          <>
            <Button variant="secondary" href="/blog" external iconRight={ArrowTopRightOnSquareIcon}>
              Блог на сайті
            </Button>
            {canEdit && (
              <Button href="/admin/blog/new" iconLeft={PlusIcon}>
                Написати статтю
              </Button>
            )}
          </>
        }
        tabs={<LinkTabs label="Статус статей" value={status} items={tabs} />}
      />

      <FilterBar
        search={<SearchInput label="Пошук статей" placeholder="Заголовок або адреса" value={list.q} onChange={(q) => list.set({ q })} />}
        filters={
          <div className="w-[220px] max-w-full">
            <Select
              aria-label="Рубрика"
              placeholder="Усі рубрики"
              clearable
              value={category || null}
              onChange={(value) => list.set({ category: value })}
              options={categoryOptions}
              className="w-full"
            />
          </div>
        }
        chips={chips}
        onReset={list.reset}
      />

      {canEdit && !canReorder && items.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl bg-white py-2.5 pl-4 pr-2.5">
          <ArrowsUpDownIcon aria-hidden strokeWidth={1.7} className="size-5 shrink-0 text-neutral-500" />
          <p className={cx(TEXT.muted, "min-w-0 flex-1")}>{ORDER_DISABLED_HINT}</p>
          <Button size="sm" variant="ghost" onClick={list.reset}>
            Показати весь список
          </Button>
        </div>
      )}

      <DataTable
        caption="Статті блогу"
        columns={columns}
        rows={data?.items}
        rowKey={(row) => row.id}
        loading={posts.loading}
        stale={posts.stale}
        error={posts.error}
        onRetry={posts.reload}
        sort={list.sort}
        onSort={(sort) => list.set({ sort })}
        rowHref={(row) => `/admin/blog/${enc(row.id)}`}
        empty={empty}
        footer={
          <Pagination
            page={list.page}
            limit={list.limit}
            total={total}
            onPage={(page) => list.set({ page })}
            onLimit={(limit) => list.set({ limit })}
          />
        }
      />
    </Page>
  );
}
