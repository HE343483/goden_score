import request from '@/utils/request'

/**
 * 导出接口 — ExportDialog 专用
 * GET /api/admin/exports/{export_type}
 *
 * export_type:
 *   1 / score  → 成绩表
 *   2 / public → 公示表
 *   3 / expert → 专家评分汇总表
 *
 * @param {number} exportType - 1/2/3
 * @param {{ category?: string, majorCategory?: string, subCategory?: string, group?: string, keyword?: string, status?: string, title?: string }} params
 * @returns {Promise<void>} — 下载 Excel 文件
 */
export async function exportData(exportType, params = {}) {
  const res = await request.get(`/admin/exports/${exportType}`, {
    params,
    responseType: 'blob',
  })

  /* ── 从 Content-Disposition 头提取文件名 ── */
  const disposition = res.headers['content-disposition']
  let filename = 'export.xlsx'
  if (disposition) {
    const utf8Match = disposition.match(/filename\*=utf-8''(.+)/)
    if (utf8Match) {
      filename = decodeURIComponent(utf8Match[1])
    } else {
      const fallback = disposition.match(/filename="?([^";\n]+)"?/)
      if (fallback) filename = fallback[1]
    }
  }

  /* ── 触发浏览器下载 ── */
  const url = URL.createObjectURL(res.data)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
