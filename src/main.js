import './styles.css'

let characterName = 'Unnamed Character'

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
      <p class="sub">Procreate-friendly palette sheet generator for character illustration.</p>
    </section>

    <section class="panel">
      <label>
        角色名稱
        <input id="characterName" value="${characterName}" />
      </label>

      <div class="actions">
        <button id="addSwatch">新增顏色</button>
        <button id="copyMarkdown">複製 Markdown</button>
      </div>
    </section>

    <section class="palette">
      ${swatches.map((item, index) => `
        <article class="swatch">
          <div class="color" style="background:${item.hex}"></div>

          <div class="meta">
            <input data-index="${index}" data-field="category" value="${item.category}" />
            <input data-index="${index}" data-field="name" value="${item.name}" />
            <input data-index="${index}" data-field="hex" value="${item.hex}" />
          </div>

          <button class="remove" data-remove="${index}">刪除</button>
        </article>
      `).join('')}
    </section>

    <section class="output">
      <h2>Markdown Preview</h2>
      <pre>${generateMarkdown()}</pre>
    </section>
  `

  bindEvents()
}

function bindEvents() {
  document.querySelector('#characterName').addEventListener('input', event => {
    characterName = event.target.value
    document.querySelector('pre').textContent = generateMarkdown()
  })

  document.querySelectorAll('input[data-index]').forEach(input => {
    input.addEventListener('change', event => {
      const index = Number(event.target.dataset.index)
      const field = event.target.dataset.field
      swatches[index][field] = event.target.value
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

  document.querySelector('#addSwatch').addEventListener('click', () => {
    swatches.push({
      category: '其他',
      name: '新顏色',
      hex: '#FFFFFF'
    })
    render()
  })

  document.querySelector('#copyMarkdown').addEventListener('click', async () => {
    await navigator.clipboard.writeText(generateMarkdown())
    alert('Markdown 已複製')
  })
}

function generateMarkdown() {
  const rows = swatches
    .map(item => `| ${item.category} | ${item.name} | ${item.hex} |`)
    .join('\n')

  return `# ${characterName} Color Palette

| 分類 | 用途 | HEX |
|---|---|---|
${rows}
`
}

render()
