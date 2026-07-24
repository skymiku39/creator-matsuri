import { Link } from 'react-router-dom'
import { AppNav } from '../components/layout/AppNav'

export function TutorialPage() {
  return (
    <div className="page-shell">
      <div className="top-bar">
        <AppNav />
      </div>
      <main className="page-main tutorial">
        <header className="page-hero">
          <p className="eyebrow">創作者的文化祭</p>
          <h1>台詞流程編輯器教學</h1>
          <p>從流程圖到 RPGMV／MZ 語句表，四步驟上手。</p>
        </header>

        <section>
          <h2>1. 認識節點</h2>
          <ul>
            <li><strong>對話</strong>：顯示一句台詞（Show Text）</li>
            <li><strong>選單</strong>：顯示選項（Show Choices）</li>
            <li><strong>選項</strong>：某一條分支的入口文字</li>
            <li><strong>連結</strong>：外部 URL</li>
            <li><strong>結束</strong>：分支結束；若標記返回會回到選單</li>
          </ul>
        </section>

        <section>
          <h2>2. 怎麼連線</h2>
          <ol>
            <li>從節點邊緣的 <strong>+</strong> 點擊，會浮出「可以接到誰」</li>
            <li>也可直接從 + 拖曳到目標節點</li>
            <li>選單右側 A～F 對應選項字母，匯出時會變成 <code>01_A_Name</code></li>
          </ol>
        </section>

        <section>
          <h2>3. 範本與自動補全</h2>
          <ol>
            <li>按上方 <strong>範本</strong>，可載入「兔子茶會」等預設流程</li>
            <li>按 <strong>自動補全結束</strong>，會為缺少結束的分支補上 end 節點</li>
            <li>勾選選項「標記為返回」時，也會嘗試自動補結束</li>
          </ol>
        </section>

        <section>
          <h2>4. 模擬與匯出</h2>
          <ol>
            <li>到 <Link to="/simulate">對話模擬</Link> 像遊戲一樣走一遍</li>
            <li>編輯器與模擬頁共用同一份專案（會自動存到瀏覽器）</li>
            <li>確認無誤後，匯出 CSV／Excel 接到 RPG Maker</li>
          </ol>
        </section>

        <section>
          <h2>匯出編號對照</h2>
          <table className="doc-table">
            <thead>
              <tr>
                <th>流程</th>
                <th>編號</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>開場對話</td>
                <td><code>01_Msg01</code>…</td>
              </tr>
              <tr>
                <td>選項文字</td>
                <td><code>01_A_Name</code></td>
              </tr>
              <tr>
                <td>選項內容</td>
                <td><code>01_A_Content01</code>…</td>
              </tr>
              <tr>
                <td>超連結</td>
                <td><code>01_A_URL</code></td>
              </tr>
            </tbody>
          </table>
        </section>

        <p className="page-cta">
          <Link className="primary-link" to="/">
            回到編輯器
          </Link>
        </p>
      </main>
    </div>
  )
}
