import { processWebhookQueue, cleanupProcessedQueue } from '../../server/src/services/queue.js';
import { processCapiQueue } from '../../server/src/services/capi.js';

exports.handler = async (event, context) => {
  try {
    const results = {
      webhookQueue: null,
      capiQueue: null,
      cleanup: null,
    };

    await processWebhookQueue();
    results.webhookQueue = 'processed';

    await processCapiQueue();
    results.capiQueue = 'processed';

    const cleanupResult = await cleanupProcessedQueue(30);
    results.cleanup = `deleted ${cleanupResult.deleted} old items`;

    return {
      statusCode: 200,
      body: JSON.stringify(results),
    };
  } catch (error) {
    console.error('[QUEUE_PROCESS_ERROR]', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Queue processing failed' }),
    };
  }
};
