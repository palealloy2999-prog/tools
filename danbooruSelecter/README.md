# Danbooru Selecter

ComfyUIを起動せず、ブラウザーで日本語・英語のタグを検索し、選択してプロンプトを作る静的Webアプリです。ビルド・サーバーAPI・外部ライブラリは不要です。

## 起動

toolsリポジトリのルートで `python -m http.server 8000` を実行し、`http://localhost:8000/danbooruSelecter/` を開きます。ES Modulesとfetchを利用するため、HTMLの直接ダブルクリックではなくHTTP経由で利用してください。GitHub Pagesでは `/tools/danbooruSelecter/` で動きます。

## 使い方

- 検索はカテゴリ選択と独立し、すべての読み込み済みデータから複数語のAND検索を行います。カテゴリ・セクションを選ぶと、その一覧表示に戻ります。
- チェックした順にプロンプトを生成します。選択中のチップで個別解除できます。
- 区切りはカンマ、ランダム候補 `{a|b}`、セミコロンから選択できます。通常タグの括弧はエスケープし、customの定型文はそのまま使います。アンダースコアの空白変換は設定で変更できます。
- コピー時の末尾カンマは初期設定で有効です。クリップボードが利用できない場合は出力欄を選択して手動コピーできます。
- 選択内容と設定はブラウザーのlocalStorageに保存します。共有PCでは「すべて解除」後にページを閉じてください。選択したローカルタグの文字列も保存対象です。

## 非公開データを手元で試す

「データを読み込む」で読み込み先（custom / json）を選択し、複数のJSONファイルを指定します。ファイルはブラウザー内だけで処理し、アップロードしません。元ノードのデータ形式をそのまま使えます。同じ読み込み先・ファイル名なら後から読み込んだデータに置き換えます。ファイル名はカテゴリ参照に使うため変更しないでください。

jsonの`index.json`は階層表示用の索引として読み込めます。customの`index.json`は使用しません。ローカルカタログそのものは保存しないため、再訪問時に読み込み直してください。公開データへのリンク先が未収録の場合、カテゴリ移動ボタンは無効になります。

## 選別したデータを公開する

公開対象は `catalog-manifest.json` の一覧から読み込みます。この一覧はGitHub ActionsがGitに登録済みのJSONから自動生成します。未登録のローカルファイルは対象になりません。

1. 公開してよいJSONだけをこのアプリ配下の `json/` または `custom/` に配置します。階層表示が必要なら、公開用に選別した `json/index.json` も配置します。
2. GitHub上でファイルをアップロードして `main` にコミットすれば、自動で一覧に登録されます。追加・削除・名前変更に対応し、manifestの手動編集は不要です。
3. ローカルからpushする場合、`json/` と `custom/` は誤公開防止のため `.gitignore` に登録しています。内容を確認したファイルだけ、例として `git add -f danbooruSelecter/custom/quality.json` のようにファイル単位で追加します。フォルダ一括追加は避けてください。
4. コミット差分で公開対象を確認してからpushします。Actionsの「Update Danbooru catalog manifest」がmanifestをコミットし、GitHub Pagesの再ビルドを要求します。公開サイトへの反映にはビルド完了を待ってください。

対象は両フォルダ直下のJSONです。`json/index.json` は索引として登録し、`custom/index.json` と下位フォルダは対象外です。不正なファイル名・JSON・カテゴリ形式を検出した場合は一覧を書き換えずにActionsが失敗します。Actionsのログで該当ファイルを確認して修正してください。

手動で再生成する場合はActions画面で「Run workflow」を実行するか、ローカルで `node danbooruSelecter/scripts/update-catalog-manifest.mjs` を実行します。ワークフローは `main` のみを対象にし、変更がない場合はコミットしません。自動更新には `contents: write`、Pages再ビルド要求には `pages: write` を使用します。追加のシークレットは不要です。

**manifestにないファイルでも、GitHubや公開サイトにアップロードした時点で公開されます。** 非公開データはリポジトリやサイトに置かず、ローカル読み込みで使用してください。ファイル名は英数字・アンダースコア・ハイフン・ピリオドを使用できます。下位フォルダや外部URLは指定できません。

カテゴリJSONの形式:

```json
{
  "カテゴリID": "example",
  "カテゴリ名": "表示名",
  "カテゴリリンク": "",
  "セクション一覧": [
    {
      "セクション名": "表示名",
      "タグ一覧": [{"label": "日本語の表示名", "tag": "english_tag"}]
    }
  ]
}
```

`custom` は定型文、`json` は通常タグとして扱います。`original: true` はjsonでも定型文扱いになります。任意の `link` は `https://danbooru.donmai.us/` のみ表示し、新しいタブで開きます。読み込みに失敗したファイルがあっても、残りのファイルとローカル読み込みは利用できます。

## 検証

`node danbooruSelecter/tests.mjs` でデータ変換・ナビゲーション・検索・出力整形・パスとリンクの制限を確認できます。`node --test danbooruSelecter/scripts/update-catalog-manifest.test.mjs` で自動生成の追加・削除・未追跡ファイル除外・入力検証を確認できます。

## English

A buildless, browser-only tag selector. Serve the repository over HTTP, then open `danbooruSelecter/`. Use local JSON import for private catalogs; files are processed in your browser and never uploaded. Selection and settings are stored in localStorage. To publish reviewed catalogs, upload approved JSON files directly under `danbooruSelecter/json/` or `danbooruSelecter/custom/` on `main`. GitHub Actions regenerates and commits the manifest, then requests a Pages rebuild. Only tracked files are included. All uploaded files become public, even when absent from the manifest.
