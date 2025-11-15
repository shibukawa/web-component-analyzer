# useSWR Node Improvements

## 概要

useSWRノードの表示を改善し、より詳細な情報を提供するようにしました。

## 修正した問題

### 問題1: urlプロップが2つに分かれる
第一引数がプロップの場合、新しいプロップノードを作成するのではなく、既存のプロップノードを探して接続するように修正。

### 問題2: onClickのデータフローが2本出る
inline handlerの場合、`buildAttributeReferenceEdges`でエッジを作成しないようにスキップ処理を追加。inline handlerは`buildInlineHandlerEdges`で処理される。

### 問題3: サーバーノードが消える
**修正**: DFDはデータの流れを表現するもので、useSWRの場合、実際のデータソースはサーバー。第一引数がリテラルでも変数でも、サーバーノードは必ず作成する。

- URLがリテラルの場合: `Server: /api/user`
- URLが変数の場合: `Server` (動的URL)

## 実装した改善

### 1. 型パラメータの表示

**変更前**: `useSWR<resource>`
**変更後**: `useSWR<User>` (型パラメータがある場合)

TypeScriptの型パラメータを抽出して、ノードラベルに表示します。型パラメータが取得できない場合は`useSWR`のみを表示します。

#### 実装詳細

1. **HookInfoに型パラメータフィールドを追加** (`packages/analyzer/src/parser/types.ts`)
   ```typescript
   export interface HookInfo {
     // ...
     typeParameter?: string; // 型パラメータ (e.g., "User")
   }
   ```

2. **hooks-analyzerで型パラメータを抽出** (`packages/analyzer/src/analyzers/hooks-analyzer.ts`)
   - `extractTypeParameter()`メソッドを追加
   - SWCのASTから`typeArguments`を取得
   - 最初の型パラメータの名前を抽出

3. **DFD builderでラベルに型パラメータを使用** (`packages/analyzer/src/parser/dfd-builder.ts`)
   ```typescript
   let label = hook.hookName;
   if (hook.typeParameter) {
     label = `${hook.hookName}<${hook.typeParameter}>`;
   }
   ```

### 2. プロップからuseSWRノードへのデータフロー

**機能**: useSWRの第一引数がプロップの場合、そのプロップからuseSWRノードへのエッジを作成

**注**: fetcherの解析は不要で、第一引数（url）だけで十分です。

#### 実装詳細

1. **HookInfoに引数識別子フィールドを追加** (`packages/analyzer/src/parser/types.ts`)
   ```typescript
   export interface HookInfo {
     // ...
     argumentIdentifiers?: string[]; // 引数として渡された変数名
   }
   ```

2. **hooks-analyzerで引数識別子を抽出** (`packages/analyzer/src/analyzers/hooks-analyzer.ts`)
   - `extractArgumentIdentifiers()`メソッドを追加
   - 引数がIdentifierの場合、その変数名を抽出

3. **DFD builderで既存ノードからのエッジを作成** (`packages/analyzer/src/parser/dfd-builder.ts`)
   ```typescript
   if (hook.argumentIdentifiers && hook.argumentIdentifiers.length > 0) {
     const firstArgId = hook.argumentIdentifiers[0];
     // 既存のノード（prop/state/context）を探す
     const sourceNode = this.findNodeByVariable(firstArgId, this.nodes);
     
     if (sourceNode) {
       this.edges.push({
         from: sourceNode.id,
         to: nodeId,
         label: 'provides key'
       });
     }
   }
   ```
   
   **重要**: `findNodeByVariable`を使用することで、プロップだけでなく、state、context、その他の変数も検索できる。これにより、urlが定数、プロップ、state、contextのいずれであっても正しく接続される。

### 3. mutateのデータフロー方向を修正

**変更前**: `useSWR → Button` (誤り)
**変更後**: `Button → mutate` (正しい)

mutateは呼び出し可能な関数なので、データフローの方向はButtonからmutateになります。

#### 実装詳細

**DFD builderのclassifyVariableメソッドを更新** (`packages/analyzer/src/parser/dfd-builder.ts`)
- library hookのプロパティが関数かデータかを判定
- `processProperties`に含まれる場合は関数として分類
- `dataProperties`に含まれる場合はデータとして分類

```typescript
// For library hooks (useSWR, useSWRMutation), check if this is a process property
if (sourceNode.metadata?.isLibraryHook) {
  const processProperties = sourceNode.metadata.processProperties as string[] | undefined;
  if (processProperties && processProperties.includes(variableName)) {
    return 'function';
  }
  const dataProperties = sourceNode.metadata.dataProperties as string[] | undefined;
  if (dataProperties && dataProperties.includes(variableName)) {
    return 'data';
  }
}
```

これにより、`buildAttributeReferenceEdges`メソッドで正しい方向のエッジが作成されます：
- 関数の場合: `element → function` (elementが関数をトリガー)
- データの場合: `data → element` (データがelementにバインド)

### 4. inline handlerの重複エッジを防ぐ

inline handler（`() => mutate()`のような）の場合、`buildInlineHandlerEdges`で処理されるため、`buildAttributeReferenceEdges`でスキップするように修正。

```typescript
// Skip inline handlers (they're handled by buildInlineHandlerEdges)
if (varName.startsWith('inline_')) {
  console.log(`🚚   ⏭️ Skipping inline handler: ${varName} (handled separately)`);
  continue;
}
```

これにより、onClickのエッジが2本作成される問題を解決。

## 使用例

### 型パラメータ付きuseSWR

```typescript
interface User {
  id: number;
  name: string;
  email: string;
}

function MyComponent({ url }: { url: string }) {
  const { data, error, isLoading } = useSWR<User>(url, fetcher);
  // ...
}
```

**DFD表示**:
- ノードラベル: `useSWR<User>`
- エッジ: `url (prop)` → `useSWR<User>` (label: "provides key")
- エッジ: `Server: /api/user` → `useSWR<User>` (label: "fetches")
- エッジ: `<button>` → `useSWR<User>` (label: "onClick") - mutateを呼び出す

### 型パラメータなしuseSWR

```typescript
function MyComponent() {
  const { data, error } = useSWR('/api/user', fetcher);
  // ...
}
```

**DFD表示**:
- ノードラベル: `useSWR`
- エッジ: `Server: /api/user` → `useSWR` (label: "fetches")

## テスト

### テストファイル

`examples/react-vite/src/components/101-SWR-BasicFetch.tsx`を更新して、urlをプロップとして受け取るようにしました。

### 確認方法

1. VS Code拡張機能をリロード
2. `101-SWR-BasicFetch.tsx`を開く
3. "Show Component Structure Preview"を実行
4. 以下を確認:
   - useSWRノードのラベルが`useSWR<User>`になっている
   - urlプロップが1つだけ存在する（重複していない）
   - urlプロップからuseSWRノードへのエッジが存在する（label: "provides key"）
   - **サーバーノードが必ず存在する**（label: "Server"、urlが変数なので）
   - サーバーノードからuseSWRノードへのエッジが存在する（label: "fetches"）
   - buttonからuseSWRノードへのエッジが1本だけ存在する（label: "onClick"、重複していない）
   - エッジの方向が`button → useSWR`になっている（mutateは関数なので）

### データフロー

```
Server → useSWR<User> → JSX elements (data, error, isLoading)
url (prop) → useSWR<User> (provides key)
button → useSWR<User> (onClick, mutateを呼び出す)
```

### URLがリテラルの場合

urlが文字列リテラル（例: `'/api/user'`）の場合：
- サーバーノードのラベルが`Server: /api/user`になる（具体的なエンドポイント表示）
- それ以外は同じ

## 変更ファイル

- `packages/analyzer/src/parser/types.ts` - HookInfoに型パラメータと引数識別子を追加
- `packages/analyzer/src/analyzers/hooks-analyzer.ts` - 型パラメータと引数識別子の抽出ロジックを追加
- `packages/analyzer/src/parser/dfd-builder.ts` - ラベル生成とエッジ作成ロジックを更新
- `examples/react-vite/src/components/101-SWR-BasicFetch.tsx` - urlをプロップとして受け取るように更新

## 重要な設計判断

### なぜサーバーノードを常に作成するのか

DFDはデータの流れを表現するものです。useSWRを使っている場合：

1. **実際のデータソース**: サーバー
2. **データ取得の実装**: useSWRの内部
3. **URLの指定方法**: 第一引数（リテラルまたは変数）

第一引数だけを追いかけても、サーバーアクセスは見えません。DFDの目的は「データがどこから来てどこへ行くか」を示すことなので、useSWRのようなdata fetching hookの場合、サーバーノードは必須です。

- URLがリテラル: `Server: /api/user` （具体的なエンドポイント）
- URLが変数: `Server` （動的URL、実際のURLは実行時に決まる）

どちらの場合も、データソースはサーバーであることに変わりはありません。

## 今後の拡張

- 他のライブラリフック（useSWRMutation、useQueryなど）にも同様の改善を適用
- 複数の型パラメータをサポート（例: `useSWR<User, Error>`）
- より複雑な引数パターン（オブジェクトリテラル、配列など）のサポート
