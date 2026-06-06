import { INTRO_ASSETS, INTRO_COPY } from '../../config/intro';

export function renderIntroScreen(): string {
  const mottoLines = INTRO_COPY.mottoLines
    .map((line) => `<span class="intro-screen__motto-line">${line}</span>`)
    .join('');

  return `
    <section class="intro-screen" aria-label="Màn hình chào mừng">
      <div
        class="intro-screen__bg"
        style="background-image: url('${INTRO_ASSETS.background}')"
        aria-hidden="true"
      ></div>
      <div class="intro-screen__overlay" aria-hidden="true"></div>

      <div class="intro-screen__content">
        <h1 class="intro-screen__title">${INTRO_COPY.title}</h1>
        <p class="intro-screen__motto" aria-label="${INTRO_COPY.motto}">${mottoLines}</p>

        <button type="button" class="btn btn-intro-start" data-action="complete-intro">
          ${INTRO_COPY.startLabel}
        </button>
      </div>

      <button type="button" class="intro-screen__skip" data-action="complete-intro">
        ${INTRO_COPY.skipLabel}
      </button>
    </section>
  `;
}
