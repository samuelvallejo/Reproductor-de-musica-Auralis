import { createRoot } from 'react-dom/client';
import { App } from './App';
import { library } from './lib/library';
import './styles.css';

void library.initialize();
createRoot(document.getElementById('root')!).render(<App />);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') void library.flush(); });
