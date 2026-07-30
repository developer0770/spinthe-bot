export interface FrameDTO {
  id: string;
  name: string;
  imageUrl: string;
  priceHearts: number | null;
  locked: boolean;
  owned: boolean;
  active: boolean;
}
