import { INTRO_ASSETS, INTRO_COPY } from '../../config/intro';
import type { AppState } from '../../types';
import { escapeHtml } from '../../utils/html';

export function renderIntroScreen(appState: AppState): string {
  const { label, url } = appState.settings.introLink;
  const hasExternalLink = Boolean(url.trim());

  const externalButton = hasExternalLink
    ? `
      <button type="button" class="btn btn-intro-link" data-action="open-intro-link">
        ${escapeHtml(label.trim() || 'Kiểm tra nhận thức')}
      </button>
    `
    : '';

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
        <div class="intro-screen__actions ${hasExternalLink ? 'intro-screen__actions--dual' : 'intro-screen__actions--solo'}">
          <button type="button" class="btn btn-intro-start" data-action="complete-intro">
            ${INTRO_COPY.startLabel}
          </button>
          ${externalButton}
        </div>
      </div>

      <button type="button" class="intro-screen__skip" data-action="complete-intro">
        ${INTRO_COPY.skipLabel}
      </button>
    </section>
  `;
}
