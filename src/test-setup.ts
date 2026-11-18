import '@testing-library/jest-dom/vitest';
import fc from 'fast-check';

// Fixed seed keeps CI deterministic; failing seeds should be added as example tests.
fc.configureGlobal({ seed: 20261031, numRuns: 200 });
