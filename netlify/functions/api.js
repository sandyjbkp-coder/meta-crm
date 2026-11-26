import { app } from '../../server/src/index.js';
import serverless from 'serverless-http';

const handler = serverless(app);

export async function functionHandler(event, context) {
  const result = await handler(event, context);
  return result;
}
