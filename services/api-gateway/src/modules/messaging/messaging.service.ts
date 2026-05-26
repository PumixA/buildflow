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
