/**
 * Tests for Props Analyzer
 */

import * as assert from 'assert';
import { SWCPropsAnalyzer } from '@web-component-analyzer/analyzer';
import { parseComponent } from '../utils/node-parser';

suite('Props Analyzer Test Suite', () => {
  let analyzer: SWCPropsAnalyzer;

  setup(() => {
    analyzer = new SWCPropsAnalyzer();
  });

  test('Extract props from destructured functional component', async () => {
    const sourceCode = `
      interface Props {
        name: string;
        age: number;
      }
      
      function MyComponent({ name, age }: Props) {
        return <div>{name} is {age} years old</div>;
      }
    `;

    const result = await parseComponent(sourceCode, 'test.tsx');
    assert.ok(result.module, 'Module should be parsed');

    const props = await analyzer.analyzeProps(result.module!);
    
    assert.strictEqual(props.length, 2, 'Should extract 2 props');
    assert.strictEqual(props[0].name, 'name', 'First prop should be name');
    assert.strictEqual(props[0].isDestructured, true, 'Props should be destructured');
    assert.strictEqual(props[1].name, 'age', 'Second prop should be age');
    assert.strictEqual(props[1].isDestructured, true, 'Props should be destructured');
  });

  test('Extract props from non-destructured functional component', async () => {
    const sourceCode = `
      interface Props {
        title: string;
      }
      
      function MyComponent(props: Props) {
        return <div>{props.title}</div>;
      }
    `;

    const result = await parseComponent(sourceCode, 'test.tsx');
    assert.ok(result.module, 'Module should be parsed');

    const props = await analyzer.analyzeProps(result.module!);
    
    assert.strictEqual(props.length, 1, 'Should extract 1 prop');
    assert.strictEqual(props[0].name, 'props', 'Prop should be named props');
    assert.strictEqual(props[0].type, 'Props', 'Prop type should be Props');
    assert.strictEqual(props[0].isDestructured, false, 'Props should not be destructured');
  });

  test('Extract props from arrow function component', async () => {
    const sourceCode = `
      const MyComponent = ({ message }: { message: string }) => {
        return <div>{message}</div>;
      };
    `;

    const result = await parseComponent(sourceCode, 'test.tsx');
    assert.ok(result.module, 'Module should be parsed');

    const props = await analyzer.analyzeProps(result.module!);
    
    assert.strictEqual(props.length, 1, 'Should extract 1 prop');
    assert.strictEqual(props[0].name, 'message', 'Prop should be message');
    assert.strictEqual(props[0].isDestructured, true, 'Props should be destructured');
  });

  test('Extract props with default values', async () => {
    const sourceCode = `
      function MyComponent({ count = 0, enabled = true }) {
        return <div>{count}</div>;
      }
    `;

    const result = await parseComponent(sourceCode, 'test.tsx');
    assert.ok(result.module, 'Module should be parsed');

    const props = await analyzer.analyzeProps(result.module!);
    
    assert.strictEqual(props.length, 2, 'Should extract 2 props');
    assert.strictEqual(props[0].name, 'count', 'First prop should be count');
    assert.strictEqual(props[1].name, 'enabled', 'Second prop should be enabled');
  });

  test('Extract props with rest parameter', async () => {
    const sourceCode = `
      function MyComponent({ name, ...rest }) {
        return <div>{name}</div>;
      }
    `;

    const result = await parseComponent(sourceCode, 'test.tsx');
    assert.ok(result.module, 'Module should be parsed');

    const props = await analyzer.analyzeProps(result.module!);
    
    assert.strictEqual(props.length, 2, 'Should extract 2 props');
    assert.strictEqual(props[0].name, 'name', 'First prop should be name');
    assert.strictEqual(props[1].name, 'rest', 'Second prop should be rest');
    assert.strictEqual(props[1].type, 'rest', 'Rest prop type should be rest');
  });

  test('Handle component with no props', async () => {
    const sourceCode = `
      function MyComponent() {
        return <div>Hello</div>;
      }
    `;

    const result = await parseComponent(sourceCode, 'test.tsx');
    assert.ok(result.module, 'Module should be parsed');

    const props = await analyzer.analyzeProps(result.module!);
    
    assert.strictEqual(props.length, 0, 'Should extract 0 props');
  });

  test('Extract props from class component', async () => {
    const sourceCode = `
      interface Props {
        value: number;
      }
      
      class MyComponent extends React.Component<Props> {
        render() {
          return <div>{this.props.value}</div>;
        }
      }
    `;

    const result = await parseComponent(sourceCode, 'test.tsx');
    assert.ok(result.module, 'Module should be parsed');

    const props = await analyzer.analyzeProps(result.module!);
    
    assert.strictEqual(props.length, 1, 'Should extract 1 prop');
    assert.strictEqual(props[0].name, 'props', 'Prop should be named props');
    assert.strictEqual(props[0].type, 'Props', 'Prop type should be Props');
  });

  test('Extract props with TypeScript types', async () => {
    const sourceCode = `
      function MyComponent({ name, age, isActive }: { name: string; age: number; isActive: boolean }) {
        return <div>{name}</div>;
      }
    `;

    const result = await parseComponent(sourceCode, 'test.tsx');
    assert.ok(result.module, 'Module should be parsed');

    const props = await analyzer.analyzeProps(result.module!);
    
    assert.strictEqual(props.length, 3, 'Should extract 3 props');
    assert.strictEqual(props[0].name, 'name', 'First prop should be name');
    assert.strictEqual(props[1].name, 'age', 'Second prop should be age');
    assert.strictEqual(props[2].name, 'isActive', 'Third prop should be isActive');
  });

  test('Resolve interface definition for props', async () => {
    const sourceCode = `
      interface UserProps {
        username: string;
        email: string;
        isAdmin: boolean;
      }
      
      function UserComponent({ username, email, isAdmin }: UserProps) {
        return <div>{username}</div>;
      }
    `;

    const result = await parseComponent(sourceCode, 'test.tsx');
    assert.ok(result.module, 'Module should be parsed');

    const props = await analyzer.analyzeProps(result.module!);
    
    assert.strictEqual(props.length, 3, 'Should extract 3 props from interface');
    assert.strictEqual(props[0].name, 'username', 'First prop should be username');
    assert.strictEqual(props[1].name, 'email', 'Second prop should be email');
    assert.strictEqual(props[2].name, 'isAdmin', 'Third prop should be isAdmin');
  });

  test('Extract props from class component with generic type', async () => {
    const sourceCode = `
      interface ComponentProps {
        title: string;
        count: number;
      }
      
      class MyClassComponent extends React.Component<ComponentProps> {
        render() {
          return <div>{this.props.title}</div>;
        }
      }
    `;

    const result = await parseComponent(sourceCode, 'test.tsx');
    assert.ok(result.module, 'Module should be parsed');

    const props = await analyzer.analyzeProps(result.module!);
    
    assert.strictEqual(props.length, 1, 'Should extract props from class component');
    assert.strictEqual(props[0].name, 'props', 'Prop should be named props');
    assert.strictEqual(props[0].type, 'ComponentProps', 'Prop type should be ComponentProps');
    assert.strictEqual(props[0].isDestructured, false, 'Class component props should not be destructured');
  });

  test('Extract props with nested object types', async () => {
    const sourceCode = `
      interface Config {
        theme: string;
        locale: string;
      }
      
      interface NestedProps {
        userId: string;
        config: Config;
      }
      
      function NestedComponent({ userId, config }: NestedProps) {
        return <div>{userId}</div>;
      }
    `;

    const result = await parseComponent(sourceCode, 'test.tsx');
    assert.ok(result.module, 'Module should be parsed');

    const props = await analyzer.analyzeProps(result.module!);
    
    assert.strictEqual(props.length, 2, 'Should extract 2 props');
    assert.strictEqual(props[0].name, 'userId', 'First prop should be userId');
    assert.strictEqual(props[1].name, 'config', 'Second prop should be config');
  });

  test('Extract props with optional properties', async () => {
    const sourceCode = `
      interface OptionalProps {
        required: string;
        optional?: number;
      }
      
      function OptionalComponent({ required, optional }: OptionalProps) {
        return <div>{required}</div>;
      }
    `;

    const result = await parseComponent(sourceCode, 'test.tsx');
    assert.ok(result.module, 'Module should be parsed');

    const props = await analyzer.analyzeProps(result.module!);
    
    assert.strictEqual(props.length, 2, 'Should extract 2 props including optional');
    assert.strictEqual(props[0].name, 'required', 'First prop should be required');
    assert.strictEqual(props[1].name, 'optional', 'Second prop should be optional');
  });

  test('Extract props from exported default function', async () => {
    const sourceCode = `
      interface ExportedProps {
        data: string;
      }
      
      export default function ExportedComponent({ data }: ExportedProps) {
        return <div>{data}</div>;
      }
    `;

    const result = await parseComponent(sourceCode, 'test.tsx');
    assert.ok(result.module, 'Module should be parsed');

    const props = await analyzer.analyzeProps(result.module!);
    
    assert.strictEqual(props.length, 1, 'Should extract props from exported default function');
    assert.strictEqual(props[0].name, 'data', 'Prop should be data');
  });

  test('Extract props from named export function', async () => {
    const sourceCode = `
      interface NamedProps {
        value: number;
      }
      
      export function NamedComponent({ value }: NamedProps) {
        return <div>{value}</div>;
      }
    `;

    const result = await parseComponent(sourceCode, 'test.tsx');
    assert.ok(result.module, 'Module should be parsed');

    const props = await analyzer.analyzeProps(result.module!);
    
    assert.strictEqual(props.length, 1, 'Should extract props from named export');
    assert.strictEqual(props[0].name, 'value', 'Prop should be value');
  });

  test('Extract props with union types', async () => {
    const sourceCode = `
      type Status = 'active' | 'inactive' | 'pending';
      
      interface UnionProps {
        status: Status;
        value: string | number;
      }
      
      function UnionComponent({ status, value }: UnionProps) {
        return <div>{status}</div>;
      }
    `;

    const result = await parseComponent(sourceCode, 'test.tsx');
    assert.ok(result.module, 'Module should be parsed');

    const props = await analyzer.analyzeProps(result.module!);
    
    assert.strictEqual(props.length, 2, 'Should extract props with union types');
    assert.strictEqual(props[0].name, 'status', 'First prop should be status');
    assert.strictEqual(props[1].name, 'value', 'Second prop should be value');
  });

  test('Extract props from React.FC type', async () => {
    const sourceCode = `
      interface FCProps {
        message: string;
      }
      
      const FCComponent: React.FC<FCProps> = ({ message }) => {
        return <div>{message}</div>;
      };
    `;

    const result = await parseComponent(sourceCode, 'test.tsx');
    assert.ok(result.module, 'Module should be parsed');

    const props = await analyzer.analyzeProps(result.module!);
    
    assert.strictEqual(props.length, 1, 'Should extract props from React.FC');
    assert.strictEqual(props[0].name, 'message', 'Prop should be message');
  });

  test('Extract function-type props (event handlers)', async () => {
    const sourceCode = `
      interface EventProps {
        onClick: () => void;
        onUpdate: (value: string) => void;
        onDelete: (id: number) => Promise<void>;
      }
      
      function EventComponent({ onClick, onUpdate, onDelete }: EventProps) {
        return <div onClick={onClick}>Click me</div>;
      }
    `;

    const result = await parseComponent(sourceCode, 'test.tsx');
    assert.ok(result.module, 'Module should be parsed');

    const props = await analyzer.analyzeProps(result.module!);
    
    assert.strictEqual(props.length, 3, 'Should extract 3 function props');
    assert.strictEqual(props[0].name, 'onClick', 'First prop should be onClick');
    assert.strictEqual(props[1].name, 'onUpdate', 'Second prop should be onUpdate');
    assert.strictEqual(props[2].name, 'onDelete', 'Third prop should be onDelete');
  });

  test('Extract mixed props with functions and primitives', async () => {
    const sourceCode = `
      interface MixedProps {
        userId: string;
        count: number;
        onSave: (data: any) => void;
        onCancel: () => void;
      }
      
      function MixedComponent({ userId, count, onSave, onCancel }: MixedProps) {
        return <div>{userId}</div>;
      }
    `;

    const result = await parseComponent(sourceCode, 'test.tsx');
    assert.ok(result.module, 'Module should be parsed');

    const props = await analyzer.analyzeProps(result.module!);
    
    assert.strictEqual(props.length, 4, 'Should extract 4 props');
    assert.strictEqual(props[0].name, 'userId', 'First prop should be userId');
    assert.strictEqual(props[1].name, 'count', 'Second prop should be count');
    assert.strictEqual(props[2].name, 'onSave', 'Third prop should be onSave');
    assert.strictEqual(props[3].name, 'onCancel', 'Fourth prop should be onCancel');
  });
});
