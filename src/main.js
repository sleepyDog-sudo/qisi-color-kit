import './styles.css'

let characterName = 'Unnamed Character'
let uploadedImage = null
let pickedColor = '#FFFFFF'
let pickedCategory = '皮膚'
let pickedName = '新吸取顏色'

let swatches = [
  { category: '皮膚', name: '皮膚底色', hex: '#F3C7B3' },
  { category: '皮膚', name: '皮膚陰影 1', hex: '#D99A86' },
  { category: '皮膚', name: '腮紅', hex: '#EFA0A3' },
  { category: '頭髮', name: '頭髮底色', hex: '#242026' },
  { category: '頭髮', name: '頭髮亮部', hex: '#5A4B58' },
  { category: '眼睛', name: '眼睛底色', hex: '#4B3A35' },
  { category: '衣服', name: '衣服底色', hex: '#F4F1EA' },
  { category: '衣服', name: '衣服陰影', hex: '#CFC7BD' },
  { category: '線稿', name: '線稿色', hex: '#241D20' }
]

function render() {
  const app = document.querySelector('#app')

  app.innerHTML = `
    <section class="hero">
      <p class="eyebrow">ratshawty atelier</p>
      <h1>qisi-color-kit</h1>
      <p class="sub">Drop an image, pick colors, build a Procreate-friendly palette sheet.</p>
    </section>

    <section class="panel">
      <label>
        角色名稱
        <input id="characterName" value="${escapeHtml(characterName)}" />
      </label>

      <div class="actions">
        <label class="fileButton">
          上傳圖片吸色
          <input id="imageInput" type="file" accept="image/*" />
        </label>

        <button id="addManualSwatch">手動新增顏色</button>
        <button id="exportPng">匯出 PNG 色卡</button>
        <button id="copyMarkdown">複製 Markdown</button>
      </div>
    </section>

    <section class="sampler">
      <div class="samplerCanvasWrap">
        <canvas id="imageCanvas"></canvas>
        <p class="samplerHint">${uploadedImage ? '點圖片任意位置吸色' : '先上傳一張圖片，然後點圖片吸色'}</p>
      </div>

      <div class="pickedPanel">
        <h2>Picked Color</h2>

        <div class="pickedColor" style="background:${pickedColor}"></div>

        <label>
          分類
          <input id="pickedCategory" value="${escapeHtml(pickedCategory)}" />
        </label>

        <label>
          用途
          <input id="pickedName" value="${escapeHtml(pickedName)}" />
        </label>

        <label>
          HEX
          <input id="pickedHex" value="${escapeHtml(pickedColor)}" />
        </label>

        <button id="addPickedColor">加入色卡</button>
      </div>
    </section>

    <section class="palette">
      ${swatches.map((item, index) => `
        <article class="swatch">
          <div class="color" style="background:${normalizeHex(item.hex)}"></div>

          <div class="meta">
            <input data-index="${index}" data-field="category" value="${escapeHtml(item.category)}" />
            <input data-index="${index}" data-field="name" value="${escapeHtml(item.name)}" />
            <input data-index="${index}" data-field="hex" value="${escapeHtml(item.hex)}" />
          </div>

          <button class="remove" data-remove="${index}">刪除</button>
        </article>
      `).join('')}
    </section>

    <section class="output">
      <h2>Markdown Preview</h2>
      <pre>${escapeHtml(generateMarkdown())}</pre>
    </section>
  `

  bindEvents()
  drawUploadedImage()
}

function bindEvents() {
  document.querySelector('#characterName').addEventListener('input', event => {
    characterName = event.target.value
    document.querySelector('pre').textContent = generateMarkdown()
  })

  document.querySelector('#imageInput').addEventListener('change', event => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()

    reader.onload = () => {
      const img = new Image()

      img.onload = () => {
        uploadedImage = img
        render()
      }

      img.src = reader.result
    }

    reader.readAsDataURL(file)
  })

  document.querySelector('#pickedCategory').addEventListener('input', event => {
    pickedCategory = event.target.value
  })

  document.querySelector('#pickedName').addEventListener('input', event => {
    pickedName = event.target.value
  })

  document.querySelector('#pickedHex').addEventListener('input', event => {
    pickedColor = normalizeHex(event.target.value)
    document.querySelector('.pickedColor').style.background = pickedColor
  })

  document.querySelector('#addPickedColor').addEventListener('click', () => {
    swatches.push({
      category: pickedCategory || '其他',
      name: pickedName || '吸取顏色',
      hex: normalizeHex(pickedColor)
    })
    render()
  })

  document.querySelectorAll('input[data-index]').forEach(input => {
    input.addEventListener('change', event => {
      const index = Number(event.target.dataset.index)
      const field = event.target.dataset.field
      swatches[index][field] = event.target.value.trim()
      render()
    })
  })

  document.querySelectorAll('[data-remove]').forEach(button => {
    button.addEventListener('click', event => {
      const index = Number(event.target.dataset.remove)
      swatches.splice(index, 1)
      render()
    })
  })

  document.querySelector('#addManualSwatch').addEventListener('click', () => {
    swatches.push({
      category: '其他',
      name: '手動新增顏色',
      hex: '#FFFFFF'
    })
    render()
  })

  document.querySelector('#copyMarkdown').addEventListener('click', async () => {
    await navigator.clipboard.writeText(generateMarkdown())
    alert('Markdown 已複製')
  })

  document.querySelector('#exportPng').addEventListener('click', () => {
    exportPalettePng()
  })
}

function drawUploadedImage() {
  const canvas = document.querySelector('#imageCanvas')
  const ctx = canvas.getContext('2d')

  const maxWidth = 760
  const maxHeight = 560

  if (!uploadedImage) {
    canvas.width = maxWidth
    canvas.height = 320
    ctx.fillStyle = '#100D10'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    ctx.fillStyle = '#6D6068'
    ctx.font = '24px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('Upload an image to sample colors', canvas.width / 2, canvas.height / 2)

    return
  }

  const ratio = Math.min(
    maxWidth / uploadedImage.width,
    maxHeight / uploadedImage.height,
    1
  )

  canvas.width = Math.round(uploadedImage.width * ratio)
  canvas.height = Math.round(uploadedImage.height * ratio)

  ctx.drawImage(uploadedImage, 0, 0, canvas.width, canvas.height)

  canvas.addEventListener('click', event => {
    const rect = canvas.getBoundingClientRect()
    const x = Math.floor((event.clientX - rect.left) * (canvas.width / rect.width))
    const y = Math.floor((event.clientY - rect.top) * (canvas.height / rect.height))

    const pixel = ctx.getImageData(x, y, 1, 1).data
    pickedColor = rgbToHex(pixel[0], pixel[1], pixel[2])

    const pickedHexInput = document.querySelector('#pickedHex')
    const pickedColorPreview = document.querySelector('.pickedColor')

    pickedHexInput.value = pickedColor
    pickedColorPreview.style.background = pickedColor
  })
}

function exportPalettePng() {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  const width = 1600
  const padding = 80
  const gap = 28
  const columns = 4
  const cardWidth = Math.floor((width - padding * 2 - gap * (columns - 1)) / columns)
  const cardHeight = 300
  const colorHeight = 185
  const headerHeight = 170
  const rows = Math.ceil(swatches.length / columns)
  const height = padding + headerHeight + rows * cardHeight + Math.max(0, rows - 1) * gap + padding

  canvas.width = width
  canvas.height = height

  ctx.fillStyle = '#F7F1EA'
  ctx.fillRect(0, 0, width, height)

  ctx.fillStyle = '#1F1A1F'
  ctx.font = '700 64px system-ui, sans-serif'
  ctx.fillText(characterName || 'Unnamed Character', padding, padding + 68)

  ctx.fillStyle = '#6D6068'
  ctx.font = '28px system-ui, sans-serif'
  ctx.fillText('qisi-color-kit / Procreate palette sheet', padding, padding + 116)

  swatches.forEach((item, index) => {
    const col = index % columns
    const row = Math.floor(index / columns)

    const x = padding + col * (cardWidth + gap)
    const y = padding + headerHeight + row * (cardHeight + gap)

    const hex = normalizeHex(item.hex)

    roundRect(ctx, x, y, cardWidth, cardHeight, 24, '#FFFFFF')
    ctx.strokeStyle = '#D8CBCF'
    ctx.lineWidth = 2
    strokeRoundRect(ctx, x, y, cardWidth, cardHeight, 24)

    roundRect(ctx, x, y, cardWidth, colorHeight, 24, hex)

    ctx.fillStyle = '#1F1A1F'
    ctx.font = '700 30px system-ui, sans-serif'
    ctx.fillText(item.category || '未分類', x + 28, y + colorHeight + 48)

    ctx.fillStyle = '#4E454B'
    ctx.font = '26px system-ui, sans-serif'
    ctx.fillText(item.name || '未命名顏色', x + 28, y + colorHeight + 88)

    ctx.fillStyle = '#1F1A1F'
    ctx.font = '700 28px monospace'
    ctx.fillText(hex, x + 28, y + colorHeight + 130)
  })

  const link = document.createElement('a')
  link.download = `${safeFileName(characterName)}-palette.png`
  link.href = canvas.toDataURL('image/png')
  link.click()
}

function normalizeHex(value) {
  const raw = String(value || '').trim()
  const withHash = raw.startsWith('#') ? raw : `#${raw}`

  if (/^#[0-9a-fA-F]{6}$/.test(withHash)) {
    return withHash.toUpperCase()
  }

  return '#FFFFFF'
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b]
    .map(value => value.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()
}

function generateMarkdown() {
  const rows = swatches
    .map(item => `| ${item.category} | ${item.name} | ${normalizeHex(item.hex)} |`)
    .join('\n')

  return `# ${characterName} Color Palette

| 分類 | 用途 | HEX |
|---|---|---|
${rows}
`
}

function roundRect(ctx, x, y, width, height, radius, fillStyle) {
  ctx.fillStyle = fillStyle
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + width - radius, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
  ctx.lineTo(x + width, y + height - radius)
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
  ctx.lineTo(x + radius, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
  ctx.closePath()
  ctx.fill()
}

function strokeRoundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + width - radius, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
  ctx.lineTo(x + width, y + height - radius)
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
  ctx.lineTo(x + radius, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
  ctx.closePath()
  ctx.stroke()
}

function safeFileName(value) {
  return String(value || 'unnamed-character')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff_-]+/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'unnamed-character'
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

render()
