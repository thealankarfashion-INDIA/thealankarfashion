import type { Order, OrderStatus } from "./types";

export const PAID_ORDER_STATUSES: OrderStatus[] = [
  "Verified",
  "Processing",
  "Shipped",
  "Delivered",
];

export const PAYMENT_SUBMITTED_STATUSES: OrderStatus[] = [
  "Under Verification",
  ...PAID_ORDER_STATUSES,
];

export function isPaidOrder(order: Pick<Order, "orderStatus">): boolean {
  return PAID_ORDER_STATUSES.includes(order.orderStatus);
}

export function hasSubmittedPayment(order: Pick<Order, "orderStatus">): boolean {
  return PAYMENT_SUBMITTED_STATUSES.includes(order.orderStatus);
}
