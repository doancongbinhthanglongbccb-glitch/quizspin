/** Thời lượng animation intro — khớp keyframes trong `styles.css` */
export const INTRO_TIMING = {
  fullExitMs: 480,
  backdropExitMs: 420,
} as const;

/** Asset intro & header — đặt file trong `public/images/` */
export const INTRO_ASSETS = {
  background: '/images/banner-293.jpg',
  headerLogo: '/images/Logo293.jpg',
} as const;

export const INTRO_COPY = {
  title: 'BỔ TRỢ GIÁO DỤC - CHÍNH TRỊ',
  startLabel: 'VÒNG XOAY KIẾN THỨC',
  skipLabel: 'Bỏ qua',
  replayLabel: 'Quay lại',
  logoAlt: 'Bổ trợ giáo dục - chính trị',
} as const;
