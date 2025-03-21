import { Construct } from "constructs";
import { RustFunction } from "cargo-lambda-cdk";
import { Stack, StackProps } from "aws-cdk-lib";

export class RustLambdaFunctionStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    new RustFunction(this, "MyRustLambda", {
      functionName: "hello-rust-lambda",
      // Cargo.toml のパスをCDKプロジェクトからの相対パスで指定
      manifestPath: "./lib/api/userInfo/user-info/Cargo.toml",
      // オプションで環境変数、メモリ、タイムアウトなどを設定可能
      environment: {
        RUST_LOG: "info",
      },
    });
  }
}