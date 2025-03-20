#!/bin/bash

# スタックの一覧を取得し、それぞれ削除する
# スタックの一覧を取得し、CDKToolKitを除外してそれぞれ削除する
for stack in $(aws cloudformation list-stacks --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE --query 'StackSummaries[?StackName!=`CDKToolkit`].StackName' --output text)
do
    aws cloudformation delete-stack --stack-name $stack
    echo "$stack を削除しました。"
done
