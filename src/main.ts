import '@fontsource/be-vietnam-pro/400.css';
import '@fontsource/be-vietnam-pro/500.css';
import '@fontsource/be-vietnam-pro/600.css';
import '@fontsource/be-vietnam-pro/700.css';
import '@fontsource/be-vietnam-pro/800.css';
import '@fontsource/be-vietnam-pro/900.css';
import '@fontsource/source-serif-4/400.css';
import '@fontsource/source-serif-4/600.css';
import '@fontsource/source-serif-4/700.css';
import './styles.css';
import { SPIN_CONFIG } from './config/spin';
import { bootstrap } from './core/actions';
import { initPlatformFlags, initAndroidKeyboardInset } from './utils/platform';

initPlatformFlags();
initAndroidKeyboardInset();
document.documentElement.style.setProperty('--spin-duration', `${SPIN_CONFIG.durationMs}ms`);

void bootstrap();
