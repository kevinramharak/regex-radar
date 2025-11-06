import type { Descriptor } from '../di/service-provider';

import { LinterCodeAction } from './handlers/linter';

export * from './events';
export * from './message-handler';

export const onCodeActionHandlers: Descriptor[] = [LinterCodeAction];
