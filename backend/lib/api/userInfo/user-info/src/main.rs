// lambda_http クレートから必要な機能をインポートします。
// - run: Lambda ランタイムを起動する関数
// - service_fn: 関数ハンドラーをサービスとしてラップするユーティリティ
// - tracing: ログ出力用のライブラリ（トレース）
// - Error: 共通のエラー型
use lambda_http::{run, service_fn, tracing, Error};

// 別ファイル（またはモジュール）として定義された http_handler モジュールを読み込みます
mod http_handler;

// http_handler モジュールから function_handler 関数をインポートします。
// function_handler は Lambda のリクエストを処理するユーザー定義の関数です。
use http_handler::function_handler;

// #[tokio::main] マクロを使って非同期の main 関数を定義します。
// このマクロにより、Tokio の非同期ランタイムが自動的に初期化されます。
#[tokio::main]
async fn main() -> Result<(), Error> {
    // ログ出力の初期化を行います。
    // init_default_subscriber() はデフォルトのログ出力先（例えば標準出力）を設定し、デバッグ情報を表示できるようにします。
    tracing::init_default_subscriber();

    // service_fn() で function_handler をラップし、Lambda ランタイムに適合する形に変換します。
    // run() 関数を呼び出して、Lambda ランタイムを起動します。
    // このランタイムは、AWS Lambda 環境でリクエストを受け取ると function_handler を呼び出して処理します。
    run(service_fn(function_handler)).await
}
