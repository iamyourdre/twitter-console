/**
 * Twitter / X Post & Repost Delete Script (With 429 Auto-Cooldown & Testing)
 *
 * Script ini mengotomatiskan penghapusan postingan (tweet) dan pembatalan repost (retweet) di X/Twitter.
 * Dilengkapi dengan:
 *  - Interceptor HTTP 429 (Too Many Requests) otomatis via window.fetch
 *  - Cooldown timer interaktif dengan countdown di layar
 *  - Testing 1 tweet setelah cooldown sebelum melanjutkan operasi normal
 *  - Universal selector untuk Twitter DOM modern
 *
 * Jalankan di Console pada halaman profil Anda:
 * URL: https://x.com/<username> atau https://x.com/<username>/with_replies
 */

(function () {
  // ================= KONFIGURASI =================
  const CONFIG = {
    DELETE_POSTS: true,       // Hapus postingan sendiri
    UNDO_REPOSTS: true,       // Batalkan posting ulang (repost/retweet)
    MIN_DELAY: 2500,          // Jeda minimum antar aksi normal (ms) - disarankan 2.5s+ agar aman dari limit
    MAX_DELAY: 4500,          // Jeda maksimum antar aksi normal (ms)
    SCROLL_WAIT: 3000,        // Waktu tunggu setelah scroll (ms)
    MAX_SCROLL_RETRIES: 5,    // Batas percobaan scroll saat tidak ada tweet baru
    COOLDOWN_MINUTES: 1,      // Durasi cooldown saat terkena 429 (dalam menit: 1 menit)
    AUTO_BACKOFF: false,      // Set false agar setiap cooldown selalu tetap 1 menit
    DEBUG: true               // Tampilkan log detail di console
  };
  // ===============================================

  window.stopDeleteScript = false;
  let deletedCount = 0;
  let unretweetedCount = 0;
  let isRateLimited = false;
  let consecutiveRateLimits = 0;

  const log = (msg, ...args) => {
    if (CONFIG.DEBUG) {
      console.log(`%c[Twitter Post Deleter]%c ${msg}`, 'color: #1d9bf0; font-weight: bold;', 'color: inherit;', ...args);
    }
  };

  const warn = (msg, ...args) => {
    console.warn(`%c[Twitter Post Deleter]%c ${msg}`, 'color: #f59e0b; font-weight: bold;', 'color: inherit;', ...args);
  };

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const randomDelay = () => {
    return Math.floor(Math.random() * (CONFIG.MAX_DELAY - CONFIG.MIN_DELAY + 1)) + CONFIG.MIN_DELAY;
  };

  // ================= 429 NETWORK INTERCEPTOR =================
  // Menangkap error 429 langsung dari request GraphQL X/Twitter
  if (!window.__originalFetch) {
    window.__originalFetch = window.fetch;
  }

  window.fetch = async function (...args) {
    const response = await window.__originalFetch.apply(this, args);
    try {
      if (response && response.status === 429) {
        const url = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url) || '';
        if (url.includes('graphql') || url.includes('delete') || url.includes('Tweet') || url.includes('mutation')) {
          warn('HTTP 429 (Too Many Requests) terdeteksi pada endpoint:', url);
          isRateLimited = true;
        }
      }
    } catch (err) {
      // Abaikan error inspeksi
    }
    return response;
  };

  const cleanupNetworkInterceptor = () => {
    if (window.__originalFetch) {
      window.fetch = window.__originalFetch;
      delete window.__originalFetch;
      log('Network interceptor dibersihkan.');
    }
  };

  // ================= UI MESSAGE BOX =================
  function showMessage(message, type = 'info') {
    let messageBox = document.getElementById('delete-post-message-box');
    if (!messageBox) {
      messageBox = document.createElement('div');
      messageBox.id = 'delete-post-message-box';
      Object.assign(messageBox.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: '999999',
        padding: '12px 20px',
        borderRadius: '8px',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontSize: '14px',
        fontWeight: '500',
        color: '#ffffff',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
        transition: 'opacity 0.3s ease-in-out',
        minWidth: '280px',
        maxWidth: '420px',
        textAlign: 'center',
        pointerEvents: 'none'
      });
      document.body.appendChild(messageBox);
    }

    let bgColor = '#1d9bf0'; // Twitter Blue
    if (type === 'success') bgColor = '#00ba7c'; // Green
    else if (type === 'error') bgColor = '#f4212e'; // Red
    else if (type === 'warn') bgColor = '#f59e0b'; // Amber
    else if (type === 'cooldown') bgColor = '#7928ca'; // Purple

    messageBox.style.backgroundColor = bgColor;
    messageBox.innerText = message;
    messageBox.style.opacity = '1';
  }

  // ================= COOLDOWN & TESTING HANDLER =================
  const handleCooldown = async () => {
    consecutiveRateLimits++;
    const waitMinutes = CONFIG.AUTO_BACKOFF
      ? CONFIG.COOLDOWN_MINUTES * consecutiveRateLimits
      : CONFIG.COOLDOWN_MINUTES;
    const totalSeconds = waitMinutes * 60;

    warn(`🚨 Rate limit (429) aktif! Memulai cooldown selama ${waitMinutes} menit (${totalSeconds} detik)...`);
    closeDropdown();

    for (let remaining = totalSeconds; remaining > 0; remaining--) {
      if (window.stopDeleteScript) {
        log('Script dihentikan saat cooldown.');
        return false;
      }

      const m = Math.floor(remaining / 60);
      const s = remaining % 60;
      const formattedTime = `${m}m ${s < 10 ? '0' : ''}${s}s`;

      showMessage(`⏳ Cooldown Rate Limit (429): ${formattedTime}`, 'cooldown');

      // Log ke console setiap 60 detik
      if (remaining % 60 === 0) {
        log(`Sedang cooldown... sisa ${m} menit.`);
      }

      await sleep(1000);
    }

    log('⏰ Cooldown selesai! Memulai testing pada 1 postingan...');
    showMessage('Cooldown selesai. Mencoba 1 aksi test...', 'info');
    
    // Reset flag rate limit untuk menguji apakah sudah pulih
    isRateLimited = false;
    await sleep(2000);
    return true;
  };

  // Trigger klik lengkap untuk React 17/18
  const triggerClick = (element) => {
    if (!element) return false;
    const events = ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'];
    events.forEach((evtName) => {
      element.dispatchEvent(
        new MouseEvent(evtName, {
          bubbles: true,
          cancelable: true,
          view: window
        })
      );
    });
    return true;
  };

  const closeDropdown = () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true }));
  };

  // Mendapatkan semua elemen artikel tweet di layar
  const getTweetElements = () => {
    const articles = Array.from(document.querySelectorAll('article'));
    if (articles.length > 0) return articles;
    return Array.from(document.querySelectorAll('[data-testid="tweet"], [data-testid="cellInnerDiv"]'));
  };

  // Mendeteksi tombol More / Titik Tiga
  const findCaretButton = (tweet) => {
    const byTestId = tweet.querySelector('[data-testid="caret"]');
    if (byTestId) return byTestId;

    const allButtons = Array.from(tweet.querySelectorAll('button, div[role="button"]'));

    const byAriaLabel = allButtons.find((b) => {
      const label = (b.getAttribute('aria-label') || '').toLowerCase();
      return label === 'more' || label === 'lainnya' || label.includes('more') || label.includes('lainnya');
    });
    if (byAriaLabel) return byAriaLabel;

    const byPopup = allButtons.find((b) => {
      const hasPopup = b.getAttribute('aria-haspopup') === 'menu';
      const label = (b.getAttribute('aria-label') || '').toLowerCase();
      return hasPopup && !label.includes('share') && !label.includes('bagikan') && !label.includes('repost');
    });
    if (byPopup) return byPopup;

    return null;
  };

  // Mendeteksi tombol Undo Repost
  const findUnretweetButton = (tweet) => {
    const byTestId = tweet.querySelector('[data-testid="unretweet"]');
    if (byTestId) return byTestId;

    const allButtons = Array.from(tweet.querySelectorAll('button, div[role="button"]'));
    return (
      allButtons.find((b) => {
        const label = (b.getAttribute('aria-label') || '').toLowerCase();
        return (
          label.includes('undo repost') ||
          label.includes('batalkan posting ulang') ||
          label.includes('undo retweet')
        );
      }) || null
    );
  };

  // Mencari tombol 'Delete' / 'Hapus' di menu dropdown
  const findDeleteMenuItem = async (timeout = 2500) => {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      const items = Array.from(
        document.querySelectorAll(
          '[role="menuitem"], [data-testid="Dropdown"] > div, #layers [role="menu"] div, div[role="menu"] [role="menuitem"]'
        )
      );

      for (const item of items) {
        const text = (item.textContent || item.innerText || '').trim().toLowerCase();
        if (
          text === 'delete' ||
          text === 'hapus' ||
          text.startsWith('delete post') ||
          text.startsWith('hapus postingan') ||
          text.includes('hapus') ||
          text.includes('delete')
        ) {
          if (!text.includes('bookmark') && !text.includes('pin') && !text.includes('sematkan')) {
            return item;
          }
        }
      }
      await sleep(150);
    }
    return null;
  };

  // Mencari tombol konfirmasi 'Hapus'
  const findConfirmButton = async (timeout = 2500) => {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      const byTestId = document.querySelector('button[data-testid="confirmationSheetConfirm"]');
      if (byTestId) return byTestId;

      const dialog = document.querySelector('[role="dialog"], [data-testid="sheetDialog"], #layers');
      if (dialog) {
        const buttons = Array.from(dialog.querySelectorAll('button'));
        const found = buttons.find((b) => {
          const text = (b.textContent || b.innerText || '').trim().toLowerCase();
          return text === 'delete' || text === 'hapus' || text.includes('delete') || text.includes('hapus');
        });
        if (found) return found;
      }
      await sleep(150);
    }
    return null;
  };

  // Mencari tombol konfirmasi 'Undo Repost'
  const findUnretweetConfirmButton = async (timeout = 2500) => {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      const byTestId = document.querySelector('[data-testid="unretweetConfirm"]');
      if (byTestId) return byTestId;

      const menu = document.querySelector('[role="menu"], #layers');
      if (menu) {
        const items = Array.from(menu.querySelectorAll('[role="menuitem"], button, div'));
        const found = items.find((el) => {
          const text = (el.textContent || el.innerText || '').trim().toLowerCase();
          return (
            text.includes('undo repost') ||
            text.includes('batalkan posting ulang') ||
            text.includes('undo retweet')
          );
        });
        if (found) return found;
      }
      await sleep(150);
    }
    return null;
  };

  // ================= MAIN LOOP =================
  const startDeleting = async () => {
    log('Script dimulai pada halaman:', window.location.href);
    showMessage('Post Deleter dimulai... Memindai timeline...', 'info');

    let scrollRetries = 0;
    let lastHeight = document.body.scrollHeight;

    while (!window.stopDeleteScript) {
      // Cek apakah sedang terkena rate limit sebelum memproses batch berikutnya
      if (isRateLimited) {
        const shouldContinue = await handleCooldown();
        if (!shouldContinue) break;
      }

      const tweets = getTweetElements();
      log(`Menemukan ${tweets.length} elemen artikel di layar.`);

      if (tweets.length === 0) {
        log('Tidak ada artikel terdeteksi, mencoba scroll...');
        window.scrollBy({ top: 800, behavior: 'smooth' });
        await sleep(CONFIG.SCROLL_WAIT);
        scrollRetries++;
        if (scrollRetries >= CONFIG.MAX_SCROLL_RETRIES) {
          log('Batas scroll tercapai dan tidak ada artikel lagi.');
          break;
        }
        continue;
      }

      let processedInThisBatch = false;

      for (let i = 0; i < tweets.length; i++) {
        const tweet = tweets[i];

        if (window.stopDeleteScript) {
          showMessage(`Dihentikan! Dihapus: ${deletedCount}, Unretweet: ${unretweetedCount}`, 'warn');
          log('Script dihentikan secara manual.');
          cleanupNetworkInterceptor();
          return;
        }

        // Cek jika terkena rate limit saat memproses loop
        if (isRateLimited) {
          const shouldContinue = await handleCooldown();
          if (!shouldContinue) {
            cleanupNetworkInterceptor();
            return;
          }
          // Ulangi pemeriksaan artikel ini setelah cooldown
          i--;
          continue;
        }

        // Jangan proses ulang elemen yang sudah ditandai
        if (tweet.getAttribute('data-del-checked') === 'true') {
          continue;
        }

        // 1. Handle Undo Repost
        if (CONFIG.UNDO_REPOSTS) {
          const unretweetButton = findUnretweetButton(tweet);
          if (unretweetButton) {
            log(`Artikel #${i + 1}: Terdeteksi Repost. Membatalkan repost...`);
            tweet.scrollIntoView({ behavior: 'smooth', block: 'center' });
            await sleep(400);

            triggerClick(unretweetButton);
            await sleep(500);

            const confirmBtn = await findUnretweetConfirmButton(2000);
            if (confirmBtn) {
              triggerClick(confirmBtn);
              await sleep(1000); // Tunggu respon network

              // Cek apakah request terkena 429
              if (isRateLimited) {
                warn('Gagal membatalkan repost karena terkena 429 Too Many Requests.');
                closeDropdown();
                const shouldContinue = await handleCooldown();
                if (!shouldContinue) {
                  cleanupNetworkInterceptor();
                  return;
                }
                // Testing ulang artikel ini
                i--;
                continue;
              }

              // Jika berhasil dan sebelumnya dalam mode cooldown testing
              if (consecutiveRateLimits > 0) {
                log('✅ Testing berhasil! Rate limit sudah hilang. Melanjutkan operasi normal...');
                showMessage('✅ Test berhasil! Melanjutkan proses normal...', 'success');
                consecutiveRateLimits = 0;
              }

              tweet.setAttribute('data-del-checked', 'true');
              unretweetedCount++;
              processedInThisBatch = true;
              log(`Berhasil membatalkan repost (Total: ${unretweetedCount})`);
              showMessage(`Hapus post: ${deletedCount} | Batalkan repost: ${unretweetedCount}`, 'success');
              await sleep(randomDelay());
              continue;
            } else {
              closeDropdown();
            }
          }
        }

        // 2. Handle Delete Post Sendiri
        if (CONFIG.DELETE_POSTS) {
          const caretButton = findCaretButton(tweet);
          if (!caretButton) {
            tweet.setAttribute('data-del-checked', 'true');
            log(`Artikel #${i + 1}: Tombol menu titik tiga tidak ditemukan, lewati.`);
            continue;
          }

          tweet.scrollIntoView({ behavior: 'smooth', block: 'center' });
          await sleep(400);

          log(`Artikel #${i + 1}: Mengklik menu titik tiga...`);
          triggerClick(caretButton);
          await sleep(500);

          const deleteOption = await findDeleteMenuItem(2000);

          if (deleteOption) {
            log(`Artikel #${i + 1}: Opsi Hapus ditemukan. Mengklik Hapus...`);
            triggerClick(deleteOption);
            await sleep(500);

            const confirmBtn = await findConfirmButton(2500);
            if (confirmBtn) {
              triggerClick(confirmBtn);
              await sleep(1000); // Tunggu respon fetch network

              // Cek apakah request terkena 429 Too Many Requests
              if (isRateLimited) {
                warn('Gagal menghapus post karena terkena 429 Too Many Requests.');
                closeDropdown();
                const shouldContinue = await handleCooldown();
                if (!shouldContinue) {
                  cleanupNetworkInterceptor();
                  return;
                }
                // Testing ulang artikel ini
                i--;
                continue;
              }

              // Jika berhasil setelah sebelumnya terkena rate limit
              if (consecutiveRateLimits > 0) {
                log('✅ Testing berhasil! Rate limit sudah hilang. Melanjutkan operasi normal...');
                showMessage('✅ Test berhasil! Melanjutkan operasi normal...', 'success');
                consecutiveRateLimits = 0;
              }

              tweet.setAttribute('data-del-checked', 'true');
              deletedCount++;
              processedInThisBatch = true;
              log(`Artikel #${i + 1}: Berhasil dihapus! (Total: ${deletedCount})`);
              showMessage(`Hapus post: ${deletedCount} | Batalkan repost: ${unretweetedCount}`, 'success');

              await sleep(randomDelay());
            } else {
              warn(`Artikel #${i + 1}: Modal konfirmasi hapus tidak ditemukan.`);
              closeDropdown();
              tweet.setAttribute('data-del-checked', 'true');
            }
          } else {
            log(`Artikel #${i + 1}: Tidak ada opsi hapus di menu. Menutup menu.`);
            closeDropdown();
            tweet.setAttribute('data-del-checked', 'true');
            await sleep(200);
          }
        }
      }

      // Scroll ke bawah untuk memuat tweet berikutnya
      log('Scroll ke bawah untuk memuat post berikutnya...');
      window.scrollBy({ top: 1200, behavior: 'smooth' });
      await sleep(CONFIG.SCROLL_WAIT);

      const newHeight = document.body.scrollHeight;
      if (newHeight === lastHeight && !processedInThisBatch) {
        scrollRetries++;
        log(`Scroll retry ${scrollRetries}/${CONFIG.MAX_SCROLL_RETRIES}...`);
        if (scrollRetries >= CONFIG.MAX_SCROLL_RETRIES) {
          log('Tidak ada post baru yang ditemukan setelah beberapa kali scroll.');
          break;
        }
      } else {
        scrollRetries = 0;
        lastHeight = newHeight;
      }
    }

    cleanupNetworkInterceptor();
    const summary = `Selesai! Berhasil menghapus ${deletedCount} post & membatalkan ${unretweetedCount} repost.`;
    showMessage(summary, 'success');
    log(summary);
  };

  startDeleting();
  showMessage('Script Hapus Post berjalan. Ketik `window.stopDeleteScript = true;` untuk stop.', 'info');
})();
