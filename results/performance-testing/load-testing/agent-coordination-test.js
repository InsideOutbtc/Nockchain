import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '3m', target: 500 },
    { duration: '7m', target: 2000 },
    { duration: '10m', target: 5000 },
    { duration: '5m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<200'],   // Agent coordination under 200ms
    http_req_failed: ['rate<0.05'],     // 95% success rate
  },
};

export default function() {
  // Test agent coordination
  const response = http.get('http://localhost:3001/api/agent-coordination');
  
  check(response, {
    'coordination successful': (r) => r.status === 200,
    'coordination under 200ms': (r) => r.timings.duration < 200,
    'coordination under 100ms': (r) => r.timings.duration < 100,
  });
  
  sleep(0.1);
}