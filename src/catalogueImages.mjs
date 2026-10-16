export const catalogueImageProps = (source, registry, {hero = false} = {}) => {
  const item = registry.items.find(item => item.original === source)
  // Unverified rights, missing files and unreviewed derivatives never activate.
  if (!item || item.rights_status !== 'VERIFIED' || item.visual_review !== 'PASS' ||
      !item.rights_evidence || !item.variants?.length) return {src: source}
  const variants = item.variants
  if (!variants.every(v => Number.isInteger(v.width) && v.width > 0 &&
      /^\/catalogue-v3\/responsive\/[a-z0-9-]+\.[a-f0-9]{12}\.webp$/.test(v.src))) return {src: source}
  const sorted = [...variants].sort((a,b) => a.width-b.width)
  return {src: sorted[sorted.length-1].src,
    srcSet: sorted.map(v => `${v.src} ${v.width}w`).join(', '),
    // Match the existing 600/900px grid breakpoints, container padding, gaps
    // and tile borders. Category headers use their existing 280px column.
    sizes: hero ? '(max-width: 600px) calc(100vw - 32px), 280px' :
      '(max-width: 600px) calc(100vw - 34px), (max-width: 900px) calc((100vw - 74px) / 2), (max-width: 1200px) calc((100vw - 98px) / 3), 367.34px'}
}
