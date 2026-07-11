import type { Offer } from './types';

type OfferImageFields = Partial<Offer> & {
  imageUrl?: string;
  banner?: string;
  bannerImage?: string;
  backgroundImage?: string;
  bgImage?: string;
  coverImage?: string;
  desktopImage?: string;
};

const firstImage = (...values: unknown[]) =>
  values.find((value): value is string => typeof value === 'string' && value.trim().length > 0)?.trim() || '';

export const getOfferImage = (offer?: OfferImageFields | null) =>
  firstImage(
    offer?.image,
    offer?.imageUrl,
    offer?.bannerImage,
    offer?.backgroundImage,
    offer?.bgImage,
    offer?.coverImage,
    offer?.banner,
    offer?.desktopImage
  );
