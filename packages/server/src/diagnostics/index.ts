import type { Descriptor } from '../di/service-provider';

import { LinterDiagnostic } from './handlers/linter';

export * from './events';
export * from './message-handler';

export const onDiagnosticHandlers: Descriptor[] = [LinterDiagnostic];
