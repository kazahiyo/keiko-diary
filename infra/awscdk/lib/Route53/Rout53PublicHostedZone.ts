import { Stack, StackProps } from "aws-cdk-lib"; // AWS CDKのStackクラスとスタックのプロパティ型StackPropsをインポート
import { Construct } from "constructs"; // CDKリソースの基本単位であるConstructをインポート
import {
  PublicHostedZone,
  PublicHostedZoneProps,
} from "aws-cdk-lib/aws-route53"; // AWS CDKのRoute53モジュールから、PublicHostedZoneリソースとそのプロパティ型をインポート

// Route53PublicHostedZoneStackPropsインターフェースを定義し、CDKスタックのプロパティ(StackProps)に加えてconfigプロパティを要求
interface Route53PublicHostedZoneStackProps extends StackProps {
  readonly config: PublicHostedZoneProps; // Route53のパブリックホストゾーン設定情報を保持する読み取り専用プロパティ
}

// Route53のパブリックホストゾーン作成に必要なプロパティ(PublicHostedZoneProps)を生成するヘルパー関数
const getPublicHostedZoneProps = (
  config: PublicHostedZoneProps // 引数としてRoute53の設定情報を受け取る
): PublicHostedZoneProps => ({
  // PublicHostedZoneProps型のオブジェクトを返す
  zoneName: config.zoneName, // 設定情報のドメイン名をゾーン名として設定
  comment: `Public hosted zone for ${config.zoneName}`, // ゾーンに付与するコメントにドメイン名を含める
  caaAmazon: true, // CAAレコードでAmazonの認証局を許可する設定を有効にする
  addTrailingDot: true, // ゾーン名の末尾にドットを追加する設定（FQDNの形式に合わせるため）
});

// Route53PublicHostedZoneStackクラスを定義（AWS CDKのStackを継承）
export class Route53PublicHostedZoneStack extends Stack {
  readonly publicHostedZone: PublicHostedZone; // 作成したパブリックホストゾーンリソースを保持する読み取り専用プロパティ

  // コンストラクタ：スタックの初期化とパブリックホストゾーンの作成を行う
  constructor(
    scope: Construct, // このスタックの親コンストラクト（ツリー構造のルート）
    id: string, // スタックの一意な識別子（CloudFormation上の論理IDに影響）
    props: Route53PublicHostedZoneStackProps // スタックに渡される追加のプロパティ、特にconfig情報を含む
  ) {
    super(scope, id, props); // 親クラスStackのコンストラクタを呼び出し、初期化を行う

    // 設定情報からデフォルトのパブリックホストゾーンプロパティを生成
    const defaultPublicHostedZoneProps = getPublicHostedZoneProps(props.config);

    // デフォルトのプロパティと、config内で追加・上書き指定されたプロパティをマージする
    const publicHostedZoneProps = {
      ...defaultPublicHostedZoneProps, // 生成されたデフォルト設定
      ...props.config, // 設定ファイルで上書き・追加された設定
    };

    // CloudFormationで使用する論理IDを、ドメイン名から生成
    // 非英数字を削除し、続く文字を大文字化することで、PascalCase形式に変換
    const logicalId = props.config.zoneName
    .replace(/\*/g, "Astr") // アスタリスク(*)を "Astr" に置換
    .replace(/[^a-zA-Z0-9]+(.)?/g, (_, c) => (c ? c.toUpperCase() : "")) // 非英数字部分を削除し、直後の文字を大文字に
    .replace(/^./, (m) => m.toUpperCase()); // 先頭文字を大文字化

    // PublicHostedZoneリソースを作成する
    // 第1引数：このスタックを親コンストラクトとする
    // 第2引数：生成した論理ID（CloudFormation内で一意なリソース識別子）
    // 第3引数：マージされたパブリックホストゾーンの設定プロパティ
    const publicHostedZone = new PublicHostedZone(
      this,
      `PublicHostedZone-${logicalId}`,
      publicHostedZoneProps
    );

    // 作成したPublicHostedZoneリソースを、クラスのプロパティとして保存
    // これにより、他のスタック内リソースから参照できるようになる
    this.publicHostedZone = publicHostedZone;
  }
}
