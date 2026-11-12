// The admin panel's UI kit: one import for a screen.
//
//   import { Button, DataTable, Page, PageHeader, useListParams, toast } from "@/components/admin/ui";
//
// Per-file imports keep working ("@/components/admin/ui/Button") and are
// what the kit's own files use. Every file opens with a comment block of
// its props and a usage example; /admin/ui-kit (development only) shows
// every component in every state.
//
// Table of contents
//
// Visual law (tokens.ts)
//   TEXT, SURFACE, CONTROL, FIELD     type scale, surfaces, control heights, the field look
//   FOCUS_RING, FOCUS_RING_INSET      keyboard focus outside / inside an element
//   FLOAT_SHADOW, LIFT_SHADOW, SCRIM  the only shadows and the modal scrim
//   EASE_OUT, COLOR_TRANSITION        motion
//   TONES, Tone, Z, ControlSize       the nine status tones, layer order, sm / md / lg
//
// Actions
//   Button                 pill button or link: primary, accent, secondary, ghost, danger, dangerGhost
//   IconButton             round icon-only button (label required), ghost / secondary / primary / danger
//   ButtonGroup            a row of related buttons
//
// Small things
//   Badge                  status pill of a tone, sm 24 / md 28, optional dot or icon
//   CountBadge             a counter ("needs attention" brand, or a calm tone)
//   Spinner                the busy ring (decorative, or announced with a label)
//   Skeleton               loading bar / pill / circle / tile / card
//   SkeletonText           loading paragraph
//   SkeletonRows           loading table (a whole card, or <tr> rows)
//   Avatar                 initials disc or picture of a person / company
//   Tooltip                short dark note on hover / keyboard focus
//
// Forms
//   Field, FieldFrame      label + control + hint / error frame (for controls outside the kit)
//   useFieldIds            ids and aria wiring for such a control
//   Input                  one-line text: prefix / suffix, icon, clearable, counter
//   Textarea               multi-line text, autoGrow, counter; variant "bare" = a writing surface
//   NumberInput            a number with decimal comma, min / max / step, steppers, clamp note
//   MoneyInput             hryvnias, 2 decimals
//   PasswordInput          password with eye toggle and "Згенерувати"
//   SearchInput            debounced search with clear and Escape
//   Select                 one value from a short list (custom listbox)
//   NativeSelect           the browser's select in the kit's pill
//   Combobox               one record from a server search (freeText: the typed text as the value)
//   MultiCombobox          several records from a server search, as chips
//   TagInput, Chip         free-text tags as chips (reorderable, invalid chips); the chip itself
//   Checkbox               one yes / no (indeterminate for "some")
//   Switch                 a setting that acts at once (tooltip for keyboard users too)
//   RadioGroup             one of a few, plain or as tiles
//   SegmentedControl       one of a few as the Tabs capsule (a radio group)
//   CheckboxGroup          several of a few
//   DateInput              a business day "YYYY-MM-DD"
//   DateTimeInput          a local date and time
//   DateRange              from / to with presets
//   PeriodFilter, periodText   a list's "Період" button with the range in a popover
//   FormSection, FormGrid, FormActions   the layout of an edit screen (FormActions idle: slim on phones)
//   useDirty               "the form differs from what was loaded"
//   useUnsavedWarning      ask before leaving with unsaved edits
//
// Media (media/)
//   ImageField             one picture: drop zone, preview, replace, library, alt text
//   GalleryField           ordered pictures: drag or arrows to reorder, add, remove
//   FileField              one document (PDF, office files)
//   MediaPicker            the library in a dialog: search, folder, upload, pick
//   DropZone, DropIcon     the drop / choose / paste region behind them
//   uploadMedia, prepareImage, mediaErrorMessage, checkImageFile, checkFile, mediaHref, fileTypeLabel
//
// Page layout and data
//   Page, PageHeader, PageSection, Stack, Grid   the screen's column, head, sections, layout
//   Card                   white r24 block (also dark and inset tones)
//   StatCard               KPI tile with a delta pill (size sm, trend slot)
//   AttentionItem          a row of a "needs attention" list (wrap: two-line title)
//   KeyValueList, CopyButton   facts of a record, with copy buttons (CopyButton size sm / md / lg)
//   OneTimeSecret          a login, an e-mail, a password or key shown once, with copy buttons
//   copyText               write text to the clipboard (lib/clipboard.ts)
//   Tabs, TabPanel, LinkTabs   tab capsule (state or links): open tab kept in view, marks, compactBelow
//   DataTable              the table: sort, selection, row links, expandable rows, marked row, states
//   MoneyCell, DateCell, TwoLineCell, ThumbCell   its helper cells
//   Pagination             pager with page size
//   FilterBar, FilterChip  search + filters + actions row (filtersLayout, secondary row), removable chips
//   TogglePill             a pressed filter pill (aria-pressed), with an optional count
//   BulkBar                the sticky bar of actions for a table's selection
//   useListParams          list state (q, filters, sort, page) in the URL (exclude: a drawer's ?id)
//   useMinWidth, useNow, useAddressParam   window width step, ticking clock, a drawer / tab in the address (lib/hooks.ts)
//   describeDevice         "Chrome, Windows" from a user agent (lib/device.ts)
//   EmptyState, ErrorState, LoadingBlock, NotFoundState, Forbidden   designed states
//   Timeline               vertical history of a record
//   OrderStatusBadge ... ActiveBadge, ORDER_STATUS ... ACCOUNT_TYPE, statusOptions, statusLabel   the status vocabulary
//
// Charts (charts/)
//   AreaChart              change over time, one or more series
//   BarChart               magnitudes of categories, columns or horizontal bars
//   DonutChart             part to whole, up to six parts (fit "container": by its own width)
//   Sparkline              tiny trend line
//   CHART_COLORS, seriesColor, formatCompact, formatPercent
//
// Layers
//   Modal, ModalFooter     dialog (sheet on phones) and its Cancel / Confirm pair
//   Drawer                 panel from the right edge
//   confirmDialog, promptDialog, ConfirmHost   promise questions and their host
//   DropdownMenu, KebabMenu    action menus
//   Popover                small non-modal card from a button
//   toast, toastError, ToastHost   short messages and their host
//   CommandPalette, PaletteTrigger, openPalette, closePalette   the panel-wide search
//   hasToastHost, hasConfirmHost, hasCommandPalette   whether a host is mounted
//
// Plumbing (for a layer or a control of a screen's own shape)
//   useFloating, useDismiss                     place and dismiss a floating layer
//   adminRoot, floatingRoot, useClientReady     where layers portal, and when
//   useModalLayer, useEscapeLayer, usePresence, lockScroll, focusableIn, hasOpenLayer, prefersReducedMotion
//   TriggerSlot, assignRef                      merge a caller's trigger / ref
//   useStickyBar, useStickyBarLift, remeasureStickyBars   bars stuck to the bottom and the toast stack above them
//   FIELD_BOX, FIELD_SURFACE, FIELD_ACTION ...  the field look for a custom control

// --- Visual law ------------------------------------------------------------
export {
  COLOR_TRANSITION,
  CONTROL,
  EASE_OUT,
  FIELD,
  FLOAT_SHADOW,
  FOCUS_RING,
  FOCUS_RING_INSET,
  LIFT_SHADOW,
  SCRIM,
  SURFACE,
  TEXT,
  TONES,
  Z,
  type ControlSize,
  type Tone,
} from "./tokens";

// --- Actions ---------------------------------------------------------------
export {
  Button,
  ButtonGroup,
  IconButton,
  SlotIcon,
  type ButtonGroupProps,
  type ButtonProps,
  type ButtonVariant,
  type IconButtonProps,
  type IconButtonVariant,
  type IconSlot,
  type IconType,
} from "./Button";

// --- Small things ----------------------------------------------------------
export { Badge, CountBadge, type BadgeProps, type BadgeSize, type CountBadgeProps } from "./Badge";
export { Spinner, type SpinnerProps, type SpinnerSize } from "./Spinner";
export { Skeleton, SkeletonRows, SkeletonText, type SkeletonRowsProps, type SkeletonShape } from "./Skeleton";
export { Avatar, type AvatarProps, type AvatarSize } from "./Avatar";
export { Tooltip, type TooltipProps } from "./Tooltip";

// --- Forms -----------------------------------------------------------------
export {
  FIELD_ACTION,
  FIELD_ACTION_SIZE,
  FIELD_BOX,
  FIELD_ERROR,
  FIELD_GAP,
  FIELD_ICON,
  FIELD_PL,
  FIELD_PR,
  FIELD_PR_ACTION,
  FIELD_SURFACE,
  Field,
  FieldFrame,
  hasField,
  present,
  useFieldIds,
  type FieldControlProps,
  type FieldError,
  type FieldIds,
  type FieldProps,
} from "./Field";
export {
  Input,
  MoneyInput,
  NumberInput,
  PasswordInput,
  SearchInput,
  Textarea,
  numberText,
  parseNumber,
  strongPassword,
  type EnterKeyHint,
  type InputMode,
  type InputProps,
  type MoneyInputProps,
  type NumberInputProps,
  type PasswordInputProps,
  type SearchInputProps,
  type TextareaProps,
} from "./Input";
export { NativeSelect, Select, ToneDot, type NativeSelectProps, type SelectOption, type SelectProps } from "./Select";
export { Combobox, MultiCombobox, type ComboboxProps, type MultiComboboxProps, type OptionState } from "./Combobox";
export { Chip, TagInput, type ChipProps, type TagInputProps } from "./TagInput";
export { SegmentedControl, type SegmentOption, type SegmentedControlProps } from "./SegmentedControl";
export {
  Checkbox,
  CheckboxGroup,
  RadioGroup,
  Switch,
  type CheckboxGroupProps,
  type CheckboxProps,
  type ChoiceOption,
  type RadioGroupProps,
  type SwitchProps,
} from "./Checkbox";
export {
  DATE_PRESETS,
  DateInput,
  DateRange,
  DateTimeInput,
  type DateInputProps,
  type DatePreset,
  type DateRangeProps,
  type DateRangeValue,
} from "./DateInput";
export { PeriodFilter, periodText, type PeriodFilterProps } from "./PeriodFilter";
export {
  FormActions,
  FormGrid,
  FormSection,
  useDirty,
  useUnsavedWarning,
  type FormActionsProps,
  type FormGridProps,
  type FormSectionProps,
  type UnsavedWarningOptions,
} from "./Form";

// --- Media -----------------------------------------------------------------
export { ImageField, type ImageAspect, type ImageFieldProps } from "./media/ImageField";
export { GalleryField, moveItem, type GalleryFieldProps } from "./media/GalleryField";
export { ACCEPT_DOCUMENTS, FileField, type FileFieldProps, type FileValue } from "./media/FileField";
export { MediaPicker, type MediaPickerProps } from "./media/MediaPicker";
export { DropIcon, DropZone, type DropZoneApi, type DropZoneProps } from "./media/DropZone";
export {
  checkFile,
  checkImageFile,
  fileTypeLabel,
  mediaErrorMessage,
  mediaHref,
  prepareImage,
  uploadMedia,
  type UploadAnswer,
  type UploadOptions,
} from "./media/upload";

// --- Page layout and data --------------------------------------------------
export {
  Grid,
  Page,
  PageHeader,
  PageSection,
  Stack,
  type Cols,
  type Gap,
  type GridCols,
  type PageHeaderProps,
  type PageSectionProps,
  type PageWidth,
} from "./Page";
export {
  AttentionItem,
  Card,
  StatCard,
  type AttentionItemProps,
  type CardPadding,
  type CardProps,
  type CardTone,
  type StatCardProps,
  type StatDelta,
} from "./Card";
export { CopyButton, KeyValueList, type CopyButtonSize, type KeyValueItem, type KeyValueListProps } from "./KeyValue";
export { OneTimeSecret, type OneTimeSecretItem, type OneTimeSecretProps } from "./OneTimeSecret";
export { copyText } from "../lib/clipboard";
export {
  LinkTabs,
  TabPanel,
  Tabs,
  panelId,
  tabId,
  type LinkTabItem,
  type TabItem,
  type TabMark,
  type TabsCompactBelow,
  type TabsProps,
} from "./Tabs";
export {
  DataTable,
  DateCell,
  MoneyCell,
  ThumbCell,
  TwoLineCell,
  type Column,
  type DataTableProps,
  type DataTableSelection,
  type HideBelow,
} from "./DataTable";
export { Pagination, type PaginationProps } from "./Pagination";
export { FilterBar, FilterChip, TogglePill, type FilterBarProps, type FilterChipItem, type TogglePillProps } from "./FilterBar";
export { BulkBar, type BulkBarProps } from "./BulkBar";
export { useListParams, type ListParams, type ListParamsOptions, type ListPatch, type ListPatchValue } from "./useListParams";
export { useAddressParam, useMinWidth, useNow, type AddressParam } from "../lib/hooks";
export { describeDevice, type Device } from "../lib/device";
export {
  EmptyState,
  ErrorState,
  Forbidden,
  LoadingBlock,
  NotFoundState,
  type EmptyStateProps,
  type ErrorStateProps,
  type NotFoundStateProps,
} from "./States";
export { Timeline, type TimelineItem } from "./Timeline";
export {
  ACCOUNT_TYPE,
  AccountTypeBadge,
  ActiveBadge,
  BLOG_STATUS,
  BlogStatusBadge,
  CHANNEL,
  ChannelBadge,
  ERP_STATE,
  ErpStateBadge,
  LEAD_KIND,
  LEAD_STATUS,
  LeadKindBadge,
  LeadStatusBadge,
  ORDER_STATUS,
  OrderStatusBadge,
  PAYMENT_STATUS,
  PaymentStatusBadge,
  RETURN_STATUS,
  ReturnStatusBadge,
  SHIPMENT_STATUS,
  ShipmentStatusBadge,
  statusLabel,
  statusOptions,
  type AccountType,
  type BlogStatus,
  type Channel,
  type ErpState,
  type LeadKind,
  type LeadStatus,
  type OrderStatus,
  type PaymentStatus,
  type ReturnStatus,
  type ShipmentStatus,
  type StatusBadgeOptions,
  type StatusMeta,
} from "./status";

// --- Charts ----------------------------------------------------------------
export { AreaChart, type AreaChartProps, type AreaDatum, type AreaSeries } from "./charts/AreaChart";
export { BarChart, type BarChartProps, type BarDatum } from "./charts/BarChart";
export { DonutChart, type DonutChartProps, type DonutDatum } from "./charts/DonutChart";
export { Sparkline, type SparklineProps } from "./charts/Sparkline";
export { CHART_COLORS, formatCompact, formatPercent, seriesColor } from "./charts/scale";

// --- Layers ----------------------------------------------------------------
export { Modal, ModalFooter, type ModalFooterProps, type ModalProps, type ModalSize } from "./Modal";
export { Drawer, type DrawerProps } from "./Drawer";
export { ConfirmHost, confirmDialog, hasConfirmHost, promptDialog, type ConfirmOptions, type PromptOptions } from "./ConfirmDialog";
export {
  DropdownMenu,
  KebabMenu,
  type DropdownMenuProps,
  type KebabMenuProps,
  type MenuAction,
  type MenuDivider,
  type MenuHeading,
  type MenuIcon,
  type MenuItem,
  type MenuTriggerProps,
} from "./DropdownMenu";
export { Popover, type PopoverProps, type PopoverTriggerProps } from "./Popover";
export { ToastHost, hasToastHost, toast, toastError, type ToastAction, type ToastOptions, type ToastTone } from "./Toast";
export { CommandPalette, PaletteTrigger, closePalette, hasCommandPalette, openPalette } from "./CommandPalette";

// --- Plumbing --------------------------------------------------------------
export { useDismiss, useFloating, type FloatingOptions, type Placement } from "./floating";
export { remeasureStickyBars, useStickyBar, useStickyBarLift } from "./stickyBars";
export {
  TriggerSlot,
  adminRoot,
  assignRef,
  floatingRoot,
  focusableIn,
  hasOpenLayer,
  lockScroll,
  prefersReducedMotion,
  useClientReady,
  useEscapeLayer,
  useModalLayer,
  usePresence,
  type ModalLayerOptions,
  type TriggerElementProps,
  type TriggerHandlers,
  type TriggerProp,
} from "./overlay";
