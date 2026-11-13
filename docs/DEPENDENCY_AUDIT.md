# Dependency audit — 13 November 2026

Bun 1.4.4, lockfile workspace tunggal. Install frozen memakai `--ignore-scripts`; tidak dilakukan forced audit fix atau upgrade major otomatis.

`bun audit --audit-level high`: tidak ada advisory high/critical. Audit penuh menyisakan satu advisory moderate pada esbuild 0.18/0.19 transitif drizzle-kit: [GHSA-67mh-4wv8-2f99](https://github.com/advisories/GHSA-67mh-4wv8-2f99). Aplikasi produksi menjalankan Hono/Bun, bukan esbuild serve. Development server/migration studio tidak boleh diterbitkan ke jaringan publik. Deferral ini berlaku untuk jalur development yang tidak dipakai production; review kembali 20 November 2026 atau sebelum mengubah toolchain/deployment.

Pembaruan patch kompatibel: music-metadata 11.16.1 dan postcss-selector-parser 6.1.6 melalui override terarah. [Rilis music-metadata](https://github.com/borewit/music-metadata/releases) mencakup pembatasan parser media; [rilis selector parser](https://github.com/postcss/postcss-selector-parser/releases) mencakup perbaikan kompleksitas parser. Build frontend, import Baileys pada image, dan regression diuji kembali setelah lockfile berubah.

Override perbaikan sebelumnya untuk sharp, shell-quote dan source-map-js dipertahankan. SheetJS menggunakan tarball resmi 0.20.3. Audit hanya mencakup advisory yang diketahui dan tidak menggantikan review kode atau pengujian runtime.
