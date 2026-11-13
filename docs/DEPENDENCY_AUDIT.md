# Dependency audit — 13 November 2026

Native audit: `bun audit --json`. Setelah pembaruan terarah tidak ada advisory high/critical. Masih ada tiga paket dengan advisory moderate yang dinilai berdasarkan jalur penggunaan. Review berikutnya: 20 November 2026.

| Paket | Cakupan teramati | Tindak lanjut |
|---|---|---|
| esbuild | Transitive drizzle-kit; aplikasi tidak menjalankan esbuild serve. | Perbarui toolchain migrasi pada pemeliharaan berikutnya; jangan publikasikan server development. |
| music-metadata | Transitive Baileys; jalur WhatsApp aplikasi saat ini mengirim pesan teks. | Tinjau kembali sebelum menambah pemrosesan media masuk/keluar. |
| postcss-selector-parser | Toolchain build CSS dari sumber repository. | Perbarui rantai CSS dan batasi build ke sumber terpercaya. |

## Metadata advisory tersisa

- esbuild: [esbuild enables any website to send any requests to the development server and read the response](https://github.com/advisories/GHSA-67mh-4wv8-2f99)
- music-metadata: [music-metadata: MP4 stsd sample-entry size==0 causes a synchronous infinite loop (DoS) — unreleased regression on master](https://github.com/advisories/GHSA-f94x-6692-553q)
- music-metadata: [music-metadata: EBML parser trusts element lengths, allowing memory exhaustion or process abort](https://github.com/advisories/GHSA-5gfj-9q3v-qfp3)
- postcss-selector-parser: [PostCSS: Quadratic complexity in flat selector parsing allows CPU exhaustion](https://github.com/advisories/GHSA-rj75-hqrm-r3gf)

## Sumber dan perubahan

- Drizzle ORM diperbarui melewati versi perbaikan SQL identifier. [Advisory resmi](https://github.com/advisories/GHSA-gpj5-g38j-94v9).
- Zod diperbarui ke versi yang memperbaiki konsumsi memori validasi collection. [Advisory](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5).
- Hono dan Vite diperbarui dalam jalur major yang sama; sharp, shell-quote dan source-map-js dipatok ke versi perbaikan melalui overrides.
- SheetJS memakai tarball resmi 0.20.3 sesuai [petunjuk distribusi resmi](https://docs.sheetjs.com/docs/getting-started/installation/frameworks/).
- Install memakai lockfile serta lifecycle scripts dinonaktifkan. Tidak dilakukan forced audit fix.

Penilaian ini bukan sertifikasi keamanan seluruh aplikasi. Jalur baru yang menerima file atau media perlu audit ulang.
