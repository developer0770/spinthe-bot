export interface GiftDTO {
  id: string;
  name: string;
  emoji: string;
  priceHearts: number;
  isEvent: boolean;
  eventId: string | null;
  sortOrder: number;
}
