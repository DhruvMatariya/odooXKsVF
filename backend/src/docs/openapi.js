const openapi = {
  openapi: '3.1.0',
  info: {
    title: 'Auth Service API',
    description:
      'Authentication and authorization microservice. Handles user registration, login, logout, token refresh, password reset, email verification, and profile management.\n\n## Authentication\n\nMost endpoints are public. The **Profile** endpoint requires a Bearer JWT token in the `Authorization` header.\n\n## Token Lifecycle\n\n- **Access Token (JWT):** 15-minute lifetime, signed with HMAC-SHA256.\n- **Refresh Token:** 7-day lifetime, opaque hex string, single-use (rotated on each refresh).\n- **Password Reset Token:** 15-minute lifetime, SHA-256 hashed before storage.\n- **Email Verification Token:** 24-hour lifetime, SHA-256 hashed before storage.\n\n## Testing Workflow\n\n1. `POST /api/auth/register` — create a new user\n2. `POST /api/auth/verify-email` — verify the email (use token from email)\n3. `POST /api/auth/login` — get access + refresh tokens\n4. `GET /api/auth/profile` — use the access token to fetch profile\n5. `POST /api/auth/profile` — create vendor profile (vendor role required)\n6. `POST /api/auth/refresh-token` — rotate the refresh token\n7. `POST /api/auth/forgot-password` → `POST /api/auth/reset-password` — reset password flow\n8. `POST /api/auth/logout` — invalidate the refresh token',
    version: '1.0.0',
    contact: {
      name: 'Auth Service Team',
    },
  },
  servers: [
    {
      url: '/',
      description: 'Local development server',
    },
  ],
  tags: [
    { name: 'Health', description: 'Service health checks' },
    { name: 'Auth', description: 'Registration, login, logout, and token management' },
    { name: 'Password', description: 'Forgot and reset password flows' },
    { name: 'Email', description: 'Email verification' },
    { name: 'Profile', description: 'Authenticated user profile' },
  ],
  paths: {
    '/api/auth/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check',
        description: 'Returns the health status of the auth service.',
        operationId: 'healthCheck',
        responses: {
          '200': {
            description: 'Service is healthy',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/HealthResponse' },
                example: {
                  statusCode: 200,
                  message: 'Auth Service is healthy',
                  data: null,
                },
              },
            },
          },
        },
      },
    },

    '/api/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a new user',
        description:
          'Create a new user account. Sends a verification email to the provided address. The email verification token is valid for 24 hours.',
        operationId: 'registerUser',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RegisterRequest' },
              examples: {
                customer: {
                  summary: 'Register a customer',
                  value: {
                    email: 'john.doe@example.com',
                    password: 'Secret@123',
                    full_name: 'John Doe',
                    role: 'customer',
                  },
                },
                seller: {
                  summary: 'Register a seller',
                  value: {
                    email: 'jane.shop@example.com',
                    password: 'Seller456',
                    full_name: 'Jane Smith',
                    role: 'seller',
                  },
                },
                admin: {
                  summary: 'Register an admin',
                  value: {
                    email: 'admin@example.com',
                    password: 'Admin789',
                    full_name: 'Admin User',
                    role: 'admin',
                  },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'User created successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/UserResponse' },
                example: {
                  statusCode: 201,
                  message: 'User created successfully. Please verify your email.',
                  data: {
                    id: '550e8400-e29b-41d4-a716-446655440000',
                    full_name: 'John Doe',
                    email: 'john.doe@example.com',
                    role: 'customer',
                    email_verified: false,
                    created_at: '2026-07-15T10:30:00.000Z',
                    updated_at: '2026-07-15T10:30:00.000Z',
                  },
                },
              },
            },
          },
          '400': {
            description: 'Validation error or email already registered',
            content: {
              'application/json': {
                oneOf: [
                  {
                    schema: { $ref: '#/components/schemas/ErrorResponse' },
                    example: {
                      statusCode: 400,
                      message: 'Missing required fields',
                      data: null,
                    },
                  },
                  {
                    schema: { $ref: '#/components/schemas/ErrorResponse' },
                    example: {
                      statusCode: 400,
                      message: 'Invalid email format',
                      data: null,
                    },
                  },
                  {
                    schema: { $ref: '#/components/schemas/ErrorResponse' },
                    example: {
                      statusCode: 400,
                      message:
                        'Password must be at least 8 characters long and contain at least one letter and one number',
                      data: null,
                    },
                  },
                  {
                    schema: { $ref: '#/components/schemas/ErrorResponse' },
                    example: {
                      statusCode: 400,
                      message: 'Invalid role',
                      data: null,
                    },
                  },
                  {
                    schema: { $ref: '#/components/schemas/ErrorResponse' },
                    example: {
                      statusCode: 400,
                      message: 'Email already registered',
                      data: null,
                    },
                  },
                ],
              },
            },
          },
          '500': {
            description: 'Internal server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: {
                  statusCode: 500,
                  message: 'Error creating user',
                  data: null,
                },
              },
            },
          },
        },
      },
    },

    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login',
        description:
          'Authenticate a user with email and password. Returns a JWT access token (15 min) and an opaque refresh token (7 days).',
        operationId: 'loginUser',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoginRequest' },
              examples: {
                valid: {
                  summary: 'Valid credentials',
                  value: {
                    email: 'john.doe@example.com',
                    password: 'Secret123',
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Login successful',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/LoginResponse' },
                example: {
                  statusCode: 200,
                  message: 'Login successful',
                  data: {
                    accessToken:
                      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjU1MGU4NDAwLWUyOWItNDFkNC1hNzE2LTQ0NjY1NTQ0MDAwMCIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsInJvbGUiOiJjdXN0b21lciIsImlhdCI6MTcxODM4OTIwMCwiZXhwIjoxNzE4Mzg5MTAwfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
                    refreshToken:
                      'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
                    user: {
                      id: '550e8400-e29b-41d4-a716-446655440000',
                      email: 'john.doe@example.com',
                      full_name: 'John Doe',
                      role: 'customer',
                    },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Missing required fields',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: {
                  statusCode: 400,
                  message: 'Missing required fields',
                  data: null,
                },
              },
            },
          },
          '401': {
            description: 'Invalid credentials',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: {
                  statusCode: 401,
                  message: 'Invalid email or password',
                  data: null,
                },
              },
            },
          },
          '500': {
            description: 'Internal server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: {
                  statusCode: 500,
                  message: 'Error logging in',
                  data: null,
                },
              },
            },
          },
        },
      },
    },

    '/api/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Logout',
        description:
          'Invalidate a refresh token. The associated access token remains valid until it expires (15 min).',
        operationId: 'logoutUser',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RefreshTokenRequest' },
              examples: {
                valid: {
                  summary: 'Valid refresh token',
                  value: {
                    refreshToken:
                      'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Logout successful',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/MessageResponse' },
                example: {
                  statusCode: 200,
                  message: 'Logout successful',
                  data: null,
                },
              },
            },
          },
          '400': {
            description: 'Missing refresh token',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: {
                  statusCode: 400,
                  message: 'Refresh token is required',
                  data: null,
                },
              },
            },
          },
          '500': {
            description: 'Internal server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: {
                  statusCode: 500,
                  message: 'Error logging out',
                  data: null,
                },
              },
            },
          },
        },
      },
    },

    '/api/auth/refresh-token': {
      post: {
        tags: ['Auth'],
        summary: 'Refresh token',
        description:
          'Rotate the refresh token and issue a new access token. The old refresh token is deleted (single-use rotation).',
        operationId: 'refreshToken',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RefreshTokenRequest' },
              examples: {
                valid: {
                  summary: 'Valid refresh token',
                  value: {
                    refreshToken:
                      'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Token refreshed',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/RefreshTokenResponse' },
                example: {
                  statusCode: 200,
                  message: 'Token refreshed',
                  data: {
                    accessToken:
                      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjU1MGU4NDAwLWUyOWItNDFkNC1hNzE2LTQ0NjY1NTQ0MDAwMCIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsInJvbGUiOiJjdXN0b21lciIsImlhdCI6MTcxODM4OTIwMCwiZXhwIjoxNzE4Mzg5MTAwfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
                    refreshToken:
                      'f6e5d4c3b2a1f6e5d4c3b2a1f6e5d4c3b2a1f6e5d4c3b2a1f6e5d4c3b2a1f6e5',
                  },
                },
              },
            },
          },
          '400': {
            description: 'Missing refresh token',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: {
                  statusCode: 400,
                  message: 'Refresh token is required',
                  data: null,
                },
              },
            },
          },
          '401': {
            description: 'Invalid or expired refresh token',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: {
                  statusCode: 401,
                  message: 'Invalid or expired refresh token',
                  data: null,
                },
              },
            },
          },
          '500': {
            description: 'Internal server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: {
                  statusCode: 500,
                  message: 'Error refreshing token',
                  data: null,
                },
              },
            },
          },
        },
      },
    },

    '/api/auth/forgot-password': {
      post: {
        tags: ['Password'],
        summary: 'Forgot password',
        description:
          'Request a password reset link. If the email exists in the system, a reset token (valid for 15 minutes) is sent to the address. Returns the same response regardless of whether the email exists to prevent enumeration.',
        operationId: 'forgotPassword',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ForgotPasswordRequest' },
              examples: {
                existing: {
                  summary: 'Registered email',
                  value: {
                    email: 'john.doe@example.com',
                  },
                },
                unknown: {
                  summary: 'Unregistered email',
                  value: {
                    email: 'unknown@example.com',
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Reset link sent (or email not found — same response)',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/MessageResponse' },
                example: {
                  statusCode: 200,
                  message: 'If the email exists, a reset link has been sent',
                  data: null,
                },
              },
            },
          },
          '400': {
            description: 'Invalid email format',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: {
                  statusCode: 400,
                  message: 'Invalid email format',
                  data: null,
                },
              },
            },
          },
          '500': {
            description: 'Internal server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: {
                  statusCode: 500,
                  message: 'Error processing request',
                  data: null,
                },
              },
            },
          },
        },
      },
    },

    '/api/auth/reset-password': {
      post: {
        tags: ['Password'],
        summary: 'Reset password',
        description:
          'Reset a user password using a token received via email. The token is valid for 15 minutes and can only be used once. All existing refresh tokens for the user are revoked upon success.',
        operationId: 'resetPassword',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ResetPasswordRequest' },
              examples: {
                valid: {
                  summary: 'Valid reset token',
                  value: {
                    token: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
                    password: 'NewPass@123',
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Password reset successful',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/MessageResponse' },
                example: {
                  statusCode: 200,
                  message: 'Password reset successful',
                  data: null,
                },
              },
            },
          },
          '400': {
            description: 'Validation error or invalid token',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                examples: {
                  missingToken: {
                    summary: 'Missing token',
                    value: {
                      statusCode: 400,
                      message: 'Reset token is required',
                      data: null,
                    },
                  },
                  weakPassword: {
                    summary: 'Weak password',
                    value: {
                      statusCode: 400,
                      message:
                        'Password must be at least 8 characters long and contain at least one letter and one number',
                      data: null,
                    },
                  },
                  invalidToken: {
                    summary: 'Invalid or expired token',
                    value: {
                      statusCode: 400,
                      message: 'Invalid or expired reset token',
                      data: null,
                    },
                  },
                },
              },
            },
          },
          '500': {
            description: 'Internal server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: {
                  statusCode: 500,
                  message: 'Error resetting password',
                  data: null,
                },
              },
            },
          },
        },
      },
    },

    '/api/auth/verify-email': {
      post: {
        tags: ['Email'],
        summary: 'Verify email address',
        description:
          'Verify a user email using the token sent during registration. The token is valid for 24 hours and can only be used once.',
        operationId: 'verifyEmail',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/VerifyEmailRequest' },
              examples: {
                valid: {
                  summary: 'Valid verification token',
                  value: {
                    token: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Email verified successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/MessageResponse' },
                example: {
                  statusCode: 200,
                  message: 'Email verified successfully',
                  data: null,
                },
              },
            },
          },
          '400': {
            description: 'Missing or invalid token',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                examples: {
                  missingToken: {
                    summary: 'Missing token',
                    value: {
                      statusCode: 400,
                      message: 'Verification token is required',
                      data: null,
                    },
                  },
                  invalidToken: {
                    summary: 'Invalid or expired token',
                    value: {
                      statusCode: 400,
                      message: 'Invalid or expired verification token',
                      data: null,
                    },
                  },
                },
              },
            },
          },
          '500': {
            description: 'Internal server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: {
                  statusCode: 500,
                  message: 'Error verifying email',
                  data: null,
                },
              },
            },
          },
        },
      },
    },

    '/api/auth/profile': {
      get: {
        tags: ['Profile'],
        summary: 'Get current user profile',
        description:
          'Returns the profile of the authenticated user. Requires a valid JWT access token in the Authorization header.',
        operationId: 'getProfile',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': {
            description: 'Profile fetched',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ProfileResponse' },
                example: {
                  statusCode: 200,
                  message: 'Profile fetched',
                  data: {
                    id: '550e8400-e29b-41d4-a716-446655440000',
                    full_name: 'John Doe',
                    email: 'john.doe@example.com',
                    role: 'customer',
                    email_verified: true,
                    created_at: '2026-07-15T10:30:00.000Z',
                  },
                },
              },
            },
          },
          '401': {
            description: 'Unauthorized — missing or invalid token',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                examples: {
                  missingToken: {
                    summary: 'No token provided',
                    value: {
                      statusCode: 401,
                      message: 'Access token required',
                      data: null,
                    },
                  },
                  invalidToken: {
                    summary: 'Invalid or expired token',
                    value: {
                      statusCode: 401,
                      message: 'Invalid or expired access token',
                      data: null,
                    },
                  },
                },
              },
            },
          },
          '404': {
            description: 'User not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: {
                  statusCode: 404,
                  message: 'User not found',
                  data: null,
                },
              },
            },
          },
          '500': {
            description: 'Internal server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: {
                  statusCode: 500,
                  message: 'Error fetching profile',
                  data: null,
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Profile'],
        summary: 'Create vendor profile',
        description:
          'Creates a vendor profile for the authenticated user. Requires vendor role and a valid JWT access token. The vendor profile includes GST number, company name, and product category.',
        operationId: 'createVendorProfile',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/VendorProfileRequest' },
              examples: {
                valid: {
                  summary: 'Valid vendor profile',
                  value: {
                    gst_number: '29AAAAA0000A1Z5',
                    company_name: 'ABC Enterprises',
                    product_category: 'Electronics',
                  },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Vendor profile created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/VendorProfileResponse' },
                example: {
                  statusCode: 201,
                  message: 'Vendor profile created successfully',
                  data: {
                    user_id: '550e8400-e29b-41d4-a716-446655440000',
                    gst_number: '29AAAAA0000A1Z5',
                    company_name: 'ABC Enterprises',
                    product_category: 'Electronics',
                    created_at: '2026-07-18T10:30:00.000Z',
                    updated_at: '2026-07-18T10:30:00.000Z',
                  },
                },
              },
            },
          },
          '400': {
            description: 'Validation error or vendor profile already exists',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                examples: {
                  validationError: {
                    summary: 'Invalid request body',
                    value: {
                      statusCode: 400,
                      message: 'GST number must be 15 characters',
                      data: null,
                    },
                  },
                  profileExists: {
                    summary: 'Vendor profile already exists',
                    value: {
                      statusCode: 400,
                      message: 'Vendor profile already exists',
                      data: null,
                    },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Unauthorized — missing or invalid token',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                examples: {
                  missingToken: {
                    summary: 'No token provided',
                    value: {
                      statusCode: 401,
                      message: 'Access token required',
                      data: null,
                    },
                  },
                  invalidToken: {
                    summary: 'Invalid or expired token',
                    value: {
                      statusCode: 401,
                      message: 'Invalid or expired access token',
                      data: null,
                    },
                  },
                },
              },
            },
          },
          '403': {
            description: 'Forbidden — vendor access required',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: {
                  statusCode: 403,
                  message: 'Only vendors can access this resource',
                  data: null,
                },
              },
            },
          },
          '404': {
            description: 'User not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: {
                  statusCode: 404,
                  message: 'User not found',
                  data: null,
                },
              },
            },
          },
          '500': {
            description: 'Internal server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: {
                  statusCode: 500,
                  message: 'Error creating vendor profile',
                  data: null,
                },
              },
            },
          },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description:
          'Pass the JWT access token obtained from the login endpoint. Format: `Bearer <token>`',
      },
    },
    schemas: {
      RegisterRequest: {
        type: 'object',
        required: ['email', 'password', 'full_name', 'role'],
        properties: {
          email: {
            type: 'string',
            format: 'email',
            description: 'User email address (must be unique)',
            example: 'john.doe@example.com',
          },
          password: {
            type: 'string',
            minLength: 8,
            pattern: '^(?=.*[A-Za-z])(?=.*\\d)[A-Za-z\\d]{8,}$',
            description:
              'Password — minimum 8 characters, at least 1 letter and 1 number. Only letters and digits are allowed (no special characters).',
            example: 'Secret123',
          },
          full_name: {
            type: 'string',
            minLength: 1,
            maxLength: 150,
            description: 'Full name of the user',
            example: 'John Doe',
          },
          role: {
            type: 'string',
            enum: ['customer', 'seller', 'admin'],
            default: 'customer',
            description: 'User role',
            example: 'customer',
          },
        },
      },

      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: {
            type: 'string',
            format: 'email',
            description: 'Registered email address',
            example: 'john.doe@example.com',
          },
          password: {
            type: 'string',
            description: 'Account password',
            example: 'Secret123',
          },
        },
      },

      RefreshTokenRequest: {
        type: 'object',
        required: ['refreshToken'],
        properties: {
          refreshToken: {
            type: 'string',
            description: 'The refresh token obtained during login',
            example: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
          },
        },
      },

      ForgotPasswordRequest: {
        type: 'object',
        required: ['email'],
        properties: {
          email: {
            type: 'string',
            format: 'email',
            description: 'Email address of the account to reset',
            example: 'john.doe@example.com',
          },
        },
      },

      ResetPasswordRequest: {
        type: 'object',
        required: ['token', 'password'],
        properties: {
          token: {
            type: 'string',
            description: 'Password reset token received via email',
            example: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
          },
          password: {
            type: 'string',
            minLength: 8,
            pattern: '^(?=.*[A-Za-z])(?=.*\\d)[A-Za-z\\d]{8,}$',
            description:
              'New password — minimum 8 characters, at least 1 letter and 1 number.',
            example: 'NewPass123',
          },
        },
      },

      VerifyEmailRequest: {
        type: 'object',
        required: ['token'],
        properties: {
          token: {
            type: 'string',
            description: 'Email verification token received via email',
            example: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
          },
        },
      },

      User: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'User UUID',
            example: '550e8400-e29b-41d4-a716-446655440000',
          },
          full_name: {
            type: 'string',
            description: 'Full name',
            example: 'John Doe',
          },
          email: {
            type: 'string',
            format: 'email',
            description: 'Email address',
            example: 'john.doe@example.com',
          },
          role: {
            type: 'string',
            enum: ['customer', 'seller', 'admin'],
            description: 'User role',
            example: 'customer',
          },
          email_verified: {
            type: 'boolean',
            description: 'Whether the email has been verified',
            example: false,
          },
          created_at: {
            type: 'string',
            format: 'date-time',
            description: 'Account creation timestamp',
            example: '2026-07-15T10:30:00.000Z',
          },
          updated_at: {
            type: 'string',
            format: 'date-time',
            description: 'Last update timestamp',
            example: '2026-07-15T10:30:00.000Z',
          },
        },
      },

      HealthResponse: {
        type: 'object',
        properties: {
          statusCode: { type: 'integer', example: 200 },
          message: { type: 'string', example: 'Auth Service is healthy' },
          data: { type: 'null', nullable: true },
        },
      },

      UserResponse: {
        type: 'object',
        properties: {
          statusCode: { type: 'integer', example: 201 },
          message: {
            type: 'string',
            example: 'User created successfully. Please verify your email.',
          },
          data: { $ref: '#/components/schemas/User' },
        },
      },

      LoginResponse: {
        type: 'object',
        properties: {
          statusCode: { type: 'integer', example: 200 },
          message: { type: 'string', example: 'Login successful' },
          data: {
            type: 'object',
            properties: {
              accessToken: {
                type: 'string',
                description: 'JWT access token (15 min expiry)',
                example: 'eyJhbGciOiJIUzI1NiIs...',
              },
              refreshToken: {
                type: 'string',
                description: 'Opaque refresh token (7 day expiry, 64 hex chars)',
                example:
                  'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
              },
              user: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  email: { type: 'string', format: 'email' },
                  full_name: { type: 'string' },
                  role: { type: 'string', enum: ['customer', 'seller', 'admin'] },
                },
              },
            },
          },
        },
      },

      RefreshTokenResponse: {
        type: 'object',
        properties: {
          statusCode: { type: 'integer', example: 200 },
          message: { type: 'string', example: 'Token refreshed' },
          data: {
            type: 'object',
            properties: {
              accessToken: {
                type: 'string',
                description: 'New JWT access token (15 min expiry)',
                example: 'eyJhbGciOiJIUzI1NiIs...',
              },
              refreshToken: {
                type: 'string',
                description: 'New opaque refresh token (replaces the old one)',
                example:
                  'f6e5d4c3b2a1f6e5d4c3b2a1f6e5d4c3b2a1f6e5d4c3b2a1f6e5d4c3b2a1f6e5',
              },
            },
          },
        },
      },

      ProfileResponse: {
        type: 'object',
        properties: {
          statusCode: { type: 'integer', example: 200 },
          message: { type: 'string', example: 'Profile fetched' },
          data: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                format: 'uuid',
                example: '550e8400-e29b-41d4-a716-446655440000',
              },
              full_name: { type: 'string', example: 'John Doe' },
              email: { type: 'string', format: 'email', example: 'john.doe@example.com' },
              role: {
                type: 'string',
                enum: ['customer', 'seller', 'admin'],
                example: 'customer',
              },
              email_verified: { type: 'boolean', example: true },
              created_at: {
                type: 'string',
                format: 'date-time',
                example: '2026-07-15T10:30:00.000Z',
              },
            },
          },
        },
      },

      MessageResponse: {
        type: 'object',
        properties: {
          statusCode: { type: 'integer', example: 200 },
          message: { type: 'string', example: 'Operation successful' },
          data: { type: 'null', nullable: true },
        },
      },

      VendorProfileRequest: {
        type: 'object',
        required: ['gst_number', 'company_name', 'product_category'],
        properties: {
          gst_number: {
            type: 'string',
            minLength: 15,
            maxLength: 15,
            description: '15-character GST number',
            example: '29AAAAA0000A1Z5',
          },
          company_name: {
            type: 'string',
            minLength: 1,
            maxLength: 150,
            description: 'Company name',
            example: 'ABC Enterprises',
          },
          product_category: {
            type: 'string',
            minLength: 1,
            maxLength: 100,
            description: 'Product category',
            example: 'Electronics',
          },
        },
      },

      VendorProfile: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'User UUID (linked to users table)',
            example: '550e8400-e29b-41d4-a716-446655440000',
          },
          user_id: {
            type: 'string',
            format: 'uuid',
            description: 'User UUID',
            example: '550e8400-e29b-41d4-a716-446655440000',
          },
          gst_number: {
            type: 'string',
            description: 'GST number',
            example: '29AAAAA0000A1Z5',
          },
          company_name: {
            type: 'string',
            description: 'Company name',
            example: 'ABC Enterprises',
          },
          product_category: {
            type: 'string',
            description: 'Product category',
            example: 'Electronics',
          },
          created_at: {
            type: 'string',
            format: 'date-time',
            description: 'Profile creation timestamp',
            example: '2026-07-18T10:30:00.000Z',
          },
          updated_at: {
            type: 'string',
            format: 'date-time',
            description: 'Last update timestamp',
            example: '2026-07-18T10:30:00.000Z',
          },
        },
      },

      VendorProfileResponse: {
        type: 'object',
        properties: {
          statusCode: { type: 'integer', example: 201 },
          message: { type: 'string', example: 'Vendor profile created successfully' },
          data: { $ref: '#/components/schemas/VendorProfile' },
        },
      },

      ErrorResponse: {
        type: 'object',
        properties: {
          statusCode: { type: 'integer', example: 400 },
          message: { type: 'string', example: 'Error message' },
          data: { type: 'null', nullable: true },
        },
      },
    },
  },
};

export default openapi;
