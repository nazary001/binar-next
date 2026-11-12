import "server-only";
import type { Filter } from "mongodb";
import type { MediaUsageItem } from "@/components/admin/media/types";
import { escapeRegex } from "../admin/list";
import {
  collection,
  type B2bOrderDoc,
  type BlogPostDoc,
  type MaterialFileDoc,
  type OrderDoc,
  type ProductDoc,
} from "../db/collections";

// Where a file of the media library is referenced, so the panel can show it
// next to the file and refuse to delete a file that is still in use
// (DELETE /api/admin/media/<id> answers 409 "in-use" with this list).
//
// A document points at a stored file in one of two ways:
// - "media:<id>" (mediaRef): private files a route streams after checking
//   the caller (an order document's `file`, a material's `storagePath`);
// - an address: "/api/media/<id>" for a public image (publicMediaUrl),
//   possibly absolute or with a query, and, by mistake, the staff address
//   "/api/admin/media/<id>/file".
// Both forms are matched, in every field the storefront reads a file or an
// image from: blog posts (cover, image blocks), products (photo, the gallery
// of the product page and of the partner page, attached files), material
// files and order documents.

// The shape lives in the panel's contract file, so screens can import it.
export type { MediaUsageItem, MediaUsageType } from "@/components/admin/media/types";

// Matches a field that holds a reference to `id` in either form. The id
// is escaped, and the address form must end right after it, so "m-1" never
// matches the file "m-12".
export function mediaReferencePattern(id: string): RegExp {
  const safe = escapeRegex(id);
  return new RegExp(`(?:^media:${safe}$)|(?:/api/(?:admin/)?media/${safe}(?:$|[/?#]))`);
}

function matches(pattern: RegExp, value: unknown): boolean {
  return typeof value === "string" && pattern.test(value);
}

async function blogUsage(pattern: RegExp): Promise<MediaUsageItem[]> {
  const posts = await collection("blogPosts");
  const filter = { $or: [{ image: pattern }, { "blocks.src": pattern }] } as Filter<BlogPostDoc>;
  const found = await posts.find(filter, { projection: { _id: 1, title: 1, image: 1, blocks: 1 } }).toArray();
  const items: MediaUsageItem[] = [];
  for (const post of found) {
    const base = { type: "blog" as const, id: post._id, label: post.title, href: `/admin/blog/${post._id}` };
    if (matches(pattern, post.image)) items.push({ ...base, field: "Обкладинка статті" });
    if ((post.blocks ?? []).some((block) => block.type === "image" && matches(pattern, block.src))) {
      items.push({ ...base, field: "Зображення в тексті статті" });
    }
  }
  return items;
}

async function productUsage(pattern: RegExp): Promise<MediaUsageItem[]> {
  const products = await collection("products");
  const filter = {
    $or: [
      { image: pattern },
      { "details.images": pattern },
      { "details.platformImages": pattern },
      { "files.file": pattern },
    ],
  } as Filter<ProductDoc>;
  const found = await products
    .find(filter, {
      projection: { _id: 1, title: 1, image: 1, "details.images": 1, "details.platformImages": 1, files: 1 },
    })
    .toArray();
  const items: MediaUsageItem[] = [];
  for (const product of found) {
    const base = { type: "product" as const, id: product._id, label: product.title, href: `/admin/products/${product._id}` };
    if (matches(pattern, product.image)) items.push({ ...base, field: "Фото в каталозі" });
    if ((product.details?.images ?? []).some((src) => matches(pattern, src))) {
      items.push({ ...base, field: "Галерея сторінки товару" });
    }
    if ((product.details?.platformImages ?? []).some((src) => matches(pattern, src))) {
      items.push({ ...base, field: "Галерея сторінки для партнерів" });
    }
    for (const file of product.files ?? []) {
      if (matches(pattern, file.file)) items.push({ ...base, field: `Файл товару «${file.name}»` });
    }
  }
  return items;
}

async function materialUsage(pattern: RegExp): Promise<MediaUsageItem[]> {
  const files = await collection("materialFiles");
  const found = await files
    .find({ storagePath: pattern } as Filter<MaterialFileDoc>, { projection: { _id: 1, name: 1 } })
    .toArray();
  return found.map((file) => ({
    type: "material" as const,
    id: file._id,
    label: file.name,
    field: "Файл бібліотеки матеріалів",
    href: `/admin/materials?file=${encodeURIComponent(file._id)}`,
  }));
}

async function orderUsage(pattern: RegExp): Promise<MediaUsageItem[]> {
  const orders = await collection("orders");
  const found = await orders
    .find({ "documents.file": pattern } as Filter<OrderDoc>, { projection: { _id: 1, number: 1, documents: 1 } })
    .toArray();
  const items: MediaUsageItem[] = [];
  for (const order of found as Pick<B2bOrderDoc, "_id" | "number" | "documents">[]) {
    for (const document of order.documents ?? []) {
      if (!matches(pattern, document.file)) continue;
      items.push({
        type: "order",
        id: order._id,
        label: `Замовлення №${order.number}`,
        field: `Документ «${document.title}»`,
        href: `/admin/orders/${order._id}`,
      });
    }
  }
  return items;
}

// Every place the file `id` is referenced (an empty list = unused).
export async function mediaUsage(id: string): Promise<MediaUsageItem[]> {
  const pattern = mediaReferencePattern(id);
  const groups = await Promise.all([
    blogUsage(pattern),
    productUsage(pattern),
    materialUsage(pattern),
    orderUsage(pattern),
  ]);
  return groups.flat();
}
