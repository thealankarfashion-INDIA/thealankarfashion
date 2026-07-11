import type { Coupon } from './user';

type CouponImageFields = Partial<Coupon> & {
  image?: string;
  imageUrl?: string;
  banner?: string;
  bannerImage?: string;
  backgroundImage?: string;
  bgImage?: string;
  coverImage?: string;
};

const firstImage = (...values: unknown[]) =>
  values.find((value): value is string => typeof value === 'string' && value.trim().length > 0)?.trim() || '';

export const getCouponBannerImage = (coupon?: CouponImageFields | null) =>
  firstImage(
    coupon?.bannerImage,
    coupon?.backgroundImage,
    coupon?.bgImage,
    coupon?.coverImage,
    coupon?.banner,
    coupon?.image,
    coupon?.imageUrl
  );

export const getCouponIconImage = (coupon?: CouponImageFields | null) =>
  firstImage(coupon?.icon, getCouponBannerImage(coupon));
