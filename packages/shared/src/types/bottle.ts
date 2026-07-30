export interface BottleSkinDTO {
  id: string;
  name: string;
  imageUrl: string;
  priceHearts: number | null;
  isEvent: boolean;
  eventId: string | null;
  owned: boolean;
  active: boolean;
}
