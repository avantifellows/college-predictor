#!/usr/bin/env bash
# Deploy the scholarship sync lambda.
#
# Bundles lambda_function.py together with the shared transform from
# scripts/scholarship_transform.py, so the deployed code and the local
# rebuild always run identical logic.
#
# Usage: ./lambda/update_scholarship_data/deploy.sh
set -euo pipefail

FUNCTION_NAME="update-scholarship-data"
REGION="ap-south-1"

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$HERE/../.." && pwd)"
BUILD_DIR="$(mktemp -d)"
trap 'rm -rf "$BUILD_DIR"' EXIT

cp "$HERE/lambda_function.py" "$BUILD_DIR/"
cp "$REPO_ROOT/scripts/scholarship_transform.py" "$BUILD_DIR/"

ZIP_PATH="$BUILD_DIR/function.zip"
(cd "$BUILD_DIR" && zip -q -r "$ZIP_PATH" lambda_function.py scholarship_transform.py)

echo "Deploying $FUNCTION_NAME to $REGION..."
aws lambda update-function-code \
  --function-name "$FUNCTION_NAME" \
  --zip-file "fileb://$ZIP_PATH" \
  --region "$REGION" \
  --output json \
  --query '{Function:FunctionName,CodeSize:CodeSize,LastModified:LastModified}'

# The code update must finish propagating before configuration can change.
aws lambda wait function-updated \
  --function-name "$FUNCTION_NAME" \
  --region "$REGION"

# boto3's json.dumps on ~200 rich rows needs more than the default 128MB/20s.
aws lambda update-function-configuration \
  --function-name "$FUNCTION_NAME" \
  --timeout 60 \
  --memory-size 256 \
  --region "$REGION" \
  --output json \
  --query '{Timeout:Timeout,MemorySize:MemorySize}' >/dev/null

echo "Done. Invoke a test run with:"
echo "  aws lambda invoke --function-name $FUNCTION_NAME --region $REGION /dev/stdout"
