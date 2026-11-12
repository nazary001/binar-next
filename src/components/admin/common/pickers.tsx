"use client";

import { useCallback, useState } from "react";
import type { AccountType } from "@/components/auth/data";
import type { CompanyAnswer, CompanyRow } from "../companies/types";
import type { CustomerAnswer, CustomerRow } from "../customers/types";
import { adminApi } from "../lib/api";
import { formatMoney, qs } from "../lib/format";
import { useAdminQuery } from "../lib/query";
import type { ProductAnswer, ProductRow } from "../products/types";
import { useStaff } from "../shell/StaffProvider";
import type { StaffOption } from "../staff/types";
import { Combobox } from "../ui/Combobox";
import type { FieldControlProps } from "../ui/Field";
import { Select } from "../ui/Select";
import type { ControlSize } from "../ui/tokens";

// The pickers several sections share: a member of staff, a partner
// company, a customer account, a product. Each takes and gives an ID (the
// form a filter keeps in the address bar and a record keeps in the
// database) and looks the name up by itself.
//
//   <StaffSelect label="Менеджер" value={managerId} onChange={setManagerId} clearable />
//   <StaffSelect aria-label="Відповідальний" value={assignee} onChange={setAssignee} withNone clearable placeholder="Усі" />
//   <CompanyPicker label="Компанія" value={companyId} onChange={(id) => setCompanyId(id)} />
//   <CustomerPicker label="Акаунт" value={userId} onChange={(id, customer) => ...} type="b2b" />
//   <ProductPicker label="Додати товар" value={null} onChange={(id, product) => product && add(product)} exclude={chosenIds} />
//
// Shared rules
// - value: the id or null; onChange(id | null, record | null). The record
//   is what the search returned (CompanyOption ...), handy when the caller
//   wants the name without another request.
// - A picker whose list the role may not read renders nothing (a filter
//   simply is not offered): companies and accounts need customers.view,
//   products need catalog.view. The staff list is open to every member.
// - The Field props (label, hint, error, required, aria-label, className)
//   and size pass through to the kit control.

type PickerFrame = FieldControlProps & { size?: ControlSize; disabled?: boolean; placeholder?: string };

// --- staff -------------------------------------------------------------------

// The value a filter uses for "nobody is assigned".
export const STAFF_NONE = "none";

type StaffSelectProps = PickerFrame & {
  value: string | null;
  onChange: (id: string | null) => void;
  // Offers the "nobody" line (value STAFF_NONE), for filters.
  withNone?: boolean;
  noneLabel?: string;
  clearable?: boolean;
  // The name to show for a value that is not among the active staff any
  // more (a blocked or deleted person a record still names).
  fallbackName?: string;
};

export function StaffSelect({
  value,
  onChange,
  withNone = false,
  noneLabel = "Не призначено",
  clearable = false,
  fallbackName,
  placeholder = "Оберіть співробітника",
  ...frame
}: StaffSelectProps) {
  const staff = useAdminQuery<{ ok: true; items: StaffOption[] }>("/staff/options");
  const items = staff.data?.items ?? [];
  const options = [
    ...(withNone ? [{ value: STAFF_NONE, label: noneLabel }] : []),
    ...items.map((person) => ({ value: person.id, label: person.name, hint: person.roleName })),
  ];
  if (value && value !== STAFF_NONE && !items.some((person) => person.id === value)) {
    options.push({ value, label: fallbackName || "Колишній співробітник", hint: "Більше не має доступу" });
  }
  const shared = {
    ...frame,
    value,
    options,
    placeholder: staff.loading && !staff.data ? "Завантаження..." : placeholder,
    hint: staff.error ? "Не вдалося завантажити список співробітників." : frame.hint,
  };
  return clearable ? (
    <Select {...shared} clearable onChange={(next: string | null) => onChange(next)} />
  ) : (
    <Select {...shared} onChange={(next: string) => onChange(next)} />
  );
}

// --- companies ---------------------------------------------------------------

export type CompanyOption = { id: string; name: string; edrpou: string; city: string };

// Records the pickers have seen, so a value set from the address bar or
// by another picker shows its name without a request.
const COMPANIES = new Map<string, CompanyOption>();

function companyOption(row: Pick<CompanyRow, "id" | "name" | "edrpou" | "city">): CompanyOption {
  return { id: row.id, name: row.name, edrpou: row.edrpou, city: row.city };
}

async function searchCompanies(query: string): Promise<CompanyOption[]> {
  const result = await adminApi<{ items: CompanyRow[] }>(`/companies?${qs({ q: query, limit: 8, sort: "name" })}`);
  if (!result.ok) throw result;
  return result.data.items.map(companyOption);
}

type CompanyPickerProps = PickerFrame & {
  value: string | null;
  onChange: (id: string | null, company: CompanyOption | null) => void;
  clearable?: boolean;
};

export function CompanyPicker({ value, onChange, clearable = true, placeholder = "Назва або ЄДРПОУ", ...frame }: CompanyPickerProps) {
  const { can } = useStaff();
  const allowed = can("customers.view");
  const [picked, setPicked] = useState<CompanyOption | null>(null);
  const known = value === null ? null : picked?.id === value ? picked : (COMPANIES.get(value) ?? null);
  const lookup = useAdminQuery<CompanyAnswer>(allowed && value !== null && !known ? `/companies/${encodeURIComponent(value)}` : null);
  if (!allowed) return null;

  const loaded = lookup.data && lookup.data.company.id === value ? companyOption(lookup.data.company) : null;
  const record: CompanyOption | null =
    value === null ? null : (known ?? loaded ?? { id: value, name: lookup.error ? "Компанію не знайдено" : "Завантаження...", edrpou: "", city: "" });

  return (
    <Combobox<CompanyOption>
      {...frame}
      value={record}
      onChange={(company) => {
        if (company) COMPANIES.set(company.id, company);
        setPicked(company);
        onChange(company ? company.id : null, company);
      }}
      search={searchCompanies}
      getKey={(company) => company.id}
      getLabel={(company) => company.name}
      renderOption={(company) => (
        <>
          <span className="block truncate">{company.name}</span>
          <span className="block truncate text-[12px] leading-4 text-neutral-500">
            {[company.edrpou && `ЄДРПОУ ${company.edrpou}`, company.city].filter(Boolean).join(", ") || "Без реквізитів"}
          </span>
        </>
      )}
      placeholder={placeholder}
      emptyText="Компаній не знайдено"
      clearable={clearable}
    />
  );
}

// --- customer accounts ---------------------------------------------------------

export type CustomerOption = { id: string; name: string; login: string; type: AccountType; companyName: string };

const CUSTOMERS = new Map<string, CustomerOption>();

function customerOption(row: Pick<CustomerRow, "id" | "name" | "login" | "type" | "company">): CustomerOption {
  return { id: row.id, name: row.name || row.login, login: row.login, type: row.type, companyName: row.company?.name ?? "" };
}

type CustomerPickerProps = PickerFrame & {
  value: string | null;
  onChange: (id: string | null, customer: CustomerOption | null) => void;
  // Only partners or only retail customers.
  type?: AccountType;
  clearable?: boolean;
};

export function CustomerPicker({ value, onChange, type, clearable = true, placeholder = "Ім'я, логін, телефон або e-mail", ...frame }: CustomerPickerProps) {
  const { can } = useStaff();
  const allowed = can("customers.view");
  const [picked, setPicked] = useState<CustomerOption | null>(null);
  const known = value === null ? null : picked?.id === value ? picked : (CUSTOMERS.get(value) ?? null);
  const lookup = useAdminQuery<CustomerAnswer>(allowed && value !== null && !known ? `/customers/${encodeURIComponent(value)}` : null);
  const search = useCallback(
    async (query: string): Promise<CustomerOption[]> => {
      const result = await adminApi<{ items: CustomerRow[] }>(`/customers?${qs({ q: query, type, limit: 8 })}`);
      if (!result.ok) throw result;
      return result.data.items.map(customerOption);
    },
    [type],
  );
  if (!allowed) return null;

  const loaded = lookup.data && lookup.data.customer.id === value ? customerOption(lookup.data.customer) : null;
  const record: CustomerOption | null =
    value === null
      ? null
      : (known ??
        loaded ?? { id: value, name: lookup.error ? "Акаунт не знайдено" : "Завантаження...", login: "", type: type ?? "b2c", companyName: "" });

  return (
    <Combobox<CustomerOption>
      {...frame}
      value={record}
      onChange={(customer) => {
        if (customer) CUSTOMERS.set(customer.id, customer);
        setPicked(customer);
        onChange(customer ? customer.id : null, customer);
      }}
      search={search}
      searchKey={type ?? "all"}
      getKey={(customer) => customer.id}
      getLabel={(customer) => customer.name}
      renderOption={(customer) => (
        <>
          <span className="block truncate">{customer.name}</span>
          <span className="block truncate text-[12px] leading-4 text-neutral-500">
            {[customer.login, customer.type === "b2b" ? customer.companyName || "Партнер B2B" : "Покупець B2C"].filter(Boolean).join(", ")}
          </span>
        </>
      )}
      placeholder={placeholder}
      emptyText="Акаунтів не знайдено"
      clearable={clearable}
    />
  );
}

// --- products ------------------------------------------------------------------

export type ProductOption = { id: string; title: string; sku: string; image: string; price: number; volume: string; archived: boolean };

const PRODUCTS = new Map<string, ProductOption>();

function productOption(row: Pick<ProductRow, "id" | "title" | "sku" | "image" | "price" | "volume" | "archived">): ProductOption {
  return { id: row.id, title: row.title, sku: row.sku, image: row.image, price: row.price, volume: row.volume, archived: row.archived };
}

async function searchProducts(query: string): Promise<ProductOption[]> {
  const result = await adminApi<{ items: ProductRow[] }>(`/products?${qs({ q: query, limit: 8 })}`);
  if (!result.ok) throw result;
  return result.data.items.map(productOption);
}

type ProductPickerProps = PickerFrame & {
  value: string | null;
  onChange: (id: string | null, product: ProductOption | null) => void;
  // Ids that cannot be picked (already in the list being edited, the
  // product itself).
  exclude?: readonly string[];
  clearable?: boolean;
};

export function ProductPicker({ value, onChange, exclude, clearable = true, placeholder = "Назва, артикул або код товару", ...frame }: ProductPickerProps) {
  const { can } = useStaff();
  const allowed = can("catalog.view");
  const [picked, setPicked] = useState<ProductOption | null>(null);
  const known = value === null ? null : picked?.id === value ? picked : (PRODUCTS.get(value) ?? null);
  const lookup = useAdminQuery<ProductAnswer>(allowed && value !== null && !known ? `/products/${encodeURIComponent(value)}` : null);
  if (!allowed) return null;

  const detail = lookup.data && lookup.data.product.id === value ? lookup.data.product : null;
  const loaded: ProductOption | null = detail
    ? { id: detail.id, title: detail.title, sku: "", image: detail.image, price: detail.price, volume: "", archived: false }
    : null;
  const record: ProductOption | null =
    value === null
      ? null
      : (known ??
        loaded ?? { id: value, title: lookup.error ? "Товар не знайдено" : "Завантаження...", sku: "", image: "", price: 0, volume: "", archived: false });

  return (
    <Combobox<ProductOption>
      {...frame}
      value={record}
      onChange={(product) => {
        if (product) PRODUCTS.set(product.id, product);
        setPicked(product);
        onChange(product ? product.id : null, product);
      }}
      search={searchProducts}
      getKey={(product) => product.id}
      getLabel={(product) => product.title}
      isDisabled={exclude ? (product) => exclude.includes(product.id) : undefined}
      renderOption={(product) => (
        <>
          <span className="block truncate">{product.title}</span>
          <span className="block truncate text-[12px] leading-4 text-neutral-500">
            {[product.sku && `Арт. ${product.sku}`, product.volume, formatMoney(product.price), product.archived ? "в архіві" : ""]
              .filter(Boolean)
              .join(", ")}
          </span>
        </>
      )}
      placeholder={placeholder}
      minChars={2}
      emptyText="Товарів не знайдено"
      clearable={clearable}
    />
  );
}
