/** Check Flip — v1.8: page title, description and the "What is Check Flip?" text in both languages. */
import {extendStrings} from './i18n.js';
import {SEO} from './seo-text.js';
extendStrings({
  en: {title: SEO.en.title, metaDesc: SEO.en.desc, seoH1: SEO.en.h1, seoAbout: SEO.en.about},
  tr: {title: SEO.tr.title, metaDesc: SEO.tr.desc, seoH1: SEO.tr.h1, seoAbout: SEO.tr.about}
});
