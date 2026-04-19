'use client';

/**
 * API Documentation Component
 * Displays interactive API documentation with examples
 */

import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

interface EndpointProps {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  path: string;
  description: string;
  auth?: 'jwt' | 'device';
  requestBody?: string;
  responseBody?: string;
  notes?: string[];
}

function CodeBlock({ code, language = 'json' }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      <pre className="bg-[#1a2332] text-gray-100 p-4 rounded-lg overflow-x-auto text-sm font-mono">
        <code>{code}</code>
      </pre>
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 px-2 py-1 text-xs bg-surface border border-border hover:bg-border text-text-muted rounded opacity-0 group-hover:opacity-100 transition-opacity"
      >
        {copied ? '✓ Copied' : 'Copy'}
      </button>
    </div>
  );
}

function MethodBadge({ method }: { method: string }) {
  const colors: Record<string, string> = {
    GET: 'bg-emerald-500',
    POST: 'bg-blue-500',
    PATCH: 'bg-amber-500',
    DELETE: 'bg-red-500',
  };

  return (
    <span className={`${colors[method]} text-white text-xs font-bold px-2 py-1 rounded uppercase`}>
      {method}
    </span>
  );
}

function Endpoint({ method, path, description, auth = 'jwt', requestBody, responseBody, notes }: EndpointProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { t } = useLanguage();

  return (
    <div className="border border-border rounded-lg mb-3 overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center gap-3 bg-surface hover:bg-border transition-colors text-left"
      >
        <MethodBadge method={method} />
        <code className="text-sm font-mono flex-1 text-text">{path}</code>
        <span className={`text-xs px-2 py-0.5 rounded ${
          auth === 'jwt' 
            ? 'bg-accent-2/20 text-accent-2 border border-accent-2/50' 
            : 'bg-warning/20 text-warning border border-warning/50'
        }`}>
          {auth === 'jwt' ? 'JWT Auth' : 'Device Token'}
        </span>
        <svg
          className={`w-5 h-5 text-text-muted transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {isExpanded && (
        <div className="px-4 py-3 bg-surface border-t border-border">
          <p className="text-sm mb-3 text-text-muted">{description}</p>
          
          {notes && notes.length > 0 && (
            <div className="mb-3 p-3 bg-warning/20 rounded-lg border border-warning/50">
              <p className="text-xs font-medium text-warning mb-1">{t('developer.notes') || 'Notes'}:</p>
              <ul className="text-xs text-warning/90 list-disc list-inside space-y-1">
                {notes.map((note, i) => (
                  <li key={i}>{note}</li>
                ))}
              </ul>
            </div>
          )}
          
          {requestBody && (
            <div className="mb-3">
              <p className="text-xs font-medium mb-2 text-text">
                {t('developer.requestBody') || 'Request Body'}:
              </p>
              <CodeBlock code={requestBody} />
            </div>
          )}
          
          {responseBody && (
            <div>
              <p className="text-xs font-medium mb-2 text-text">
                {t('developer.responseBody') || 'Response'}:
              </p>
              <CodeBlock code={responseBody} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h3 className="text-lg font-semibold mb-4 pb-2 border-b border-border text-text">
        {title}
      </h3>
      {children}
    </div>
  );
}

function DownloadCard({ 
  title, 
  description, 
  filename, 
  icon 
}: { 
  title: string; 
  description: string; 
  filename: string;
  icon: React.ReactNode;
}) {
  return (
    <a
      href={`/downloads/${filename}`}
      download={filename}
      className="flex items-start gap-4 p-4 bg-surface border border-border rounded-lg hover:border-accent-1 hover:shadow-md transition-all group"
    >
      <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gradient-to-br from-accent-1 to-accent-1-dark flex items-center justify-center text-white">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-semibold group-hover:text-accent-1 transition-colors text-text">
          {title}
        </h4>
        <p className="text-xs mt-1 text-text-muted">{description}</p>
        <p className="text-xs mt-2 font-mono truncate text-text-muted">{filename}</p>
      </div>
      <div className="flex-shrink-0 self-center">
        <svg className="w-5 h-5 text-text-muted group-hover:text-accent-1 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
      </div>
    </a>
  );
}

export function ApiDocumentation() {
  const { t } = useLanguage();
  const [activeSection, setActiveSection] = useState<string>('overview');

  const sections = [
    { id: 'overview', label: t('developer.overview') || 'Overview' },
    { id: 'downloads', label: t('developer.downloads') || 'Downloads' },
    { id: 'auth', label: t('developer.authentication') || 'Authentication' },
    { id: 'users', label: t('developer.users') || 'Users' },
    { id: 'installations', label: t('developer.installations') || 'Installations' },
    { id: 'devices', label: t('developer.edgeDevices') || 'Edge Devices' },
    { id: 'firmware', label: t('developer.firmware') || 'Firmware' },
    { id: 'measurements', label: t('developer.measurements') || 'Measurements' },
  ];

  return (
    <div className="flex gap-6">
      {/* Sidebar Navigation */}
      <div className="w-48 flex-shrink-0">
        <div className="sticky top-6">
          <nav className="space-y-1">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                  activeSection === section.id
                    ? 'bg-accent-1 text-text font-medium'
                    : 'text-text-muted hover:bg-border'
                }`}
              >
                {section.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 card p-6">
        {activeSection === 'overview' && (
          <>
            <Section title={t('developer.apiOverview') || 'API Overview'}>
              <p className="text-sm mb-4 text-text-muted">
                {t('developer.apiOverviewDesc') || 'The JSEnergy Dashboard API is a RESTful API built with FastAPI. Interactive documentation is available at /docs when the backend is running.'}
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="p-4 bg-surface border border-border rounded-lg">
                  <h4 className="text-sm font-medium mb-2 text-text">
                    {t('developer.stagingApi') || 'Staging API'}
                  </h4>
                  <code className="text-sm text-accent-1">http://jsenergyapi.aitech.work/api</code>
                </div>
                <div className="p-4 bg-surface border border-border rounded-lg">
                  <h4 className="text-sm font-medium mb-2 text-text">
                    {t('developer.developmentApi') || 'Development'}
                  </h4>
                  <code className="text-sm text-accent-1">http://localhost:8000/api</code>
                </div>
              </div>

              <h4 className="text-sm font-medium mb-3 text-text">
                {t('developer.authMethods') || 'Authentication Methods'}
              </h4>
              <div className="space-y-3">
                <div className="p-4 bg-accent-2/20 rounded-lg border border-accent-2/50">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs px-2 py-0.5 rounded bg-accent-2 text-white font-medium">JWT</span>
                    <span className="text-sm font-medium text-accent-2">{t('developer.userAuth') || 'User Authentication'}</span>
                  </div>
                  <CodeBlock code="Authorization: Bearer <access_token>" language="text" />
                </div>
                <div className="p-4 bg-warning/20 rounded-lg border border-warning/50">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs px-2 py-0.5 rounded bg-warning text-white font-medium">Device</span>
                    <span className="text-sm font-medium text-warning">{t('developer.deviceAuth') || 'Device Authentication'}</span>
                  </div>
                  <CodeBlock code="X-Device-Token: <device_token>\n// or\nAuthorization: Device <device_token>" language="text" />
                </div>
              </div>
            </Section>

            <Section title={t('developer.errorHandling') || 'Error Handling'}>
              <p className="text-sm mb-4 text-text-muted">
                {t('developer.errorHandlingDesc') || 'All errors follow a consistent JSON format:'}
              </p>
              <CodeBlock code={`{
  "detail": "Error message"
}`} />
              <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-2">
                {[
                  { code: '200', desc: 'Success' },
                  { code: '201', desc: 'Created' },
                  { code: '400', desc: 'Bad Request' },
                  { code: '401', desc: 'Unauthorized' },
                  { code: '403', desc: 'Forbidden' },
                  { code: '404', desc: 'Not Found' },
                ].map(({ code, desc }) => (
                  <div key={code} className="flex items-center gap-2 text-sm">
                    <span className={`font-mono px-2 py-0.5 rounded ${
                      code.startsWith('2') ? 'bg-success/20 text-success border border-success/50' : 'bg-critical/20 text-critical border border-critical/50'
                    }`}>{code}</span>
                    <span className="text-text-muted">{desc}</span>
                  </div>
                ))}
              </div>
            </Section>
          </>
        )}

        {activeSection === 'downloads' && (
          <>
            <Section title={t('developer.postmanCollection') || 'Postman Collection'}>
              <p className="text-sm mb-6 text-text-muted">
                {t('developer.postmanDesc') || 'Download the Postman collection and environment files to quickly test and explore the API. Import these files into Postman to get started.'}
              </p>
              
              <div className="grid gap-4">
                <DownloadCard
                  title={t('developer.apiCollection') || 'API Collection'}
                  description={t('developer.apiCollectionDesc') || 'Complete API collection with all endpoints, examples, and pre-configured requests'}
                  filename="JSEnergy_Edge_Device_API.postman_collection.json"
                  icon={
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                    </svg>
                  }
                />
                
                <DownloadCard
                  title={t('developer.localEnv') || 'Local Environment'}
                  description={t('developer.localEnvDesc') || 'Environment variables for local development (localhost:8000)'}
                  filename="JSEnergy_Edge_Device_API_Local.postman_environment.json"
                  icon={
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                    </svg>
                  }
                />
                
                <DownloadCard
                  title={t('developer.productionEnv') || 'Production Environment'}
                  description={t('developer.productionEnvDesc') || 'Environment variables for staging/production server'}
                  filename="JSEnergy_Edge_Device_API_Production.postman_environment.json"
                  icon={
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                    </svg>
                  }
                />
              </div>
            </Section>

            <Section title={t('developer.howToImport') || 'How to Import'}>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-accent-1 text-white flex items-center justify-center text-sm font-bold">1</div>
                  <div>
                    <h4 className="text-sm font-medium text-text">{t('developer.step1Title') || 'Download Files'}</h4>
                    <p className="text-sm mt-1 text-text-muted">{t('developer.step1Desc') || 'Click the download buttons above to save the collection and environment files to your computer.'}</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-accent-1 text-white flex items-center justify-center text-sm font-bold">2</div>
                  <div>
                    <h4 className="text-sm font-medium text-text">{t('developer.step2Title') || 'Open Postman'}</h4>
                    <p className="text-sm mt-1 text-text-muted">{t('developer.step2Desc') || 'Launch Postman and click "Import" in the top left corner.'}</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-accent-1 text-white flex items-center justify-center text-sm font-bold">3</div>
                  <div>
                    <h4 className="text-sm font-medium text-text">{t('developer.step3Title') || 'Import Collection'}</h4>
                    <p className="text-sm mt-1 text-text-muted">{t('developer.step3Desc') || 'Drag and drop the collection file or browse to select it. The collection will appear in your sidebar.'}</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-accent-1 text-white flex items-center justify-center text-sm font-bold">4</div>
                  <div>
                    <h4 className="text-sm font-medium text-text">{t('developer.step4Title') || 'Import Environment'}</h4>
                    <p className="text-sm mt-1 text-text-muted">{t('developer.step4Desc') || 'Import the environment file, then select it from the environment dropdown in the top right.'}</p>
                  </div>
                </div>
              </div>
            </Section>
          </>
        )}

        {activeSection === 'auth' && (
          <Section title={t('developer.authEndpoints') || 'Authentication Endpoints'}>
            <Endpoint
              method="POST"
              path="/api/auth/login"
              description="Login with email and password to receive JWT tokens."
              requestBody={`{
  "email": "admin@jsenergy.nl",
  "password": "password"
}`}
              responseBody={`{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "expires_in": 900
}`}
            />
            
            <Endpoint
              method="POST"
              path="/api/auth/refresh"
              description="Refresh an expired access token using a valid refresh token."
              requestBody={`{
  "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
}`}
              responseBody={`{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "expires_in": 900
}`}
            />
            
            <Endpoint
              method="GET"
              path="/api/auth/me"
              description="Get the current authenticated user's information."
              responseBody={`{
  "id": 1,
  "email": "admin@jsenergy.nl",
  "role": "admin",
  "is_active": true,
  "full_name": "Admin User",
  "language_preference": "nl"
}`}
            />
          </Section>
        )}

        {activeSection === 'users' && (
          <Section title={t('developer.userEndpoints') || 'User Management Endpoints (Admin Only)'}>
            <Endpoint
              method="GET"
              path="/api/users"
              description="List all users. Supports filtering by role and active status."
              responseBody={`{
  "users": [
    {
      "id": 1,
      "email": "user@example.com",
      "role": "customer",
      "is_active": true,
      "full_name": "John Doe",
      "last_login_at": "2025-01-11T16:00:00Z"
    }
  ],
  "total": 1
}`}
              notes={['Query params: role (admin|customer), is_active (true|false)']}
            />
            
            <Endpoint
              method="POST"
              path="/api/users"
              description="Create a new user account. Password is optional - a random one will be generated if not provided."
              requestBody={`{
  "email": "newuser@example.com",
  "password": "securepassword123",
  "role": "customer",
  "is_active": true,
  "full_name": "Jane Doe"
}`}
              responseBody={`{
  "email": "newuser@example.com",
  "password": "generated-or-provided-password",
  "message": "Save these credentials - the password will not be shown again"
}`}
              notes={['Password is only returned once on creation', 'If password is empty, a random one is generated']}
            />
            
            <Endpoint
              method="PATCH"
              path="/api/users/{user_id}"
              description="Update user information. All fields are optional."
              requestBody={`{
  "email": "updated@example.com",
  "role": "admin",
  "full_name": "Updated Name",
  "password": "newpassword123"
}`}
              notes={['Password must be at least 12 characters if provided']}
            />
            
            <Endpoint
              method="PATCH"
              path="/api/users/{user_id}/activate"
              description="Activate a deactivated user account."
            />
            
            <Endpoint
              method="PATCH"
              path="/api/users/{user_id}/deactivate"
              description="Deactivate a user account."
              notes={['Admins cannot deactivate themselves']}
            />
            
            <Endpoint
              method="DELETE"
              path="/api/users/{user_id}"
              description="Soft delete a user account."
              notes={['Admins cannot delete themselves']}
            />
          </Section>
        )}

        {activeSection === 'installations' && (
          <Section title={t('developer.installationEndpoints') || 'Installation Endpoints'}>
            <Endpoint
              method="GET"
              path="/api/installations"
              description="List all installations accessible to the current user."
              responseBody={`{
  "installations": [
    {
      "id": 1,
      "name": "Office Building A",
      "country": "Netherlands",
      "state": "North Holland",
      "city": "Amsterdam",
      "timezone": "Europe/Amsterdam",
      "has_pv": true,
      "has_battery": true,
      "has_generator": false,
      "has_ev_chargers": true,
      "inverter_count": 2,
      "charger_count": 2
    }
  ],
  "total": 1
}`}
            />
            
            <Endpoint
              method="POST"
              path="/api/installations"
              description="Create a new installation."
              requestBody={`{
  "name": "Office Building A",
  "country": "Netherlands",
  "state": "North Holland",
  "city": "Amsterdam",
  "user_id": 1,
  "timezone": "Europe/Amsterdam",
  "has_pv": true,
  "has_battery": true,
  "has_generator": false,
  "has_ev_chargers": true,
  "inverter_count": 2,
  "charger_count": 2
}`}
              notes={['user_id is required', 'Regular users can only create installations for themselves']}
            />
            
            <Endpoint
              method="GET"
              path="/api/installations/{id}/live"
              description="Get live snapshot of all components for real-time dashboard."
              responseBody={`{
  "battery": { "soc_percentage": 75.5, "power_kw": -2.3 },
  "inverters": [{ "id": 1, "power_kw": 3.2 }],
  "meter": { "import_kw": 0.5, "export_kw": 1.2 },
  "ev_chargers": [{ "id": 1, "power_kw": 7.2 }]
}`}
            />
          </Section>
        )}

        {activeSection === 'devices' && (
          <Section title={t('developer.deviceEndpoints') || 'Edge Device Endpoints'}>
            <h4 className="text-md font-semibold mb-3 text-text">
              Configuration Endpoints (Device Token Auth)
            </h4>
            
            <Endpoint
              method="GET"
              path="/api/installations/{installation_id}/inverters"
              description="Get list of inverters for the edge device's installation. Returns inverter IDs and numbers that can be used for sending inverter measurements."
              auth="device"
              responseBody={`{
  "inverters": [
    {
      "id": 1,
      "inverter_number": 1
    },
    {
      "id": 2,
      "inverter_number": 2
    }
  ],
  "total": 2
}`}
              notes={['Use the id field from the response as the inverter_id when sending inverter measurements']}
            />
            
            <Endpoint
              method="GET"
              path="/api/installations/{installation_id}/chargers"
              description="Get list of EV chargers for the edge device's installation. Returns charger IDs and numbers that can be used for sending EV charger measurements."
              auth="device"
              responseBody={`{
  "chargers": [
    {
      "id": 1,
      "charger_number": 1
    },
    {
      "id": 2,
      "charger_number": 2
    }
  ],
  "total": 2
}`}
              notes={[
                'Use the id field from the response as the charger_id when sending EV charger measurements',
                'This endpoint is only available if the EV chargers feature is enabled'
              ]}
            />
            
            <Endpoint
              method="GET"
              path="/api/installations/{installation_id}/device"
              description="Get the authenticated device's own details including reverse SSH status."
              auth="device"
              responseBody={`{
  "id": 1,
  "installation_id": 1,
  "name": "Raspberry Pi 1",
  "description": "Main monitoring device",
  "is_active": true,
  "last_seen_at": "2025-01-11T16:00:00Z",
  "created_at": "2025-01-11T15:00:00Z",
  "updated_at": "2025-01-11T15:00:00Z",
  "reverse_ssh_enabled": true
}`}
              notes={['Device can only get its own details', 'reverse_ssh_enabled is true if enabled, false if disabled or no config exists']}
            />
            
            <h4 className="text-md font-semibold mt-6 mb-3 pt-4 border-t border-border text-text">
              Device Management (JWT Auth)
            </h4>
            
            <Endpoint
              method="GET"
              path="/api/installations/{installation_id}/edge-devices"
              description="List all edge devices for an installation."
              responseBody={`{
  "devices": [
    {
      "id": 1,
      "installation_id": 1,
      "name": "Raspberry Pi 1",
      "description": "Main monitoring device",
      "is_active": true,
      "last_seen_at": "2025-01-11T16:00:00Z",
      "reverse_ssh_enabled": true
    }
  ],
  "total": 1
}`}
              notes={['Tokens are never returned in list responses', 'reverse_ssh_enabled is true if enabled, false if disabled or no config exists']}
            />
            
            <Endpoint
              method="GET"
              path="/api/installations/{installation_id}/edge-devices/{device_id}"
              description="Get edge device details including reverse SSH status."
              responseBody={`{
  "id": 1,
  "installation_id": 1,
  "name": "Raspberry Pi 1",
  "description": "Main monitoring device",
  "is_active": true,
  "last_seen_at": "2025-01-11T16:00:00Z",
  "created_at": "2025-01-11T15:00:00Z",
  "updated_at": "2025-01-11T15:00:00Z",
  "reverse_ssh_enabled": true
}`}
              notes={['reverse_ssh_enabled is true if enabled, false if disabled or no config exists']}
            />
            
            <Endpoint
              method="POST"
              path="/api/installations/{installation_id}/edge-devices"
              description="Register a new edge device. The token is only returned once!"
              requestBody={`{
  "name": "Raspberry Pi 1",
  "installation_id": 1,
  "description": "Main monitoring device"
}`}
              responseBody={`{
  "id": 1,
  "device_id": 1,
  "installation_id": 1,
  "name": "Raspberry Pi 1",
  "token": "abc123xyz789...",
  "is_active": true
}`}
              notes={[
                '⚠️ CRITICAL: Token is only shown once!',
                'Save the token immediately after device registration',
                'If lost, use the regenerate endpoint'
              ]}
            />
            
            <Endpoint
              method="POST"
              path="/api/installations/{installation_id}/edge-devices/{device_id}/regenerate-token"
              description="Regenerate the device token. The old token will be invalidated."
              responseBody={`{
  "id": 1,
  "token": "new-token-abc123..."
}`}
              notes={['New token is only shown once', 'Old token immediately becomes invalid']}
            />
            
            <Endpoint
              method="PATCH"
              path="/api/installations/{installation_id}/edge-devices/{device_id}/reverse-ssh/toggle?enabled=true"
              description="Toggle Reverse SSH enabled/disabled state for an edge device."
              responseBody={`{
  "id": 1,
  "installation_id": 1,
  "name": "Raspberry Pi 1",
  "description": "Main monitoring device",
  "is_active": true,
  "last_seen_at": "2025-01-11T16:00:00Z",
  "created_at": "2025-01-11T15:00:00Z",
  "updated_at": "2025-01-11T15:00:00Z",
  "reverse_ssh_enabled": true
}`}
              notes={['Query param: enabled (true/false)', 'Auto-creates config with systemwide defaults when enabling if none exists']}
            />
            
            <h4 className="text-md font-semibold mt-6 mb-3 pt-4 border-t border-border text-text">
              Reverse SSH Configuration (Device Token Auth)
            </h4>
            
            <Endpoint
              method="GET"
              path="/api/installations/{installation_id}/edge-devices/{device_id}/reverse-ssh"
              description="Get reverse SSH configuration for the device. Returns default config (enabled=false) if none exists."
              auth="device"
              responseBody={`{
  "id": null,
  "device_id": 1,
  "enabled": false,
  "host": "support.jsenergy.nl",
  "user": "rpi-tunnel",
  "ssh_port": 22,
  "created_at": null,
  "updated_at": null
}`}
              notes={['Returns default disabled state if no config exists', 'Uses systemwide host/user from server config']}
            />
            
            <Endpoint
              method="POST"
              path="/api/installations/{installation_id}/edge-devices/{device_id}/reverse-ssh"
              description="Create or update reverse SSH configuration. Creates new if none exists, updates if exists."
              auth="device"
              requestBody={`{
  "enabled": true,
  "host": "support.example.com",
  "user": "rpi-tunnel",
  "ssh_port": 22
}`}
              responseBody={`{
  "id": 1,
  "device_id": 1,
  "enabled": true,
  "host": "support.example.com",
  "user": "rpi-tunnel",
  "ssh_port": 22,
  "created_at": "2025-01-12T11:00:00Z",
  "updated_at": "2025-01-12T11:00:00Z"
}`}
              notes={['All fields optional - host/user default to systemwide config', 'ssh_port defaults to 22', 'enabled defaults to false']}
            />
            
            <Endpoint
              method="PATCH"
              path="/api/installations/{installation_id}/edge-devices/{device_id}/reverse-ssh"
              description="Partially update reverse SSH configuration. Only provided fields are updated."
              auth="device"
              requestBody={`{
  "enabled": false,
  "ssh_port": 2222
}`}
              notes={['All fields are optional', 'Returns 404 if no configuration exists']}
            />
            
            <Endpoint
              method="DELETE"
              path="/api/installations/{installation_id}/edge-devices/{device_id}/reverse-ssh"
              description="Delete reverse SSH configuration (soft delete)."
              auth="device"
              notes={['Returns 204 No Content on success', 'Returns 404 if no configuration exists']}
            />
          </Section>
        )}

        {activeSection === 'firmware' && (
          <>
            <Section title={t('developer.firmwareUpdates') || 'Firmware Updates (Device Token Auth)'}>
              <div className="mb-4 p-4 bg-warning/20 rounded-lg border border-warning/50">
                <p className="text-sm text-warning">
                  <strong>{t('developer.important') || 'Important'}:</strong> {t('developer.firmwareDeviceAuthNote') || 'These endpoints use Device Token authentication, not JWT. Use the X-Device-Token header.'}
                </p>
              </div>
              
              <Endpoint
                method="GET"
                path="/api/device/firmware/latest"
                description="Get the latest available firmware info. The device should compare version/build_number locally to decide if an update is needed."
                auth="device"
                responseBody={`{
  "id": 1,
  "version": "1.3.0",
  "build_number": 150,
  "file_size": 52428800,
  "checksum": "abc123...",
  "release_notes": "Bug fixes and improvements",
  "download_url": "/api/device/firmware/download/1",
  "created_at": "2025-01-17T10:00:00Z"
}`}
                notes={[
                  'Device compares version and build_number from response with its own values to determine if update is needed',
                  'Returns 404 if no firmware has been uploaded yet'
                ]}
              />
              
              <Endpoint
                method="GET"
                path="/api/device/firmware/download/{firmware_id}"
                description="Download firmware file. Returns the firmware ZIP file as a binary stream."
                auth="device"
                notes={[
                  'Response headers: Content-Type: application/zip, X-Firmware-Version, X-Firmware-Build, X-Firmware-Checksum',
                  'Response body: Binary ZIP file',
                  'Error responses: 401 (Invalid device token), 404 (Firmware not found)'
                ]}
              />
            </Section>

            <Section title={t('developer.firmwareManagement') || 'Firmware Management (Admin - JWT Auth)'}>
              <Endpoint
                method="POST"
                path="/api/firmware"
                description="Upload a new firmware version (admin only)."
                requestBody={`{
  "file": "<multipart/form-data file>",
  "version": "1.2.0",
  "build_number": 123,
  "release_notes": "Initial release"
}`}
                responseBody={`{
  "id": 1,
  "version": "1.2.0",
  "build_number": 123,
  "filename": "firmware_v1.2.0_b123_20250117_100000.zip",
  "file_size": 52428800,
  "checksum": "abc123...",
  "release_notes": "Bug fixes and improvements",
  "created_at": "2025-01-17T10:00:00Z",
  "updated_at": "2025-01-17T10:00:00Z"
}`}
                notes={[
                  'Request body: multipart/form-data',
                  'Required fields: file (ZIP file), version (max 50 chars), build_number (>= 1)',
                  'Optional fields: release_notes',
                  'Error responses: 400 (Invalid file type - only ZIP allowed), 401 (Not authenticated), 403 (Not an admin), 409 (Version + build_number combination already exists)'
                ]}
              />
              
              <Endpoint
                method="GET"
                path="/api/firmware"
                description="List all firmware versions (admin only). Results are sorted by upload date (newest first)."
                responseBody={`{
  "firmware": [
    {
      "id": 2,
      "version": "1.3.0",
      "build_number": 150,
      "filename": "firmware_v1.3.0_b150_20250117_120000.zip",
      "file_size": 54525952,
      "created_at": "2025-01-17T12:00:00Z"
    },
    {
      "id": 1,
      "version": "1.2.0",
      "build_number": 123,
      "filename": "firmware_v1.2.0_b123_20250117_100000.zip",
      "file_size": 52428800,
      "created_at": "2025-01-17T10:00:00Z"
    }
  ],
  "total": 2
}`}
              />
              
              <Endpoint
                method="GET"
                path="/api/firmware/{firmware_id}"
                description="Get detailed information about a specific firmware version (admin only)."
                responseBody={`{
  "id": 1,
  "version": "1.2.0",
  "build_number": 123,
  "filename": "firmware_v1.2.0_b123_20250117_100000.zip",
  "file_size": 52428800,
  "checksum": "abc123...",
  "release_notes": "Bug fixes and improvements",
  "created_at": "2025-01-17T10:00:00Z",
  "updated_at": "2025-01-17T10:00:00Z"
}`}
              />
              
              <Endpoint
                method="DELETE"
                path="/api/firmware/{firmware_id}"
                description="Delete a firmware version (admin only, soft delete)."
                notes={[
                  'Response: 204 No Content',
                  'Error responses: 401 (Not authenticated), 403 (Not an admin), 404 (Firmware not found)'
                ]}
              />
            </Section>
          </>
        )}

        {activeSection === 'measurements' && (
          <Section title={t('developer.measurementEndpoints') || 'Measurement Endpoints (Device Token Auth)'}>
            <div className="mb-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
              <p className="text-sm text-amber-800">
                <strong>{t('developer.important') || 'Important'}:</strong> {t('developer.measurementAuthNote') || 'These endpoints use Device Token authentication, not JWT. Use the X-Device-Token header.'}
              </p>
            </div>
            
            <Endpoint
              method="POST"
              path="/api/installations/{installation_id}/measurements/battery"
              description="Send battery measurement data (batch support)."
              auth="device"
              requestBody={`[
  {
    "soc_percentage": 65.5,
    "power_kw": -2.3,
    "voltage": 48.0,
    "temperature": 25.5,
    "timestamp": "2025-01-11T16:00:00Z"
  }
]`}
              responseBody={`{
  "accepted": 1,
  "total_rows_added": 1,
  "version": "2.0.0",
  "data": [
    {
      "soc_percentage": 65.5,
      "power_kw": -2.3,
      "voltage": 48.0,
      "temperature": 25.5,
      "timestamp": "2025-01-11T16:00:00Z"
    }
  ]
}`}
              notes={[
                'Request body: Array of battery measurements (batch support)',
                'Required fields: soc_percentage, power_kw, timestamp',
                'Optional fields: voltage, temperature',
                'power_kw: negative = charging, positive = discharging'
              ]}
            />
            
            <Endpoint
              method="POST"
              path="/api/installations/{installation_id}/measurements/inverter/{inverter_id}"
              description="Send inverter measurement data (batch support)."
              auth="device"
              requestBody={`[
  {
    "power_kw": 3.2,
    "energy_kwh_daily": 12.5,
    "curtailment_percentage": 0.0,
    "timestamp": "2025-01-11T16:00:00Z"
  }
]`}
              responseBody={`{
  "accepted": 1,
  "total_rows_added": 1,
  "version": "2.0.0",
  "data": [
    {
      "power_kw": 3.2,
      "energy_kwh_daily": 12.5,
      "curtailment_percentage": 0.0,
      "timestamp": "2025-01-11T16:00:00Z"
    }
  ]
}`}
              notes={[
                'Request body: Array of inverter measurements (batch support)',
                'Required fields: power_kw, timestamp',
                'Optional fields: energy_kwh_daily (default: 0.0), curtailment_percentage (default: 0.0)',
                'The inverter_id in the URL must match an existing inverter for the installation'
              ]}
            />
            
            <Endpoint
              method="POST"
              path="/api/installations/{installation_id}/measurements/meter"
              description="Send meter measurement data (batch support)."
              auth="device"
              requestBody={`[
  {
    "import_kw": 0.5,
    "export_kw": 1.2,
    "import_kwh": 12.5,
    "export_kwh": 28.8,
    "l1_a": 2.3,
    "l2_a": 2.1,
    "l3_a": 2.4,
    "timestamp": "2025-01-11T16:00:00Z"
  }
]`}
              responseBody={`{
  "accepted": 1,
  "total_rows_added": 1,
  "version": "2.0.0",
  "data": [
    {
      "import_kw": 0.5,
      "export_kw": 1.2,
      "import_kwh": 12.5,
      "export_kwh": 28.8,
      "l1_a": 2.3,
      "l2_a": 2.1,
      "l3_a": 2.4,
      "timestamp": "2025-01-11T16:00:00Z"
    }
  ]
}`}
              notes={[
                'Request body: Array of meter measurements (batch support)',
                'Required fields: import_kw, export_kw, timestamp',
                'Optional fields: import_kwh (default: 0.0), export_kwh (default: 0.0), l1_a, l2_a, l3_a (default: 0.0)'
              ]}
            />
            
            <Endpoint
              method="POST"
              path="/api/installations/{installation_id}/measurements/generator"
              description="Send generator measurement data (batch support)."
              auth="device"
              requestBody={`[
  {
    "status": "off",
    "fuel_consumption_lph": 0.0,
    "charging_power_kw": 0.0,
    "timestamp": "2025-01-11T16:00:00Z"
  }
]`}
              responseBody={`{
  "accepted": 1,
  "total_rows_added": 1,
  "version": "2.0.0",
  "data": [
    {
      "status": "off",
      "fuel_consumption_lph": 0.0,
      "charging_power_kw": 0.0,
      "timestamp": "2025-01-11T16:00:00Z"
    }
  ]
}`}
              notes={[
                'Request body: Array of generator measurements (batch support)',
                'Required fields: status (max 20 chars), timestamp',
                'Optional fields: fuel_consumption_lph (default: 0.0), charging_power_kw (default: 0.0)',
                'status: "off", "on", "starting", "error"',
                'This endpoint is only available if the generator feature is enabled'
              ]}
            />
            
            <Endpoint
              method="POST"
              path="/api/installations/{installation_id}/measurements/charger/{charger_id}"
              description="Send EV charger measurement data (batch support)."
              auth="device"
              requestBody={`[
  {
    "power_kw": 7.2,
    "energy_kwh": 15.5,
    "source": "battery",
    "revenue_eur": 6.23,
    "timestamp": "2025-01-11T16:00:00Z"
  }
]`}
              responseBody={`{
  "accepted": 1,
  "total_rows_added": 1,
  "version": "2.0.0",
  "data": [
    {
      "power_kw": 7.2,
      "energy_kwh": 15.5,
      "source": "battery",
      "revenue_eur": 6.23,
      "timestamp": "2025-01-11T16:00:00Z"
    }
  ]
}`}
              notes={[
                'Request body: Array of EV charger measurements (batch support)',
                'Required fields: power_kw, source (max 20 chars), timestamp',
                'Optional fields: energy_kwh (default: 0.0), revenue_eur (default: 0.0)',
                'source: "battery", "grid", "pv"',
                'The charger_id in the URL must match an existing EV charger for the installation',
                'This endpoint is only available if the EV chargers feature is enabled'
              ]}
            />
            
            <Endpoint
              method="POST"
              path="/api/installations/{installation_id}/measurements/bulk"
              description="Upload measurements for all device types in a single API call (bulk upload). All measurements are processed atomically in a single transaction - if any device type fails validation, the entire operation is rolled back."
              auth="device"
              requestBody={`{
  "battery": [
    {
      "soc_percentage": 65.5,
      "power_kw": -2.3,
      "voltage": 48.0,
      "temperature": 25.5,
      "timestamp": "2025-01-11T16:00:00Z"
    }
  ],
  "inverter": {
    "inverter_id": 1,
    "measurements": [
      {
        "power_kw": 3.2,
        "energy_kwh_daily": 12.5,
        "curtailment_percentage": 0.0,
        "timestamp": "2025-01-11T16:00:00Z"
      }
    ]
  },
  "meter": [
    {
      "import_kw": 0.5,
      "export_kw": 1.2,
      "import_kwh": 12.5,
      "export_kwh": 28.8,
      "l1_a": 2.3,
      "l2_a": 2.1,
      "l3_a": 2.4,
      "timestamp": "2025-01-11T16:00:00Z"
    }
  ],
  "generator": [
    {
      "status": "off",
      "fuel_consumption_lph": 0.0,
      "charging_power_kw": 0.0,
      "timestamp": "2025-01-11T16:00:00Z"
    }
  ],
  "ev_charger": {
    "charger_id": 1,
    "measurements": [
      {
        "power_kw": 7.2,
        "energy_kwh": 15.5,
        "source": "battery",
        "revenue_eur": 6.23,
        "timestamp": "2025-01-11T16:00:00Z"
      }
    ]
  }
}`}
              responseBody={`{
  "accepted": 5,
  "total_rows_added": 5,
  "version": "2.0.0",
  "battery": [...],
  "inverter": [...],
  "meter": [...],
  "generator": [...],
  "ev_charger": [...],
  "errors": []
}`}
              notes={[
                'At least one device type must be provided with at least one measurement',
                'All measurements are processed atomically in a single transaction',
                'If any device type fails validation, the entire operation is rolled back',
                'Reduces network overhead and improves efficiency when collecting data from multiple devices simultaneously'
              ]}
            />
          </Section>
        )}
      </div>
    </div>
  );
}

