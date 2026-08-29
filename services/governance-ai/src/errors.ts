export class GovernanceError extends Error {
  constructor(
    message: string,
    readonly code: 'VALIDATION' | 'NOT_FOUND' | 'CONFLICT' | 'FORBIDDEN',
  ) {
    super(message);
  }
}
