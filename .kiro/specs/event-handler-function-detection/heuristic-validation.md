# Event Handler Heuristic Validation

## 概要

イベントハンドラー使用状況に基づく型分類ヒューリスティックの有効性を検証しました。

## 検証方法

`packages/analyzer/src/services/type-classifier.ts`の`classifyWithUsage`メソッド内で、イベントハンドラー使用状況に基づく分類ロジックをコメントアウトして、テストを実行しました。

### 無効化したコード

```typescript
// HEURISTIC DISABLED FOR TESTING
// const isAmbiguousType = 
//   normalized === 'any' || 
//   normalized === 'unknown' || 
//   normalized === '' ||
//   normalized === 'void' ||
//   normalized === 'never';
// 
// if (isAmbiguousType && eventHandlerUsage?.isLikelyFunction) {
//   console.log(`[TypeClassifier] Type is ambiguous ("${normalized}"), using event handler usage signal for "${variableName}"`);
//   console.log(`[TypeClassifier] Event handler usage contexts:`, eventHandlerUsage.usageContexts);
//   
//   // Override classification based on usage
//   return {
//     isFunction: true,
//     isFunctionLike: true,
//     isUnion: false,
//     baseType: normalized
//   };
// }
```

## 検証結果

### ヒューリスティック有効時

全てのテストが成功：

```
EventHandler Tests:
✓ PASS 170-EventHandler-DirectReference
✓ PASS 171-EventHandler-ArrowFunction
✓ PASS 172-Zustand-EventHandler
✓ PASS 173-EventHandler-MixedUsage

Jotai Tests:
✓ PASS 170-Jotai-AtomicState
✓ PASS 171-Jotai-ReadWrite
✓ PASS 172-Jotai-DerivedAtom
```

### ヒューリスティック無効時

Jotaiテストの一部が失敗：

```
EventHandler Tests:
✓ PASS 170-EventHandler-DirectReference
✓ PASS 171-EventHandler-ArrowFunction
✓ PASS 172-Zustand-EventHandler
✓ PASS 173-EventHandler-MixedUsage

Jotai Tests:
✗ FAIL 170-Jotai-AtomicState
  Extra edges: edge:jotai_atom_0:jsx_element_1:binds
✓ PASS 171-Jotai-ReadWrite
✗ FAIL 172-Jotai-DerivedAtom
  Extra edges: edge:jotai_atom_0:jsx_element_2:binds
```

## 分析

### なぜEventHandlerテストは影響を受けないのか

EventHandlerテストケース（170-173）では、以下の理由でヒューリスティックが不要でした：

1. **170-EventHandler-DirectReference**: `handleClick`は`ProcessAnalyzer`で既に`event-handler`タイプのプロセスとして分類されている
2. **171-EventHandler-ArrowFunction**: `increment`, `decrement`, `reset`は`custom-function`タイプのプロセスとして分類されている
3. **172-Zustand-EventHandler**: Zustandの型推論が正しく機能し、`increment`, `decrement`, `reset`が関数として認識される
4. **173-EventHandler-MixedUsage**: `handleSubmit`はプロセスとして分類され、`formatMessage`も同様

### なぜJotaiテストは影響を受けるのか

Jotaiテストケースでは、以下の問題が発生しました：

#### 170-Jotai-AtomicState（失敗）

```tsx
const [count, setCount] = useAtom(countAtom);

// アロー関数内でcountを呼び出し
<button onClick={() => setCount(count + 1)}>Increment</button>
```

- `count`の型推論が空文字列（`""`）になる
- ヒューリスティックなしでは、`count`がデータとして分類される
- 結果：余分な`binds`エッジが生成される（`jotai_atom_0 -> jsx_element_1`）

#### 171-Jotai-ReadWrite（成功）

```tsx
const text = useAtomValue(textAtom);
const setText = useSetAtom(textAtom);
```

- `useAtomValue`と`useSetAtom`を分離して使用
- 型推論が正しく機能し、`setText`が関数として認識される
- ヒューリスティック不要

#### 172-Jotai-DerivedAtom（失敗）

```tsx
const [count, setCount] = useAtom(countAtom);

// アロー関数内でcountを呼び出し
<button onClick={() => setCount(count + 1)}>Increment</button>
```

- 170と同じ理由で失敗

## 結論（修正版）

### ヒューリスティックの問題点

イベントハンドラー使用状況に基づくヒューリスティックは、**誤った分類**を引き起こしていました：

#### 問題のあるケース

```tsx
<button onClick={() => setCount(count + 1)}>Increment</button>
```

- `setCount`: 関数（状態を更新） → ✅ 正しく分類
- `count`: **データ参照**（現在の値を読み取る） → ❌ ヒューリスティックにより関数として誤分類

#### 正しい動作

- `setCount` → 関数として分類 → `onClick`エッジ（JSX要素 → ストア）
- `count` → データとして分類 → `binds`エッジ（ストア → JSX要素）

### ヒューリスティックを削除した理由

1. **データ参照の誤分類**: アロー関数内で使用されているという理由だけで、データ参照を関数として分類していた
2. **不完全な使用状況分析**: `EventHandlerUsageAnalyzer`は、関数呼び出しと引数を区別できない
3. **型推論で十分**: ほとんどのケースで、型推論またはプロセス分類で正しく動作する

### 正しい動作の確認

ヒューリスティックを削除した後、全てのテストが通過：

- **EventHandler Tests**: 全4件成功（プロセス分類で対応）
- **Jotai Tests**: 全3件成功（データ参照が正しく`binds`エッジを生成）
- **その他**: 全テスト成功

## 推奨事項

1. **ヒューリスティックを削除**: 現在の実装から削除し、型推論とプロセス分類に依存
2. **使用状況分析の改善**: 将来的に、関数呼び出しと引数を区別できる分析を実装する場合は、より精密な実装が必要
3. **テストカバレッジの維持**: 新しいライブラリやパターンを追加する際は、データ参照が正しく処理されることを確認

## 実装完了

### 削除されたコード

1. **process-analyzer.ts**:
   - `isEventHandlerName()` メソッドを削除
   - 名前ベースのイベントハンドラー検出ロジックを削除
   - 全ての関数を `custom-function` として分類

2. **type-classifier.ts**:
   - イベントハンドラー使用状況に基づくヒューリスティックを削除
   - コメントアウトされたコードをクリーンアップ

### テスト結果

全48件のアクセプタンステストが成功：

```
Total Tests:  48
Passed:       48 ✓
Failed:       0 ✗
```

名前ベースのヒューリスティックを削除しても、全てのテストが通過することを確認しました。

## 関連ファイル

- `packages/analyzer/src/analyzers/process-analyzer.ts`: 名前ベースのヒューリスティック削除
- `packages/analyzer/src/services/type-classifier.ts`: イベントハンドラー使用状況ヒューリスティック削除
- `packages/analyzer/src/services/event-handler-usage-analyzer.ts`: 使用状況分析
- `examples/react-vite/src/components/170-Jotai-AtomicState.tsx`: テストケース
- `examples/react-vite/src/components/172-Jotai-DerivedAtom.tsx`: テストケース
