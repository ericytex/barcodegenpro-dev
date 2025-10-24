# Function Ordering Guidelines for BarcodeDesigner.tsx

## Problem
React hooks with `useCallback` can have dependency issues when functions reference each other before they're defined.

## Solution
Always define functions in dependency order:

1. **Base functions** (no dependencies)
2. **Functions that depend on base functions**
3. **Functions that depend on previous functions**

## Example Order:
```typescript
// 1. Base functions
const saveToHistory = useCallback(...)
const updateComponentPosition = useCallback(...)
const updateComponentSize = useCallback(...)
const updateComponentProperty = useCallback(...)

// 2. Functions that depend on base functions
const handleCanvasDoubleClick = useCallback(..., [updateComponentProperty])
const handleResizeStart = useCallback(..., [updateComponentPosition, updateComponentSize])

// 3. Functions that depend on previous functions
const handleLiveCanvasMouseMove = useCallback(..., [updateComponentPosition, updateComponentSize])
```

## Prevention Checklist:
- [ ] All `useCallback` functions are defined before they're used in dependency arrays
- [ ] Functions are ordered by dependency hierarchy
- [ ] No circular dependencies between functions
- [ ] All dependencies are properly declared in dependency arrays

## Common Patterns to Avoid:
```typescript
// ❌ WRONG - Function used before definition
const handleSomething = useCallback(..., [someFunction]) // someFunction not defined yet
const someFunction = useCallback(...)

// ✅ CORRECT - Function defined before use
const someFunction = useCallback(...)
const handleSomething = useCallback(..., [someFunction])
```
