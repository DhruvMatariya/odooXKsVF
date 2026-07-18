// Stub BullMQ notification queue — logs job payloads instead of real Redis queue
// Replace with real BullMQ implementation when Redis is available.

export const JOB_NAMES = {
  DISPATCH_NOTIFICATION_EMAIL: 'dispatch-notification-email',
  HANDOVER_CONFIRMED_EMAIL: 'handover-confirmed-email',
  DELIVERY_REJECTED_REFUND_EMAIL: 'delivery-rejected-refund-email',
  REPLACEMENT_REQUESTED_EMAIL: 'replacement-requested-email',
};

class StubQueue {
  async add(jobName, data) {
    console.log(`[QUEUE] Job enqueued: ${jobName}`, JSON.stringify(data, null, 2));
    // In real implementation: await this.queue.add(jobName, data);
    return { id: `stub-${Date.now()}`, name: jobName, data };
  }
}

export const notificationQueue = new StubQueue();