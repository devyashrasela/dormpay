const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
    definition: {
        openapi: '3.0.3',
        info: {
            title: 'Campus Wallet API',
            version: '1.0.0',
            description: 'Student Payment System on Algorand TestNet — Send/receive ALGO & ASA stablecoins within a campus community.',
            contact: { name: 'CampusWallet Team' },
        },
        servers: [
            { url: 'http://localhost:8000', description: 'Development' },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'Auth0 access token (get from Auth0 login flow)',
                },
            },
            schemas: {
                User: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        auth0_sub: { type: 'string', example: 'auth0|abc123' },
                        username: { type: 'string', example: 'john_doe' },
                        wallet_address: { type: 'string', example: 'ALGO...' },
                        email: { type: 'string', example: 'john@campus.edu' },
                        display_name: { type: 'string', example: 'John Doe' },
                        avatar_url: { type: 'string', nullable: true },
                        is_active: { type: 'boolean' },
                        last_active: { type: 'string', format: 'date-time', nullable: true },
                        created_at: { type: 'string', format: 'date-time' },
                        updated_at: { type: 'string', format: 'date-time' },
                    },
                },
                Transaction: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        txn_id: { type: 'string', example: 'TXNID123...' },
                        sender_user_id: { type: 'integer' },
                        receiver_user_id: { type: 'integer', nullable: true },
                        sender_address: { type: 'string' },
                        receiver_address: { type: 'string' },
                        amount: { type: 'number', example: 5.5 },
                        asset_type: { type: 'string', example: 'ALGO' },
                        asset_id: { type: 'integer', example: 0 },
                        note: { type: 'string', nullable: true },
                        status: { type: 'string', enum: ['pending', 'confirmed', 'failed'] },
                        block_round: { type: 'integer', nullable: true },
                        created_at: { type: 'string', format: 'date-time' },
                    },
                },
                SplitBill: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        creator_id: { type: 'integer' },
                        title: { type: 'string', example: 'Dinner at campus café' },
                        description: { type: 'string', nullable: true },
                        total_amount: { type: 'number', example: 50.0 },
                        asset_type: { type: 'string', example: 'ALGO' },
                        status: { type: 'string', enum: ['active', 'settled', 'cancelled'] },
                        creator: { $ref: '#/components/schemas/User' },
                        participants: { type: 'array', items: { $ref: '#/components/schemas/SplitBillParticipant' } },
                        expenses: { type: 'array', items: { $ref: '#/components/schemas/SplitBillExpense' } },
                    },
                },
                SplitBillParticipant: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        split_bill_id: { type: 'integer' },
                        user_id: { type: 'integer' },
                        is_admin: { type: 'boolean' },
                        share_amount: { type: 'number' },
                        paid_amount: { type: 'number' },
                        status: { type: 'string', enum: ['pending', 'partial', 'paid'] },
                    },
                },
                SplitBillExpense: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        split_bill_id: { type: 'integer' },
                        paid_by_user_id: { type: 'integer' },
                        description: { type: 'string' },
                        amount: { type: 'number' },
                        txn_id: { type: 'string', nullable: true },
                    },
                },
                Notification: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        user_id: { type: 'integer' },
                        type: { type: 'string', enum: ['payment_received', 'payment_sent', 'split_invite', 'split_settled'] },
                        title: { type: 'string' },
                        message: { type: 'string' },
                        reference_id: { type: 'string', nullable: true },
                        is_read: { type: 'boolean' },
                        email_sent: { type: 'boolean' },
                        created_at: { type: 'string', format: 'date-time' },
                    },
                },
                ChatMessage: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        user_id: { type: 'integer' },
                        role: { type: 'string', enum: ['user', 'assistant'] },
                        message: { type: 'string' },
                        created_at: { type: 'string', format: 'date-time' },
                    },
                },
                VoiceProfile: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        user_id: { type: 'integer' },
                        voice_name: { type: 'string', example: 'My Deep Voice' },
                        elevenlabs_voice_id: { type: 'string' },
                        sample_url: { type: 'string', nullable: true },
                        use_for_outgoing: { type: 'boolean' },
                        use_for_incoming: { type: 'boolean' },
                        is_active: { type: 'boolean' },
                    },
                },
                Error: {
                    type: 'object',
                    properties: {
                        error: { type: 'string' },
                    },
                },
            },
        },
        tags: [
            { name: 'Health', description: 'Server health check' },
            { name: 'Users', description: 'User profile management (Auth0-protected)' },
            { name: 'Wallet', description: 'Algorand wallet balance & assets' },
            { name: 'Transactions', description: 'On-chain transaction metadata & history' },
            { name: 'Split Bills', description: 'Group expense splitting with on-chain settlement' },
            { name: 'Notifications', description: 'In-app & email notifications' },
            { name: 'Analytics', description: 'Spending/receiving analytics & charts' },
            { name: 'AI Chat', description: 'Gemini-powered financial assistant' },
            { name: 'Voice', description: 'ElevenLabs voice cloning & TTS' },
        ],
        paths: {
            // ═══════════════════ HEALTH ═══════════════════
            '/api/health': {
                get: {
                    tags: ['Health'],
                    summary: 'Health check',
                    description: 'Returns server status and timestamp.',
                    responses: {
                        200: {
                            description: 'Server is healthy',
                            content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string', example: 'ok' }, timestamp: { type: 'string', format: 'date-time' } } } } },
                        },
                    },
                },
            },

            // ═══════════════════ USERS ═══════════════════
            '/api/users/sync': {
                post: {
                    tags: ['Users'],
                    summary: 'Sync user profile after Auth0 login',
                    description: 'Creates or updates user record. Called after Auth0 login to ensure user exists in MySQL.',
                    security: [{ bearerAuth: [] }],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['username', 'email'],
                                    properties: {
                                        username: { type: 'string', example: 'john_doe' },
                                        email: { type: 'string', example: 'john@campus.edu' },
                                        wallet_address: { type: 'string', example: 'ALGO...' },
                                        display_name: { type: 'string', example: 'John Doe' },
                                        avatar_url: { type: 'string' },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        201: { description: 'User created', content: { 'application/json': { schema: { type: 'object', properties: { message: { type: 'string' }, user: { $ref: '#/components/schemas/User' } } } } } },
                        200: { description: 'User synced (already exists)', content: { 'application/json': { schema: { type: 'object', properties: { message: { type: 'string' }, user: { $ref: '#/components/schemas/User' } } } } } },
                        401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
                        409: { description: 'Username or wallet already taken', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
                    },
                },
            },
            '/api/users/me': {
                get: {
                    tags: ['Users'],
                    summary: 'Get current user profile',
                    security: [{ bearerAuth: [] }],
                    responses: {
                        200: { description: 'User profile', content: { 'application/json': { schema: { type: 'object', properties: { user: { $ref: '#/components/schemas/User' } } } } } },
                        404: { description: 'User not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
                    },
                },
                put: {
                    tags: ['Users'],
                    summary: 'Update current user profile',
                    security: [{ bearerAuth: [] }],
                    requestBody: {
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        display_name: { type: 'string' },
                                        avatar_url: { type: 'string' },
                                        wallet_address: { type: 'string' },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        200: { description: 'Profile updated', content: { 'application/json': { schema: { type: 'object', properties: { message: { type: 'string' }, user: { $ref: '#/components/schemas/User' } } } } } },
                        409: { description: 'Wallet address already taken' },
                    },
                },
            },
            '/api/users/lookup/{username}': {
                get: {
                    tags: ['Users'],
                    summary: 'Lookup user by username',
                    description: 'Resolve a username to a wallet address. Used for sending payments by @username.',
                    security: [{ bearerAuth: [] }],
                    parameters: [{ name: 'username', in: 'path', required: true, schema: { type: 'string' }, description: 'Username to look up' }],
                    responses: {
                        200: { description: 'User found', content: { 'application/json': { schema: { type: 'object', properties: { user: { type: 'object', properties: { id: { type: 'integer' }, username: { type: 'string' }, wallet_address: { type: 'string' }, display_name: { type: 'string' }, avatar_url: { type: 'string' } } } } } } } },
                        404: { description: 'User not found' },
                        400: { description: 'User has no wallet connected' },
                    },
                },
            },

            // ═══════════════════ WALLET ═══════════════════
            '/api/wallet/balance/{address}': {
                get: {
                    tags: ['Wallet'],
                    summary: 'Get ALGO balance for an address',
                    description: 'Queries Algorand TestNet node for live account balance.',
                    security: [{ bearerAuth: [] }],
                    parameters: [{ name: 'address', in: 'path', required: true, schema: { type: 'string' }, description: 'Algorand wallet address (58 chars)' }],
                    responses: {
                        200: {
                            description: 'Balance info',
                            content: { 'application/json': { schema: { type: 'object', properties: { address: { type: 'string' }, balance: { type: 'object', properties: { algo: { type: 'number', example: 10.5 }, algo_microalgos: { type: 'integer', example: 10500000 }, min_balance: { type: 'number' }, pending_rewards: { type: 'number' } } } } } } },
                        },
                        400: { description: 'Invalid Algorand address' },
                        404: { description: 'Account not found on TestNet' },
                    },
                },
            },
            '/api/wallet/assets/{address}': {
                get: {
                    tags: ['Wallet'],
                    summary: 'List opted-in ASAs for an address',
                    description: 'Returns all Algorand Standard Assets the account has opted into.',
                    security: [{ bearerAuth: [] }],
                    parameters: [{ name: 'address', in: 'path', required: true, schema: { type: 'string' } }],
                    responses: {
                        200: {
                            description: 'Asset list',
                            content: { 'application/json': { schema: { type: 'object', properties: { address: { type: 'string' }, assets: { type: 'array', items: { type: 'object', properties: { asset_id: { type: 'integer' }, amount: { type: 'integer' }, is_frozen: { type: 'boolean' } } } } } } } },
                        },
                        400: { description: 'Invalid address' },
                    },
                },
            },

            // ═══════════════════ TRANSACTIONS ═══════════════════
            '/api/transactions': {
                post: {
                    tags: ['Transactions'],
                    summary: 'Save transaction metadata',
                    description: 'After submitting a transaction on-chain via Pera Wallet, save metadata (note, participants) in MySQL. Creates notification for recipient.',
                    security: [{ bearerAuth: [] }],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['txn_id', 'receiver_address', 'amount'],
                                    properties: {
                                        txn_id: { type: 'string', description: 'Algorand transaction ID' },
                                        receiver_address: { type: 'string' },
                                        amount: { type: 'number', example: 5.0 },
                                        asset_type: { type: 'string', default: 'ALGO' },
                                        asset_id: { type: 'integer', default: 0 },
                                        note: { type: 'string', description: 'Optional payment note' },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        201: { description: 'Transaction saved', content: { 'application/json': { schema: { type: 'object', properties: { message: { type: 'string' }, transaction: { $ref: '#/components/schemas/Transaction' } } } } } },
                        409: { description: 'Transaction already recorded' },
                    },
                },
            },
            '/api/transactions/history': {
                get: {
                    tags: ['Transactions'],
                    summary: 'Get enriched transaction history',
                    description: 'Returns transactions from MySQL enriched with usernames. Supports pagination and filters.',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
                        { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
                        { name: 'filter', in: 'query', schema: { type: 'string', enum: ['all', 'sent', 'received'], default: 'all' } },
                    ],
                    responses: {
                        200: {
                            description: 'Paginated transaction list',
                            content: { 'application/json': { schema: { type: 'object', properties: { transactions: { type: 'array', items: { $ref: '#/components/schemas/Transaction' } }, pagination: { type: 'object', properties: { total: { type: 'integer' }, page: { type: 'integer' }, limit: { type: 'integer' }, pages: { type: 'integer' } } } } } } },
                        },
                    },
                },
            },
            '/api/transactions/{txnId}/status': {
                get: {
                    tags: ['Transactions'],
                    summary: 'Check transaction confirmation status',
                    description: 'Checks on-chain status via Algod pending info and Indexer. Updates local record if confirmed.',
                    security: [{ bearerAuth: [] }],
                    parameters: [{ name: 'txnId', in: 'path', required: true, schema: { type: 'string' } }],
                    responses: {
                        200: {
                            description: 'Transaction status',
                            content: { 'application/json': { schema: { type: 'object', properties: { txn_id: { type: 'string' }, status: { type: 'string', enum: ['pending', 'confirmed', 'failed', 'unknown'] }, block_round: { type: 'integer', nullable: true } } } } },
                        },
                    },
                },
            },

            // ═══════════════════ SPLIT BILLS ═══════════════════
            '/api/split-bills': {
                post: {
                    tags: ['Split Bills'],
                    summary: 'Create a split bill',
                    description: 'Create a new split bill. Creator is auto-admin. Sends split_invite notifications to participants.',
                    security: [{ bearerAuth: [] }],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['title', 'total_amount'],
                                    properties: {
                                        title: { type: 'string', example: 'Dinner at campus café' },
                                        description: { type: 'string' },
                                        total_amount: { type: 'number', example: 50.0 },
                                        asset_type: { type: 'string', default: 'ALGO' },
                                        participants: {
                                            type: 'array',
                                            items: { type: 'object', properties: { username: { type: 'string' }, share_amount: { type: 'number' } } },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        201: { description: 'Bill created', content: { 'application/json': { schema: { type: 'object', properties: { message: { type: 'string' }, bill: { $ref: '#/components/schemas/SplitBill' } } } } } },
                    },
                },
                get: {
                    tags: ['Split Bills'],
                    summary: 'List user\'s split bills',
                    description: 'Returns all bills where user is creator or participant.',
                    security: [{ bearerAuth: [] }],
                    responses: {
                        200: { description: 'List of split bills', content: { 'application/json': { schema: { type: 'object', properties: { bills: { type: 'array', items: { $ref: '#/components/schemas/SplitBill' } } } } } } },
                    },
                },
            },
            '/api/split-bills/{id}': {
                get: {
                    tags: ['Split Bills'],
                    summary: 'Get split bill detail',
                    description: 'Full detail: participants, expenses, balances.',
                    security: [{ bearerAuth: [] }],
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                    responses: {
                        200: { description: 'Bill detail', content: { 'application/json': { schema: { type: 'object', properties: { bill: { $ref: '#/components/schemas/SplitBill' } } } } } },
                        404: { description: 'Not found' },
                    },
                },
            },
            '/api/split-bills/{id}/members': {
                post: {
                    tags: ['Split Bills'],
                    summary: 'Add members to a split bill',
                    description: 'Only admins can add members. Sends split_invite notifications.',
                    security: [{ bearerAuth: [] }],
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['members'],
                                    properties: {
                                        members: { type: 'array', items: { type: 'object', properties: { username: { type: 'string' }, share_amount: { type: 'number' }, is_admin: { type: 'boolean' } } } },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        200: { description: 'Members added' },
                        403: { description: 'Only admins can add members' },
                    },
                },
            },
            '/api/split-bills/{id}/expenses': {
                post: {
                    tags: ['Split Bills'],
                    summary: 'Record an expense',
                    description: 'Record who paid for what. Updates participant paid_amount and status.',
                    security: [{ bearerAuth: [] }],
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['description', 'amount'],
                                    properties: {
                                        description: { type: 'string', example: 'Pizza' },
                                        amount: { type: 'number', example: 15.0 },
                                        txn_id: { type: 'string' },
                                        paid_by_username: { type: 'string', description: 'Defaults to current user' },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        201: { description: 'Expense recorded' },
                        403: { description: 'Not a participant' },
                    },
                },
            },
            '/api/split-bills/{id}/settle': {
                post: {
                    tags: ['Split Bills'],
                    summary: 'Settle user\'s outstanding shares',
                    description: 'Marks all user shares as paid. If all participants settled, bill status → "settled". Sends split_settled notifications.',
                    security: [{ bearerAuth: [] }],
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                    requestBody: {
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        txn_ids: { type: 'array', items: { type: 'string' }, description: 'Algorand txn IDs from batch payment' },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        200: { description: 'Share settled', content: { 'application/json': { schema: { type: 'object', properties: { message: { type: 'string' }, settled_amount: { type: 'number' }, bill_status: { type: 'string' }, bill: { $ref: '#/components/schemas/SplitBill' } } } } } },
                        400: { description: 'No outstanding balance' },
                    },
                },
            },

            // ═══════════════════ NOTIFICATIONS ═══════════════════
            '/api/notifications': {
                get: {
                    tags: ['Notifications'],
                    summary: 'List user notifications',
                    description: 'Paginated notifications with unread count.',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
                        { name: 'limit', in: 'query', schema: { type: 'integer', default: 30 } },
                    ],
                    responses: {
                        200: {
                            description: 'Notifications list',
                            content: { 'application/json': { schema: { type: 'object', properties: { notifications: { type: 'array', items: { $ref: '#/components/schemas/Notification' } }, unread_count: { type: 'integer' }, pagination: { type: 'object' } } } } },
                        },
                    },
                },
            },
            '/api/notifications/read-all': {
                put: {
                    tags: ['Notifications'],
                    summary: 'Mark all notifications as read',
                    security: [{ bearerAuth: [] }],
                    responses: {
                        200: { description: 'All marked as read' },
                    },
                },
            },
            '/api/notifications/{id}/read': {
                put: {
                    tags: ['Notifications'],
                    summary: 'Mark a single notification as read',
                    security: [{ bearerAuth: [] }],
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                    responses: {
                        200: { description: 'Marked as read' },
                        404: { description: 'Notification not found' },
                    },
                },
            },

            // ═══════════════════ ANALYTICS ═══════════════════
            '/api/analytics/summary': {
                get: {
                    tags: ['Analytics'],
                    summary: 'Get spending/receiving summary',
                    description: 'Total sent, received, count, average, and net balance.',
                    security: [{ bearerAuth: [] }],
                    responses: {
                        200: {
                            description: 'Analytics summary',
                            content: { 'application/json': { schema: { type: 'object', properties: { sent: { type: 'object', properties: { count: { type: 'integer' }, total: { type: 'number' }, avg: { type: 'number' } } }, received: { type: 'object', properties: { count: { type: 'integer' }, total: { type: 'number' }, avg: { type: 'number' } } }, net: { type: 'number' } } } } },
                        },
                    },
                },
            },
            '/api/analytics/monthly': {
                get: {
                    tags: ['Analytics'],
                    summary: 'Get monthly breakdown for charts',
                    description: 'Monthly sent/received totals over the past N months.',
                    security: [{ bearerAuth: [] }],
                    parameters: [{ name: 'months', in: 'query', schema: { type: 'integer', default: 6 }, description: 'Number of months to look back' }],
                    responses: {
                        200: {
                            description: 'Monthly data',
                            content: { 'application/json': { schema: { type: 'object', properties: { sent: { type: 'array', items: { type: 'object', properties: { month: { type: 'string', example: '2026-03' }, total: { type: 'number' }, count: { type: 'integer' } } } }, received: { type: 'array', items: { type: 'object', properties: { month: { type: 'string' }, total: { type: 'number' }, count: { type: 'integer' } } } } } } } },
                        },
                    },
                },
            },

            // ═══════════════════ AI CHAT ═══════════════════
            '/api/chat': {
                post: {
                    tags: ['AI Chat'],
                    summary: 'Send message to Gemini AI',
                    description: 'Sends a message + user context (transactions, balance, splits) to Gemini. Returns AI response.',
                    security: [{ bearerAuth: [] }],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['message'],
                                    properties: {
                                        message: { type: 'string', example: 'How much did I spend this week?' },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        200: { description: 'AI response', content: { 'application/json': { schema: { type: 'object', properties: { response: { type: 'string' } } } } } },
                    },
                },
            },
            '/api/chat/history': {
                get: {
                    tags: ['AI Chat'],
                    summary: 'Get chat history',
                    security: [{ bearerAuth: [] }],
                    parameters: [{ name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } }],
                    responses: {
                        200: { description: 'Chat messages', content: { 'application/json': { schema: { type: 'object', properties: { history: { type: 'array', items: { $ref: '#/components/schemas/ChatMessage' } } } } } } },
                    },
                },
                delete: {
                    tags: ['AI Chat'],
                    summary: 'Clear chat history',
                    security: [{ bearerAuth: [] }],
                    responses: {
                        200: { description: 'Chat history cleared' },
                    },
                },
            },

            // ═══════════════════ VOICE ═══════════════════
            '/api/voice/clone': {
                post: {
                    tags: ['Voice'],
                    summary: 'Clone voice from audio sample',
                    description: 'Upload a voice sample + name → ElevenLabs creates a cloned voice. Supports multiple voices per user.',
                    security: [{ bearerAuth: [] }],
                    requestBody: {
                        required: true,
                        content: {
                            'multipart/form-data': {
                                schema: {
                                    type: 'object',
                                    required: ['voice_sample'],
                                    properties: {
                                        voice_sample: { type: 'string', format: 'binary', description: 'Audio file (wav, mp3, webm, ogg). Max 10MB.' },
                                        voice_name: { type: 'string', description: 'User-given name for this voice', example: 'My Deep Voice' },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        201: { description: 'Voice cloned', content: { 'application/json': { schema: { type: 'object', properties: { message: { type: 'string' }, profile: { $ref: '#/components/schemas/VoiceProfile' } } } } } },
                    },
                },
            },
            '/api/voice/profiles': {
                get: {
                    tags: ['Voice'],
                    summary: 'Get all voice profiles',
                    description: 'Returns all voice clones for the authenticated user.',
                    security: [{ bearerAuth: [] }],
                    responses: {
                        200: { description: 'Voice profiles list', content: { 'application/json': { schema: { type: 'object', properties: { profiles: { type: 'array', items: { $ref: '#/components/schemas/VoiceProfile' } } } } } } },
                    },
                },
            },
            '/api/voice/profile/{id}': {
                delete: {
                    tags: ['Voice'],
                    summary: 'Delete a specific voice clone',
                    description: 'Deletes from ElevenLabs and removes local profile.',
                    security: [{ bearerAuth: [] }],
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                    responses: {
                        200: { description: 'Voice profile deleted' },
                        404: { description: 'Voice profile not found' },
                    },
                },
            },
            '/api/voice/generate': {
                post: {
                    tags: ['Voice'],
                    summary: 'Generate TTS audio',
                    description: 'Returns MP3 audio using a specific voice or the outgoing voice (or default fallback).',
                    security: [{ bearerAuth: [] }],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['text'],
                                    properties: {
                                        text: { type: 'string', example: 'Sent 10 ALGO to @john!' },
                                        voice_id: { type: 'integer', description: 'Optional: specific voice profile ID to use' },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        200: { description: 'MP3 audio stream', content: { 'audio/mpeg': { schema: { type: 'string', format: 'binary' } } } },
                    },
                },
            },
            '/api/voice/toggle/{id}': {
                put: {
                    tags: ['Voice'],
                    summary: 'Toggle voice settings for a specific voice',
                    description: 'Set use_for_outgoing/use_for_incoming/is_active. Setting outgoing/incoming on one voice auto-unsets others.',
                    security: [{ bearerAuth: [] }],
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
                    requestBody: {
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        use_for_outgoing: { type: 'boolean', description: 'Use this voice for outgoing payments' },
                                        use_for_incoming: { type: 'boolean', description: 'Use this voice for incoming payments' },
                                        is_active: { type: 'boolean', description: 'Master on/off toggle' },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        200: { description: 'Settings updated, returns all profiles', content: { 'application/json': { schema: { type: 'object', properties: { message: { type: 'string' }, profiles: { type: 'array', items: { $ref: '#/components/schemas/VoiceProfile' } } } } } } },
                        404: { description: 'Voice profile not found' },
                    },
                },
            },
        },
    },
    apis: [], // We define all specs inline above, no JSDoc annotations needed
};

const swaggerSpec = swaggerJsdoc(options);

const setupSwagger = (app) => {
    app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
        customCss: '.swagger-ui .topbar { display: none }',
        customSiteTitle: 'Campus Wallet API Docs',
    }));

    // Serve raw JSON spec
    app.get('/api/docs.json', (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.send(swaggerSpec);
    });

    console.log('📚 Swagger API docs: http://localhost:' + (process.env.PORT || 5000) + '/api/docs');
};

module.exports = { setupSwagger };
