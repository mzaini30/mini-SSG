# Mini SSG Zen

## Perbedaannya dengan Mini SSG

1. Hasil build, minified HTML
2. Sudah include dengan Windi CSS
3. Bisa main Markdown

## Instalasi

Buat file `.npmrc` yang berisi:

```toml
shamefully-hoist = true
```

Lalu, install dengan:

```bash
pnpm i -D mini-ssg-zen
```

Lalu, pada `package.json`, tambahkan kode berikut:

```json
"scripts": {
  "dev": "ssg --watch",
  "build": "ssg"
}
```

Terus, kalau ingin menjalankan mode dev, tinggal jalankan `pnpm dev`. Untuk build, jalankan aja `pnpm build`.

## Struktur Folder

```
.
├── dev
│   ├── components
│   ├── imports
│   ├── layouts
│   ├── pages
│   └── static
└── public
```

File-file utama terletak di folder `pages`.

Contoh:
- `pages/index.html` menjadi `index.html`
- `pages/about.html` menjadi `about.html`
- `pages/kelas/satu.html` menjadi `kelas/satu.html`

Folder `layouts` berfungsi untuk meletakkan layout-layout yang akan kita gunakan. Bentuknya adalah HTML.

Folder `components` dan `imports` berfungsi untuk meletakkan partial HTML. Bentuknya juga HTML.

Folder `static` berisi dengan file-file selain file HTML. Jadi, nanti langsung disalin ke folder `public`, nggak diolah.

Folder `public` adalah hasilnya.

## Partial HTML

### Memanggil Component

Isi dari `dev/components/sidebar.html`:

```html
<div>
  @attach(isi)
</div>
```

Isi dari `dev/pages/index.html`:

```html
@component(sidebar)
  @slot(isi)
    <img src="hello.jpg" alt="">
  @endslot
@endcomponent
```

### Memanggil Import

Isi dari `dev/imports/head.html`:

```html
<script src="adsense.js"></script>
```

Isi dari `dev/pages/about.html`:

```html
<html>
  <head>
    @import(head)
  </head>
  <body>
    <p>Halo</p>
  </body>
</html>
```

### Memanggil Layout

Isi dari `dev/layouts/blog.html`:

```html
<h1>@attach(judul)</h1>
@attach(isi)
```

Isi dari `dev/pages/baca.html`:

```html
@layout(blog)

@section(judul)
  Ini adalah Judul
@endsection

@section(isi)
  <p>Hello World...</p>
  <p>Bagaimana kabarnya?</p>
@endsection
```

### Menggunakan Markdown (plus Shiki)

```markdown
@markdown
  # Judul

  Ini adalah isi. _Tulisan miring_ **tebal**
@endmarkdown
```

## Menggunakan Windi

Panggil dulu dengan:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Document</title>
  <link rel="stylesheet" href="windi.css">
</head>
<body>
	
</body>
</html>
```

### Inline

```html
<p class="bg-green-500 text-violet-800">Hai...</p>
```

### Apply

```html
<p class="judulnya">Ini adalah Judul</p>

<style lang="windi">
  .judulnya {
    @apply px-5 py-1 bg-red-300
  }
</style>
```

> Buat `class` yang unik karena dia cuma generate satu biji file `windi.css`

## Snippet dengan Emmet

```json
{
  "config": {
    "markup": {
      "snippets": {
        "attach": "{@attach()}",
        "import": "{@import()}",
        "layout": "{@layout()\n\n@section()\n\t\n@endsection}",
        "section": "{@section()\n\t\n@endsection}",
        "markdown": "{@markdown\n\t\n@endmarkdown}",
        "component": "{@component()\n\t@slot()\n\t\t\n\t@endslot\n@endcomponent}",
        "slot": "{@slot()\n\t\n@endslot}",
        "windi": "style[lang=windi]",
        "petite": "script>{PetiteVue.createApp({}).mount()\n}"
      }
    }
  }
}
```
