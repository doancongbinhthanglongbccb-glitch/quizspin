/** Asset intro & header — đặt file trong `public/images/` */
export const INTRO_ASSETS = {
  background: '/images/banner-293.jpg',
  headerLogo: '/images/Logo293.jpg',
} as const;

export const INTRO_COPY = {
  title: 'ĐOÀN CÔNG BINH THĂNG LONG',
  motto: 'CHỦ ĐỘNG - SÁNG TẠO - TỰ LỰC - TỰ CƯỜNG - TRƯỞNG THÀNH - VỮNG MẠNH',
  /** Hai dòng khẩu hiệu — đủ 12 chữ, wrap đẹp trên mobile */
  mottoLines: [
    'CHỦ ĐỘNG - SÁNG TẠO - TỰ LỰC - TỰ CƯỜNG',
    'TRƯỞNG THÀNH - VỮNG MẠNH',
  ],
  startLabel: 'BẮT ĐẦU HUẤN LUYỆN',
  skipLabel: 'Bỏ qua',
  replayLabel: 'Quay lại Intro',
  logoAlt: 'Đoàn Công Binh Thăng Long',
} as const;
