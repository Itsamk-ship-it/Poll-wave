import swaggerJSDoc from 'swagger-jsdoc';

export const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'PollWave API',
      version: '1.0.0',
      description:
        'REST API for PollWave — a real-time poll & voting platform. ' +
        'Authenticate via the /api/auth endpoints, then use the Bearer access token.',
    },
    servers: [{ url: 'http://localhost:4000', description: 'Local' }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              properties: { message: { type: 'string' } },
            },
          },
        },
        AuthResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                user: { $ref: '#/components/schemas/User' },
                accessToken: { type: 'string' },
                refreshToken: { type: 'string' },
              },
            },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            username: { type: 'string' },
            name: { type: 'string', nullable: true },
            bio: { type: 'string', nullable: true },
            avatarUrl: { type: 'string', nullable: true },
            role: { type: 'string', enum: ['USER', 'ADMIN'] },
          },
        },
        Poll: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            slug: { type: 'string' },
            title: { type: 'string' },
            description: { type: 'string', nullable: true },
            type: {
              type: 'string',
              enum: ['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'YES_NO', 'RATING', 'EMOJI', 'IMAGE_CHOICE'],
            },
            visibility: { type: 'string', enum: ['PUBLIC', 'PRIVATE', 'UNLISTED'] },
            voteCount: { type: 'integer' },
            viewCount: { type: 'integer' },
            options: { type: 'array', items: { $ref: '#/components/schemas/PollOption' } },
          },
        },
        PollOption: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            text: { type: 'string' },
            imageUrl: { type: 'string', nullable: true },
            order: { type: 'integer' },
            voteCount: { type: 'integer' },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
    tags: [
      { name: 'Auth', description: 'Registration, login, tokens' },
      { name: 'Users', description: 'Profiles and user data' },
      { name: 'Polls', description: 'Create and manage polls' },
      { name: 'Voting', description: 'Cast votes and read results' },
      { name: 'Comments', description: 'Poll discussion' },
      { name: 'Favorites', description: 'Bookmark polls' },
      { name: 'Search', description: 'Global search' },
      { name: 'Notifications', description: 'User notifications' },
      { name: 'Dashboard', description: 'Aggregate user stats' },
      { name: 'Analytics', description: 'Per-poll analytics' },
      { name: 'Categories', description: 'Poll categories' },
      { name: 'Health', description: 'Service health' },
    ],
  },
  apis: ['./src/modules/**/*.routes.ts', './src/modules/**/*.ts'],
});
