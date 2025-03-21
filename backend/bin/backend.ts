#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib'; // AWS CDKライブラリをインポート
import dynamoDbConfig from '../configs/dynamoDb.config'; // DynamoDBの設定をインポート
import DynamoDbTableStack from '../lib/DynamoDb/DynamoDbTable'; // DynamoDbTableStackクラスをインポート
import PutItemsFunctionStack from '../lib/DynamoDb/PutItemsFunction'; // PutItemsFunctionStackクラスをインポート
import { RustLambdaFunctionStack } from '../lib/api/userInfo/RustLambdaFunction';

const app = new cdk.App(); // 新しいCDKアプリケーションを作成

// dynamoDbConfigの各設定に対して
for (const config of dynamoDbConfig) {
  // DynamoDbTableStackを作成
  const dynamoDbTableStack = new DynamoDbTableStack(
    app,
    `DynamoDbTable-${config.tableName}`, // スタックのIDを設定
    { config } // スタックのプロパティを設定
  );

  // initJsonFileが設定されている場合
  if (config.initJsonFile) {
    // PutItemsFunctionStackを作成
    const putItemsFunctionStack = new PutItemsFunctionStack(
      app,
      `PutItemsFunction-${config.tableName}`, // スタックのIDを設定
      { config } // スタックのプロパティを設定
    );
  }
}

const rustLambdaFunctionStack = new RustLambdaFunctionStack(
  app,
  "RustLambdaFunctionStack"
);
