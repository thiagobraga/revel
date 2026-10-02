import type {Server} from 'socket.io';
import type {SessionUser,SyncEvent} from './domain.js';
export interface ClientEvents {check:()=>void}
export interface ServerEvents {sync:(event:SyncEvent)=>void}
export interface InterServerEvents {ping:()=>void}
export interface SocketData {user:SessionUser;token:string}
export type SyncServer=Server<ClientEvents,ServerEvents,InterServerEvents,SocketData>;
