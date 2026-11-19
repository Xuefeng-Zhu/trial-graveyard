import '@testing-library/jest-dom/vitest';
import fc from 'fast-check';

// Fixed seed keeps CI deterministic; failing seeds should be added as example tests.
fc.configureGlobal({ seed: 20261031, numRuns: 200 });

// jsdom has no canvas. Return no context so components skip drawing without logging errors.
HTMLCanvasElement.prototype.getContext = (() => null) as unknown as HTMLCanvasElement['getContext'];
