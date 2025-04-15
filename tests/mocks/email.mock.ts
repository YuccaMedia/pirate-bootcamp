/**
 * Mock Nodemailer for testing email functionality
 */
export const mockNodemailer = {
  createTransport: jest.fn().mockImplementation(() => ({
    sendMail: jest.fn().mockImplementation((mailOptions) => {
      return Promise.resolve({
        messageId: '<test-message-id@example.com>',
        envelope: {
          from: mailOptions.from,
          to: Array.isArray(mailOptions.to) ? mailOptions.to : [mailOptions.to]
        },
        accepted: Array.isArray(mailOptions.to) ? mailOptions.to : [mailOptions.to],
        rejected: [],
        pending: [],
        response: '250 Message accepted'
      });
    }),
    verify: jest.fn().mockResolvedValue(true)
  })),
  
  // Mock for error scenarios
  createTransportError: jest.fn().mockImplementation(() => ({
    sendMail: jest.fn().mockRejectedValue(new Error('Failed to send email')),
    verify: jest.fn().mockRejectedValue(new Error('Connection failed'))
  }))
}; 