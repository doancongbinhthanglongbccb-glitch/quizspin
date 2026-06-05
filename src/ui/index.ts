// Barrel for UI root exports. Re-exports the main components renderer to provide
// a stable import path (import from '../../ui'). This avoids ambiguity between
// a file named `components.ts` and the `components/` directory.
export * from './components';
