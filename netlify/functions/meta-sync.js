import { startMetaSync } from '../../server/src/services/metaSync.js';

exports.handler = async (event, context) => {
  try {
    startMetaSync();
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Meta sync triggered' }),
    };
  } catch (error) {
    console.error('[META_SYNC_ERROR]', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to trigger sync' }),
    };
  }
};
