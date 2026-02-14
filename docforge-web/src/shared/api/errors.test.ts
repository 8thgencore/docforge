import axios, { AxiosError } from 'axios'
import { describe, expect, it } from 'vitest'

import { toApiError } from '@/shared/api/errors'

describe('toApiError', () => {
  it('maps 401 to auth message', () => {
    const error = new AxiosError('Request failed', undefined, undefined, undefined, {
      status: 401,
      statusText: 'Unauthorized',
      headers: {},
      config: {} as never,
      data: { detail: 'invalid api key' },
    })

    const mapped = toApiError(error)

    expect(mapped.message).toContain('Invalid API key')
    expect(mapped.status).toBe(401)
  })

  it('handles non-axios errors', () => {
    const mapped = toApiError(new Error('boom'))
    expect(mapped.message).toBe('boom')
  })

  it('guards axios check', () => {
    expect(axios.isAxiosError(new Error('x'))).toBe(false)
  })
})
