import Head from "next/head";
import PropTypes from "prop-types";

/**
 * Reusable SEO component for standardizing meta tags across the application.
 * Follows Open Graph and Twitter Card standards for rich social previews.
 */
const SeoHead = ({ title, description, keywords, ogImage, ogUrl }) => {
  const siteName = "Avanti Fellows College Predictor";
  const defaultDescription =
    "Predict your college admissions based on your ranks in JEE, JoSAA, TNEA, and more with Avanti Fellows College Predictor.";
  const defaultKeywords =
    "College Predictor, JEE Main, JEE Advanced, JoSAA, TNEA, Avanti Fellows, Engineering Admissions, India";
  const defaultImage = "https://cdn.avantifellows.org/af_logos/avanti_logo_black_text.webp";
  const baseUrl = "https://college-predictor.avantifellows.org"; // Ensure this is the correct production domain if possible

  const metaTitle = title || siteName;
  const metaDescription = description || defaultDescription;
  const metaKeywords = keywords || defaultKeywords;
  const metaImage = ogImage || defaultImage;
  const metaUrl = ogUrl || baseUrl;

  return (
    <Head>
      <title>{metaTitle}</title>
      <meta name="description" content={metaDescription} />
      <meta name="keywords" content={metaKeywords} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content="website" />
      <meta property="og:url" content={metaUrl} />
      <meta property="og:title" content={metaTitle} />
      <meta property="og:description" content={metaDescription} />
      <meta property="og:image" content={metaImage} />
      <meta property="og:site_name" content={siteName} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={metaUrl} />
      <meta name="twitter:title" content={metaTitle} />
      <meta name="twitter:description" content={metaDescription} />
      <meta name="twitter:image" content={metaImage} />
    </Head>
  );
};

SeoHead.propTypes = {
  title: PropTypes.string,
  description: PropTypes.string,
  keywords: PropTypes.string,
  ogImage: PropTypes.string,
  ogUrl: PropTypes.string,
};

export default SeoHead;
