/*
  ==================================================
  Neo Carnivore Discord Join
  Service Worker v1
  GitHub Pages対応
  ==================================================
*/

const NEO_CACHE_VERSION =
  'neo-discord-join-v2';

const NEO_CACHE_NAME =
  `neo-discord-cache-${NEO_CACHE_VERSION}`;


/*
  最初から保存するファイル

  アイコンは、アップロード前にService Workerを
  公開してもエラーにならないよう、ここには含めません。
  初回表示時に自動でキャッシュされます。
*/
const NEO_APP_SHELL = [
  './index.html',
  './manifest.webmanifest'
];


/*
  インストール
*/
self.addEventListener('install', event => {
  event.waitUntil(
    caches
      .open(NEO_CACHE_NAME)
      .then(cache => {
        return cache.addAll(
          NEO_APP_SHELL
        );
      })
      .then(() => {
        return self.skipWaiting();
      })
  );
});


/*
  有効化

  古いバージョンのキャッシュを削除します。
*/
self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            const isNeoCache =
              cacheName.startsWith(
                'neo-discord-cache-'
              );

            const isCurrentCache =
              cacheName === NEO_CACHE_NAME;

            if(
              isNeoCache &&
              !isCurrentCache
            ){
              return caches.delete(
                cacheName
              );
            }

            return Promise.resolve();
          })
        );
      })
      .then(() => {
        return self.clients.claim();
      })
  );
});


/*
  通信処理
*/
self.addEventListener('fetch', event => {
  const request = event.request;

  /*
    GET以外はService Workerで処理しません。
  */
  if(request.method !== 'GET'){
    return;
  }

  const requestUrl =
    new URL(request.url);

  /*
    Discordなど、GitHub Pages以外のドメインは
    Service Workerで操作・キャッシュしません。
  */
  if(
    requestUrl.origin !==
    self.location.origin
  ){
    return;
  }


  /*
    HTMLページの移動

    まずネットワークを試し、
    失敗した場合は保存済みindex.htmlを表示します。
  */
  if(request.mode === 'navigate'){
    event.respondWith(
      fetch(request)
        .then(networkResponse => {
          if(
            networkResponse &&
            networkResponse.ok
          ){
            const responseClone =
              networkResponse.clone();

            caches
              .open(NEO_CACHE_NAME)
              .then(cache => {
                cache.put(
                  request,
                  responseClone
                );
              });
          }

          return networkResponse;
        })
        .catch(async () => {
          const cachedNavigation =
            await caches.match(
              request,
              {
                ignoreSearch:true
              }
            );

          if(cachedNavigation){
            return cachedNavigation;
          }

          const cachedIndex =
            await caches.match(
              './index.html'
            );

          if(cachedIndex){
            return cachedIndex;
          }

          return new Response(
            `<!doctype html>
            <html lang="ja">
            <head>
              <meta charset="utf-8">
              <meta
                name="viewport"
                content="width=device-width,initial-scale=1"
              >
              <title>オフライン</title>
              <style>
                *{
                  box-sizing:border-box;
                }

                body{
                  min-height:100vh;
                  margin:0;
                  padding:30px;
                  display:flex;
                  align-items:center;
                  justify-content:center;
                  color:#171717;
                  background:#fff;
                  font-family:
                    -apple-system,
                    BlinkMacSystemFont,
                    "Helvetica Neue",
                    "Yu Gothic",
                    Meiryo,
                    sans-serif;
                  text-align:center;
                }

                div{
                  width:min(100%,420px);
                }

                h1{
                  margin:0 0 15px;
                  font-size:30px;
                  font-weight:900;
                }

                p{
                  margin:0;
                  color:#666;
                  font-size:15px;
                  line-height:1.8;
                  font-weight:600;
                }

                button{
                  margin-top:25px;
                  padding:15px 25px;
                  border:0;
                  border-radius:999px;
                  color:#fff;
                  background:
                    linear-gradient(
                      115deg,
                      #4134ff,
                      #766cff
                    );
                  font-size:15px;
                  font-weight:800;
                }
              </style>
            </head>

            <body>
              <div>
                <h1>
                  インターネットに接続できません
                </h1>

                <p>
                  接続状況を確認してから、
                  もう一度お試しください。
                </p>

                <button
                  type="button"
                  onclick="location.reload()"
                >
                  もう一度読み込む
                </button>
              </div>
            </body>
            </html>`,
            {
              status:503,
              headers:{
                'Content-Type':
                  'text/html; charset=UTF-8'
              }
            }
          );
        })
    );

    return;
  }


  /*
    CSS・JavaScript・画像・マニフェストなど

    保存済みファイルを先に表示しながら、
    裏側で新しいファイルへ更新します。
  */
  event.respondWith(
    caches
      .match(request)
      .then(cachedResponse => {
        const networkResponsePromise =
          fetch(request)
            .then(networkResponse => {
              if(
                !networkResponse ||
                !networkResponse.ok ||
                networkResponse.type !==
                  'basic'
              ){
                return networkResponse;
              }

              const responseClone =
                networkResponse.clone();

              caches
                .open(NEO_CACHE_NAME)
                .then(cache => {
                  cache.put(
                    request,
                    responseClone
                  );
                });

              return networkResponse;
            })
            .catch(() => {
              return cachedResponse;
            });

        return (
          cachedResponse ||
          networkResponsePromise
        );
      })
  );
});


/*
  ページ側から即時更新を要求された場合
*/
self.addEventListener(
  'message',
  event => {
    if(
      event.data &&
      event.data.type ===
        'NEO_SKIP_WAITING'
    ){
      self.skipWaiting();
    }
  }
);
