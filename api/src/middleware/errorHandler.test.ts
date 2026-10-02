import {it,expect} from 'vitest';
import express from 'express';
import request from 'supertest';
import {errorHandler} from './errorHandler.js';
import {AppError} from '../utils/AppError.js';
it('preserves safe error details and hides unexpected failures',async()=>{const app=express();app.get('/safe',()=>{throw new AppError(409,'CONFLICT','Changed',{field:'version'});});app.get('/unknown',()=>{throw new Error('sensitive database detail');});app.use(errorHandler);expect((await request(app).get('/safe')).body.error.details).toEqual({field:'version'});const unknown=await request(app).get('/unknown');expect(unknown.status).toBe(500);expect(JSON.stringify(unknown.body)).not.toContain('sensitive');});
