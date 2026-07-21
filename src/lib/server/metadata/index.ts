/**
 * What a page says about itself: its title, its description, and its icon.
 *
 * Split three ways because the parts fail differently. `extract` and `favicon` are
 * pure string work and always succeed at something; `fetch` is the only part that
 * touches the network, and so the only part that can be defeated by a page being
 * private, slow, or not a page at all.
 */

export { extractMetadata } from './extract';
export { conventionalFavicon } from './favicon';
export { fetchMetadata } from './fetch';
