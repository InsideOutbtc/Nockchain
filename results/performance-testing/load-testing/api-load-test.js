import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

// Load testing configuration
export const options = {
  stages: [
    { duration: '2m', target: 100 },    // Ramp up to 100 users
    { duration: '5m', target: 500 },    // Scale to 500 users  
    { duration: '10m', target: 1000 },  // Scale to 1000 users
    { duration: '15m', target: 5000 },  // Scale to 5000 users
    { duration: '20m', target: 10000 }, // Peak at 10,000 users
    { duration: '10m', target: 5000 },  // Scale down
    { duration: '5m', target: 0 },      // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<22'], // 95% of requests must be under 22ms
    http_req_failed: ['rate<0.1'],   // Error rate must be below 10%
    errors: ['rate<0.1'],            // Custom error rate
  },
};

const BASE_URL = 'http://localhost';

// Define endpoints to test
const endpoints = [
  { url: `${BASE_URL}:3000/api/health`, name: 'Web App' },
  { url: `${BASE_URL}:8080/health`, name: 'Mining Pool' },
  { url: `${BASE_URL}:8081/health`, name: 'Revenue Engine' },
  { url: `${BASE_URL}:3002/api/status`, name: 'DEX Integration' },
  { url: `${BASE_URL}:3001/api/health`, name: 'Monitoring' },
  { url: `${BASE_URL}:3006/api/status`, name: 'Bridge Sync' },
];

export default function() {
  // Test random endpoint
  const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
  
  const response = http.get(endpoint.url, {
    timeout: '30s',
  });
  
  // Check response
  const result = check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 22ms': (r) => r.timings.duration < 22,
    'response time < 50ms': (r) => r.timings.duration < 50,
  });
  
  errorRate.add(!result);
  
  sleep(1);
}