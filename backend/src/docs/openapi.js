const openapi = {
  openapi: '3.1.0',
  info: {
    title: 'Odoo Rental API',
    description:
      'Complete API for rental marketplace with authentication, catalog management, and vendor operations.\n\n## Authentication\n\nMost endpoints require a Bearer JWT token in the `Authorization` header.\n\n## Token Lifecycle\n\n- **Access Token (JWT):** 15-minute lifetime, signed with HMAC-SHA256\n- **Refresh Token:** 7-day lifetime, opaque hex string, single-use (rotated on each refresh)\n- **Password Reset Token:** 15-minute lifetime, SHA-256 hashed before storage\n- **Email Verification Token:** 24-hour lifetime, SHA-256 hashed before storage\n\n## Testing Workflow\n\n1. `POST /api/v1/auth/register` — create a new user (customer, vendor, admin)\n2. `POST /api/v1/auth/verify-email` — verify email using token from email\n3. `POST /api/v1/auth/login` — get access + refresh tokens\n4. `GET /api/v1/auth/profile` — fetch authenticated user profile\n5. `POST /api/v1/auth/profile` — create vendor profile (vendor role required)\n6. `POST /api/v1/auth/refresh-token` — rotate refresh token\n7. `POST /api/v1/auth/forgot-password` → `POST /api/v1/auth/reset-password` — reset password flow\n8. `POST /api/v1/auth/logout` — invalidate refresh token\n\n## Catalog Operations\n\n- Public: Browse categories, products, inventory, pricing\n- Vendor: Create/update/delete products, manage inventory, pricing, return slots, late fees, cancellation policies\n- Admin: Create categories',
    version: '1.0.0',
    contact: { name: 'Odoo Rental API Team' },
  },
  servers: [
    { url: '/', description: 'Local development server' },
  ],
  tags: [
    { name: 'Health', description: 'Service health checks' },
    { name: 'Auth', description: 'Registration, login, logout, token management' },
    { name: 'Password', description: 'Forgot and reset password flows' },
    { name: 'Email', description: 'Email verification' },
    { name: 'Profile', description: 'Authenticated user profile and vendor profile' },
    { name: 'Categories', description: 'Product categories (public read, admin write)' },
    { name: 'Products', description: 'Product CRUD and listing (public read, vendor write)' },
    { name: 'Inventory', description: 'Product inventory management (vendor)' },
    { name: 'Pricing', description: 'Product pricing tiers (public read, vendor write)' },
    { name: 'Vendor Settings', description: 'Return slots, late fees, cancellation policies (vendor)' },
    { name: 'Orders', description: 'Order management (customer and vendor)' },
  ],
  paths: {
    '/api/v1/auth/health': {
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
                example: { statusCode: 200, message: 'Auth Service is healthy', data: null },
              },
            },
          },
        },
      },
    },

    '/api/v1/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a new user',
        description: 'Create a new user account. Sends a verification email (valid 24 hours).',
        operationId: 'registerUser',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RegisterRequest' },
              examples: {
                customer: { summary: 'Register a customer', value: { email: 'john@example.com', password: 'Secret@123', full_name: 'John Doe', role: 'customer' } },
                vendor: { summary: 'Register a vendor', value: { email: 'jane@shop.com', password: 'Seller@456', full_name: 'Jane Smith', role: 'vendor' } },
                admin: { summary: 'Register an admin', value: { email: 'admin@example.com', password: 'Admin@789', full_name: 'Admin User', role: 'admin' } },
              },
            },
          },
        },
        responses: {
          '201': { description: 'User created', content: { 'application/json': { schema: { $ref: '#/components/schemas/UserResponse' }, example: { statusCode: 201, message: 'User created successfully. Please verify your email.', data: { id: '550e8400-e29b-41d4-a716-446655440000', full_name: 'John Doe', email: 'john@example.com', role: 'customer', email_verified: false, created_at: '2026-07-15T10:30:00.000Z', updated_at: '2026-07-15T10:30:00.000Z' } } } } },
          '400': { description: 'Validation error or email exists', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '500': { description: 'Server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },

    '/api/v1/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login',
        description: 'Authenticate with email and password. Returns JWT access token (15 min) and opaque refresh token (7 days). Requires verified email.',
        operationId: 'loginUser',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' }, examples: { valid: { summary: 'Valid credentials', value: { email: 'john@example.com', password: 'Secret@123' } } } } } },
        responses: {
          '200': { description: 'Login successful', content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginResponse' }, example: { statusCode: 200, message: 'Login successful', data: { accessToken: 'eyJhbGciOiJIUzI1NiIs...', refreshToken: 'a1b2c3d4e5f6...', user: { id: '550e8400-e29b-41d4-a716-446655440000', email: 'john@example.com', full_name: 'John Doe', role: 'customer' } } } } } },
          '400': { description: 'Missing fields', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '401': { description: 'Invalid credentials', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' }, example: { statusCode: 401, message: 'Invalid email or password', data: null } } } },
          '403': { description: 'Email not verified', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' }, example: { statusCode: 403, message: 'Please verify your email before logging in', data: null } } } },
          '500': { description: 'Server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },

    '/api/v1/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Logout',
        description: 'Invalidate a refresh token. Access token remains valid until expiry (15 min).',
        operationId: 'logoutUser',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/RefreshTokenRequest' }, examples: { valid: { summary: 'Valid refresh token', value: { refreshToken: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2' } } } } } },
        responses: { '200': { description: 'Logout successful', content: { 'application/json': { schema: { $ref: '#/components/schemas/MessageResponse' }, example: { statusCode: 200, message: 'Logout successful', data: null } } } }, '400': { description: 'Missing token', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }, '500': { description: 'Server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } } },
      },
    },

    '/api/v1/auth/refresh-token': {
      post: {
        tags: ['Auth'],
        summary: 'Refresh access token',
        description: 'Rotate the refresh token and issue a new access token. Old refresh token is deleted (single-use rotation).',
        operationId: 'refreshToken',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/RefreshTokenRequest' }, examples: { valid: { summary: 'Valid refresh token', value: { refreshToken: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2' } } } } } },
        responses: {
          '200': { description: 'Token refreshed', content: { 'application/json': { schema: { $ref: '#/components/schemas/RefreshTokenResponse' }, example: { statusCode: 200, message: 'Token refreshed successfully', data: { accessToken: 'eyJhbGciOiJIUzI1NiIs...', refreshToken: 'f6e5d4c3b2a1...' } } } } },
          '400': { description: 'Missing token', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '401': { description: 'Invalid or expired refresh token', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' }, example: { statusCode: 401, message: 'Invalid or expired refresh token', data: null } } } },
          '500': { description: 'Server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },

    '/api/v1/auth/forgot-password': {
      post: {
        tags: ['Password'],
        summary: 'Request password reset',
        description: 'If the email exists, a reset token (valid 15 min) is sent. Same response regardless to prevent enumeration.',
        operationId: 'forgotPassword',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ForgotPasswordRequest' }, examples: { existing: { summary: 'Registered email', value: { email: 'john@example.com' } }, unknown: { summary: 'Unregistered email', value: { email: 'unknown@example.com' } } } } } },
        responses: { '200': { description: 'Reset link sent (or email not found)', content: { 'application/json': { schema: { $ref: '#/components/schemas/MessageResponse' }, example: { statusCode: 200, message: 'If the email exists, a reset link has been sent', data: null } } } }, '400': { description: 'Invalid email', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }, '500': { description: 'Server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } } },
      },
    },

    '/api/v1/auth/reset-password': {
      post: {
        tags: ['Password'],
        summary: 'Reset password',
        description: 'Reset password using token from email. Token valid 15 min, single use. Revokes all refresh tokens for the user.',
        operationId: 'resetPassword',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ResetPasswordRequest' }, examples: { valid: { summary: 'Valid reset token', value: { token: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2', password: 'NewPass@123' } } } } } },
        responses: { '200': { description: 'Password reset', content: { 'application/json': { schema: { $ref: '#/components/schemas/MessageResponse' }, example: { statusCode: 200, message: 'Password reset successfully', data: null } } } }, '400': { description: 'Validation error or invalid token', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }, '500': { description: 'Server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } } },
      },
    },

    '/api/v1/auth/verify-email': {
      post: {
        tags: ['Email'],
        summary: 'Verify email address',
        description: 'Verify user email using token from registration email. Token valid 24 hours, single use.',
        operationId: 'verifyEmail',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/VerifyEmailRequest' }, examples: { valid: { summary: 'Valid verification token', value: { token: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2' } } } } } },
        responses: { '200': { description: 'Email verified', content: { 'application/json': { schema: { $ref: '#/components/schemas/MessageResponse' }, example: { statusCode: 200, message: 'Email verified successfully', data: null } } } }, '400': { description: 'Missing or invalid token', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }, '500': { description: 'Server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } } },
      },
    },

    '/api/v1/auth/profile': {
      get: {
        tags: ['Profile'],
        summary: 'Get current user profile',
        description: 'Returns the profile of the authenticated user. Requires valid JWT access token.',
        operationId: 'getProfile',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': { description: 'Profile fetched', content: { 'application/json': { schema: { $ref: '#/components/schemas/ProfileResponse' }, example: { statusCode: 200, message: 'Profile fetched successfully', data: { id: '550e8400-e29b-41d4-a716-446655440000', full_name: 'John Doe', email: 'john@example.com', role: 'customer', email_verified: true, created_at: '2026-07-15T10:30:00.000Z' } } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'User not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' }, example: { statusCode: 404, message: 'User not found', data: null } } } },
          '500': { description: 'Server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
      post: {
        tags: ['Profile'],
        summary: 'Create vendor profile',
        description: 'Creates a vendor profile for the authenticated user. Requires vendor role and valid JWT. Body must include GST number (15 chars), company name, and product category.',
        operationId: 'createVendorProfile',
        security: [{ BearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/VendorProfileRequest' }, examples: { valid: { summary: 'Valid vendor profile', value: { gst_number: '29AAAAA0000A1Z5', company_name: 'ABC Enterprises', product_category: 'Electronics' } } } } } },
        responses: {
          '201': { description: 'Vendor profile created', content: { 'application/json': { schema: { $ref: '#/components/schemas/VendorProfileResponse' }, example: { statusCode: 201, message: 'Vendor profile created successfully', data: { user_id: '550e8400-e29b-41d4-a716-446655440000', gst_number: '29AAAAA0000A1Z5', company_name: 'ABC Enterprises', product_category: 'Electronics', created_at: '2026-07-18T10:30:00.000Z', updated_at: '2026-07-18T10:30:00.000Z' } } } } },
          '400': { description: 'Validation error or profile exists', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '403': { description: 'Forbidden - vendor role required', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' }, example: { statusCode: 403, message: 'Only vendors can access this resource', data: null } } } },
          '404': { description: 'User not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' }, example: { statusCode: 404, message: 'User not found', data: null } } } },
          '500': { description: 'Server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },

    '/api/v1/categories': {
      get: {
        tags: ['Categories'],
        summary: 'List all categories',
        description: 'Returns all active categories. Public endpoint.',
        operationId: 'listCategories',
        responses: { '200': { description: 'Categories list', content: { 'application/json': { schema: { $ref: '#/components/schemas/CategoriesResponse' }, example: { success: true, data: [{ id: 'cat-1', name: 'Electronics' }, { id: 'cat-2', name: 'Furniture' }] } } } } },
      },
      post: {
        tags: ['Categories'],
        summary: 'Create category (admin)',
        description: 'Create a new product category. Requires admin role.',
        operationId: 'createCategory',
        security: [{ BearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CategoryRequest' }, examples: { valid: { summary: 'New category', value: { name: 'Electronics', description: 'Electronic devices and accessories' } } } } } },
        responses: {
          '201': { description: 'Category created', content: { 'application/json': { schema: { $ref: '#/components/schemas/CategoryResponse' }, example: { success: true, message: 'Category created successfully', data: { id: 'cat-1', name: 'Electronics', description: 'Electronic devices and accessories', created_at: '2026-07-18T10:30:00.000Z' } } } } },
          '400': { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '403': { description: 'Forbidden - admin required', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '409': { description: 'Category already exists', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' }, example: { statusCode: 409, message: 'Category already exists', data: null } } } },
          '500': { description: 'Server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },

    '/api/v1/products': {
      get: {
        tags: ['Products'],
        summary: 'List products (paginated, filterable)',
        description: 'Public endpoint to browse products with pagination, search, category filter, brand filter, and sorting.',
        operationId: 'listProducts',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 }, description: 'Page number' },
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 }, description: 'Items per page' },
          { name: 'search', in: 'query', schema: { type: 'string', maxLength: 100 }, description: 'Search in name/description' },
          { name: 'category', in: 'query', schema: { type: 'string', format: 'uuid' }, description: 'Filter by category ID' },
          { name: 'brand', in: 'query', schema: { type: 'string', maxLength: 100 }, description: 'Filter by brand' },
          { name: 'sort', in: 'query', schema: { type: 'string', enum: ['name', 'createdAt', 'startingPrice'], default: 'name' }, description: 'Sort field' },
          { name: 'order', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'], default: 'asc' }, description: 'Sort order' },
        ],
        responses: { '200': { description: 'Products list', content: { 'application/json': { schema: { $ref: '#/components/schemas/ProductListResponse' } } } }, '500': { description: 'Server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } } },
      },
      post: {
        tags: ['Products'],
        summary: 'Create product (vendor)',
        description: 'Create a new product. Requires vendor role. Creates inventory record automatically.',
        operationId: 'createProduct',
        security: [{ BearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateProductRequest' }, examples: { valid: { summary: 'New product', value: { categoryId: 'cat-uuid', name: 'Wireless Headphones', description: 'Premium noise-cancelling headphones', brand: 'Sony', manufacturer: 'Sony Corp', thumbnail: 'https://example.com/thumb.jpg', images: ['https://example.com/img1.jpg', 'https://example.com/img2.jpg'] } } } } } },
        responses: {
          '201': { description: 'Product created', content: { 'application/json': { schema: { $ref: '#/components/schemas/ProductCreateResponse' }, example: { success: true, message: 'Product created successfully', data: { id: 'prod-uuid', name: 'Wireless Headphones', category: { id: 'cat-uuid', name: 'Electronics' }, brand: 'Sony', manufacturer: 'Sony Corp', status: 'ACTIVE', thumbnail: 'https://example.com/thumb.jpg', createdAt: '2026-07-18T10:30:00.000Z' } } } } },
          '400': { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '403': { description: 'Forbidden - vendor required', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'Category not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' }, example: { statusCode: 404, message: 'Category not found', data: null } } } },
          '409': { description: 'Product already exists in category', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' }, example: { statusCode: 409, message: 'Product with this name already exists in this category', data: null } } } },
          '500': { description: 'Server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },

    '/api/v1/products/{id}': {
      get: {
        tags: ['Products'],
        summary: 'Get product by ID',
        description: 'Returns full product details including inventory, pricing, late fee rule, and cancellation policy. Public endpoint.',
        operationId: 'getProductById',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Product UUID' }],
        responses: {
          '200': { description: 'Product details', content: { 'application/json': { schema: { $ref: '#/components/schemas/ProductDetailResponse' } } } },
          '404': { description: 'Product not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' }, example: { statusCode: 404, message: 'Product not found', data: null } } } },
          '500': { description: 'Server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
      patch: {
        tags: ['Products'],
        summary: 'Update product (vendor, owner)',
        description: 'Update product fields. Requires vendor role and ownership of the product.',
        operationId: 'updateProduct',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Product UUID' }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateProductRequest' } } } },
        responses: {
          '200': { description: 'Product updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/ProductUpdateResponse' }, example: { success: true, message: 'Product updated successfully', data: { id: 'prod-uuid', name: 'Updated Name', category: { id: 'cat-uuid', name: 'Electronics' }, brand: 'Sony', manufacturer: 'Sony Corp', status: 'ACTIVE', thumbnail: 'https://example.com/thumb.jpg', createdAt: '2026-07-18T10:30:00.000Z' } } } } },
          '400': { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '403': { description: 'Forbidden - not owner', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' }, example: { statusCode: 403, message: 'You do not own this product', data: null } } } },
          '404': { description: 'Product not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '500': { description: 'Server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
      delete: {
        tags: ['Products'],
        summary: 'Delete product (vendor, owner, soft delete)',
        description: 'Soft delete a product. Requires vendor role and ownership.',
        operationId: 'deleteProduct',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Product UUID' }],
        responses: { '200': { description: 'Product deleted', content: { 'application/json': { schema: { $ref: '#/components/schemas/MessageResponse' }, example: { statusCode: 200, message: 'Product deleted successfully', data: null } } } }, '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }, '403': { description: 'Forbidden - not owner', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }, '404': { description: 'Product not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }, '500': { description: 'Server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } } },
      },
    },

    '/api/v1/products/{id}/inventory': {
      get: {
        tags: ['Inventory'],
        summary: 'Get product inventory',
        description: 'Returns available, reserved, rented, and maintenance counts for a product. Public endpoint.',
        operationId: 'getInventory',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Product UUID' }],
        responses: { '200': { description: 'Inventory details', content: { 'application/json': { schema: { $ref: '#/components/schemas/InventoryResponse' }, example: { success: true, message: 'Inventory fetched successfully', data: { available: 10, reserved: 2, rented: 3, maintenance: 1 } } } } }, '404': { description: 'Product not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }, '500': { description: 'Server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } } },
      },
      patch: {
        tags: ['Inventory'],
        summary: 'Update product inventory (vendor, owner)',
        description: 'Update available and/or maintenance counts. Requires vendor role and ownership.',
        operationId: 'updateInventory',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Product UUID' }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateInventoryRequest' }, examples: { valid: { summary: 'Update available', value: { available: 15 } }, maintenance: { summary: 'Set maintenance', value: { maintenance: 2 } } } } } },
        responses: { '200': { description: 'Inventory updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/InventoryUpdateResponse' }, example: { success: true, message: 'Inventory updated successfully', data: { available: 15, reserved: 2, rented: 3, maintenance: 2 } } } } }, '400': { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }, '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }, '403': { description: 'Forbidden - not owner', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }, '404': { description: 'Product not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }, '500': { description: 'Server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } } },
      },
    },

    '/api/v1/products/{id}/pricing': {
      get: {
        tags: ['Pricing'],
        summary: 'Get product pricing tiers',
        description: 'Returns all pricing tiers for a product. Public endpoint.',
        operationId: 'getPricing',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Product UUID' }],
        responses: { '200': { description: 'Pricing list', content: { 'application/json': { schema: { $ref: '#/components/schemas/PricingListResponse' }, example: { success: true, message: 'Pricing fetched successfully', data: [{ id: 'price-uuid', period: 'DAY', duration: 1, price: 500, deposit: 1000 }] } } } }, '404': { description: 'Product not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }, '500': { description: 'Server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } } },
      },
      post: {
        tags: ['Pricing'],
        summary: 'Create pricing tier (vendor, owner)',
        description: 'Add a new pricing tier (hour/day/week). Requires vendor role and ownership.',
        operationId: 'createPricing',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Product UUID' }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CreatePricingRequest' }, examples: { valid: { summary: 'Daily pricing', value: { period: 'DAY', duration: 1, price: 500, deposit: 1000 } } } } } },
        responses: { '201': { description: 'Pricing created', content: { 'application/json': { schema: { $ref: '#/components/schemas/PricingCreateResponse' }, example: { success: true, message: 'Pricing created successfully', data: { id: 'price-uuid', period: 'DAY', duration: 1, price: 500, deposit: 1000 } } } } }, '400': { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }, '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }, '403': { description: 'Forbidden - not owner', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }, '404': { description: 'Product not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }, '409': { description: 'Pricing already exists for period/duration', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' }, example: { statusCode: 409, message: 'Pricing for this period and duration already exists', data: null } } } }, '500': { description: 'Server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } } },
      },
    },

    '/api/v1/pricing/{id}': {
      patch: {
        tags: ['Pricing'],
        summary: 'Update pricing tier (vendor, owner)',
        description: 'Update a pricing tier. Requires vendor role and ownership of parent product.',
        operationId: 'updatePricing',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Pricing UUID' }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdatePricingRequest' } } } },
        responses: { '200': { description: 'Pricing updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/PricingUpdateResponse' }, example: { success: true, message: 'Pricing updated successfully', data: { id: 'price-uuid', period: 'DAY', duration: 1, price: 600, deposit: 1200 } } } } }, '400': { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }, '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }, '403': { description: 'Forbidden - not owner', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }, '404': { description: 'Pricing not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }, '500': { description: 'Server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } } },
      },
      delete: {
        tags: ['Pricing'],
        summary: 'Delete pricing tier (vendor, owner)',
        description: 'Delete a pricing tier. Requires vendor role and ownership of parent product.',
        operationId: 'deletePricing',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Pricing UUID' }],
        responses: { '200': { description: 'Pricing deleted', content: { 'application/json': { schema: { $ref: '#/components/schemas/MessageResponse' }, example: { statusCode: 200, message: 'Pricing deleted successfully', data: null } } } }, '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }, '403': { description: 'Forbidden - not owner', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }, '404': { description: 'Pricing not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }, '500': { description: 'Server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } } },
      },
    },

    '/api/v1/vendor/return-slots': {
      post: {
        tags: ['Vendor Settings'],
        summary: 'Create return slot (vendor)',
        description: 'Create a return time slot for a specific date. Requires vendor role.',
        operationId: 'createReturnSlot',
        security: [{ BearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateReturnSlotRequest' }, examples: { valid: { summary: 'Morning slot', value: { date: '2026-07-20', slotLabel: 'MORNING', capacity: 10 } } } } } },
        responses: { '201': { description: 'Return slot created', content: { 'application/json': { schema: { $ref: '#/components/schemas/ReturnSlotResponse' }, example: { success: true, message: 'Return slot created successfully', data: { date: '2026-07-20', slotLabel: 'MORNING', capacity: 10 } } } } }, '400': { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }, '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }, '403': { description: 'Forbidden - vendor required', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }, '500': { description: 'Server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } } },
      },
      get: {
        tags: ['Vendor Settings'],
        summary: 'List return slots (vendor)',
        description: 'Get return slots for the authenticated vendor, optionally filtered by date. Requires vendor role.',
        operationId: 'getReturnSlots',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'date', in: 'query', schema: { type: 'string', format: 'date' }, description: 'Filter by date (YYYY-MM-DD)' }],
        responses: { '200': { description: 'Return slots list', content: { 'application/json': { schema: { $ref: '#/components/schemas/ReturnSlotsListResponse' }, example: { success: true, message: 'Return slots fetched successfully', data: [{ date: '2026-07-20', slotLabel: 'MORNING', capacity: 10 }] } } } }, '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }, '403': { description: 'Forbidden - vendor required', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }, '500': { description: 'Server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } } },
      },
    },

    '/api/v1/vendor/late-fee-rule': {
      put: {
        tags: ['Vendor Settings'],
        summary: 'Upsert late fee rule (vendor)',
        description: 'Create or update the late fee rule for the authenticated vendor. Requires vendor role.',
        operationId: 'upsertLateFeeRule',
        security: [{ BearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/LateFeeRuleRequest' }, examples: { valid: { summary: 'Hourly late fee', value: { gracePeriodHours: 2, rateType: 'HOURLY', rateAmount: 50, maxCap: 500 } } } } } },
        responses: { '200': { description: 'Late fee rule updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/MessageResponse' }, example: { statusCode: 200, message: 'Late fee rule updated successfully', data: null } } } }, '400': { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }, '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }, '403': { description: 'Forbidden - vendor required', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }, '500': { description: 'Server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } } },
      },
    },

    '/api/v1/vendor/cancellation-policy': {
      put: {
        tags: ['Vendor Settings'],
        summary: 'Upsert cancellation policy (vendor)',
        description: 'Create or update the cancellation policy for the authenticated vendor. Requires vendor role.',
        operationId: 'upsertCancellationPolicy',
        security: [{ BearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CancellationPolicyRequest' }, examples: { valid: { summary: 'Standard policy', value: { fullRefundHoursBefore: 24, partialRefundHoursBefore: 6, partialRefundPercent: 50 } } } } } },
        responses: { '200': { description: 'Cancellation policy updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/MessageResponse' }, example: { statusCode: 200, message: 'Cancellation policy updated successfully', data: null } } } }, '400': { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }, '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }, '403': { description: 'Forbidden - vendor required', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }, '500': { description: 'Server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } } },
},
      },
    },

    '/api/v1/orders': {
      post: {
        tags: ['Orders'],
        summary: 'Create order (customer)',
        description: 'Create a new rental order. Requires customer role. Returns Stripe client secrets for rental fee and deposit payments.',
        operationId: 'createOrder',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateOrderRequest' },
              examples: {
                valid: {
                  summary: 'Create order',
                  value: {
                    productId: 'prod-uuid',
                    pricingId: 'price-uuid',
                    quantity: 1,
                    channel: 'ONLINE',
                    deliveryType: 'PICKUP',
                    rentalPeriodStart: '2026-07-20T10:00:00.000Z',
                    rentalPeriodEnd: '2026-07-22T10:00:00.000Z',
                  },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Order created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CreateOrderResponse' },
                example: {
                  success: true,
                  message: 'Order created successfully',
                  data: {
                    order: {
                      id: 'order-uuid',
                      customerUserId: 'user-uuid',
                      vendorUserId: 'vendor-uuid',
                      productId: 'prod-uuid',
                      pricingId: 'price-uuid',
                      quantity: 1,
                      channel: 'ONLINE',
                      status: 'PENDING_PAYMENT',
                      deliveryType: 'PICKUP',
                      rentalPeriodStart: '2026-07-20T10:00:00.000Z',
                      rentalPeriodEnd: '2026-07-22T10:00:00.000Z',
                      createdAt: '2026-07-18T10:30:00.000Z',
                      updatedAt: '2026-07-18T10:30:00.000Z',
                    },
                    stripeClientSecretRental: 'pi_xxx_secret_xxx',
                    stripeClientSecretDeposit: 'pi_yyy_secret_yyy',
                  },
                },
              },
            },
          },
          '400': { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '403': { description: 'Forbidden - customer role required', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'Product/pricing not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '409': { description: 'Product not active or insufficient inventory', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '500': { description: 'Server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
      get: {
        tags: ['Orders'],
        summary: 'List orders (customer/vendor)',
        description: 'List orders for the authenticated user. Customers see their orders, vendors see orders for their products.',
        operationId: 'listOrders',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['PENDING_PAYMENT', 'CONFIRMED', 'DISPATCHED', 'REJECTED_AT_DELIVERY', 'REPLACEMENT_REQUESTED', 'HANDED_OVER', 'ACTIVE_RENTAL', 'RETURN_SCHEDULED', 'RETURNED_PENDING_INSPECTION', 'INSPECTED', 'DEPOSIT_REFUNDED', 'PENALTY_APPLIED', 'DISPUTED', 'CANCELLED', 'COMPLETED'] }, description: 'Filter by order status' },
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 }, description: 'Page number' },
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 }, description: 'Items per page' },
        ],
        responses: {
          '200': { description: 'Orders list', content: { 'application/json': { schema: { $ref: '#/components/schemas/OrderListResponse' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '500': { description: 'Server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
  
    '/api/v1/orders/{id}': {
      get: {
        tags: ['Orders'],
        summary: 'Get order by ID',
        description: 'Returns full order details including product, deposit, payments, and events. Customer can access their orders, vendor can access orders for their products.',
        operationId: 'getOrderById',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Order UUID' }],
        responses: {
          '200': { description: 'Order details', content: { 'application/json': { schema: { $ref: '#/components/schemas/OrderDetailResponse' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '403': { description: 'Forbidden - not owner', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'Order not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '500': { description: 'Server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },

    '/api/v1/vendor/orders': {
      post: {
        tags: ['Orders'],
        summary: 'Create vendor order (vendor)',
        description: 'Create an offline order on behalf of a customer. Requires vendor role. Marks order as CONFIRMED and creates offline deposit record.',
        operationId: 'createVendorOrder',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/VendorOrderRequest' },
              examples: {
                valid: {
                  summary: 'Vendor creates order',
                  value: {
                    customerEmail: 'customer@example.com',
                    productId: 'prod-uuid',
                    pricingId: 'price-uuid',
                    quantity: 1,
                    channel: 'OFFLINE',
                    deliveryType: 'PICKUP',
                    rentalPeriodStart: '2026-07-20T10:00:00.000Z',
                    rentalPeriodEnd: '2026-07-22T10:00:00.000Z',
                  },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Vendor order created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CreateOrderResponse' },
                example: {
                  success: true,
                  message: 'Order created successfully',
                  data: {
                    id: 'order-uuid',
                    customerUserId: 'user-uuid',
                    vendorUserId: 'vendor-uuid',
                    productId: 'prod-uuid',
                    pricingId: 'price-uuid',
                    quantity: 1,
                    channel: 'OFFLINE',
                    status: 'CONFIRMED',
                    deliveryType: 'PICKUP',
                    rentalPeriodStart: '2026-07-20T10:00:00.000Z',
                    rentalPeriodEnd: '2026-07-22T10:00:00.000Z',
                    createdAt: '2026-07-18T10:30:00.000Z',
                    updatedAt: '2026-07-18T10:30:00.000Z',
                  },
                },
              },
            },
          },
          '400': { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '403': { description: 'Forbidden - vendor role required', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'Customer/product/pricing not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '409': { description: 'Product not active or insufficient inventory', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '500': { description: 'Server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },

    '/api/v1/orders/{id}/dispatch': {
      post: {
        tags: ['Orders'],
        summary: 'Dispatch order (vendor)',
        description: 'Mark order as dispatched. Requires vendor role and ownership. Order must be in CONFIRMED status.',
        operationId: 'dispatchOrder',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Order UUID' }],
        responses: {
          '200': { description: 'Order dispatched', content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateOrderResponse' } } } },
          '400': { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '403': { description: 'Forbidden - vendor role required or not owner', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'Order not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '409': { description: 'Invalid state transition', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '500': { description: 'Server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },

    '/api/v1/orders/{id}/confirm-delivery': {
      post: {
        tags: ['Orders'],
        summary: 'Confirm or reject delivery (customer)',
        description: 'Customer accepts delivery (ACCEPT) or rejects with refund/replace (REJECT). Requires customer role and ownership.',
        operationId: 'confirmDelivery',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Order UUID' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ConfirmDeliveryRequest' },
              examples: {
                accept: { summary: 'Accept delivery', value: { decision: 'ACCEPT' } },
                rejectRefund: { summary: 'Reject - request refund', value: { decision: 'REJECT', resolution: 'REFUND', reason: 'Item damaged', photos: ['https://example.com/photo.jpg'] } },
                rejectReplace: { summary: 'Reject - request replacement', value: { decision: 'REJECT', resolution: 'REPLACE', reason: 'Wrong item', photos: [] } },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Delivery confirmed', content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateOrderResponse' } } } },
          '400': { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '403': { description: 'Forbidden - customer role required or not owner', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'Order not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '409': { description: 'Invalid state transition', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '500': { description: 'Server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },

    '/api/v1/orders/{id}/resolve-replacement': {
      post: {
        tags: ['Orders'],
        summary: 'Resolve replacement request (vendor)',
        description: 'Vendor resolves a replacement request by choosing to redispatch or refund. Requires vendor role and ownership.',
        operationId: 'resolveReplacement',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Order UUID' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ResolveReplacementRequest' },
              examples: {
                redispatch: { summary: 'Redispatch replacement', value: { resolution: 'REDISPATCH' } },
                refund: { summary: 'Refund instead', value: { resolution: 'REFUND' } },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Replacement resolved', content: { 'application/json': { schema: { $ref: '#/components/schemas/ResolveReplacementResponse' } } } },
          '400': { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '403': { description: 'Forbidden - vendor role required or not owner', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'Order not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '409': { description: 'Invalid state transition', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '500': { description: 'Server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },

    '/api/v1/orders/{id}/return-slot': {
      post: {
        tags: ['Orders'],
        summary: 'Schedule return slot (customer)',
        description: 'Customer selects a return slot for the order. Requires customer role and ownership. Order must be in ACTIVE_RENTAL status.',
        operationId: 'scheduleReturnSlot',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Order UUID' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ScheduleReturnSlotRequest' },
              examples: {
                valid: { summary: 'Schedule return slot', value: { returnSlotId: 'slot-uuid' } },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Return slot scheduled', content: { 'application/json': { schema: { $ref: '#/components/schemas/ScheduleReturnSlotResponse' } } } },
          '400': { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '403': { description: 'Forbidden - customer role required or not owner', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'Order not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '409': { description: 'Invalid state transition or slot full', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '500': { description: 'Server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },

    '/api/v1/orders/{id}/mark-returned': {
      post: {
        tags: ['Orders'],
        summary: 'Mark order as returned (vendor)',
        description: 'Vendor marks the order as returned, moving it to RETURNED_PENDING_INSPECTION. Requires vendor role and ownership. Order must be in RETURN_SCHEDULED status.',
        operationId: 'markReturned',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Order UUID' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/MarkReturnedRequest' },
              examples: {
                valid: { summary: 'Mark returned now', value: {} },
                withTime: { summary: 'Mark returned at specific time', value: { actualReturnTime: '2026-07-20T14:30:00.000Z' } },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Order marked as returned', content: { 'application/json': { schema: { $ref: '#/components/schemas/MarkReturnedResponse' } } } },
          '400': { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '403': { description: 'Forbidden - vendor role required or not owner', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'Order not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '409': { description: 'Invalid state transition', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '500': { description: 'Server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },

    '/api/v1/orders/{id}/inspect': {
      post: {
        tags: ['Orders'],
        summary: 'Inspect returned order (vendor)',
        description: 'Vendor inspects the returned item, records damage, computes late fees and deductions, processes deposit refund, and completes the order. Requires vendor role and ownership. Order must be in RETURNED_PENDING_INSPECTION status.',
        operationId: 'inspectOrder',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Order UUID' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/InspectOrderRequest' },
              examples: {
                noDamage: { summary: 'No damage, on time', value: { damageFound: false, conditionNotes: 'Item in perfect condition', photos: [], damageDeductionAmount: 0 } },
                withDamage: { summary: 'Damage found', value: { damageFound: true, conditionNotes: 'Screen cracked', photos: ['https://example.com/damage.jpg'], damageDeductionAmount: 5000 } },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Inspection completed', content: { 'application/json': { schema: { $ref: '#/components/schemas/InspectOrderResponse' } } } },
          '400': { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '403': { description: 'Forbidden - vendor role required or not owner', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'Order not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '409': { description: 'Invalid state transition', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '502': { description: 'Stripe refund failed', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '500': { description: 'Server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },

    '/api/v1/orders/{id}/report-issue': {
      post: {
        tags: ['Orders'],
        summary: 'Report issue / open dispute (customer)',
        description: 'Customer reports an issue during rental (e.g., defective item). Opens a dispute. Requires customer role and ownership. Order must be in HANDED_OVER or ACTIVE_RENTAL status and within 24h of handover.',
        operationId: 'reportIssue',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Order UUID' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ReportIssueRequest' },
              examples: {
                valid: { summary: 'Report issue', value: { description: 'Item not working', photos: ['https://example.com/issue.jpg'] } },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Issue reported, dispute opened', content: { 'application/json': { schema: { $ref: '#/components/schemas/ReportIssueResponse' } } } },
          '400': { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '403': { description: 'Forbidden - customer role required or not owner', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'Order not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '409': { description: 'Invalid state transition or report window expired', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '500': { description: 'Server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },

    '/api/v1/orders/{id}/resolve-dispute': {
      post: {
        tags: ['Orders'],
        summary: 'Resolve dispute (vendor)',
        description: 'Vendor resolves a dispute opened by the customer. ACCEPT -> full refund and cancel order, REJECT -> order continues as ACTIVE_RENTAL. Requires vendor role and ownership. Order must be in DISPUTED status.',
        operationId: 'resolveDispute',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Order UUID' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ResolveDisputeRequest' },
              examples: {
                accept: { summary: 'Accept dispute', value: { resolution: 'ACCEPT', note: 'Item was defective, full refund issued' } },
                reject: { summary: 'Reject dispute', value: { resolution: 'REJECT', note: 'Item functions correctly' } },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Dispute resolved', content: { 'application/json': { schema: { $ref: '#/components/schemas/ResolveDisputeResponse' } } } },
          '400': { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '403': { description: 'Forbidden - vendor role required or not owner', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'Order not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '409': { description: 'Invalid state transition', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '502': { description: 'Stripe refund failed', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '500': { description: 'Server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },

    '/api/v1/orders/{id}/cancel': {
      post: {
        tags: ['Orders'],
        summary: 'Cancel order (customer or vendor)',
        description: 'Cancels an order in PENDING_PAYMENT or CONFIRMED status. Refund percentage determined by vendor\'s cancellation policy. Deposit always fully refunded. Requires ownership (customer or vendor). Supports Idempotency-Key header for safe retries.',
        operationId: 'cancelOrder',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Order UUID' },
          { name: 'Idempotency-Key', in: 'header', schema: { type: 'string' }, description: 'Optional idempotency key for safe retries (24h TTL)' },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CancelOrderRequest' },
              examples: {
                empty: { summary: 'Cancel with no extra data', value: {} },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Order cancelled', content: { 'application/json': { schema: { $ref: '#/components/schemas/CancelOrderResponse' } } } },
          '400': { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '403': { description: 'Forbidden - not owner', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'Order not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '409': { description: 'Invalid state transition', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '502': { description: 'Stripe refund failed', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '500': { description: 'Server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },

    '/api/v1/orders/{id}/mark-paid-offline': {
      post: {
        tags: ['Orders'],
        summary: 'Mark offline order as paid (vendor)',
        description: 'Vendor marks an offline order as paid, moving it to CONFIRMED status. Requires vendor role and ownership. Not yet implemented (returns 501).',
        operationId: 'markPaidOffline',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' }, description: 'Order UUID' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/MarkPaidOfflineRequest' },
              examples: { empty: { summary: 'Mark paid', value: {} } },
            },
          },
        },
        responses: {
          '501': { description: 'Not implemented', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '400': { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '403': { description: 'Forbidden - vendor role required or not owner', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '404': { description: 'Order not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '409': { description: 'Invalid state transition', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '500': { description: 'Server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },

    '/api/v1/webhooks/stripe': {
      post: {
        tags: ['Orders'],
        summary: 'Stripe webhook',
        description: 'Receives Stripe events (payment_intent.succeeded, charge.refunded). No JWT authentication; verifies Stripe-Signature header. Raw body required.',
        operationId: 'stripeWebhook',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { type: 'object', description: 'Stripe event object' },
            },
          },
        },
        responses: {
          '200': { description: 'Webhook processed', content: { 'application/json': { schema: { type: 'object', properties: { received: { type: 'boolean', example: true } } } } } },
          '400': { description: 'Invalid signature', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '500': { description: 'Server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Pass the JWT access token from login. Format: `Bearer <token>`',
      },
    },
    schemas: {
      RegisterRequest: {
        type: 'object',
        required: ['email', 'password', 'full_name', 'role'],
        properties: {
          email: { type: 'string', format: 'email', description: 'User email (unique)', example: 'john@example.com' },
          password: { type: 'string', minLength: 8, description: 'Min 8 chars, uppercase, lowercase, number, special char', example: 'Secret@123' },
          full_name: { type: 'string', minLength: 1, maxLength: 150, description: 'Full name', example: 'John Doe' },
          role: { type: 'string', enum: ['customer', 'vendor', 'admin'], default: 'customer', description: 'User role', example: 'customer' },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: { email: { type: 'string', format: 'email', example: 'john@example.com' }, password: { type: 'string', example: 'Secret@123' } },
      },
      RefreshTokenRequest: { type: 'object', required: ['refreshToken'], properties: { refreshToken: { type: 'string', description: 'Opaque refresh token from login', example: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2' } } },
      ForgotPasswordRequest: { type: 'object', required: ['email'], properties: { email: { type: 'string', format: 'email', example: 'john@example.com' } } },
      ResetPasswordRequest: { type: 'object', required: ['token', 'password'], properties: { token: { type: 'string', description: 'Reset token from email', example: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2' }, password: { type: 'string', minLength: 8, description: 'New password', example: 'NewPass@123' } } },
      VerifyEmailRequest: { type: 'object', required: ['token'], properties: { token: { type: 'string', description: 'Verification token from email', example: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2' } } },
      VendorProfileRequest: { type: 'object', required: ['gst_number', 'company_name', 'product_category'], properties: { gst_number: { type: 'string', minLength: 15, maxLength: 15, description: '15-character GST number', example: '29AAAAA0000A1Z5' }, company_name: { type: 'string', minLength: 1, maxLength: 150, description: 'Company name', example: 'ABC Enterprises' }, product_category: { type: 'string', minLength: 1, maxLength: 100, description: 'Product category', example: 'Electronics' } } },

      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440000' },
          full_name: { type: 'string', example: 'John Doe' },
          email: { type: 'string', format: 'email', example: 'john@example.com' },
          role: { type: 'string', enum: ['customer', 'vendor', 'admin'], example: 'customer' },
          email_verified: { type: 'boolean', example: true },
          created_at: { type: 'string', format: 'date-time', example: '2026-07-15T10:30:00.000Z' },
          updated_at: { type: 'string', format: 'date-time', example: '2026-07-15T10:30:00.000Z' },
        },
      },
      VendorProfile: {
        type: 'object',
        properties: {
          user_id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440000' },
          gst_number: { type: 'string', example: '29AAAAA0000A1Z5' },
          company_name: { type: 'string', example: 'ABC Enterprises' },
          product_category: { type: 'string', example: 'Electronics' },
          created_at: { type: 'string', format: 'date-time', example: '2026-07-18T10:30:00.000Z' },
          updated_at: { type: 'string', format: 'date-time', example: '2026-07-18T10:30:00.000Z' },
        },
      },
      HealthResponse: { type: 'object', properties: { statusCode: { type: 'integer', example: 200 }, message: { type: 'string', example: 'Auth Service is healthy' }, data: { type: 'null', nullable: true } } },
      UserResponse: { type: 'object', properties: { statusCode: { type: 'integer', example: 201 }, message: { type: 'string', example: 'User created successfully. Please verify your email.' }, data: { $ref: '#/components/schemas/User' } } },
      LoginResponse: { type: 'object', properties: { statusCode: { type: 'integer', example: 200 }, message: { type: 'string', example: 'Login successful' }, data: { type: 'object', properties: { accessToken: { type: 'string', description: 'JWT access token (15 min)' }, refreshToken: { type: 'string', description: 'Opaque refresh token (7 days)' }, user: { type: 'object', properties: { id: { type: 'string', format: 'uuid' }, email: { type: 'string', format: 'email' }, full_name: { type: 'string' }, role: { type: 'string', enum: ['customer', 'vendor', 'admin'] } } } } } } },
      RefreshTokenResponse: { type: 'object', properties: { statusCode: { type: 'integer', example: 200 }, message: { type: 'string', example: 'Token refreshed successfully' }, data: { type: 'object', properties: { accessToken: { type: 'string' }, refreshToken: { type: 'string' } } } } },
      ProfileResponse: { type: 'object', properties: { statusCode: { type: 'integer', example: 200 }, message: { type: 'string', example: 'Profile fetched successfully' }, data: { $ref: '#/components/schemas/User' } } },
      VendorProfileResponse: { type: 'object', properties: { statusCode: { type: 'integer', example: 201 }, message: { type: 'string', example: 'Vendor profile created successfully' }, data: { $ref: '#/components/schemas/VendorProfile' } } },
      MessageResponse: { type: 'object', properties: { statusCode: { type: 'integer', example: 200 }, message: { type: 'string', example: 'Operation successful' }, data: { type: 'null', nullable: true } } },
      ErrorResponse: { type: 'object', properties: { statusCode: { type: 'integer', example: 400 }, message: { type: 'string', example: 'Error message' }, data: { type: 'null', nullable: true } } },

      CategoryRequest: { type: 'object', required: ['name'], properties: { name: { type: 'string', minLength: 1, maxLength: 50, example: 'Electronics' }, description: { type: 'string', maxLength: 300, example: 'Electronic devices' } } },
      Category: { type: 'object', properties: { id: { type: 'string', format: 'uuid' }, name: { type: 'string' }, description: { type: 'string', nullable: true }, created_at: { type: 'string', format: 'date-time' } } },
      CategoryResponse: { type: 'object', properties: { success: { type: 'boolean', example: true }, message: { type: 'string', example: 'Category created successfully' }, data: { $ref: '#/components/schemas/Category' } } },
      CategoriesResponse: { type: 'object', properties: { success: { type: 'boolean', example: true }, data: { type: 'array', items: { $ref: '#/components/schemas/Category' } } } },

      CreateProductRequest: {
        type: 'object',
        required: ['categoryId', 'name'],
        properties: {
          categoryId: { type: 'string', format: 'uuid', description: 'Category UUID', example: 'cat-uuid' },
          name: { type: 'string', minLength: 1, maxLength: 100, example: 'Wireless Headphones' },
          description: { type: 'string', maxLength: 2000, example: 'Premium noise-cancelling headphones' },
          brand: { type: 'string', maxLength: 100, example: 'Sony' },
          manufacturer: { type: 'string', maxLength: 100, example: 'Sony Corp' },
          thumbnail: { type: 'string', format: 'uri', example: 'https://example.com/thumb.jpg' },
          images: { type: 'array', items: { type: 'string', format: 'uri' }, maxItems: 20, default: [], example: ['https://example.com/img1.jpg'] },
        },
      },
      UpdateProductRequest: {
        type: 'object',
        properties: {
          categoryId: { type: 'string', format: 'uuid' },
          name: { type: 'string', minLength: 1, maxLength: 100 },
          description: { type: 'string', maxLength: 2000 },
          brand: { type: 'string', maxLength: 100 },
          manufacturer: { type: 'string', maxLength: 100 },
          thumbnail: { type: 'string', format: 'uri' },
          images: { type: 'array', items: { type: 'string', format: 'uri' }, maxItems: 20 },
        },
      },
      ProductCreateDTO: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          category: { type: 'object', properties: { id: { type: 'string', format: 'uuid' }, name: { type: 'string' } } },
          brand: { type: 'string', nullable: true },
          manufacturer: { type: 'string', nullable: true },
          status: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'DRAFT'] },
          thumbnail: { type: 'string', format: 'uri', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      ProductCreateResponse: { type: 'object', properties: { success: { type: 'boolean', example: true }, message: { type: 'string', example: 'Product created successfully' }, data: { $ref: '#/components/schemas/ProductCreateDTO' } } },
      ProductUpdateResponse: { type: 'object', properties: { success: { type: 'boolean', example: true }, message: { type: 'string', example: 'Product updated successfully' }, data: { $ref: '#/components/schemas/ProductCreateDTO' } } },

      ProductListItem: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          thumbnail: { type: 'string', format: 'uri', nullable: true },
          category: { type: 'object', properties: { id: { type: 'string', format: 'uuid' }, name: { type: 'string' } } },
          brand: { type: 'string', nullable: true },
          vendorId: { type: 'string', format: 'uuid' },
          vendorName: { type: 'string' },
          inventory: { type: 'object', properties: { available: { type: 'integer' } } },
          startingPrice: { type: 'number', nullable: true },
          status: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'DRAFT'] },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      ProductListResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: { type: 'array', items: { $ref: '#/components/schemas/ProductListItem' } },
          meta: {
            type: 'object',
            properties: {
              page: { type: 'integer', example: 1 },
              limit: { type: 'integer', example: 10 },
              total: { type: 'integer', example: 100 },
              totalPages: { type: 'integer', example: 10 },
            },
          },
        },
      },

      ProductDetail: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          description: { type: 'string', nullable: true },
          brand: { type: 'string', nullable: true },
          manufacturer: { type: 'string', nullable: true },
          category: { type: 'object', properties: { id: { type: 'string', format: 'uuid' }, name: { type: 'string' } } },
          vendor: { type: 'object', properties: { id: { type: 'string', format: 'uuid' }, companyName: { type: 'string' } } },
          images: { type: 'array', items: { type: 'string', format: 'uri' } },
          inventory: { type: 'object', properties: { available: { type: 'integer' }, reserved: { type: 'integer' }, rented: { type: 'integer' }, maintenance: { type: 'integer' } } },
          pricing: { type: 'array', items: { type: 'object', properties: { id: { type: 'string', format: 'uuid' }, period: { type: 'string', enum: ['HOUR', 'DAY', 'WEEK'] }, duration: { type: 'integer' }, price: { type: 'number' }, deposit: { type: 'number' } } } },
          lateFeeRule: { type: 'object', nullable: true, properties: { gracePeriodHours: { type: 'integer' }, rateType: { type: 'string', enum: ['HOURLY', 'DAILY'] }, rateAmount: { type: 'number' }, maxCap: { type: 'number' } } },
          cancellationPolicy: { type: 'object', nullable: true, properties: { fullRefundHoursBefore: { type: 'integer' }, partialRefundHoursBefore: { type: 'integer' }, partialRefundPercent: { type: 'integer' } } },
        },
      },
      ProductDetailResponse: { type: 'object', properties: { success: { type: 'boolean', example: true }, message: { type: 'string', example: 'Product fetched successfully' }, data: { $ref: '#/components/schemas/ProductDetail' } } },

      Inventory: { type: 'object', properties: { available: { type: 'integer', example: 10 }, reserved: { type: 'integer', example: 2 }, rented: { type: 'integer', example: 3 }, maintenance: { type: 'integer', example: 1 } } },
      InventoryResponse: { type: 'object', properties: { success: { type: 'boolean', example: true }, message: { type: 'string', example: 'Inventory fetched successfully' }, data: { $ref: '#/components/schemas/Inventory' } } },
      UpdateInventoryRequest: { type: 'object', properties: { available: { type: 'integer', minimum: 0 }, maintenance: { type: 'integer', minimum: 0 } } },
      InventoryUpdateResponse: { type: 'object', properties: { success: { type: 'boolean', example: true }, message: { type: 'string', example: 'Inventory updated successfully' }, data: { $ref: '#/components/schemas/Inventory' } } },

      CreatePricingRequest: { type: 'object', required: ['period', 'duration', 'price'], properties: { period: { type: 'string', enum: ['HOUR', 'DAY', 'WEEK'], example: 'DAY' }, duration: { type: 'integer', minimum: 1, example: 1 }, price: { type: 'integer', minimum: 1, example: 500 }, deposit: { type: 'integer', minimum: 0, default: 0, example: 1000 } } },
      UpdatePricingRequest: { type: 'object', properties: { period: { type: 'string', enum: ['HOUR', 'DAY', 'WEEK'] }, duration: { type: 'integer', minimum: 1 }, price: { type: 'integer', minimum: 1 }, deposit: { type: 'integer', minimum: 0 } } },
      PricingItem: { type: 'object', properties: { id: { type: 'string', format: 'uuid' }, period: { type: 'string', enum: ['HOUR', 'DAY', 'WEEK'] }, duration: { type: 'integer' }, price: { type: 'number' }, deposit: { type: 'number' } } },
      PricingListResponse: { type: 'object', properties: { success: { type: 'boolean', example: true }, message: { type: 'string', example: 'Pricing fetched successfully' }, data: { type: 'array', items: { $ref: '#/components/schemas/PricingItem' } } } },
      PricingCreateResponse: { type: 'object', properties: { success: { type: 'boolean', example: true }, message: { type: 'string', example: 'Pricing created successfully' }, data: { $ref: '#/components/schemas/PricingItem' } } },
      PricingUpdateResponse: { type: 'object', properties: { success: { type: 'boolean', example: true }, message: { type: 'string', example: 'Pricing updated successfully' }, data: { $ref: '#/components/schemas/PricingItem' } } },

      CreateReturnSlotRequest: { type: 'object', required: ['date', 'slotLabel', 'capacity'], properties: { date: { type: 'string', format: 'date', example: '2026-07-20' }, slotLabel: { type: 'string', enum: ['MORNING', 'AFTERNOON', 'EVENING'], example: 'MORNING' }, capacity: { type: 'integer', minimum: 1, example: 10 } } },
      ReturnSlot: { type: 'object', properties: { date: { type: 'string', format: 'date' }, slotLabel: { type: 'string', enum: ['MORNING', 'AFTERNOON', 'EVENING'] }, capacity: { type: 'integer' } } },
      ReturnSlotResponse: { type: 'object', properties: { success: { type: 'boolean', example: true }, message: { type: 'string', example: 'Return slot created successfully' }, data: { $ref: '#/components/schemas/ReturnSlot' } } },
      ReturnSlotsListResponse: { type: 'object', properties: { success: { type: 'boolean', example: true }, message: { type: 'string', example: 'Return slots fetched successfully' }, data: { type: 'array', items: { $ref: '#/components/schemas/ReturnSlot' } } } },

      LateFeeRuleRequest: { type: 'object', required: ['rateType', 'rateAmount', 'maxCap'], properties: { gracePeriodHours: { type: 'integer', minimum: 0, default: 0, example: 2 }, rateType: { type: 'string', enum: ['HOURLY', 'DAILY'], example: 'HOURLY' }, rateAmount: { type: 'integer', minimum: 1, example: 50 }, maxCap: { type: 'integer', minimum: 1, example: 500 } } },
      CancellationPolicyRequest: { type: 'object', properties: { fullRefundHoursBefore: { type: 'integer', minimum: 0, default: 24, example: 24 }, partialRefundHoursBefore: { type: 'integer', minimum: 0, default: 6, example: 6 }, partialRefundPercent: { type: 'integer', minimum: 0, maximum: 100, default: 50, example: 50 } } },
},
      },

      CreateOrderRequest: {
        type: 'object',
        required: ['productId', 'pricingId', 'quantity', 'channel', 'deliveryType', 'rentalPeriodStart', 'rentalPeriodEnd'],
        properties: {
          productId: { type: 'string', format: 'uuid', description: 'Product UUID' },
          pricingId: { type: 'string', format: 'uuid', description: 'Pricing tier UUID' },
          quantity: { type: 'integer', minimum: 1, default: 1 },
          channel: { type: 'string', enum: ['ONLINE', 'OFFLINE'], description: 'Order channel' },
          deliveryType: { type: 'string', enum: ['PICKUP', 'DELIVERY'], description: 'Delivery type' },
          rentalPeriodStart: { type: 'string', format: 'date-time', description: 'Rental start (ISO 8601)' },
          rentalPeriodEnd: { type: 'string', format: 'date-time', description: 'Rental end (ISO 8601)' },
        },
      },
      VendorOrderRequest: {
        type: 'object',
        required: ['customerEmail', 'productId', 'pricingId', 'quantity', 'channel', 'deliveryType', 'rentalPeriodStart', 'rentalPeriodEnd'],
        properties: {
          customerEmail: { type: 'string', format: 'email', description: 'Customer email' },
          productId: { type: 'string', format: 'uuid', description: 'Product UUID' },
          pricingId: { type: 'string', format: 'uuid', description: 'Pricing tier UUID' },
          quantity: { type: 'integer', minimum: 1, default: 1 },
          channel: { type: 'string', enum: ['OFFLINE'], description: 'Must be OFFLINE for vendor orders' },
          deliveryType: { type: 'string', enum: ['PICKUP', 'DELIVERY'] },
          rentalPeriodStart: { type: 'string', format: 'date-time' },
          rentalPeriodEnd: { type: 'string', format: 'date-time' },
        },
      },
      CreateOrderResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          message: { type: 'string' },
          data: {
            type: 'object',
            properties: {
              order: { $ref: '#/components/schemas/Order' },
              stripeClientSecretRental: { type: 'string', nullable: true, description: 'Stripe client secret for rental payment' },
              stripeClientSecretDeposit: { type: 'string', nullable: true, description: 'Stripe client secret for deposit payment' },
            },
          },
        },
      },
      Order: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          customerUserId: { type: 'string', format: 'uuid' },
          vendorUserId: { type: 'string', format: 'uuid' },
          productId: { type: 'string', format: 'uuid' },
          pricingId: { type: 'string', format: 'uuid' },
          quantity: { type: 'integer' },
          channel: { type: 'string', enum: ['ONLINE', 'OFFLINE'] },
          status: { type: 'string', enum: ['PENDING_PAYMENT', 'CONFIRMED', 'DISPATCHED', 'REJECTED_AT_DELIVERY', 'REPLACEMENT_REQUESTED', 'HANDED_OVER', 'ACTIVE_RENTAL', 'RETURN_SCHEDULED', 'RETURNED_PENDING_INSPECTION', 'INSPECTED', 'DEPOSIT_REFUNDED', 'PENALTY_APPLIED', 'DISPUTED', 'CANCELLED', 'COMPLETED'] },
          deliveryType: { type: 'string', enum: ['PICKUP', 'DELIVERY'] },
          returnSlotId: { type: 'string', format: 'uuid', nullable: true },
          rentalPeriodStart: { type: 'string', format: 'date-time' },
          rentalPeriodEnd: { type: 'string', format: 'date-time' },
          actualHandoverTime: { type: 'string', format: 'date-time', nullable: true },
          actualReturnTime: { type: 'string', format: 'date-time', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      OrderDetail: {
        allOf: [
          { $ref: '#/components/schemas/Order' },
          {
            type: 'object',
            properties: {
              product: { type: 'object', properties: { id: { type: 'string', format: 'uuid' }, name: { type: 'string' }, thumbnail: { type: 'string', format: 'uri' }, brand: { type: 'string' } } },
              deposit: { type: 'object', properties: { id: { type: 'string', format: 'uuid' }, amountHeld: { type: 'integer' }, status: { type: 'string' }, method: { type: 'string' } }, nullable: true },
              payments: { type: 'array', items: { type: 'object', properties: { id: { type: 'string', format: 'uuid' }, stripePaymentIntentId: { type: 'string' }, amount: { type: 'integer' }, type: { type: 'string' }, status: { type: 'string' } } } },
              orderEvents: { type: 'array', items: { type: 'object', properties: { id: { type: 'string', format: 'uuid' }, fromStatus: { type: 'string' }, toStatus: { type: 'string' }, actorRole: { type: 'string' }, actorUserId: { type: 'string', format: 'uuid', nullable: true }, note: { type: 'string' }, createdAt: { type: 'string', format: 'date-time' } } } },
            },
          },
        ],
      },
      OrderListResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: { type: 'array', items: { $ref: '#/components/schemas/Order' } },
          meta: { type: 'object', properties: { page: { type: 'integer' }, limit: { type: 'integer' }, total: { type: 'integer' }, totalPages: { type: 'integer' } } },
        },
      },
      OrderDetailResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          message: { type: 'string' },
          data: { $ref: '#/components/schemas/OrderDetail' },
        },
      },
      ConfirmDeliveryRequest: {
        type: 'object',
        oneOf: [
          { type: 'object', required: ['decision'], properties: { decision: { type: 'string', enum: ['ACCEPT'] } } },
          { type: 'object', required: ['decision', 'resolution', 'reason'], properties: { decision: { type: 'string', enum: ['REJECT'] }, resolution: { type: 'string', enum: ['REFUND', 'REPLACE'] }, reason: { type: 'string', minLength: 1 }, photos: { type: 'array', items: { type: 'string', format: 'uri' }, default: [] } } },
        ],
        description: 'ACCEPT to confirm delivery, REJECT with REFUND or REPLACE for rejection',
      },
      ResolveReplacementRequest: {
        type: 'object',
        required: ['resolution'],
        properties: {
          resolution: { type: 'string', enum: ['REDISPATCH', 'REFUND'], description: 'REDISPATCH to send replacement, REFUND to process refund' },
        },
      },
ResolveReplacementResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          message: { type: 'string' },
          data: { $ref: '#/components/schemas/Order' },
        },
      },

      ScheduleReturnSlotRequest: {
        type: 'object',
        required: ['returnSlotId'],
        properties: {
          returnSlotId: { type: 'string', format: 'uuid', description: 'Return slot UUID' },
        },
      },
      ScheduleReturnSlotResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          message: { type: 'string' },
          data: { $ref: '#/components/schemas/Order' },
        },
      },

      MarkReturnedRequest: {
        type: 'object',
        properties: {
          actualReturnTime: { type: 'string', format: 'date-time', description: 'ISO 8601 timestamp (defaults to now)' },
        },
      },
      MarkReturnedResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          message: { type: 'string' },
          data: { $ref: '#/components/schemas/Order' },
        },
      },

      InspectOrderRequest: {
        type: 'object',
        required: ['damageFound', 'conditionNotes', 'photos', 'damageDeductionAmount'],
        properties: {
          damageFound: { type: 'boolean' },
          conditionNotes: { type: 'string' },
          photos: { type: 'array', items: { type: 'string', format: 'uri' }, default: [] },
          damageDeductionAmount: { type: 'integer', minimum: 0 },
        },
      },
      InspectionReport: {
        type: 'object',
        properties: {
          damageFound: { type: 'boolean' },
          conditionNotes: { type: 'string' },
          photos: { type: 'array', items: { type: 'string', format: 'uri' } },
          damageDeductionAmount: { type: 'integer' },
          lateByMinutes: { type: 'integer' },
          latePenalty: { type: 'integer' },
          totalDeduction: { type: 'integer' },
          refundAmount: { type: 'integer' },
        },
      },
      InspectOrderResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          message: { type: 'string' },
          data: {
            type: 'object',
            properties: {
              order: { $ref: '#/components/schemas/Order' },
              inspectionReport: { $ref: '#/components/schemas/InspectionReport' },
              latePenalty: { type: 'integer' },
              totalDeduction: { type: 'integer' },
              refundAmount: { type: 'integer' },
            },
          },
        },
      },

      ReportIssueRequest: {
        type: 'object',
        required: ['description'],
        properties: {
          description: { type: 'string', minLength: 1 },
          photos: { type: 'array', items: { type: 'string', format: 'uri' }, default: [] },
        },
      },
      ReportIssueResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          message: { type: 'string' },
          data: { $ref: '#/components/schemas/Order' },
        },
      },

      ResolveDisputeRequest: {
        type: 'object',
        required: ['resolution', 'note'],
        properties: {
          resolution: { type: 'string', enum: ['ACCEPT', 'REJECT'] },
          note: { type: 'string', minLength: 1 },
        },
      },
      ResolveDisputeResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          message: { type: 'string' },
          data: { $ref: '#/components/schemas/Order' },
        },
      },

      CancelOrderRequest: {
        type: 'object',
        properties: {},
      },
      RefundBreakdown: {
        type: 'object',
        properties: {
          rentalFeeRefundCents: { type: 'integer' },
          depositRefundCents: { type: 'integer' },
          totalRefundCents: { type: 'integer' },
          refundPercent: { type: 'integer' },
          reason: { type: 'string' },
        },
      },
      CancelOrderResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          message: { type: 'string' },
          data: {
            type: 'object',
            properties: {
              order: { $ref: '#/components/schemas/Order' },
              refundBreakdown: { $ref: '#/components/schemas/RefundBreakdown' },
            },
          },
        },
      },

      MarkPaidOfflineRequest: {
        type: 'object',
        properties: {},
      },
      MarkPaidOfflineResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          message: { type: 'string' },
          data: { $ref: '#/components/schemas/Order' },
        },
      },
    };

export default openapi;