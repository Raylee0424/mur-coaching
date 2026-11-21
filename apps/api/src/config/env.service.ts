import { Injectable } from '@nestjs/common';
import { Env, validateEnv } from './env';

@Injectable()
export class EnvService {
  private readonly env: Env = validateEnv(process.env);

  get<K extends keyof Env>(key: K): Env[K] {
    return this.env[key];
  }
}
