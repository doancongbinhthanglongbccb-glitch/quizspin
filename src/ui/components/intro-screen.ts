import { INTRO_ASSETS, INTRO_COPY } from '../../config/intro';
import type { AppState } from '../../types';
import { getVisibleIntroLinks, DEFAULT_INTRO_LINK_LABEL } from '../../data';
import { escapeHtml } from '../../utils/html';

export function renderIntroScreen(appState: AppState): string {
  const activeLinks = getVisibleIntroLinks(appState.settings.introLinks);
  const linkCount = activeLinks.length;

  const linkButtons = activeLinks
    .map((link) => {
      const label = link.label.trim() || DEFAULT_INTRO_LINK_LABEL;
      return `
        <button
          type="button"
          class="btn btn-intro-link"
          data-action="open-intro-link"
          data-intro-link-url="${encodeURIComponent(link.url.trim())}"
        >
          ${escapeHtml(label)}
        </button>
      `;
    })
    .join('');

  const actionsClass =
    linkCount === 0 ? 'intro-screen__actions--solo' : linkCount === 1 ? 'intro-screen__actions--dual' : 'intro-screen__actions--multi';

  const linksMarkup =
    linkCount > 1
      ? `<div class="intro-screen__link-row" role="group" aria-label="Liên kết ngoài">${linkButtons}</div>`
      : linkButtons;

  return `
    <section class="intro-screen" aria-label="Màn hình chào mừng">
      <div
        class="intro-screen__bg absolute inset-0 z-0 bg-[#050810] bg-cover bg-center bg-no-repeat"
        style="background-image: url('${INTRO_ASSETS.background}')"
        aria-hidden="true"
      ></div>
      <div class="intro-screen__overlay absolute inset-0 z-[1] bg-[#050810]/[0.72]" aria-hidden="true"></div>

      <div class="intro-screen__content relative z-[2] flex w-full max-w-full flex-col items-center justify-center gap-[22px] px-5 pb-24 pt-8 text-center xs:px-4 tablet:gap-6 tablet:px-6 tablet:pb-24 tablet:pt-8">
        <img
          class="intro-screen__logo"
          src="${INTRO_ASSETS.headerLogo}"
          alt="${INTRO_COPY.logoAlt}"
          width="120"
          height="120"
          decoding="async"
        />
        <h1 class="intro-screen__title">${INTRO_COPY.title}</h1>
        <div class="intro-screen__actions ${actionsClass}">
          <button type="button" class="btn btn-intro-start" data-action="complete-intro">
            ${INTRO_COPY.startLabel}
          </button>
          ${linksMarkup}
        </div>
      </div>

      <button type="button" class="intro-screen__skip" data-action="complete-intro">
        ${INTRO_COPY.skipLabel}
      </button>
    </section>
  `;
}
