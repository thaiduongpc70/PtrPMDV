import { EventEmitter } from 'node:events';
import { notificationRepository } from './notification.repository.js';

export const notificationEvents = new EventEmitter();
export const emailQueue = [];

export const notificationService = {
  async notifyOrderStatus(input) {
    const recipients = [input.customerUserId, input.restaurantOwnerUserId].filter(value => Number.isInteger(Number(value)) && Number(value) > 0);
    const uniqueRecipients = [...new Set(recipients.map(Number))];
    const title = `Order ${input.orderCode} updated`;
    const message = input.message ?? `Order ${input.orderCode} is now ${input.status}.`;
    const items = uniqueRecipients.map(userId => ({ userId, title, message, type: 'ORDER', referenceType: 'ORDER', referenceId: input.orderId }));
    if (items.length > 0) await notificationRepository.createMany(items);
    if (input.email) emailQueue.push({ to: input.email, subject: title, text: message, orderId: input.orderId });
    notificationEvents.emit('order.status', { ...input, recipients: uniqueRecipients });
    return { recipients: uniqueRecipients, queuedEmail: Boolean(input.email) };
  },
  list: (userId, filters) => notificationRepository.listForUser(userId, filters),
  async markRead(userId, notificationId) {
    return { marked: await notificationRepository.markRead(userId, notificationId) };
  }
};
