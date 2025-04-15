import express from 'express';
import helmet from 'helmet';
import { collectDefaultMetrics } from 'prom-client';
import ipfsRouter from './routes/ipfs.routes';
import securityDashboardRouter from './routes/security-dashboard.routes';
import dotenv from 'dotenv';
import { checkDocAccess, requireDocAccess, DocAccessLevel, DocRequest } from './middleware/docs.middleware';

// Load environment variables
dotenv.config();

// Initialize Prometheus metrics
collectDefaultMetrics();

const app = express();
const PORT = process.env.PORT || 3000;
const API_VERSION = 'v1';  // API version

// Apply middleware
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from public directory
app.use(express.static('src/public'));

// Add documentation access control middleware
app.use(checkDocAccess);

// Public documentation route - Basic info only
app.get('/', (req, res) => {
    const docReq = req as DocRequest;
    const accessLevel = docReq.docAccessLevel || DocAccessLevel.PUBLIC;
    
    // Common header HTML for all access levels
    const headerHtml = `
        <html>
            <head>
                <title>Yucca Media - Solana Bootcamp Pirate Adventure API</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        line-height: 1.6;
                        margin: 0;
                        padding: 20px;
                        color: #333;
                    }
                    .container {
                        max-width: 900px;
                        margin: 0 auto;
                    }
                    .header {
                        display: flex;
                        align-items: center;
                        margin-bottom: 20px;
                    }
                    .logo {
                        font-size: 24px;
                        font-weight: bold;
                        color: #2c3e50;
                        margin-right: 15px;
                        padding: 5px 10px;
                        border: 2px solid #3498db;
                        border-radius: 5px;
                    }
                    h1 {
                        color: #2c3e50;
                        border-bottom: 1px solid #eee;
                        padding-bottom: 10px;
                    }
                    h2 {
                        color: #3498db;
                        margin-top: 30px;
                        border-bottom: 1px solid #eee;
                        padding-bottom: 5px;
                    }
                    h3 {
                        color: #2c3e50;
                        margin-top: 20px;
                    }
                    .endpoint {
                        background-color: #f9f9f9;
                        border-left: 3px solid #3498db;
                        padding: 15px;
                        margin-bottom: 25px;
                        border-radius: 3px;
                    }
                    .method {
                        font-weight: bold;
                        color: #e74c3c;
                    }
                    .path {
                        font-family: monospace;
                        background-color: #eee;
                        padding: 2px 5px;
                        border-radius: 3px;
                    }
                    .description {
                        margin-top: 5px;
                        margin-bottom: 10px;
                    }
                    pre {
                        background-color: #f1f1f1;
                        padding: 10px;
                        border-radius: 3px;
                        overflow-x: auto;
                    }
                    code {
                        font-family: monospace;
                    }
                    .pill {
                        display: inline-block;
                        padding: 2px 8px;
                        border-radius: 12px;
                        font-size: 12px;
                        font-weight: bold;
                        margin-right: 5px;
                    }
                    .pill.success {
                        background-color: #2ecc71;
                        color: white;
                    }
                    .pill.error {
                        background-color: #e74c3c;
                        color: white;
                    }
                    .pill.warn {
                        background-color: #f39c12;
                        color: white;
                    }
                    .rate-limit {
                        background-color: #f8f9fa;
                        border-left: 3px solid #f39c12;
                        padding: 10px;
                        margin: 15px 0;
                    }
                    .error-example {
                        margin-top: 10px;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin: 15px 0;
                    }
                    th, td {
                        border: 1px solid #ddd;
                        padding: 8px;
                        text-align: left;
                    }
                    th {
                        background-color: #f2f2f2;
                    }
                    tr:nth-child(even) {
                        background-color: #f9f9f9;
                    }
                    .version-info {
                        background-color: #e8f4f8;
                        padding: 10px;
                        border-radius: 3px;
                        margin-bottom: 20px;
                    }
                    .access-level {
                        position: absolute;
                        top: 10px;
                        right: 20px;
                        background-color: #34495e;
                        color: white;
                        padding: 5px 10px;
                        border-radius: 3px;
                        font-size: 12px;
                    }
                    .access-level.public { background-color: #95a5a6; }
                    .access-level.user { background-color: #3498db; }
                    .access-level.stakeholder { background-color: #2ecc71; }
                    .access-level.admin { background-color: #e74c3c; }
                    .upgrade-note {
                        background-color: #f8f9fa;
                        border: 1px solid #ddd;
                        padding: 10px;
                        margin: 20px 0;
                        border-radius: 3px;
                    }
                </style>
            </head>
            <body>
                <div class="access-level ${accessLevel}">${accessLevel.toUpperCase()} ACCESS</div>
                <div class="container">
                    <div class="header">
                        <span class="logo">Yucca Media</span>
                        <h1>Solana Bootcamp Pirate Adventure API</h1>
                    </div>
                    
                    <div class="version-info">
                        <strong>Project:</strong> Solana Bootcamp Pirate Adventure <br>
                        <strong>Developer:</strong> Tatiane Amnuar <br>
                        <strong>Company:</strong> Yucca Media <br>
                        <strong>API Version:</strong> ${API_VERSION} <br>
                        <strong>Last Updated:</strong> ${new Date().toISOString().split('T')[0]} <br>
    `;

    // Public access content
    let contentHtml = `
                    </div>
                    
                    <p>Welcome to the IPFS API. This service provides secure access to IPFS pinning services.</p>
                    
                    <div class="upgrade-note">
                        <strong>Note:</strong> You're viewing the public documentation. 
                        <a href="/?key=YOUR_ACCESS_KEY">Sign in with your access key</a> for more detailed documentation.
                    </div>
                    
                    <h2>Available Endpoints</h2>
                    
                    <div class="endpoint">
                        <div><span class="method">POST</span> <span class="path">/ipfs/json</span></div>
                        <div class="description">Pin JSON data to IPFS</div>
                        <p><span class="pill success">Authentication</span> Required</p>
                    </div>
                    
                    <div class="endpoint">
                        <div><span class="method">POST</span> <span class="path">/ipfs/file</span></div>
                        <div class="description">Pin a file to IPFS</div>
                        <p><span class="pill success">Authentication</span> Required</p>
                    </div>
                    
                    <div class="endpoint">
                        <div><span class="method">GET</span> <span class="path">/ipfs/pins</span></div>
                        <div class="description">Get a list of pinned content</div>
                        <p><span class="pill success">Authentication</span> Required</p>
                    </div>
                    
                    <div class="endpoint">
                        <div><span class="method">GET</span> <span class="path">/health</span></div>
                        <div class="description">Health check endpoint</div>
                        <p><span class="pill success">Authentication</span> Not required</p>
                    </div>
                </div>
            </body>
        </html>
    `;

    // Stakeholder access content - More details but no sensitive info
    if (accessLevel === DocAccessLevel.STAKEHOLDER || accessLevel === DocAccessLevel.USER || accessLevel === DocAccessLevel.ADMIN) {
        contentHtml = `
                        <strong>Environment:</strong> Production
                    </div>
                    
                    <p>Welcome to the IPFS API. This service provides secure access to IPFS pinning services via Pinata.</p>
                    
                    <h2>Authentication</h2>
                    <p>Most endpoints require authentication. Use a JWT token in the Authorization header:</p>
                    <pre><code>Authorization: Bearer your-jwt-token</code></pre>
                    
                    <h2>Rate Limiting</h2>
                    <div class="rate-limit">
                        <p>The API implements rate limits to prevent abuse:</p>
                        <ul>
                            <li><strong>Window Size:</strong> 15 minutes</li>
                            <li><strong>Maximum Requests:</strong> 100 requests per IP address per window</li>
                        </ul>
                    </div>
                    
                    <h2>Common Error Responses</h2>
                    <table>
                        <tr>
                            <th>Status Code</th>
                            <th>Description</th>
                        </tr>
                        <tr>
                            <td>400</td>
                            <td>Bad Request</td>
                        </tr>
                        <tr>
                            <td>401</td>
                            <td>Unauthorized</td>
                        </tr>
                        <tr>
                            <td>403</td>
                            <td>Forbidden</td>
                        </tr>
                        <tr>
                            <td>404</td>
                            <td>Not Found</td>
                        </tr>
                        <tr>
                            <td>429</td>
                            <td>Too Many Requests</td>
                        </tr>
                        <tr>
                            <td>500</td>
                            <td>Internal Server Error</td>
                        </tr>
                    </table>
                    
                    <h2>Endpoints</h2>
                    
                    <div class="endpoint">
                        <div><span class="method">POST</span> <span class="path">/ipfs/json</span></div>
                        <div class="description">Pin JSON data to IPFS</div>
                        <p><span class="pill success">Authentication</span> Required (admin, user)</p>
                    </div>
                    
                    <div class="endpoint">
                        <div><span class="method">POST</span> <span class="path">/ipfs/file</span></div>
                        <div class="description">Pin a file to IPFS</div>
                        <p><span class="pill success">Authentication</span> Required (admin, user)</p>
                    </div>
                    
                    <div class="endpoint">
                        <div><span class="method">GET</span> <span class="path">/ipfs/pins</span></div>
                        <div class="description">Get a list of pinned content</div>
                        <p><span class="pill success">Authentication</span> Required (admin, user, viewer)</p>
                    </div>
                    
                    <div class="endpoint">
                        <div><span class="method">DELETE</span> <span class="path">/ipfs/unpin/:hash</span></div>
                        <div class="description">Unpin content from IPFS by hash</div>
                        <p><span class="pill success">Authentication</span> Required (admin only)</p>
                    </div>
                    
                    <div class="endpoint">
                        <div><span class="method">GET</span> <span class="path">/health</span></div>
                        <div class="description">Health check endpoint</div>
                        <p><span class="pill success">Authentication</span> Not required</p>
                    </div>
                </div>
            </body>
        </html>
        `;
    }

    // User access with more detailed examples
    if (accessLevel === DocAccessLevel.USER || accessLevel === DocAccessLevel.ADMIN) {
        contentHtml = `
                        <strong>Environment:</strong> Production
                    </div>
                    
                    <p>Welcome to the IPFS API. This service provides secure access to IPFS pinning services via Pinata.</p>
                    
                    <h2>Authentication</h2>
                    <p>Most endpoints require authentication. Use a JWT token in the Authorization header:</p>
                    <pre><code>Authorization: Bearer your-jwt-token</code></pre>
                    
                    <h2>Rate Limiting</h2>
                    <div class="rate-limit">
                        <p>The API implements the following rate limits to prevent abuse:</p>
                        <ul>
                            <li><strong>Window Size:</strong> 15 minutes</li>
                            <li><strong>Maximum Requests:</strong> 100 requests per IP address per window</li>
                            <li><strong>Status Code:</strong> 429 Too Many Requests</li>
                        </ul>
                        <p>When rate limited, you'll receive a response with status code 429 and a message indicating when you can retry.</p>
                    </div>
                    
                    <h2>Common Error Responses</h2>
                    <table>
                        <tr>
                            <th>Status Code</th>
                            <th>Description</th>
                            <th>Reasons</th>
                        </tr>
                        <tr>
                            <td>400</td>
                            <td>Bad Request</td>
                            <td>Invalid input, missing required fields, validation errors</td>
                        </tr>
                        <tr>
                            <td>401</td>
                            <td>Unauthorized</td>
                            <td>Missing or invalid authentication token</td>
                        </tr>
                        <tr>
                            <td>403</td>
                            <td>Forbidden</td>
                            <td>Valid authentication but insufficient permissions</td>
                        </tr>
                        <tr>
                            <td>404</td>
                            <td>Not Found</td>
                            <td>Resource not found</td>
                        </tr>
                        <tr>
                            <td>429</td>
                            <td>Too Many Requests</td>
                            <td>Rate limit exceeded</td>
                        </tr>
                        <tr>
                            <td>500</td>
                            <td>Internal Server Error</td>
                            <td>Server-side error</td>
                        </tr>
                    </table>
                    
                    <div class="error-example">
                        <h3>Error Response Format</h3>
                        <pre><code>{
  "status": "fail",
  "message": "Error description",
  "errors": [
    "Detailed error information"
  ]
}</code></pre>
                    </div>
                    
                    <h2>Endpoints</h2>
                    
                    <div class="endpoint">
                        <div><span class="method">POST</span> <span class="path">/ipfs/json</span></div>
                        <div class="description">Pin JSON data to IPFS</div>
                        <p><span class="pill success">Authentication</span> Required (admin, user)</p>
                        
                        <h3>Request Example</h3>
                        <pre><code>POST /ipfs/json
Authorization: Bearer your-jwt-token
Content-Type: application/json

{
  "json": {
    "name": "My IPFS JSON Data",
    "description": "This is sample data to pin to IPFS",
    "attributes": {
      "property1": "value1",
      "property2": "value2"
    }
  },
  "metadata": {
    "name": "sample-json-data",
    "keyvalues": {
      "category": "documentation",
      "visibility": "public"
    }
  }
}</code></pre>

                        <h3>Response Example (201 Created)</h3>
                        <pre><code>{
  "status": "success",
  "data": {
    "IpfsHash": "QmT5NvUtoM5nWFfrQdVrFtvGfKFmG7AHE8P34isapyhCxX",
    "PinSize": 1024,
    "Timestamp": "2023-07-21T10:15:30Z"
  }
}</code></pre>
                    </div>
                    
                    <div class="endpoint">
                        <div><span class="method">POST</span> <span class="path">/ipfs/file</span></div>
                        <div class="description">Pin a file to IPFS</div>
                        <p><span class="pill success">Authentication</span> Required (admin, user)</p>
                        
                        <h3>Request Example</h3>
                        <pre><code>POST /ipfs/file
Authorization: Bearer your-jwt-token
Content-Type: multipart/form-data

Form Data:
- file: [Binary file data]
- metadata: {
    "name": "sample-file",
    "keyvalues": {
      "category": "documents",
      "type": "pdf"
    }
  }</code></pre>

                        <h3>Response Example (201 Created)</h3>
                        <pre><code>{
  "status": "success",
  "data": {
    "IpfsHash": "QmV5NvUtoM5nWFfrQdVrFtvGfKFmG7AHE8P34isapyhCxM",
    "PinSize": 5120,
    "Timestamp": "2023-07-21T10:30:45Z"
  }
}</code></pre>
                    </div>
                    
                    <div class="endpoint">
                        <div><span class="method">GET</span> <span class="path">/ipfs/pins</span></div>
                        <div class="description">Get a list of pinned content</div>
                        <p><span class="pill success">Authentication</span> Required (admin, user, viewer)</p>
                        
                        <h3>Request Example</h3>
                        <pre><code>GET /ipfs/pins
Authorization: Bearer your-jwt-token</code></pre>

                        <h3>Response Example (200 OK)</h3>
                        <pre><code>{
  "status": "success",
  "data": {
    "count": 2,
    "rows": [
      {
        "id": "QmT5NvUtoM5nWFfrQdVrFtvGfKFmG7AHE8P34isapyhCxX",
        "metadata": {
          "name": "sample-json-data",
          "keyvalues": {
            "category": "documentation"
          }
        },
        "size": 1024,
        "date_pinned": "2023-07-21T10:15:30Z"
      }
    ]
  }
}</code></pre>
                    </div>
                    
                    <div class="endpoint">
                        <div><span class="method">DELETE</span> <span class="path">/ipfs/unpin/:hash</span></div>
                        <div class="description">Unpin content from IPFS by hash</div>
                        <p><span class="pill success">Authentication</span> Required (admin only)</p>
                        
                        <h3>Request Example</h3>
                        <pre><code>DELETE /ipfs/unpin/QmT5NvUtoM5nWFfrQdVrFtvGfKFmG7AHE8P34isapyhCxX
Authorization: Bearer your-jwt-token</code></pre>

                        <h3>Response Example (200 OK)</h3>
                        <pre><code>{
  "status": "success",
  "message": "Content unpinned successfully"
}</code></pre>
                    </div>
                    
                    <div class="endpoint">
                        <div><span class="method">GET</span> <span class="path">/health</span></div>
                        <div class="description">Health check endpoint</div>
                        <p><span class="pill success">Authentication</span> Not required</p>
                        
                        <h3>Response Example (200 OK)</h3>
                        <pre><code>{
  "status": "healthy"
}</code></pre>
                    </div>
                </div>
            </body>
        </html>
        `;
    }
    
    // Admin access - Full documentation with environment details
    if (accessLevel === DocAccessLevel.ADMIN) {
        // Add additional sensitive details for admin-only access
        contentHtml += `
            <script>
                // Additional admin-only information that appears after the page loads
                window.addEventListener('DOMContentLoaded', function() {
                    const container = document.querySelector('.container');
                    
                    // Create admin-only section
                    const adminSection = document.createElement('div');
                    adminSection.className = 'admin-section';
                    adminSection.innerHTML = \`
                        <h2 style="color: #e74c3c;">ADMIN ONLY - SYSTEM INFORMATION</h2>
                        <div style="background-color: #fee; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
                            <p><strong>Warning:</strong> This information is sensitive and should not be shared.</p>
                            
                            <h3>System Configuration</h3>
                            <ul>
                                <li><strong>Environment:</strong> ${process.env.NODE_ENV}</li>
                                <li><strong>Server Port:</strong> ${PORT}</li>
                                <li><strong>HTTPS Enabled:</strong> ${process.env.HTTPS}</li>
                                <li><strong>Allowed Origins:</strong> ${process.env.ALLOWED_ORIGINS}</li>
                            </ul>
                            
                            <h3>Service Integration Details</h3>
                            <ul>
                                <li><strong>IPFS Provider:</strong> Pinata</li>
                                <li><strong>Pinata API Base URL:</strong> https://api.pinata.cloud</li>
                                <li><strong>Infrastructure:</strong> AWS</li>
                                <li><strong>Monitoring:</strong> Prometheus + Grafana</li>
                            </ul>
                            
                            <h3>Security Settings</h3>
                            <ul>
                                <li><strong>Rate Limit Window:</strong> ${process.env.RATE_LIMIT_WINDOW || 900000}ms</li>
                                <li><strong>Rate Limit Max Requests:</strong> ${process.env.RATE_LIMIT_MAX || 100}</li>
                                <li><strong>DDoS Protection:</strong> ${process.env.DDOS_PROTECTION}</li>
                                <li><strong>TLS Version:</strong> ${process.env.TLS_VERSION}</li>
                            </ul>
                        </div>
                    \`;
                    
                    // Add to the end of the container
                    container.appendChild(adminSection);
                });
            </script>
        `;
    }

    res.send(headerHtml + contentHtml);
});

// Protected detailed documentation routes
app.get('/docs/full', requireDocAccess(DocAccessLevel.ADMIN), (req, res) => {
    res.json({
        message: 'Full documentation with all system details - Admin Only',
        access: 'admin'
    });
});

app.get('/docs/dev', requireDocAccess(DocAccessLevel.USER), (req, res) => {
    res.json({
        message: 'Developer documentation with implementation details',
        access: 'user'
    });
});

app.get('/docs/stakeholder', requireDocAccess(DocAccessLevel.STAKEHOLDER), (req, res) => {
    res.json({
        message: 'Stakeholder documentation with high-level details',
        access: 'stakeholder'
    });
});

// Register routes
app.use('/ipfs', ipfsRouter);
app.use('/security-dashboard', securityDashboardRouter);

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'healthy' });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
});

export default app; 