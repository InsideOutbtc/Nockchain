import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '5m', target: 1000 },   // Revenue processing load
    { duration: '10m', target: 2000 },  // High revenue load
    { duration: '15m', target: 5000 },  // Peak revenue processing
    { duration: '5m', target: 0 },      // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(99)<100'],   // 99% under 100ms for revenue
    http_req_failed: ['rate<0.01'],     // 99% success rate for revenue
  },
};

export default function() {
  // Test revenue system endpoints
  const revenueEndpoints = [
    'http://localhost:8081/api/revenue/streams',
    'http://localhost:8081/api/billing/metrics',
    'http://localhost:3002/api/trading/status',
    'http://localhost:8080/api/mining/stats',
  ];
  
  revenueEndpoints.forEach(url => {
    const response = http.get(url);
    check(response, {
      'revenue endpoint healthy': (r) => r.status === 200,
      'revenue response fast': (r) => r.timings.duration < 50,
    });
  });
  
  sleep(0.5);
}