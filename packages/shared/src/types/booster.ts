export type BoosterCategory = 'choice' | 'league';

export interface BoosterDTO {
  id: string;
  name: string;
  description: string;
  category: BoosterCategory;
  imageUrl: string;
  priceHearts: number | null;
  quantity: number;
}
