import type { IntroLinkSettings } from '../types';
import { MAX_INTRO_LINKS } from '../types';

export const DEFAULT_INTRO_LINK_LABEL = 'Kiểm tra nhận thức';

function normalizeIntroLinkEntry(raw: unknown, index: number): IntroLinkSettings {
  const item = raw as Partial<IntroLinkSettings> | undefined;
  const label = typeof item?.label === 'string' ? item.label.trim() : '';
  const url = typeof item?.url === 'string' ? item.url.trim() : '';
  return {
    label: label || (index === 0 ? DEFAULT_INTRO_LINK_LABEL : ''),
    url,
  };
}

export function compactIntroLinks(links: IntroLinkSettings[]): IntroLinkSettings[] {
  return links
    .map((item, index) => normalizeIntroLinkEntry(item, index))
    .filter((item) => item.label || item.url)
    .slice(0, MAX_INTRO_LINKS);
}

export function normalizeIntroLinks(
  raw: unknown,
  legacySingle?: IntroLinkSettings,
): IntroLinkSettings[] {
  let links: IntroLinkSettings[] = [];

  if (Array.isArray(raw)) {
    links = raw.map((item, index) => normalizeIntroLinkEntry(item, index));
  } else if (legacySingle) {
    links = [normalizeIntroLinkEntry(legacySingle, 0)];
  }

  return compactIntroLinks(links);
}

export function getVisibleIntroLinks(links: IntroLinkSettings[]): IntroLinkSettings[] {
  return links.filter((item) => item.url.trim());
}
