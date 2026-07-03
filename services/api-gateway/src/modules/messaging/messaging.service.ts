import { Injectable, OnModuleDestroy } from '@nestjs/common';
import amqp, { Channel, ChannelModel } from 'amqplib';
import { DomainEvent } from '../../../../../libs/domain/src/events';

@Injectable()
export class MessagingService implements OnModuleDestroy {
  private connection: ChannelModel | null = null;
  private channel: Channel | null = null;
  private readonly amqpUrl = process.env.AMQP_URL ?? '';
  private readonly exchange = process.env.AMQP_EXCHANGE ?? 'buildflow.events';

  async publish(event: DomainEvent): Promise<void> {
    if (!this.amqpUrl) {
      return;
    }

    const channel = await this.getChannel();
    await channel.assertExchange(this.exchange, 'topic', { durable: true });
    channel.publish(this.exchange, event.topic, Buffer.from(JSON.stringify(event)), {
      contentType: 'application/json',
      persistent: true
    });
  }

  async consume(
    queue: string,
    topics: string[],
    handler: (event: DomainEvent) => Promise<void>
  ): Promise<void> {
    if (!this.amqpUrl) {
      return;
    }

    const channel = await this.getChannel();
    await channel.assertExchange(this.exchange, 'topic', { durable: true });
    const { queue: queueName } = await channel.assertQueue(queue, { durable: true });

    for (const topic of topics) {
      await channel.bindQueue(queueName, this.exchange, topic);
    }

    await channel.consume(queueName, async (msg) => {
      if (!msg) return;
      try {
        const event = JSON.parse(msg.content.toString()) as DomainEvent;
        await handler(event);
        channel.ack(msg);
      } catch (err) {
        console.warn(`[Messaging] Handler failed for queue ${queue}:`, (err as Error).message);
        channel.nack(msg, false, false); // dead-letter (reject without requeue)
      }
    });
  }

  async onModuleDestroy(): Promise<void> {
    if (this.channel) {
      await this.channel.close();
      this.channel = null;
    }
    if (this.connection) {
      await this.connection.close();
      this.connection = null;
    }
  }

  private async getChannel(): Promise<Channel> {
    if (this.channel) {
      return this.channel;
    }

    const connection = await amqp.connect(this.amqpUrl);
    this.connection = connection;
    this.channel = await connection.createChannel();
    return this.channel;
  }
}
