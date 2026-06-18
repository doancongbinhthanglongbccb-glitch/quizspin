import './styles.css';
import { SPIN_CONFIG } from './config/spin';
import { bootstrap } from './core/actions';
import { initPlatformFlags, initAndroidKeyboardInset } from './utils/platform';

initPlatformFlags();
initAndroidKeyboardInset();
document.documentElement.style.setProperty('--spin-duration', `${SPIN_CONFIG.durationMs}ms`);

void bootstrap();
