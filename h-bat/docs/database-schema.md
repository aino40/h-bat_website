# H-BAT データベーススキーマ設計書

## 概要
H-BAT（リズム知覚テスト）アプリケーションのデータベーススキーマ設計書です。
聴力閾値測定とリズム知覚テスト（BST/BIT/BFIT）のデータを管理します。

## テーブル構成

### 1. profiles（被験者プロフィール）
被験者の基本情報を格納します。

| カラム名 | データ型 | 制約 | 説明 |
|---------|---------|------|------|
| id | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() | 被験者ID |
| age | INTEGER | | 年齢 |
| gender | VARCHAR(10) | | 性別（male/female/other） |
| handedness | VARCHAR(10) | | 利き手（right/left/both） |
| created_at | TIMESTAMP | DEFAULT NOW() | 作成日時 |
| updated_at | TIMESTAMP | DEFAULT NOW() | 更新日時 |

### 2. sessions（テストセッション）
各テストセッションの情報を管理します。

| カラム名 | データ型 | 制約 | 説明 |
|---------|---------|------|------|
| id | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() | セッションID |
| profile_id | UUID | FOREIGN KEY (profiles.id), NOT NULL | 被験者ID |
| started_at | TIMESTAMP | DEFAULT NOW() | 開始日時 |
| completed_at | TIMESTAMP | | 完了日時 |
| created_at | TIMESTAMP | DEFAULT NOW() | 作成日時 |
| updated_at | TIMESTAMP | DEFAULT NOW() | 更新日時 |

### 3. hearing_trials（聴力閾値測定試行）
聴力閾値測定の各試行データを格納します。

| カラム名 | データ型 | 制約 | 説明 |
|---------|---------|------|------|
| session_id | UUID | FOREIGN KEY (sessions.id), NOT NULL | セッションID |
| frequency | INTEGER | NOT NULL | 周波数（Hz）: 1000, 2000, 4000 |
| idx | INTEGER | NOT NULL | 試行番号（0から開始） |
| db_level | REAL | NOT NULL | 音圧レベル（dB SPL） |
| correct | BOOLEAN | NOT NULL | 正解フラグ（聞こえた=true） |
| created_at | TIMESTAMP | DEFAULT NOW() | 作成日時 |

**複合主キー**: (session_id, frequency, idx)

### 4. hearing_thresholds（聴力閾値結果）
聴力閾値測定の最終結果を格納します。

| カラム名 | データ型 | 制約 | 説明 |
|---------|---------|------|------|
| session_id | UUID | FOREIGN KEY (sessions.id), NOT NULL | セッションID |
| frequency | INTEGER | NOT NULL | 周波数（Hz） |
| threshold_db | REAL | NOT NULL | 閾値（dB SPL） |
| created_at | TIMESTAMP | DEFAULT NOW() | 作成日時 |

**複合主キー**: (session_id, frequency)

### 5. bst_trials（BST試行データ）
Beat Saliency Test（拍子判別）の試行データを格納します。

| カラム名 | データ型 | 制約 | 説明 |
|---------|---------|------|------|
| session_id | UUID | FOREIGN KEY (sessions.id), NOT NULL | セッションID |
| idx | INTEGER | NOT NULL | 試行番号 |
| delta_db | REAL | NOT NULL | 強拍・弱拍の音量差（dB） |
| pattern_type | INTEGER | NOT NULL | パターンタイプ（2=2拍子, 3=3拍子） |
| correct | BOOLEAN | NOT NULL | 正解フラグ |
| created_at | TIMESTAMP | DEFAULT NOW() | 作成日時 |

**複合主キー**: (session_id, idx)

### 6. bit_trials（BIT試行データ）
Beat Interval Test（テンポ変化判別）の試行データを格納します。

| カラム名 | データ型 | 制約 | 説明 |
|---------|---------|------|------|
| session_id | UUID | FOREIGN KEY (sessions.id), NOT NULL | セッションID |
| idx | INTEGER | NOT NULL | 試行番号 |
| slope_ms_per_beat | REAL | NOT NULL | IOI変化率（ms/beat） |
| slope_sign | INTEGER | NOT NULL | 方向（1=加速, -1=減速） |
| correct | BOOLEAN | NOT NULL | 正解フラグ |
| created_at | TIMESTAMP | DEFAULT NOW() | 作成日時 |

**複合主キー**: (session_id, idx)

### 7. bfit_trials（BFIT試行データ）
Beat Finding & Interval Test（複雑リズム）の試行データを格納します。

| カラム名 | データ型 | 制約 | 説明 |
|---------|---------|------|------|
| session_id | UUID | FOREIGN KEY (sessions.id), NOT NULL | セッションID |
| idx | INTEGER | NOT NULL | 試行番号 |
| pattern_id | VARCHAR(50) | NOT NULL | リズムパターンID |
| slope_ms_per_beat | REAL | NOT NULL | IOI変化率（ms/beat） |
| slope_sign | INTEGER | NOT NULL | 方向（1=加速, -1=減速） |
| correct | BOOLEAN | NOT NULL | 正解フラグ |
| created_at | TIMESTAMP | DEFAULT NOW() | 作成日時 |

**複合主キー**: (session_id, idx)

### 8. thresholds（最終閾値結果）
各テストの最終閾値を統合して格納します。

| カラム名 | データ型 | 制約 | 説明 |
|---------|---------|------|------|
| session_id | UUID | PRIMARY KEY, FOREIGN KEY (sessions.id) | セッションID |
| bst_threshold_db | REAL | | BST閾値（dB） |
| bit_threshold_ms | REAL | | BIT閾値（ms/beat） |
| bfit_threshold_ms | REAL | | BFIT閾値（ms/beat） |
| created_at | TIMESTAMP | DEFAULT NOW() | 作成日時 |
| updated_at | TIMESTAMP | DEFAULT NOW() | 更新日時 |

## インデックス設計

### パフォーマンス最適化用インデックス
```sql
-- セッション検索用
CREATE INDEX idx_sessions_profile_id ON sessions(profile_id);
CREATE INDEX idx_sessions_created_at ON sessions(created_at DESC);

-- 試行データ検索用
CREATE INDEX idx_hearing_trials_session_frequency ON hearing_trials(session_id, frequency);
CREATE INDEX idx_bst_trials_session ON bst_trials(session_id);
CREATE INDEX idx_bit_trials_session ON bit_trials(session_id);
CREATE INDEX idx_bfit_trials_session ON bfit_trials(session_id);

-- 管理者ダッシュボード用
CREATE INDEX idx_sessions_completed_at ON sessions(completed_at DESC) WHERE completed_at IS NOT NULL;
```

## RLS（Row Level Security）ポリシー

### 基本方針
- **被験者**: 自分のデータのみ読み取り・作成可能
- **管理者**: 全データへの完全アクセス権限
- **匿名ユーザー**: プロフィール作成とテスト実行のみ可能

### セキュリティレベル
1. **Public Read**: なし（すべて認証必要）
2. **User Read**: 自分のセッションデータのみ
3. **Admin Full**: 管理者は全データアクセス可能

## データ整合性制約

### 外部キー制約
- sessions.profile_id → profiles.id
- hearing_trials.session_id → sessions.id
- hearing_thresholds.session_id → sessions.id
- bst_trials.session_id → sessions.id
- bit_trials.session_id → sessions.id
- bfit_trials.session_id → sessions.id
- thresholds.session_id → sessions.id

### CHECK制約
```sql
-- 年齢制約
ALTER TABLE profiles ADD CONSTRAINT check_age CHECK (age >= 0 AND age <= 150);

-- 性別制約
ALTER TABLE profiles ADD CONSTRAINT check_gender CHECK (gender IN ('male', 'female', 'other'));

-- 利き手制約
ALTER TABLE profiles ADD CONSTRAINT check_handedness CHECK (handedness IN ('right', 'left', 'both'));

-- 周波数制約
ALTER TABLE hearing_trials ADD CONSTRAINT check_frequency CHECK (frequency IN (1000, 2000, 4000));
ALTER TABLE hearing_thresholds ADD CONSTRAINT check_frequency CHECK (frequency IN (1000, 2000, 4000));

-- 音圧レベル制約
ALTER TABLE hearing_trials ADD CONSTRAINT check_db_level CHECK (db_level >= 0 AND db_level <= 120);
ALTER TABLE hearing_thresholds ADD CONSTRAINT check_threshold_db CHECK (threshold_db >= 0 AND threshold_db <= 120);

-- BST制約
ALTER TABLE bst_trials ADD CONSTRAINT check_delta_db CHECK (delta_db >= 0 AND delta_db <= 60);
ALTER TABLE bst_trials ADD CONSTRAINT check_pattern_type CHECK (pattern_type IN (2, 3));

-- BIT/BFIT制約
ALTER TABLE bit_trials ADD CONSTRAINT check_slope_sign CHECK (slope_sign IN (-1, 1));
ALTER TABLE bfit_trials ADD CONSTRAINT check_slope_sign CHECK (slope_sign IN (-1, 1));
```

## 想定データ量

### 1セッションあたりのデータ量
- **聴力測定**: 3周波数 × 平均30試行 = 90レコード
- **BST**: 平均40試行 = 40レコード
- **BIT**: 平均40試行 = 40レコード  
- **BFIT**: 平均40試行 = 40レコード
- **合計**: 約210レコード/セッション

### 年間想定データ量
- **被験者数**: 1,000人/年
- **総レコード数**: 約210,000レコード/年
- **ストレージ**: 約50MB/年（インデックス含む）

## バックアップ・保持ポリシー

### データ保持期間
- **アクティブデータ**: 2年間
- **アーカイブデータ**: 5年間（圧縮保存）
- **匿名化データ**: 研究目的で長期保存

### バックアップ戦略
- **リアルタイム**: Supabase自動バックアップ
- **日次**: フルバックアップ
- **週次**: CSV エクスポート（オフサイト保存） 