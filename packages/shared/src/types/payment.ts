export interface HeartsPackDTO {
  id: string;
  hearts: number;
  bonusPercent: number;
  priceStars: number;
  badge: null | 'best' | 'hit';
  imageUrl: string;
}

export interface ShopOfferDTO {
  id: string;
  type: 'vip' | 'invite' | 'compliment';
  title: string;
  subtitle?: string;
  imageUrl: string;
}
