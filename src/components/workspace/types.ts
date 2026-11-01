import type { Plan } from '../../domain/types';
export type WorkspaceTab = 'overview' | 'budget' | 'timeline' | 'vendors' | 'ideas' | 'activity';
export interface ViewProps {
  plan: Plan;
  onChange: (plan: Plan) => void;
}
