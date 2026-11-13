# Twitter Console Scripts

Kumpulan script otomatisasi sederhana untuk dijalankan langsung melalui browser console di X (Twitter).

## ⚠️ Disclaimer
Script ini berinteraksi langsung dengan antarmuka web X/Twitter. Gunakan secara bijak dan dengan risiko ditanggung sendiri (*use at your own risk*). Penggunaan berlebihan dalam waktu singkat dapat menyebabkan pembatasan akun (rate limit) atau suspensi.

---

## 1. Unfollow Tools (`UnfollowTools.js`)
Otomatis unfollow akun yang tidak follow back (*not following you back*).

### Cara Menggunakan:
1. Buka daftar following Anda di X: `https://x.com/<username_kamu>/following`.
2. Buka Developer Tools:
   - Tekan `F12` atau `Ctrl+Shift+I` (Windows/Linux) / `Cmd+Opt+I` (Mac).
   - Masuk ke tab **Console**.
3. Salin seluruh isi file `UnfollowTools.js` dan paste ke dalam Console.
4. Tekan **Enter** untuk menjalankan.

### Menghentikan Script:
Ketik perintah berikut di Console lalu Enter:
```js
window.stopUnfollowScript = true;
```
atau cukup refresh halaman browser.

---

## 2. Delete Post & Repost Tools (`DeletePostTools.js`)
Otomatis menghapus postingan (tweet) sendiri dan membatalkan repost (retweet) secara bertahap.

### Fitur Unggulan:
- **Auto-Cooldown saat Kena Rate Limit (HTTP 429)**:
  - Otomatis meng-intercept request GraphQL (`deleteTweetMutation`).
  - Jika terkena limit (429 *Too Many Requests*), script tidak akan berhenti error melainkan otomatis masuk mode **Cooldown** (default 1 menit) dengan countdown timer real-time di layar.
  - Setelah waktu cooldown habis, script otomatis **melakukan testing** pada 1 postingan terlebih dahulu. Jika test berhasil (limit sudah dibuka oleh Twitter), script otomatis melanjutkan penghapusan normal. Jika masih limit, cooldown akan ditambah secara bertahap (*auto backoff*).
- **Hapus Post Sendiri**: Otomatis klik tombol dropdown (More) -> Hapus -> Konfirmasi.
- **Batalkan Repost (Retweet)**: Otomatis membatalkan postingan yang Anda repost.
- **Universal Selector**: Mendukung DOM Twitter modern tanpa ketergantungan pada `data-testid` yang sering diacak oleh X.
- **Human-like Delay**: Jeda acak antar aksi (default 2.5 – 4.5 detik) untuk mengurangi frekuensi terkena limit.
- **On-screen Widget**: Menampilkan floating box status total post yang dihapus dan status cooldown.

### Cara Menggunakan:
1. Buka halaman profil Anda di X:
   - `https://x.com/<username_kamu>` atau `https://x.com/<username_kamu>/with_replies` (untuk menghapus balasan/replies juga).
2. Buka Developer Tools (`F12` / `Ctrl+Shift+I` / `Cmd+Opt+I`) lalu buka tab **Console**.
3. Salin seluruh isi file `DeletePostTools.js` dan paste ke dalam Console.
4. Tekan **Enter** untuk menjalankan.

### Menghentikan Script:
Ketik perintah berikut di Console lalu Enter:
```js
window.stopDeleteScript = true;
```
atau cukup refresh halaman browser.
