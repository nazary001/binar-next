import {
  ArrowUturnLeftIcon,
  BuildingOffice2Icon,
  ClipboardDocumentListIcon,
  Cog6ToothIcon,
  CubeIcon,
  CurrencyDollarIcon,
  FolderOpenIcon,
  InboxArrowDownIcon,
  NewspaperIcon,
  PhotoIcon,
  PuzzlePieceIcon,
  RectangleGroupIcon,
  ShieldCheckIcon,
  ShoppingBagIcon,
  Squares2X2Icon,
  TruckIcon,
  UserGroupIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";
import type { ComponentType, SVGProps } from "react";
import type { NavIconName } from "../lib/nav";

// The menu's icon names (lib/nav.ts) resolved to Heroicons outlines, the
// icon family the site's design is drawn with.
const ICONS: Record<NavIconName, ComponentType<SVGProps<SVGSVGElement>>> = {
  home: Squares2X2Icon,
  orders: ShoppingBagIcon,
  returns: ArrowUturnLeftIcon,
  shipping: TruckIcon,
  products: CubeIcon,
  categories: RectangleGroupIcon,
  pricing: CurrencyDollarIcon,
  customers: UsersIcon,
  companies: BuildingOffice2Icon,
  groups: UserGroupIcon,
  blog: NewspaperIcon,
  materials: FolderOpenIcon,
  media: PhotoIcon,
  leads: InboxArrowDownIcon,
  integrations: PuzzlePieceIcon,
  settings: Cog6ToothIcon,
  staff: ShieldCheckIcon,
  audit: ClipboardDocumentListIcon,
};

export function NavIcon({ name, className }: { name: NavIconName; className?: string }) {
  const Icon = ICONS[name];
  return <Icon aria-hidden className={className ?? "size-5"} strokeWidth={1.7} />;
}
