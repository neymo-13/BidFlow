import { localInputToIso } from "@/lib/format";

// All values are strings because they come straight from inputs
// (times are <input type="datetime-local"> values in local time)
export interface AuctionFormValues {
  title: string;
  description: string;
  startPrice: string;
  minIncrement: string;
  startTime: string;
  endTime: string;
}

export type AuctionFieldName = keyof AuctionFormValues;
export type AuctionFieldErrors = Partial<Record<AuctionFieldName, string>>;

// Only fields that changed in edit mode; everything in create mode
export interface AuctionFormPayload {
  title?: string;
  description?: string;
  startPrice?: number;
  minIncrement?: number;
  startTime?: string; // ISO
  endTime?: string; // ISO
}

export const TITLE_MAX = 150;
export const DESCRIPTION_MAX = 5000;
const PRICE_MAX = 1_000_000_000; // keeps well inside DECIMAL(15,2)
const MONEY_PATTERN = /^\d+(\.\d{1,2})?$/;

// =====================================================
// Validation (server validates again)
// isChanged: in edit mode only changed times are checked against "now"
// (an unchanged start time of an old draft may already be in the past)
// =====================================================
export function validateAuctionForm(
  values: AuctionFormValues,
  isChanged: (field: AuctionFieldName) => boolean,
  now: number = Date.now()
): AuctionFieldErrors {
  const errors: AuctionFieldErrors = {};

  const title = values.title.trim();
  if (!title) errors.title = "Title is required";
  else if (title.length > TITLE_MAX) errors.title = `Title must be at most ${TITLE_MAX} characters`;

  if (values.description.length > DESCRIPTION_MAX) {
    errors.description = `Description must be at most ${DESCRIPTION_MAX} characters`;
  }

  const startPriceError = validateMoney(values.startPrice, "Start price");
  if (startPriceError) errors.startPrice = startPriceError;

  const incrementError = validateMoney(values.minIncrement, "Minimum increment");
  if (incrementError) errors.minIncrement = incrementError;

  const start = values.startTime ? new Date(values.startTime).getTime() : NaN;
  const end = values.endTime ? new Date(values.endTime).getTime() : NaN;

  if (Number.isNaN(start)) errors.startTime = "Start time is required";
  else if (isChanged("startTime") && start < now) errors.startTime = "Start time can't be in the past";

  if (Number.isNaN(end)) errors.endTime = "End time is required";
  else if (!Number.isNaN(start) && end <= start) errors.endTime = "End time must be after the start time";
  else if (isChanged("endTime") && end <= now) errors.endTime = "End time must be in the future";

  return errors;
}

function validateMoney(raw: string, label: string): string | null {
  const value = raw.trim();
  if (!value) return `${label} is required`;
  if (!MONEY_PATTERN.test(value)) return "Enter a positive number with up to 2 decimal places";
  const amount = Number(value);
  if (amount <= 0) return `${label} must be greater than 0`;
  if (amount > PRICE_MAX) return `${label} is too large`;
  return null;
}

export function buildAuctionPayload(
  values: AuctionFormValues,
  isChanged: (field: AuctionFieldName) => boolean
): AuctionFormPayload {
  const payload: AuctionFormPayload = {};
  if (isChanged("title")) payload.title = values.title.trim();
  if (isChanged("description")) payload.description = values.description.trim();
  if (isChanged("startPrice")) payload.startPrice = Number(values.startPrice.trim());
  if (isChanged("minIncrement")) payload.minIncrement = Number(values.minIncrement.trim());
  if (isChanged("startTime")) payload.startTime = localInputToIso(values.startTime);
  if (isChanged("endTime")) payload.endTime = localInputToIso(values.endTime);
  return payload;
}
