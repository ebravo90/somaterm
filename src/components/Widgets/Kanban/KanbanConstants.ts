import type { KanbanTicket } from '../../../types/store.types';

const KANBAN_COLUMNS: KanbanTicket['status'][] = ['Ready', 'Blocked', 'In Progress', 'Testing', 'UAT', 'Done'];
const STATUS_OPTIONS: KanbanTicket['status'][] = ['Open', 'Ready', 'Blocked', 'In Progress', 'Testing', 'UAT', 'Done', 'Canceled'];
const PRIORITY_OPTIONS: KanbanTicket['priority'][] = ['Low', 'Medium', 'High', 'Critical'];
const TYPE_OPTIONS: KanbanTicket['type'][] = ['Story', 'Task', 'Bug', 'Spike', 'Cycle'];

export { KANBAN_COLUMNS, STATUS_OPTIONS, PRIORITY_OPTIONS, TYPE_OPTIONS };
