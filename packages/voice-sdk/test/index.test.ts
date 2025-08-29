import { describe, it, expect } from 'vitest';
import { VERSION } from '../src/index';

describe('VERSION', () => {
  it('is defined', () => {
    expect(VERSION).toBeTypeOf('string');
  });
});
