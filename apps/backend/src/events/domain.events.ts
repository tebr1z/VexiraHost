/**
 * Domain events — architecture scaffold for event-driven patterns.
 */
export class BaseDomainEvent {
  readonly occurredAt: Date;
  readonly eventId: string;

  constructor(public readonly aggregateId: string) {
    this.occurredAt = new Date();
    this.eventId = crypto.randomUUID();
  }
}

export class UserRegisteredEvent extends BaseDomainEvent {
  constructor(
    aggregateId: string,
    public readonly email: string,
  ) {
    super(aggregateId);
  }
}

export class OrderCreatedEvent extends BaseDomainEvent {
  constructor(
    aggregateId: string,
    public readonly userId: string,
  ) {
    super(aggregateId);
  }
}
