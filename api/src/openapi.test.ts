import {it,expect} from 'vitest';
import {openapi} from './openapi.js';
it('derives required show fields from the boundary schema',()=>{expect(openapi.openapi).toBe('3.1.0');const schema=openapi.paths['/shows'].post.requestBody!.content['application/json'].schema;expect(schema.required).toEqual(['title','city','venue','startsAt','ticketUrl','published']);});
