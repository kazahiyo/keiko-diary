// AWS Lambda HTTP ランタイム用の必要な型やトレイトをインポート
use lambda_http::{ Body, Error, Request, RequestExt, Response };

/// この関数は AWS Lambda のエントリーポイントです。
/// 非同期関数として定義され、HTTP リクエストを受け取り HTTP レスポンスを返します。
pub(crate) async fn function_handler(event: Request) -> Result<Response<Body>, Error> {
    // リクエストからクエリパラメータを参照取得
    // もし "?name=XXX" のようなパラメータがあれば、その値を使い、なければ "world" を使用します
    let who = event
        .query_string_parameters_ref() // クエリパラメータの参照を取得する
        .and_then(|params| params.first("name")) // "name" というキーの最初の値を取得する
        .unwrap_or("world"); // "name" が無い場合はデフォルトで "world" を使う

    // 上記で取得した値を使い、表示するメッセージを生成
    let message = format!("{{message: Hello {who}, this is an AWS Lambda HTTP request}}");

    // レスポンスビルダーを使って、HTTP レスポンスを構築
    // ステータスコード 200 (成功)、コンテンツタイプ "text/html" を設定し、メッセージをレスポンスボディに変換して設定する
    let resp = Response::builder()
        .status(200) // HTTP ステータスコード 200 (OK) を設定
        .header("content-type", "application/json") // ヘッダーにコンテンツタイプを設定
        .body(message.into()) // 文字列メッセージを Body 型に変換してボディに設定
        .map_err(Box::new)?; // エラーが発生した場合は Box 化して返す
    Ok(resp) // 正常なレスポンスを返す
}

#[cfg(test)] // 以下のモジュールはテスト用にのみコンパイルされる
mod tests {
    // 外部の定義（function_handler など）をインポート
    use super::*;
    // HashMap を使うためのインポート
    use std::collections::HashMap;
    // lambda_http の Request 型とその拡張メソッドをインポート
    use lambda_http::{ Request, RequestExt };

    // #[tokio::test] マクロを使って非同期テストを定義
    #[tokio::test]
    async fn test_generic_http_handler() {
        // デフォルトのリクエストを作成（クエリパラメータなどは何も含まれていない）
        let request = Request::default();

        // function_handler 関数を実行し、返されたレスポンスを unwrap で取得（エラーの場合はテスト失敗）
        let response = function_handler(request).await.unwrap();
        // レスポンスのステータスコードが 200 であることを確認
        assert_eq!(response.status(), 200);

        // レスポンスのボディ（バイト列）を取得
        let body_bytes = response.body().to_vec();
        // バイト列を UTF-8 文字列に変換
        let body_string = String::from_utf8(body_bytes).unwrap();

        // デフォルトリクエストの場合、"name" が指定されていないため "world" を使用することを検証
        assert_eq!(body_string, "Hello world, this is an AWS Lambda HTTP request");
    }

    #[tokio::test]
    async fn test_http_handler_with_query_string() {
        // クエリパラメータを格納するための HashMap を作成
        let mut query_string_parameters: HashMap<String, String> = HashMap::new();
        // "name" パラメータに "user-info" という値を設定
        query_string_parameters.insert("name".into(), "user-info".into());

        // デフォルトのリクエストを作成し、クエリパラメータを追加する
        let request = Request::default().with_query_string_parameters(query_string_parameters);

        // function_handler 関数を実行してレスポンスを取得
        let response = function_handler(request).await.unwrap();
        // レスポンスのステータスコードが 200 であることを確認
        assert_eq!(response.status(), 200);

        // レスポンスのボディ（バイト列）を取得し、UTF-8 の文字列に変換する
        let body_bytes = response.body().to_vec();
        let body_string = String::from_utf8(body_bytes).unwrap();

        // クエリパラメータにより "name" が "user-info" になっているため、それに基づいたメッセージになっていることを検証
        assert_eq!(body_string, "Hello user-info, this is an AWS Lambda HTTP request");
    }
}
