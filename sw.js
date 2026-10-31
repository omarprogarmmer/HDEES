// ============================================
// Service Worker - حديث (my-app)
// ============================================

const CACHE_NAME = 'hadeeth-app-v1';

const PRECACHE_ASSETS = [
  // // ===== صفحة الانتظار =====
  // './loading.html',

  // // ===== ملفات CSS =====
  // './losson.css',
  // './style_test.css',

  // // ===== ملفات JavaScript =====
  // './losson.js',
  // './script_test.js',

  // ===== ملفات HTML =====
  // './register.html',
  // './index.html',
  // './about.html',
  // './profile.html',
  // './start_1.html',
  // './stages.html',
  // './g1_level1.html',
  // './g1_t1.html',
  // './g1_t2.html',
  // './g2_level1.html',
  // './g2_t1.html',
  // './g2_t2.html',
  // './g2_t3.html',
  // './g3_level1.html',
  // './g3_t2.html',
  // './g3_t3.html',
  // './g4_level1.html',
  // './g4_t3.html',
  // './g4_t2.html',

  // // ===== ملفات الإعداد =====
  // './manifest.json',

  // ===== الأيقونات (ضرورية للتثبيت) =====
  './icon-192.png',
  './icon-512.png',

  // ⚠️ الصور من مجلد photo/ أُزيلت — تُجلب من الشبكة عند الحاجة
];

// ============================================
// ✅ دالة مساعدة: أضف الملف فقط إذا لم يكن موجوداً
// ============================================
async function addIfMissing(cache, url) {
  const existing = await cache.match(url);
  if (existing) {
    return { url, status: 'skipped' };
  }
  try {
    await cache.add(url);
    return { url, status: 'downloaded' };
  } catch (err) {
    return { url, status: 'failed', error: err };
  }
}

// ============================================
// 📣 إرسال التقدم للصفحات
// ============================================
function broadcastProgress(payload) {
  self.clients.matchAll({ includeUncontrolled: true }).then(clients => {
    clients.forEach(client => {
      client.postMessage({ type: 'PRECACHE_PROGRESS', ...payload });
    });
  });
}

function broadcastDone(payload) {
  self.clients.matchAll({ includeUncontrolled: true }).then(clients => {
    clients.forEach(client => {
      client.postMessage({ type: 'PRECACHE_DONE', ...payload });
    });
  });
}

// ============================================
// 1) التثبيت: حمّل فقط الملفات الناقصة
// ============================================
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(async cache => {
        console.log('📦 بدء التحقق من الملفات...');

        const total = PRECACHE_ASSETS.length;
        let processed = 0;
        let downloaded = 0;
        let skipped = 0;
        let failed = 0;

        await Promise.allSettled(
          PRECACHE_ASSETS.map(async url => {
            const result = await addIfMissing(cache, url);

            processed++;
            if (result.status === 'downloaded') downloaded++;
            else if (result.status === 'skipped') skipped++;
            else failed++;

            broadcastProgress({ processed, downloaded, skipped, failed, total });

            if (result.status === 'downloaded') {
              console.log(`⬇️ (${processed}/${total}) تنزيل:`, url);
            } else if (result.status === 'skipped') {
              console.log(`⏭️ (${processed}/${total}) موجود:`, url);
            } else {
              console.warn(`⚠️ (${processed}/${total}) فشل:`, url, result.error);
            }

            return result;
          })
        );

        console.log(`🎉 انتهى: جديد=${downloaded} | موجود=${skipped} | فشل=${failed}`);
        broadcastDone({ downloaded, skipped, failed, total });
        return self.skipWaiting();
      })
  );
});

// ============================================
// 2) التفعيل: احذف الكاش القديم
// ============================================
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => {
        return Promise.all(
          keys
            .filter(key => key !== CACHE_NAME && key.startsWith('hadeeth-app-'))
            .map(key => {
              console.log('🗑️ حذف كاش قديم:', key);
              return caches.delete(key);
            })
        );
      })
      .then(() => self.clients.claim())
  );
});

// ============================================
// 3) الجلب: cache-first مع تحديث تلقائي
// ============================================
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // 🖼️ الصور من مجلد photo/ → شبكة أولاً (لا تُخزّن في الكاش)
  if (url.pathname.includes('/photo/')) {
    event.respondWith(fetch(event.request).catch(() => new Response('', { status: 404 })));
    return;
  }

  // 🔁 إذا كان الطلب HTML
  if (event.request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;

        // إذا لم يكن في الكاش → صفحة الانتظار
        return caches.match('./loading.html').then(loading => {
          if (loading) return loading;
          return fetch(event.request);
        });
      })
    );
    return;
  }

  // باقي الملفات: cache-first
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request)
        .then(response => {
          if (!response || response.status !== 200 || response.type === 'opaque') {
            return response;
          }
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => {
          if (event.request.headers.get('accept')?.includes('text/html')) {
            return caches.match('./index.html');
          }
        });
    })
  );
});

// ============================================
// 4) رسائل من الصفحة
// ============================================
self.addEventListener('message', event => {
  const data = event.data;

  // 🗑️ حذف الكاش
  if (data === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys()
        .then(keys => Promise.all(keys.map(k => caches.delete(k))))
        .then(() => {
          console.log('✅ تم حذف كل الكاش');
          return self.registration.unregister();
        })
        .then(() => self.clients.matchAll())
        .then(clients => clients.forEach(c => c.navigate(c.url)))
    );
  }

  // 💚 KEEP_ALIVE
  if (data && data.type === 'KEEP_ALIVE') {
    console.log('💚 KEEP_ALIVE');
  }

  // 🕐 صفحة الانتظار جاهزة
  if (data && data.type === 'PAGE_READY') {
    caches.open(CACHE_NAME).then(async cache => {
      let found = 0;
      for (const url of PRECACHE_ASSETS) {
        const match = await cache.match(url);
        if (match) found++;
      }

      if (found >= PRECACHE_ASSETS.length) {
        event.source?.postMessage({ type: 'PRECACHE_DONE' });
      } else {
        event.source?.postMessage({
          type: 'PRECACHE_PROGRESS',
          processed: found,
          total: PRECACHE_ASSETS.length,
          downloaded: 0,
          skipped: found,
          failed: 0,
        });
      }
    });
  }
});