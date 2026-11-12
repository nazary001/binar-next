"use client";

import { useAdminQuery } from "../lib/query";
import { Card } from "../ui/Card";
import { Page, PageHeader } from "../ui/Page";
import { Skeleton, SkeletonText } from "../ui/Skeleton";
import { ErrorState, NotFoundState } from "../ui/States";
import { BlogEditor } from "./BlogEditor";
import type { BlogOptionsAnswer, BlogPostAnswer } from "./types";

// The page of one article (id) or of a new one (id null): loads the post
// and the blog's options, shows a skeleton shaped like the editor, a "not
// found" panel for an unknown address, and then the editor, keyed by the
// post so its form starts from the loaded values.

function EditorSkeleton({ isNew }: { isNew: boolean }) {
  return (
    <Page>
      <PageHeader back={{ href: "/admin/blog", label: "До списку статей" }} title={isNew ? "Нова стаття" : "Стаття"} />
      <div className="grid min-w-0 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_360px] 2xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="flex min-w-0 flex-col gap-3">
          <Skeleton shape="pill" className="h-10 w-[300px] max-w-full" />
          <div className="rounded-3xl bg-white p-5 min-[640px]:p-8 min-[1024px]:px-10 min-[1024px]:py-9">
            <Skeleton className="h-9 w-[80%]" />
            <Skeleton className="mt-3 h-9 w-[55%]" />
            <Skeleton shape="tile" className="mt-8 h-[76px] w-full" />
            <div className="mt-8 border-t border-stroke-subtle pt-6">
              <Skeleton className="h-4 w-32" />
              <SkeletonText lines={4} className="mt-5" />
              <Skeleton className="mt-8 h-5 w-[45%]" />
              <SkeletonText lines={5} className="mt-4" />
            </div>
          </div>
        </div>
        <div className="flex min-w-0 flex-col gap-4">
          {[3, 2, 4].map((lines, index) => (
            <Card key={index}>
              <Skeleton className="h-4 w-28" />
              <SkeletonText lines={lines} className="mt-4" />
            </Card>
          ))}
        </div>
      </div>
    </Page>
  );
}

export function BlogEditorScreen({ id }: { id: string | null }) {
  const options = useAdminQuery<BlogOptionsAnswer>("/blog/options");
  const post = useAdminQuery<BlogPostAnswer>(id ? `/blog/posts/${encodeURIComponent(id)}` : null);

  if (id && post.error?.error === "not-found") {
    return (
      <Page>
        <div className="flex flex-1 flex-col rounded-3xl bg-white">
          <NotFoundState
            title="Статтю не знайдено"
            text="Можливо, її видалили або змінили її адресу."
            backHref="/admin/blog"
            backLabel="До списку статей"
          />
        </div>
      </Page>
    );
  }

  const failure = (id ? post.error : null) ?? options.error;
  const loadedPost = id ? post.data?.post : null;
  const ready = Boolean(options.data) && (id === null || Boolean(loadedPost));

  if (!ready && failure) {
    return (
      <Page>
        <div className="flex flex-1 flex-col rounded-3xl bg-white">
          <ErrorState
            title="Не вдалося відкрити статтю"
            failure={failure}
            onRetry={() => {
              options.reload();
              post.reload();
            }}
          />
        </div>
      </Page>
    );
  }

  if (!ready || !options.data || (id !== null && (!loadedPost || loadedPost.id !== id))) return <EditorSkeleton isNew={id === null} />;

  return <BlogEditor key={loadedPost ? loadedPost.id : "new"} post={loadedPost ?? null} options={options.data} />;
}
