
DATE_TAG=$(date +"%Y.%m.%d")
IMAGE="registry.codewalk.myds.me/binance-futures-bot-web"

LAST_NUMBER=$(crane ls $IMAGE \
  | grep "^${DATE_TAG}-" \
  | sed "s/${DATE_TAG}-//" \
  | sort -n \
  | tail -1)

LAST_NUMBER=${LAST_NUMBER:-0}
RUNNING_NUMBER=$((LAST_NUMBER + 1))
TAG="${DATE_TAG}-${RUNNING_NUMBER}"

echo "Using TAG: $TAG"

docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t registry.codewalk.myds.me/binance-futures-bot-web:$TAG \
  --push .