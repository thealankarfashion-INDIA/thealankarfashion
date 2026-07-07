import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  url?: string;
  image?: string;
  schema?: string;
  noindex?: boolean;
}

export default function SEO({
  title = "The Alankar — Premium Women's Fashion Jewellery & Ornaments Online",
  description = "Shop exquisite women's fashion jewellery at The Alankar. Discover handcrafted earrings, necklaces, bangles & hair accessories. Free shipping above ₹999. Trusted by 10,000+ customers across India.",
  keywords = "women fashion jewellery, premium women ornaments, buy fashion jewellery India, elegant women accessories, trendy jewellery shop",
  url = "https://thealankar.in",
  image = "https://thealankar.in/images/hero.png",
  schema,
  noindex = false
}: SEOProps) {
  const fullTitle = title.includes('The Alankar') ? title : `${title} | The Alankar`;

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{fullTitle}</title>
      {noindex && <meta name="robots" content="noindex, nofollow" />}
      <meta name="title" content={fullTitle} />
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <link rel="canonical" href={url} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content="website" />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />

      {/* Twitter */}
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={url} />
      <meta property="twitter:title" content={fullTitle} />
      <meta property="twitter:description" content={description} />
      <meta property="twitter:image" content={image} />

      {/* Dynamic JSON-LD Schema if provided */}
      {schema && (
        <script type="application/ld+json">
          {schema}
        </script>
      )}
    </Helmet>
  );
}
