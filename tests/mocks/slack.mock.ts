/**
 * Mock Slack API for testing
 */
export const mockSlackApi = {
  // WebClient mock
  WebClient: jest.fn().mockImplementation(() => ({
    chat: {
      postMessage: jest.fn().mockResolvedValue({
        ok: true,
        channel: 'C123456',
        ts: '1234567890.123456',
        message: {
          text: 'Test message'
        }
      })
    },
    conversations: {
      list: jest.fn().mockResolvedValue({
        ok: true,
        channels: [
          {
            id: 'C123456',
            name: 'security-alerts',
            is_channel: true,
            is_private: false
          }
        ]
      })
    }
  })),
  
  // IncomingWebhook mock
  IncomingWebhook: jest.fn().mockImplementation(() => ({
    send: jest.fn().mockResolvedValue({
      text: 'Test webhook message'
    })
  }))
}; 