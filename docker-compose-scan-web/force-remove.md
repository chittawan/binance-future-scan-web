docker rm -f \
  binance-future-web-nice-8003 \
  binance-future-web-film-8005 \
  binance-future-web-01-8007 \
  binance-future-web-02-8009 \
  binance-future-web-03-8011


docker rm -f binance-future-api-film-8006 binance-future-web-film-8005 


curl -u codewalk:P@ssw0rd \
  https://registry.codewalk.myds.me/v2/binance-futures-bot-api/tags/list