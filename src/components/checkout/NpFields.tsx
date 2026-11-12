"use client";

import { api } from "@/lib/api/client";
import { SearchField, type SearchFn, type SearchOption } from "./fields";
import {
  NP_CITY_MAX,
  NP_CITY_MIN,
  NP_PLACE_MAX,
  NP_REF,
  npQueryText,
  type NpListAnswer,
  type NpPlaceKind,
  type NpPublicCity,
  type NpPublicPlace,
} from "./novaPoshta";

// The checkout fields that search Nova Poshta's real directory (only while
// the shop has switched the search on; CheckoutForm otherwise renders the
// fixed lists). They are SearchField with the public routes behind it:
// «Місто» asks /api/np/cities from two characters on; «Відділення» and
// «Поштомат» list the branches / postomats of the picked city from
// /api/np/warehouses and narrow them as the customer types. A field whose
// list cannot be had (no city picked, the carrier down) is plain free text.

// "м. Київ, Київська обл.": desktop rows show the whole line, phones the
// settlement over its region (the two-line rows of the branch lists).
function cityOption(city: NpPublicCity): SearchOption {
  const label = city.label || [city.name, city.area].filter(Boolean).join(", ");
  const at = label.indexOf(", ");
  return at > 0
    ? { key: city.ref, value: city.name, label, primary: label.slice(0, at), secondary: label.slice(at + 2) }
    : { key: city.ref, value: city.name, label };
}

// "Відділення №12: вул. Родини Бунге, 8": the line is the field's text
// once picked, split at ": " for the phone rows like the fixed lists.
function placeOption(place: NpPublicPlace): SearchOption {
  const at = place.name.indexOf(": ");
  return at > 0
    ? { key: place.ref, value: place.name, label: place.name, primary: place.name.slice(0, at), secondary: place.name.slice(at + 2) }
    : { key: place.ref, value: place.name, label: place.name };
}

function rowsOf<T extends { ref: unknown; name: unknown }>(data: NpListAnswer<T> | null): T[] | null {
  if (!data || !Array.isArray(data.items)) return null;
  return data.items.filter((row) => typeof row.ref === "string" && NP_REF.test(row.ref) && typeof row.name === "string" && row.name !== "");
}

const searchCities: SearchFn = async (query, _scope, signal) => {
  // Text no place name holds (or too much of it) matches nothing: there is
  // nothing to ask the carrier.
  const q = npQueryText(query, NP_CITY_MAX);
  if (q === null || q.length < NP_CITY_MIN) return [];
  const result = await api<NpListAnswer<NpPublicCity>>(`/api/np/cities?${new URLSearchParams({ q })}`, { signal });
  if (!result.ok) return null;
  return rowsOf(result.data)?.map(cityOption) ?? null;
};

// scope = "<cityRef>:<kind>"
const searchPlaces: SearchFn = async (query, scope, signal) => {
  const [cityRef, kind] = scope.split(":");
  const q = npQueryText(query, NP_PLACE_MAX);
  if (q === null) return [];
  const params = new URLSearchParams({ cityRef, kind });
  if (q) params.set("q", q);
  const result = await api<NpListAnswer<NpPublicPlace>>(`/api/np/warehouses?${params}`, { signal });
  if (!result.ok) return null;
  return rowsOf(result.data)?.map(placeOption) ?? null;
};

export function NpCityField({
  value,
  cityRef,
  onType,
  onPick,
  error,
}: {
  value: string;
  cityRef?: string;
  onType: (text: string) => void;
  onPick: (city: SearchOption) => void;
  error?: string;
}) {
  return (
    <SearchField
      label="Місто"
      name="city"
      autoComplete="address-level2"
      enterKeyHint="next"
      announceError={false}
      value={value}
      query={value}
      minChars={NP_CITY_MIN}
      scope="city"
      search={searchCities}
      selectedKey={cityRef}
      onChange={onType}
      onPick={onPick}
      error={error}
    />
  );
}

export function NpPlaceField({
  kind,
  label,
  name,
  value,
  cityRef,
  placeRef,
  onType,
  onPick,
  error,
}: {
  kind: NpPlaceKind;
  label: string;
  name: string;
  value: string;
  cityRef?: string;
  placeRef?: string;
  onType: (text: string) => void;
  onPick: (place: SearchOption) => void;
  error?: string;
}) {
  return (
    <SearchField
      label={label}
      name={name}
      enterKeyHint="next"
      announceError={false}
      value={value}
      // A picked row shows the whole list of the city again when the field
      // is opened; typed text narrows it.
      query={placeRef ? "" : value}
      minChars={0}
      scope={cityRef ? `${cityRef}:${kind}` : null}
      search={searchPlaces}
      selectedKey={placeRef}
      onChange={onType}
      onPick={onPick}
      error={error}
    />
  );
}
