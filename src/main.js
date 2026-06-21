import './styles.css'

const STORAGE_KEY = 'qisi-color-kit-state-v1'

let characterName = 'Unnamed Character'
let uploadedImage = null
let pickedColor = '#FFFFFF'
let pickedCategory = '皮膚'
let pickedName = '新吸取顏色'
let autoPaletteCount = 16

let swatches = []

function loadSavedState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return

    const state = JSON.parse(raw)

    characterName = state.characterName || characterName
    pickedColor = state.pickedColor || pickedColor
    pickedCategory = state.pickedCategory || pickedCategory
    pickedName = state.pickedName || pickedName
    autoPaletteCount = Number(state.autoPaletteCount || autoPaletteCount)

    if (Array.isArray(state.swatches)) {
      swatches = state.swatches
    }
  } catch (error) {
    console.warn('Failed to load saved qisi-color-kit state:', error)
  }
}

function saveState() {
  try {
    const state = {
      characterName,
      pickedColor,
      pickedCategory,
      pickedName,
      autoPaletteCount,
      swatches
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch (error) {
    console.warn('Failed to save qisi-color-kit state:', error)
  }
}

function resetSavedState() {
  localStorage.removeItem(STORAGE_KEY)

  characterName = 'Unnamed Character'
  uploadedImage = null
  pickedColor = '#FFFFFF'
  pickedCategory = '皮膚'
  pickedName = '新吸取顏色'
  autoPaletteCount = 16
  swatches = []

  render()
}

function render() {
  saveState()

  const app = document.querySelector('#app')

  app.innerHTML = `
    <section class="hero">
      <p class="eyebrow">ratshawty atelier</p>
      <h1>qisi-color-kit</h1>
      <p class="sub">Drop an image, auto-extract colors, build a Procreate-friendly palette sheet.</p>
    </section>

    <section class="panel">
      <label>
        角色名稱
        <input id="characterName" value="${escapeHtml(characterName)}" />
      </label>

      <div class="actions">
        <label class="fileButton">
          上傳圖片
          <input id="imageInput" type="file" accept="image/*" />
        </label>

        <label class="selectLabel">
          自動抽色數量
          <select id="autoPaletteCount">
            ${[8, 12, 16, 24].map(count => `
              <option value="${count}" ${count === autoPaletteCount ? 'selected' : ''}>${count} 色</option>
            `).join('')}
          </select>
        </label>

        <button id="autoExtract">自動抽色</button>
        <button id="addManualSwatch">手動新增顏色</button>
        <button id="clearPalette">清空色卡</button>
        <button id="exportPng">匯出 PNG 色卡</button>
        <button id="copyMarkdown">複製 Markdown</button>
        <button id="exportProject">匯出專案 JSON</button>

        <label class="fileButton">
          匯入專案 JSON
          <input id="projectInput" type="file" accept="application/json,.json" />
        </label>

        <button id="resetState">重置儲存</button>
      </div>
    </section>

    <section class="sampler">
      <div class="samplerCanvasWrap">
        <canvas id="imageCanvas"></canvas>
        <p class="samplerHint">${uploadedImage ? '點圖片任意位置可以手動吸色，或按「自動抽色」直接產生色卡。' : '先上傳一張圖片。'}</p>
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
        <article class="swatch" draggable="true" data-drag-index="${index}">
          <div class="color" style="background:${normalizeHex(item.hex)}"></div>

          <div class="meta">
            <input data-index="${index}" data-field="category" value="${escapeHtml(item.category)}" />
            <input data-index="${index}" data-field="name" value="${escapeHtml(item.name)}" />
            <input data-index="${index}" data-field="hex" value="${escapeHtml(item.hex)}" />
          </div>

          <div class="swatchActions">
            <button class="copyHex" data-copy-hex="${normalizeHex(item.hex)}">複製 HEX</button>
            <button class="remove" data-remove="${index}">刪除</button>
          </div>
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
    saveState()
  })

  document.querySelector('#imageInput').addEventListener('change', event => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()

    reader.onload = () => {
      const img = new Image()

      img.onload = () => {
        uploadedImage = img
        swatches = extractPaletteFromImage(uploadedImage, autoPaletteCount).map((item, index) => ({
          category: guessColorCategory(item),
          name: `自動抽色 ${String(index + 1).padStart(2, '0')}`,
          hex: item.hex
        }))
        saveState()
        render()
      }

      img.src = reader.result
    }

    reader.readAsDataURL(file)
  })

  document.querySelector('#autoPaletteCount').addEventListener('change', event => {
    autoPaletteCount = Number(event.target.value)
    saveState()
  })

  document.querySelector('#autoExtract').addEventListener('click', () => {
    autoExtractPalette()
  })

  document.querySelector('#pickedCategory').addEventListener('input', event => {
    pickedCategory = event.target.value
    saveState()
  })

  document.querySelector('#pickedName').addEventListener('input', event => {
    pickedName = event.target.value
    saveState()
  })

  document.querySelector('#pickedHex').addEventListener('change', event => {
    pickedColor = normalizeHex(event.target.value)
    document.querySelector('.pickedColor').style.background = pickedColor
    event.target.value = pickedColor
    saveState()
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

  document.querySelectorAll('[data-copy-hex]').forEach(button => {
    button.addEventListener('click', async event => {
      const hex = event.currentTarget.dataset.copyHex
      await navigator.clipboard.writeText(hex)

      const oldText = event.currentTarget.textContent
      event.currentTarget.textContent = '已複製'

      window.setTimeout(() => {
        event.currentTarget.textContent = oldText
      }, 700)
    })
  })

  document.querySelectorAll('[data-remove]').forEach(button => {
    button.addEventListener('click', event => {
      const index = Number(event.target.dataset.remove)
      swatches.splice(index, 1)
      render()
    })
  })

  document.querySelectorAll('[data-drag-index]').forEach(card => {
    card.addEventListener('dragstart', event => {
      event.currentTarget.classList.add('dragging')
      event.dataTransfer.effectAllowed = 'move'
      event.dataTransfer.setData('text/plain', event.currentTarget.dataset.dragIndex)
    })

    card.addEventListener('dragend', event => {
      event.currentTarget.classList.remove('dragging')
    })

    card.addEventListener('dragover', event => {
      event.preventDefault()
      event.dataTransfer.dropEffect = 'move'
    })

    card.addEventListener('drop', event => {
      event.preventDefault()

      const fromIndex = Number(event.dataTransfer.getData('text/plain'))
      const toIndex = Number(event.currentTarget.dataset.dragIndex)

      if (Number.isNaN(fromIndex) || Number.isNaN(toIndex) || fromIndex === toIndex) {
        return
      }

      const [moved] = swatches.splice(fromIndex, 1)
      swatches.splice(toIndex, 0, moved)

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

  document.querySelector('#clearPalette').addEventListener('click', () => {
    swatches = []
    render()
  })

  document.querySelector('#copyMarkdown').addEventListener('click', async () => {
    await navigator.clipboard.writeText(generateMarkdown())
    alert('Markdown 已複製')
  })

  document.querySelector('#exportProject').addEventListener('click', () => {
    exportProjectJson()
  })

  document.querySelector('#projectInput').addEventListener('change', async event => {
    const file = event.target.files?.[0]
    if (!file) return

    await importProjectJson(file)
    event.target.value = ''
  })

  document.querySelector('#resetState').addEventListener('click', () => {
    const ok = window.confirm('確定要清除目前儲存的色卡嗎？')
    if (!ok) return

    resetSavedState()
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
    saveState()
  })
}

function autoExtractPalette() {
  if (!uploadedImage) {
    alert('先上傳圖片')
    return
  }

  const extracted = extractPaletteFromImage(uploadedImage, autoPaletteCount)

  if (extracted.length === 0) {
    alert('沒有抽到有效顏色')
    return
  }

  swatches = extracted.map((item, index) => ({
    category: guessColorCategory(item),
    name: `自動抽色 ${String(index + 1).padStart(2, '0')}`,
    hex: item.hex
  }))

  render()
}

function extractPaletteFromImage(img, targetCount) {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d', { willReadFrequently: true })

  const maxSize = 180
  const ratio = Math.min(maxSize / img.width, maxSize / img.height, 1)

  canvas.width = Math.max(1, Math.round(img.width * ratio))
  canvas.height = Math.max(1, Math.round(img.height * ratio))

  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data
  const buckets = new Map()
  const quantizeStep = 24
  const sampleStep = 2

  for (let y = 0; y < canvas.height; y += sampleStep) {
    for (let x = 0; x < canvas.width; x += sampleStep) {
      const i = (y * canvas.width + x) * 4

      const r = imageData[i]
      const g = imageData[i + 1]
      const b = imageData[i + 2]
      const a = imageData[i + 3]

      if (a < 128) continue
      if (shouldIgnorePixel(r, g, b)) continue

      const qr = quantize(r, quantizeStep)
      const qg = quantize(g, quantizeStep)
      const qb = quantize(b, quantizeStep)

      const key = `${qr},${qg},${qb}`

      if (!buckets.has(key)) {
        buckets.set(key, {
          rTotal: 0,
          gTotal: 0,
          bTotal: 0,
          count: 0
        })
      }

      const bucket = buckets.get(key)
      bucket.rTotal += r
      bucket.gTotal += g
      bucket.bTotal += b
      bucket.count += 1
    }
  }

  const candidates = Array.from(buckets.values())
    .map(bucket => {
      const r = Math.round(bucket.rTotal / bucket.count)
      const g = Math.round(bucket.gTotal / bucket.count)
      const b = Math.round(bucket.bTotal / bucket.count)
      const hsl = rgbToHsl(r, g, b)

      return {
        r,
        g,
        b,
        h: hsl.h,
        s: hsl.s,
        l: hsl.l,
        count: bucket.count,
        score: bucket.count * (0.65 + hsl.s * 0.35),
        hex: rgbToHex(r, g, b)
      }
    })
    .sort((a, b) => b.score - a.score)

  let selected = selectDistinctColors(candidates, targetCount, 42)

  if (selected.length < targetCount) {
    selected = selectDistinctColors(candidates, targetCount, 30)
  }

  if (selected.length < targetCount) {
    selected = selectDistinctColors(candidates, targetCount, 18)
  }

  return selected
    .slice(0, targetCount)
    .sort((a, b) => {
      if (Math.abs(a.h - b.h) > 0.03) return a.h - b.h
      if (Math.abs(a.l - b.l) > 0.03) return a.l - b.l
      return b.s - a.s
    })
}

function shouldIgnorePixel(r, g, b) {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const brightness = (r + g + b) / 3
  const chroma = max - min

  if (brightness > 248) return true
  if (brightness < 7) return true

  if (chroma < 6 && brightness > 235) return true
  if (chroma < 6 && brightness < 20) return true

  return false
}

function selectDistinctColors(candidates, targetCount, minDistance) {
  const selected = []

  for (const candidate of candidates) {
    const tooClose = selected.some(color => {
      return colorDistance(candidate, color) < minDistance
    })

    if (!tooClose) {
      selected.push(candidate)
    }

    if (selected.length >= targetCount) break
  }

  return selected
}

function guessColorCategory(color) {
  const r = color.r
  const g = color.g
  const b = color.b
  const h = color.h
  const s = color.s
  const l = color.l

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const chroma = max - min

  if (l < 0.16) return '線稿'
  if (l > 0.88 && chroma < 24) return '高光'
  if (h > 0.03 && h < 0.13 && s > 0.18 && l > 0.35 && l < 0.85) return '皮膚'
  if (l < 0.32 && s < 0.35) return '頭髮'
  if (s < 0.12) return '灰階'
  return '自動'
}

function exportProjectJson() {
  const project = {
    app: 'qisi-color-kit',
    version: 1,
    exportedAt: new Date().toISOString(),
    characterName,
    pickedColor: normalizeHex(pickedColor),
    pickedCategory,
    pickedName,
    autoPaletteCount,
    swatches: swatches.map(item => ({
      category: item.category || '其他',
      name: item.name || '未命名顏色',
      hex: normalizeHex(item.hex)
    }))
  }

  const blob = new Blob([JSON.stringify(project, null, 2)], {
    type: 'application/json'
  })

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = `${safeFileName(characterName)}-qisi-color-kit.json`
  link.click()

  URL.revokeObjectURL(url)
}

async function importProjectJson(file) {
  try {
    const text = await file.text()
    const project = JSON.parse(text)

    if (!project || !Array.isArray(project.swatches)) {
      throw new Error('Invalid qisi-color-kit project file')
    }

    characterName = project.characterName || 'Unnamed Character'
    pickedColor = normalizeHex(project.pickedColor || '#FFFFFF')
    pickedCategory = project.pickedCategory || '皮膚'
    pickedName = project.pickedName || '新吸取顏色'
    autoPaletteCount = Number(project.autoPaletteCount || 16)

    swatches = project.swatches.map(item => ({
      category: String(item.category || '其他'),
      name: String(item.name || '未命名顏色'),
      hex: normalizeHex(item.hex || '#FFFFFF')
    }))

    saveState()
    render()
  } catch (error) {
    console.error(error)
    alert('匯入失敗：這不是有效的 qisi-color-kit JSON 專案檔')
  }
}

function exportPalettePng() {
  if (swatches.length === 0) {
    alert('色卡是空的')
    return
  }

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

function quantize(value, step) {
  return Math.max(0, Math.min(255, Math.round(value / step) * step))
}

function colorDistance(a, b) {
  const dr = a.r - b.r
  const dg = a.g - b.g
  const db = a.b - b.b

  return Math.sqrt(dr * dr + dg * dg + db * db)
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

function rgbToHsl(r, g, b) {
  r /= 255
  g /= 255
  b /= 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)

  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0)
        break
      case g:
        h = (b - r) / d + 2
        break
      case b:
        h = (r - g) / d + 4
        break
    }

    h /= 6
  }

  return { h, s, l }
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

loadSavedState()
render()
