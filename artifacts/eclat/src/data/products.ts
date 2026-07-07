export interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  collection: string;
  category: string;
  colors: { name: string; hex: string }[];
  sizes: string[];
  description: string;
  fabric: string;
  fit: string;
  occasion: string;
  images: string[];
  isNew: boolean;
  isBestSeller: boolean;
  rating: number;
  reviewCount: number;
}

export const products: Product[] = [
  {
    id: "p1",
    name: "Aurelia Silk Slip Dress",
    price: 395,
    collection: "Evening Reverie",
    category: "Dresses",
    colors: [
      { name: "Blush", hex: "#F7F1EE" },
      { name: "Champagne", hex: "#E8D8D1" },
      { name: "Midnight", hex: "#2A2A2A" }
    ],
    sizes: ["XS", "S", "M", "L"],
    description: "The Aurelia slip dress is cut from liquid silk charmeuse that drapes beautifully over the frame. Featuring a subtle cowl neckline and adjustable barely-there straps, it is the epitome of effortless evening glamour.",
    fabric: "100% Mulberry Silk Charmeuse",
    fit: "True to size. Bias cut for a flattering drape.",
    occasion: "Evening",
    images: ["/images/product-1.png", "/images/product-7.png"],
    isNew: true,
    isBestSeller: true,
    rating: 4.9,
    reviewCount: 42
  },
  {
    id: "p2",
    name: "Colette Tailored Coat",
    price: 895,
    originalPrice: 1100,
    collection: "Daily Luxe",
    category: "Outerwear",
    colors: [
      { name: "Caramel", hex: "#B47A67" },
      { name: "Ivory", hex: "#FBF6F3" }
    ],
    sizes: ["XS", "S", "M", "L", "XL"],
    description: "An investment piece that transcends seasons. The Colette coat is tailored from double-faced Italian wool, featuring a relaxed dropped shoulder, wide lapels, and a sweeping length that commands attention.",
    fabric: "80% Virgin Wool, 20% Cashmere",
    fit: "Oversized fit. We recommend sizing down if you prefer a more tailored look.",
    occasion: "Daily",
    images: ["/images/product-2.png", "/images/collection-daily.png"],
    isNew: false,
    isBestSeller: true,
    rating: 4.8,
    reviewCount: 128
  },
  {
    id: "p3",
    name: "Margot Wide Leg Trouser",
    price: 325,
    collection: "Statement Silhouettes",
    category: "Pants",
    colors: [
      { name: "Ivory", hex: "#F7F1EE" },
      { name: "Rose Gold", hex: "#C8927D" },
      { name: "Onyx", hex: "#1A1A1A" }
    ],
    sizes: ["XS", "S", "M", "L"],
    description: "Flowing beautifully with every step, the Margot trousers offer a dramatic wide-leg silhouette balanced by a sharply tailored high waist. Front pleats add structural elegance to the fluid fabric.",
    fabric: "Fluid Crepe, 70% Triacetate, 30% Polyester",
    fit: "High-waisted, true to size.",
    occasion: "Statement",
    images: ["/images/product-3.png", "/images/product-3.png"],
    isNew: true,
    isBestSeller: false,
    rating: 5.0,
    reviewCount: 15
  },
  {
    id: "p4",
    name: "Camille Architectural Blazer",
    price: 595,
    collection: "Statement Silhouettes",
    category: "Outerwear",
    colors: [
      { name: "Rose Gold", hex: "#C8927D" },
      { name: "Ivory", hex: "#FBF6F3" }
    ],
    sizes: ["XS", "S", "M", "L", "XL"],
    description: "Structured yet supremely feminine. The Camille blazer features sharp, padded shoulders and a nipped-in waist that creates an impeccable hourglass shape. A masterclass in modern tailoring.",
    fabric: "Italian Wool Blend, Silk lining",
    fit: "Tailored fit. True to size.",
    occasion: "Statement",
    images: ["/images/product-4.png", "/images/collection-statement.png"],
    isNew: true,
    isBestSeller: true,
    rating: 4.7,
    reviewCount: 84
  },
  {
    id: "p5",
    name: "Elise Cashmere Turtleneck",
    price: 450,
    collection: "Daily Luxe",
    category: "Knitwear",
    colors: [
      { name: "Warm Beige", hex: "#E8D8D1" },
      { name: "Blush", hex: "#F7F1EE" },
      { name: "Cocoa", hex: "#8E5E4F" }
    ],
    sizes: ["XS", "S", "M", "L"],
    description: "Sumptuously soft against the skin, the Elise turtleneck is spun from the finest Mongolian cashmere. It features a relaxed silhouette with elongated ribbed cuffs and a slouchy neck that can be styled effortlessly.",
    fabric: "100% Grade-A Cashmere",
    fit: "Relaxed fit.",
    occasion: "Daily",
    images: ["/images/product-5.png", "/images/product-5.png"],
    isNew: false,
    isBestSeller: true,
    rating: 4.9,
    reviewCount: 215
  },
  {
    id: "p6",
    name: "Vivienne Pleated Midi Skirt",
    price: 295,
    collection: "The Occasion Edit",
    category: "Skirts",
    colors: [
      { name: "Dusty Rose", hex: "#B47A67" },
      { name: "Champagne", hex: "#E8D8D1" }
    ],
    sizes: ["XS", "S", "M", "L"],
    description: "Sunburst pleats create mesmerizing movement in the Vivienne midi skirt. Crafted from lightweight georgette, it sways gracefully from desk to dinner.",
    fabric: "100% Polyester Georgette",
    fit: "Sits at the natural waist. True to size.",
    occasion: "Occasion",
    images: ["/images/product-6.png", "/images/product-6.png"],
    isNew: false,
    isBestSeller: false,
    rating: 4.6,
    reviewCount: 38
  },
  {
    id: "p7",
    name: "Genevieve Evening Gown",
    price: 1250,
    collection: "Evening Reverie",
    category: "Dresses",
    colors: [
      { name: "Champagne", hex: "#E8D8D1" },
      { name: "Rose Gold", hex: "#C8927D" },
      { name: "Midnight", hex: "#2A2A2A" }
    ],
    sizes: ["XS", "S", "M", "L"],
    description: "The showstopper. The Genevieve gown features masterful draping across the bodice, a thigh-high slit, and a dramatic sweeping train. For the moments that demand absolute perfection.",
    fabric: "Heavy Silk Satin",
    fit: "Fitted bodice, flowing skirt. True to size.",
    occasion: "Evening",
    images: ["/images/product-7.png", "/images/collection-evening.png"],
    isNew: true,
    isBestSeller: false,
    rating: 5.0,
    reviewCount: 8
  },
  {
    id: "p8",
    name: "Amelie Silk Blouse",
    price: 350,
    collection: "Daily Luxe",
    category: "Tops",
    colors: [
      { name: "Ivory", hex: "#FBF6F3" },
      { name: "Blush", hex: "#F7F1EE" }
    ],
    sizes: ["XS", "S", "M", "L", "XL"],
    description: "A reimagined classic. The Amelie blouse features a delicate lavallière bow and billowing bishop sleeves. Crafted from sandwashed silk that glows with a subtle luster.",
    fabric: "100% Sandwashed Silk",
    fit: "Relaxed fit.",
    occasion: "Daily",
    images: ["/images/product-8.png", "/images/product-8.png"],
    isNew: false,
    isBestSeller: true,
    rating: 4.8,
    reviewCount: 156
  }
];