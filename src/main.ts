import './styles.css';
import { SPIN_CONFIG } from './config/spin';
import { bootstrap } from './core/actions';

document.documentElement.style.setProperty('--spin-duration', `${SPIN_CONFIG.durationMs}ms`);

void bootstrap();
