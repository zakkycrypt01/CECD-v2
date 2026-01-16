# CECD-v2 Development Guidelines - January 2026

## Project Status Overview

**Version**: 2.0+  
**Last Updated**: January 16, 2026  
**Code Quality**: Enhanced with comprehensive error handling, validation, logging, and monitoring

---

## 🏗️ Architecture Overview

### Service Layer
The application uses a service-oriented architecture with specialized services for different concerns:

```
services/
├── AI & ML
│   ├── aiService.ts (predictions, chat, geocoding with retry)
│   ├── predictiveAnalyticsService.ts
│   └── aiDecisionSupportService.ts
├── Data Persistence
│   ├── localStorageService.ts (user preferences)
│   ├── offlineService.ts (offline queue)
│   └── incidentEventPersistenceService.ts
├── Infrastructure
│   ├── loggerService.ts (structured logging)
│   ├── validationService.ts (input validation)
│   ├── notificationService.ts (alerts & notifications)
│   ├── performanceMonitor.ts (performance metrics)
│   ├── requestCacheService.ts (caching)
│   └── resilienceService.ts (retry + circuit breaker)
└── Domain
    ├── incidentService.ts
    ├── volunteerOptimizationService.ts
    ├── playbookService.ts
    └── [40+ other specialized services]
```

### Component Hierarchy

```
App (with ErrorBoundary)
├── Router
├── Header
├── Sidebar
├── Main Content
│   ├── Dashboard
│   ├── Incidents/Detail
│   ├── Volunteers
│   ├── Teams
│   ├── Analytics
│   └── Admin
└── AiAssistant
```

---

## 📋 New Developer Checklist

When adding new features:

- [ ] **Validate input** using `validationService`
- [ ] **Log operations** using `loggerService`
- [ ] **Handle errors** with try-catch and proper error handling
- [ ] **Send notifications** for user feedback
- [ ] **Cache expensive** operations
- [ ] **Persist preferences** to localStorage
- [ ] **Monitor performance** for slow operations
- [ ] **Use TypeScript** with strict types
- [ ] **Write JSDoc comments** for all functions
- [ ] **Handle offline** scenarios with `offlineService`
- [ ] **Implement retry** logic for API calls
- [ ] **Add unit tests** for business logic

---

## 🚀 Feature Implementation Template

### Example: Adding a New Feature

```typescript
// 1. Define types
interface MyFeatureData {
  id: string;
  name: string;
  status: 'active' | 'inactive';
}

// 2. Create service
export const myFeatureService = {
  /**
   * Create a new feature
   * @param data - Feature data to create
   * @returns Created feature with ID
   */
  async create(data: Omit<MyFeatureData, 'id'>): Promise<MyFeatureData> {
    // Validate input
    const validation = validationService.validateName(data.name);
    if (!validation.isValid) {
      loggerService.error('MyFeatureService', 'Invalid data', 
        new Error(validation.errors[0]));
      throw new Error(validation.errors[0]);
    }

    // Execute with retry and timeout
    try {
      const result = await resilienceService.retry(
        async () => {
          const created: MyFeatureData = {
            id: `feature-${Date.now()}`,
            ...data
          };
          loggerService.info('MyFeatureService', 'Feature created', { id: created.id });
          return created;
        },
        { maxAttempts: 3 }
      );

      // Notify user
      notificationService.sendNotification({
        title: 'Success',
        message: `Feature "${data.name}" created`,
        severity: 'info'
      });

      return result;
    } catch (error) {
      loggerService.error('MyFeatureService', 'Failed to create feature', error as Error);
      notificationService.sendNotification({
        title: 'Error',
        message: 'Failed to create feature',
        severity: 'warning'
      });
      throw error;
    }
  }
};

// 3. Use in component
const MyFeatureComponent: React.FC = () => {
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await myFeatureService.create({
        name: 'New Feature',
        status: 'active'
      });
      
      loggerService.info('MyFeatureComponent', 'Feature created', { id: result.id });
    } catch (error) {
      loggerService.error('MyFeatureComponent', 'Create failed', error as Error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleCreate}>
      {/* Form fields */}
      <button type="submit" disabled={loading}>
        {loading ? 'Creating...' : 'Create'}
      </button>
    </form>
  );
};
```

---

## 🔍 Error Handling Strategy

### Hierarchy of Error Handling

```
1. Component Level (Try-Catch)
   ↓
2. Error Boundary (Component Crash)
   ↓
3. Service Level (Retry/Fallback)
   ↓
4. Logger Service (Persistence)
```

### Pattern: Safe Async Operations

```typescript
async function safeAsyncOp<T>(
  fn: () => Promise<T>,
  serviceName: string,
  fallback?: T
): Promise<T> {
  try {
    return await resilienceService.retry(fn, {
      maxAttempts: 3,
      baseDelay: 1000
    });
  } catch (error) {
    loggerService.error(serviceName, 'Operation failed', error as Error);
    
    if (fallback !== undefined) {
      return fallback;
    }
    
    throw error;
  }
}
```

---

## 📊 Monitoring & Debugging

### Performance Debugging

```typescript
// Add to a component
useEffect(() => {
  performanceMonitor.startMeasure('ComponentRender');
  
  return () => {
    const metric = performanceMonitor.endMeasure('ComponentRender');
    console.log('Render time:', metric?.duration, 'ms');
  };
}, []);
```

### Check Service Health

```typescript
// In console
// View circuit breaker status
resilienceService.getAllCircuitBreakerMetrics()

// View cache stats
requestCacheService.getStats()

// View performance stats
performanceMonitor.getAllStats()

// View recent logs
loggerService.getLogs('error', undefined, 50)
```

---

## 🧪 Testing Strategies

### Unit Testing Pattern

```typescript
describe('MyFeatureService', () => {
  beforeEach(() => {
    loggerService.clear();
    requestCacheService.clear();
  });

  it('should validate input', async () => {
    const validation = validationService.validateName('');
    expect(validation.isValid).toBe(false);
  });

  it('should handle errors gracefully', async () => {
    const result = await resilienceService.withFallback(
      () => Promise.reject(new Error('Test')),
      { fallbackData: true }
    );
    expect(result.fallbackData).toBe(true);
  });
});
```

### Integration Testing Pattern

```typescript
describe('Feature Integration', () => {
  it('should complete workflow with all services', async () => {
    // Setup
    const data = { name: 'Test Feature' };
    
    // Validate
    const validation = validationService.validateName(data.name);
    expect(validation.isValid).toBe(true);
    
    // Execute
    const result = await myFeatureService.create(data);
    
    // Verify
    expect(result.id).toBeDefined();
    expect(result.name).toBe(data.name);
    
    // Check notifications were sent
    const notifications = notificationService.getNotifications();
    expect(notifications.length).toBeGreaterThan(0);
  });
});
```

---

## 📱 Mobile-First Guidelines

When developing components:

1. **Test on Mobile**: Use device emulation in DevTools
2. **Touch Targets**: Min 44px × 44px
3. **Responsive**: Mobile → Tablet → Desktop
4. **Performance**: Optimize for slower connections
5. **Offline**: Support offline mode

```typescript
// Mobile-responsive component
const MyComponent: React.FC = () => {
  return (
    <div className="p-4 md:p-6 lg:p-12">
      {/* Mobile: full width, Tablet+: constrained */}
      <div className="w-full md:w-3/4 lg:w-1/2 mx-auto">
        {/* Content */}
      </div>
    </div>
  );
};
```

---

## 🔐 Security Best Practices

### Input Sanitization
```typescript
// Always validate user input
const sanitized = validationService.sanitizeString(userInput);

// Validate sensitive data
const emailValidation = validationService.validateEmail(userEmail);
const walletValidation = validationService.validateWalletAddress(address);
```

### Error Messages
```typescript
// ❌ BAD - Exposes sensitive info
loggerService.error('Service', 'DB Error: ' + error.message);

// ✅ GOOD - Generic message to user, detailed logging
loggerService.error('Service', 'Operation failed', error);
notificationService.sendNotification({
  title: 'Error',
  message: 'Unable to complete operation. Please try again.',
  severity: 'warning'
});
```

### Data Handling
```typescript
// Use localStorage service for safe storage
localStorageService.saveUserPreferences({
  notifications: true // Safe data only
});

// Never store sensitive data in localStorage
// ❌ localStorageService.save('password', userPassword)
// ✅ Use secure cookies/session storage instead
```

---

## 📚 File Naming Conventions

```
services/
  camelCaseService.ts       # Service implementations

components/
  PascalCase.tsx            # React components
  PascalCase.module.css     # Component styles

pages/
  PascalCase.tsx            # Page components

types.ts                    # Shared types
constants.tsx               # App constants
mockData.ts                 # Mock data for development
```

---

## 🔄 Workflow for Adding a Service

1. **Create Service**
   ```
   services/newService.ts
   ```

2. **Add Types**
   ```typescript
   export interface MyData { ... }
   ```

3. **Implement Methods**
   ```typescript
   export const myService = {
     async getData(): Promise<MyData> { ... }
   }
   ```

4. **Add Documentation**
   ```typescript
   /**
    * Gets data from service
    * @param id - Data identifier
    * @returns Promise with data
    */
   ```

5. **Use in Components**
   ```typescript
   import { myService } from '../services/myService'
   ```

6. **Test**
   ```
   Add tests to __tests__/
   ```

---

## 📞 Support & Debugging

### Common Issues & Solutions

**Issue**: "Component crash on error"  
**Solution**: Wrap with ErrorBoundary
```typescript
<ErrorBoundary onError={(e) => loggerService.error('...', '...', e)}>
  <MyComponent />
</ErrorBoundary>
```

**Issue**: "Slow data fetching"  
**Solution**: Add caching
```typescript
await requestCacheService.withCache(key, () => fetchData(), 5*60*1000)
```

**Issue**: "No error retry logic"  
**Solution**: Use resilience service
```typescript
await resilienceService.retry(() => apiCall(), { maxAttempts: 3 })
```

**Issue**: "Lost user preferences"  
**Solution**: Persist to storage
```typescript
localStorageService.saveUserPreferences(preferences)
```

---

## 🎓 Learning Resources

- **Error Handling**: See `INTEGRATION_GUIDE_PRIVACY.md`
- **Services**: See `SERVICES_QUICK_REFERENCE.md`
- **Updates**: See `UPDATES_SUMMARY.md`
- **Deployment**: See `DEPLOYMENT_GUIDE.md`

---

## 📝 Code Review Checklist

Before submitting PR:

- [ ] Inputs are validated
- [ ] Errors are handled (try-catch)
- [ ] Operations are logged
- [ ] User feedback provided (notifications)
- [ ] Performance considered (caching, memoization)
- [ ] TypeScript types are strict
- [ ] JSDoc comments added
- [ ] No console.log left in code
- [ ] Offline scenarios handled
- [ ] Tests added/updated
- [ ] No sensitive data exposed
- [ ] Accessibility (a11y) considered

---

**Version**: 1.0 | **Status**: Active Development  
**Last Updated**: January 16, 2026
