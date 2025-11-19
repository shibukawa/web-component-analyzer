import type {
  JSXAttributeReference,
  EventHandlerUsageMap,
  EventHandlerUsageInfo,
  EventHandlerUsageContext,
} from '../parser/types.js';

/**
 * Analyzes JSX attribute references to identify variables used as event handlers
 */
export class EventHandlerUsageAnalyzer {
  /**
   * Analyze attribute references and build usage map
   * @param attributeReferences - All JSX attribute references from component
   * @returns Map of variable names to their event handler usage contexts
   */
  analyze(attributeReferences: JSXAttributeReference[]): EventHandlerUsageMap {
    const usageMap: EventHandlerUsageMap = {};

    // Group references by attribute name to detect arrow function patterns
    const refsByAttribute = new Map<string, JSXAttributeReference[]>();
    
    for (const ref of attributeReferences) {
      if (!refsByAttribute.has(ref.attributeName)) {
        refsByAttribute.set(ref.attributeName, []);
      }
      refsByAttribute.get(ref.attributeName)!.push(ref);
    }

    // Process each attribute
    for (const [attrName, refs] of refsByAttribute.entries()) {
      // Check if this is an event handler attribute
      if (!this.isEventHandlerAttribute(attrName)) {
        continue;
      }

      // If there's only one reference, it's likely a direct reference
      // If there are multiple references for the same attribute, they came from an arrow function
      const usageType = refs.length === 1 ? 'direct' : 'arrow-function-call';

      for (const ref of refs) {
        // Handle direct references: onClick={handleClick}
        if (ref.referencedVariable && !ref.propertyName) {
          this.addUsageContext(usageMap, ref.referencedVariable, {
            attributeName: attrName,
            usageType,
          });
        }

        // Handle member expressions: onClick={store.increment}
        if (ref.referencedVariable && ref.propertyName) {
          // For member expressions, we track both the object and the property
          // The property is more likely to be the actual function
          const memberKey = `${ref.referencedVariable}.${ref.propertyName}`;
          this.addUsageContext(usageMap, memberKey, {
            attributeName: attrName,
            usageType,
          });
          
          // Also track the base object in case it's needed
          this.addUsageContext(usageMap, ref.referencedVariable, {
            attributeName: attrName,
            usageType,
          });
        }
      }
    }

    return usageMap;
  }

  /**
   * Check if an attribute name is an event handler
   * @param attributeName - The attribute name (e.g., 'onClick', 'onChange')
   * @returns true if the attribute is an event handler
   */
  private isEventHandlerAttribute(attributeName: string): boolean {
    // React event handlers follow the pattern: on[A-Z]
    // Examples: onClick, onChange, onSubmit, onCustomEvent
    return /^on[A-Z]/.test(attributeName);
  }

  /**
   * Add a usage context to the usage map
   * @param usageMap - The usage map to update
   * @param variableName - The variable name
   * @param context - The usage context to add
   */
  private addUsageContext(
    usageMap: EventHandlerUsageMap,
    variableName: string,
    context: Omit<EventHandlerUsageContext, 'jsxElement'>
  ): void {
    if (!usageMap[variableName]) {
      usageMap[variableName] = {
        variableName,
        usageContexts: [],
        isLikelyFunction: true,
      };
    }

    usageMap[variableName].usageContexts.push({
      ...context,
    });
  }
}
