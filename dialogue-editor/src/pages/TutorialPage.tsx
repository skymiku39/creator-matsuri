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
          <p>從流程圖到可模擬的對話，四步驟上手。</p>
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
            <li>選單右側 A～F 對應選項字母</li>
            <li>
              <kbd>Ctrl</kbd> 點選可多選；
              <kbd>Shift</kbd> 點選會選取整條線性片段；拖曳可移動
            </li>
            <li>
              <kbd>Ctrl</kbd>+<kbd>C</kbd>／<kbd>V</kbd> 複製貼上選取節點
            </li>
            <li>右側屬性可查看並修改「上一個／下一個」連線</li>
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
            <li>確認無誤後，用 <strong>匯出 JSON</strong> 備份；之後可用 <strong>匯入 JSON</strong> 完整還原節點與連線</li>
          </ol>
        </section>

        <section>
          <h2>專案檔內容</h2>
          <p>
            JSON 會保存攤位資訊、所有節點位置／台詞、連線，以及模擬頁的選項位置。
            這是編輯器唯一的匯入／匯出格式。
          </p>
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
