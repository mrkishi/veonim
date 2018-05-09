// can't import types from main thread or worker thread from each other. can't
// boundry cross contexts sharing into a separate file that each context can
// import seems like an okay approach

export enum ActivationEventType {
  WorkspaceContains = 'workspaceContains',
  Language = 'onLanguage',
  Command = 'onCommand',
  Debug = 'onDebug',
  View = 'onView',
  Always  = '*',
}

export interface ActivationEvent {
  type: ActivationEventType,
  value: string,
}
