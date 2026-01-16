# CECD-v2 Services Quick Reference Guide

## Service Imports

```typescript
// Error handling & Logging
import { ErrorBoundary } from './components/ErrorBoundary';
import { loggerService } from './services/loggerService';

// Validation
import { validationService } from './services/validationService';

// Notifications
import { notificationService } from './services/notificationService';

// Storage
import { localStorageService } from './services/localStorageService';

// Resilience
import { resilienceService } from './services/resilienceService';

// Performance & Caching
import { requestCacheService } from './services/requestCacheService';
import { performanceMonitor } from './services/performanceMonitor';

// Utilities
import { 
  formatDate, 
  calculateDistance, 
  debounce, 
  sleep 
} from './services/utilHelpers';

// State Management
import { 
  createState, 
  createReducerState,
  StateStore 
} from './services/stateManagement';
```

## Common Patterns

### 1. Validate & Log
```typescript
const validation = validationService.validateEmail(email);
if (!validation.isValid) {
  loggerService.error('MyComponent', 'Invalid email', 
    new Error(validation.errors[0]));
  return;
}
```

### 2. Send Notification
```typescript
notificationService.sendNotification({
  title: 'Operation Success',
  message: 'Incident reported successfully',
  severity: 'info'
});
```

### 3. Retry with Backoff
```typescript
try {
  await resilienceService.retry(
    () => fetchData(),
    { maxAttempts: 3, baseDelay: 1000 }
  );
} catch (error) {
  loggerService.error('Component', 'Failed after retries', error);
}
```

### 4. Cache Expensive Operation
```typescript
const result = await requestCacheService.withCache(
  'unique-key',
  () => expensiveAsyncOperation(),
  5 * 60 * 1000 // 5 minute TTL
);
```

### 5. Measure Performance
```typescript
performanceMonitor.startMeasure('operation');
// ... do work ...
performanceMonitor.endMeasure('operation', { userId: '123' });
```

### 6. Format Dates
```typescript
const relative = formatDate(timestamp); // "2h ago"
const distance = formatDistance(5.2); // "5.2km"
```

### 7. Persist User Preferences
```typescript
localStorageService.saveUserPreferences({
  theme: 'dark',
  language: 'en'
});

const prefs = localStorageService.getUserPreferences();
```

### 8. Simple State Management
```typescript
const state = createState({ count: 0 });
state.subscribe((s) => console.log('State:', s));
state.setState({ count: 1 });
```

## Error Boundaries

Wrap error-prone components:
```typescript
<ErrorBoundary
  onError={(error, info) => {
    loggerService.error('ComponentName', 'Error caught', error);
  }}
>
  <YourComponent />
</ErrorBoundary>
```

## Logging Best Practices

```typescript
// Debug level (development only)
loggerService.debug('Service', 'Detailed info', { context: 'data' });

// Info level (important operations)
loggerService.info('Service', 'Operation completed', { result: 'success' });

// Warning level (recoverable issues)
loggerService.warn('Service', 'Retry attempt 2', { error: 'timeout' });

// Error level (failures)
loggerService.error('Service', 'Critical failure', new Error(), { context });
```

## Validation Examples

```typescript
// Available validations
validationService.validateTitle(text) // 3-200 chars
validationService.validateDescription(text) // 10-5000 chars
validationService.validateEmail(email) // Email format
validationService.validateName(name) // 2-100 chars, letters only
validationService.validateCoordinates(lat, lng) // Valid GPS bounds
validationService.validateAmount(amount, min, max) // Numeric range
validationService.validateTrustScore(score) // 0-100
validationService.validateWalletAddress(address) // Ethereum format
validationService.validateTimestamp(ts) // Reasonable date range
validationService.validateIdArray(ids) // Non-empty array of strings
```

## Notification Severity Levels

```typescript
// Critical - PUSH/SMS sent, stays until dismissed
sendNotification({ severity: 'critical', ... })

// Warning - EMAIL sent, auto-dismisses after 8s
sendNotification({ severity: 'warning', ... })

// Info - Log only, auto-dismisses after 8s
sendNotification({ severity: 'info', ... })
```

## Performance Monitoring

```typescript
// Get stats for operation
const stats = performanceMonitor.getStats('myOperation');
// { count, avg, min, max, median, total }

// Get all stats
const allStats = performanceMonitor.getAllStats();

// Get memory usage
const memory = performanceMonitor.getMemoryUsage();

// Export metrics
const json = performanceMonitor.export();
```

## Caching Strategies

```typescript
// Cache with TTL
requestCacheService.set(key, data, 5 * 60 * 1000);

// Memoize async function
const memoized = requestCacheService.memoize(asyncFn, ttl);

// Invalidate pattern
requestCacheService.invalidatePattern('incident:*');

// Get cache stats
const stats = requestCacheService.getStats();
```

## Resilience Patterns

```typescript
// Simple retry
await resilienceService.retry(fn, { maxAttempts: 3 });

// Circuit breaker
await resilienceService.executeWithCircuitBreaker(
  'external-service',
  fn,
  { failureThreshold: 5, cooldownPeriod: 30000 }
);

// Fallback
await resilienceService.withFallback(
  () => fetchData(),
  defaultData
);
```

## Local Storage Methods

```typescript
// Save and retrieve with type safety
localStorageService.save('key', data);
const data = localStorageService.get('key', defaultValue);

// Preferences
localStorageService.saveUserPreferences({ theme: 'dark' });
const prefs = localStorageService.getUserPreferences();

// Filters
localStorageService.saveIncidentFilters({ severity: 'HIGH' });
const filters = localStorageService.getIncidentFilters();

// Favorites
localStorageService.addFavoriteIncident(id);
localStorageService.removeFavoriteIncident(id);
const isFav = localStorageService.isFavorite(id);

// Recent searches
localStorageService.addRecentSearch('flood');
const searches = localStorageService.getRecentSearches();

// Cleanup
localStorageService.clear(); // Clear all
localStorageService.remove('key'); // Clear specific
```

## Type Definitions

```typescript
// Validation result
interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// Log entry
interface LogEntry {
  timestamp: number;
  level: LogLevel;
  service: string;
  message: string;
  context?: Record<string, any>;
  stack?: string;
}

// Performance metric
interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

// Cache entry
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}
```

## Debug Tips

### View all logs
```typescript
loggerService.getLogs()
```

### View logs by level
```typescript
loggerService.getLogs('error')
loggerService.getLogs('warn', 'ServiceName')
```

### Check circuit breaker status
```typescript
resilienceService.getCircuitBreakerMetrics('service-name')
resilienceService.getAllCircuitBreakerMetrics()
```

### Monitor cache
```typescript
requestCacheService.getStats()
requestCacheService.cleanup()
```

### Export performance data
```typescript
performanceMonitor.export()
```

### Export storage data
```typescript
localStorageService.getAllKeys()
```

---

**Pro Tips:**
- Always validate user input before processing
- Use error boundaries around error-prone components
- Log important operations for debugging
- Memoize expensive operations
- Use circuit breaker for external services
- Monitor performance regularly
- Clean up listeners and timers

**Version**: 1.0 | **Updated**: January 16, 2026
